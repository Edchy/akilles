import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Children,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject,
} from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type TextInput as NativeTextInput,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Text, TextInput } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Column, COLUMN } from "@/components/screen";
import { useHideBar } from "@/components/bar-actions";
import { useBarSpace } from "@/components/bottom-bar";
import { Field, useColors } from "@/components/field";
import { Icon, type IconName } from "@/components/icon";
import { Mark } from "@/components/mark";
import { NoteLine, NoteSheet } from "@/components/note";
import { GuideButton, GuideSheet } from "@/components/guide";
import { CardContext, useOnCard } from "@/components/card-context";
import { Illustration } from "@/components/illustration";
import { GoalSheet, Pips, hasTutorial, openTutorial } from "@/components/goals";
import { BigButton, Sheet } from "@/components/sheet";
import { RestTimer } from "@/components/rest-timer";
import { colors, FAMILY, fieldColors, fonts, radii } from "@/constants/theme";
import { byId, inSentence } from "@/data/exercises";
import { ownCue } from "@/data/guides";
import type { Family } from "@/data/families";
import {
  FINISHED_LINES,
  GOAL_LINES,
  OUTCOME_LINES,
  pickLine,
  type FinishedMood,
} from "@/data/voice";
import {
  AWAY_CARDIO,
  courseLabel,
  distanceLabel,
  EFFORT,
  parseTime,
  pictureOf,
  timeLabel,
  type CardioEnd,
  type CardioExercise,
  type CardioLength,
  type MobilityMove,
  type MobilityRoutine,
} from "@/data/conditioning";
import { nextStepLine, ruleLine, type Goal, type GoalStep } from "@/data/goals";
import { decayLabel } from "@/lib/progression";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { weightLabel } from "@/lib/warmup";
import {
  addSuperset,
  allSetsLogged,
  cardioRecord,
  completeCardio,
  completeExercise,
  completeGoal,
  conditioningPool,
  currentCardio,
  currentRoutine,
  currentPool,
  currentPrescription,
  currentTaken,
  currentWarmup,
  currentWorkout,
  exerciseCount,
  editWeight,
  finishWorkout,
  goalStepOf,
  goalVerdict,
  isCardio,
  isBetter,
  isComplete,
  isConditioning,
  isGoal,
  isLift,
  itemFamily,
  isMobility,
  isTimed,
  lastScore,
  logGoalSet,
  nudgeScore,
  nextAfterSession,
  nextTime,
  noteFor,
  sessionTally,
  nudgeWeight,
  partnerPrescription,
  removeSuperset,
  resetGoalSet,
  resetSet,
  scoreOf,
  setGot,
  setScore,
  supersetOptions,
  swapConditioning,
  swapForSession,
  tapGoalSet,
  tapSet,
  nextItemName,
  completeMove,
  atCard,
  cardMark,
  cardName,
  goToCard,
  SessionContext,
  useSession,
  type CardMark,
  type Item,
  type SessionState,
  cardioEnd,
  itemLength,
  keepTodayLength,
  nudgeTodayLength,
  plannedLength,
  workoutById,
} from "@/store/session";


/**
 * The lift screen's rhythm, top to bottom: the name, the weight, the circles
 * and a line on last time — the gaps between them, and each block's height.
 * Everything else about the lift (how-to, swap, a note, a superset) waits
 * behind the ⋯ beside the name, so these four have the screen to themselves.
 *
 * Mid-workout you tap without really looking, so nothing may move under the
 * thumb: each block is sized for its largest case — a two-line remark, a
 * five-figure weight — and smaller content sits inside that space rather than
 * shrinking it. A superset folds a second lift in, so the same blocks are
 * drawn tighter to fit both above the bar.
 */
const LAYOUT = {
  solo: { name: 36, weight: 52, number: 96, sets: 48, under: 84, underGap: 28 },
  paired: { name: 18, weight: 22, number: 64, sets: 22, under: 58, underGap: 10 },
} as const;

/**
 * Cardio's name sits where a lift's does, but its round buttons still sit
 * in a row under it, so its gap down to the number is its own.
 */
const CARDIO_WEIGHT = 42;

/**
 * Set circles: a lift on its own; the main lift once a partner is folded in,
 * a little smaller so both fit above the bar on a phone; and the partner,
 * smaller again so the main lift stays primary.
 */
const CIRCLES = {
  solo: { full: 92, gap: 22, font: 50 },
  main: { full: 80, gap: 16, font: 44 },
  partner: { full: 52, gap: 12, font: 28 },
} as const;

/**
 * The row of cards: the gap at the left of a card — so also between two — the
 * width kept at the right for the next card's gap and its edge, and how round
 * a card's corners are.
 */
const ROW = { side: 12, peek: 34, corner: 30 };

/**
 * A workout, as a row of cards: the cardio, the warm-up, each lift, the
 * stretch — one card each, in order, and after the last of them the end.
 * Swipe left for the next card and right for the one before; any card, done
 * or not, so a taken bench is passed and come back to. The edge of the next
 * card always shows at the right, and a tap on it goes there too. Above the
 * row, its header: one mark for each card, filled as it is done (see
 * `CardDot`) — tap it for all the cards at once.
 *
 * The bottom bar is put away while the row is up, so a card has the screen.
 */
export default function WorkoutScreen() {
  const { state } = useSession();
  useHideBar();
  if (!state.active) return <Finished hasSession={false} />;
  return <Deck />;
}

function Deck() {
  const { state, setState } = useSession();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const active = state.active!;
  const cards = active.items.length + 1;
  const page = Math.min(active.cursor, cards - 1);
  const [overview, setOverview] = useState(false);

  // A card and the gap after it: all but the sliver of the next card.
  const stride = Math.min(width, COLUMN + 2 * ROW.side) - ROW.peek;
  const pager = useRef<ScrollView>(null);
  // The row's own height: a sideways scroller does not stretch what is in it
  // to its height, so each card is given it.
  const [height, setHeight] = useState(0);
  const foot = Math.max(insets.bottom, 12);
  // The card the row has scrolled to. When the session moves on some other
  // way — a button on a card, the overview — the row follows it.
  const shown = useRef(-1);
  useEffect(() => {
    if (shown.current === page) return;
    const first = shown.current === -1;
    shown.current = page;
    pager.current?.scrollTo({ x: page * stride, animated: !first });
  }, [page, stride]);

  // Come to rest on a card: that one is on screen now.
  const settle = (x: number) => {
    const at = Math.min(Math.max(Math.round(x / stride), 0), cards - 1);
    if (at === shown.current) return;
    shown.current = at;
    Haptics.selectionAsync();
    setState((s) => goToCard(s, at));
  };
  // Not every platform says when a swipe has come to rest, so a moment
  // without movement counts as rest too.
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (idle.current && clearTimeout(idle.current)), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      <DeckHeader onOpen={() => setOverview(true)} />

      <ScrollView
        ref={pager}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // One card at a time: on a phone the row snaps by a card's width; a
        // browser snaps to each card's leading edge.
        snapToInterval={Platform.OS === "web" ? undefined : stride}
        pagingEnabled={Platform.OS === "web"}
        disableIntervalMomentum
        decelerationRate="fast"
        scrollEventThrottle={16}
        onLayout={(e) => {
          setHeight(e.nativeEvent.layout.height);
          pager.current?.scrollTo({ x: shown.current * stride, animated: false });
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          if (idle.current) clearTimeout(idle.current);
          idle.current = setTimeout(() => settle(x), 180);
        }}
        style={{ flex: 1, marginTop: 12 }}
        // Room after the last card, so it too comes to rest at the left.
        contentContainerStyle={{ paddingRight: Math.max(0, width - stride) }}
      >
        {Array.from({ length: cards }, (_, i) => (
          // Each card stands in a stride of the row, a stride from the last,
          // so the row comes to rest with a card's margin at the left.
          <View key={i} style={{ width: stride, height, paddingLeft: ROW.side, paddingBottom: foot }}>
          <View
            style={{
              flex: 1,
              overflow: "hidden",
              borderRadius: ROW.corner,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
            }}
          >
            {i === cards - 1 ? (
              <CardContext.Provider value>
                <Finished hasSession onCard={(index) => setState((s) => goToCard(s, index))} />
              </CardContext.Provider>
            ) : Math.abs(i - page) <= 1 ? (
              // The card on screen and its neighbours are drawn in full, so
              // what slides in under the thumb is the real thing.
              <CardStep index={i} />
            ) : (
              <Face index={i} />
            )}
            {i !== page ? (
              // A card to the side is a way there, not a place to tap sets.
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  i === cards - 1 ? "Go to the end" : `Go to ${cardName(state, i)}`
                }
                onPress={() => setState((s) => goToCard(s, i))}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>
          </View>
        ))}
      </ScrollView>

      <Sheet visible={overview} title={currentWorkout(state).name || "Workout"} closeLabel="Close" onClose={() => setOverview(false)}>
        <Overview
          onPick={(index) => {
            setOverview(false);
            setState((s) => goToCard(s, index));
          }}
          onLeave={() => {
            setOverview(false);
            router.replace("/");
          }}
        />
      </Sheet>
    </View>
  );
}

/**
 * One card in full (see `StepBody`), given the session as it is for that
 * card: everything on it reads and writes "the exercise on screen", and here
 * that is this card, wherever the row happens to be. What it writes lands in
 * the real session; only a move along the row — a card's own Done — moves
 * the row with it.
 */
function CardStep({ index }: { index: number }) {
  const { state, setState } = useSession();
  const value = useMemo(
    () => ({
      state: atCard(state, index),
      setState: (update: SessionState | ((s: SessionState) => SessionState)) =>
        setState((real) => {
          const next = typeof update === "function" ? update(atCard(real, index)) : update;
          if (!real.active || !next.active) return next;
          const moved = next.active.cursor - index;
          const cursor = moved === 0 ? real.active.cursor : index + moved;
          return { ...next, active: { ...next.active, cursor } };
        }),
    }),
    [state, index, setState],
  );
  return (
    <SessionContext.Provider value={value}>
      <CardContext.Provider value>
        <StepBody />
      </CardContext.Provider>
    </SessionContext.Provider>
  );
}

/** A card further along the row than the next: its colour and its name, until it is near. */
function Face({ index }: { index: number }) {
  const { state } = useSession();
  const item = state.active?.items[index];
  if (!item) return null;
  const palette = fieldColors(itemFamily(item));
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: palette.bg }}>
      <Text style={{ textAlign: "center", color: palette.text, fontFamily: fonts.medium, fontSize: 30, lineHeight: 34 }}>
        {cardName(state, index)}
      </Text>
    </View>
  );
}

/**
 * How a card stands, as one small mark in its family's colour: an outline
 * while it is to do, filled when it is done as asked, half filled when it is
 * done but came up short. By fill, not by a second colour — a short set is
 * something to know, not a fault — so it reads on white and on any field.
 */
function CardDot({ mark, color, size = 14, current = false }: { mark: CardMark; color: string; size?: number; current?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          overflow: "hidden",
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: mark === "done" ? color : "transparent",
        }}
      >
        {mark === "short" ? <View style={{ width: "50%", height: "100%", backgroundColor: color }} /> : null}
      </View>
      {/* Where you are: a short line under the mark. Always laid out. */}
      <View style={{ width: size, height: 3, borderRadius: 1.5, backgroundColor: current ? colors.text : "transparent" }} />
    </View>
  );
}

const MARK_WORD: Record<CardMark, string> = { todo: "", done: "Done", short: "Done, short of the reps" };

/**
 * The row's header, on white above the cards: the workout's name, the rest
 * since your last set, and a mark for every card — the whole of it a button
 * that opens the overview.
 */
function DeckHeader({ onOpen }: { onOpen: () => void }) {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const active = state.active;
  if (!active) return null;
  const done = active.items.filter((_, i) => cardMark(state, i) !== "todo").length;

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 22 }}>
      <Column>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${currentWorkout(state).name}. ${done} of ${active.items.length} cards done. Show all cards`}
          onPress={onOpen}
          style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.6 : 1 })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 32 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>
              {currentWorkout(state).name}
              {"  "}
              <Text style={{ fontFamily: fonts.italic }}>
                {done} of {active.items.length} done
              </Text>
            </Text>
            <RestTimer startedAt={active.lastSetAt} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            {active.items.map((it, i) => (
              <CardDot
                key={i}
                mark={cardMark(state, i)}
                color={FAMILY[itemFamily(it)].mark}
                current={i === active.cursor}
              />
            ))}
          </View>
        </Pressable>
      </Column>
    </View>
  );
}

/** Every card of the row at once: its mark, its name, how it stands. Tap one to go there. */
function Overview({ onPick, onLeave }: { onPick: (index: number) => void; onLeave: () => void }) {
  const { state } = useSession();
  const active = state.active;
  if (!active) return null;
  return (
    <View style={{ gap: 4 }}>
      {active.items.map((it, i) => {
        const mark = cardMark(state, i);
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`${cardName(state, i)}. ${MARK_WORD[mark] || "Not done"}`}
            onPress={() => onPick(i)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              minHeight: 52,
              paddingHorizontal: 14,
              borderRadius: radii.button,
              backgroundColor: i === active.cursor ? colors.surface : "transparent",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <CardDot mark={mark} color={FAMILY[itemFamily(it)].mark} size={18} />
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 19 }}>
              {cardName(state, i)}
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.italic, fontSize: 17 }}>{MARK_WORD[mark]}</Text>
          </Pressable>
        );
      })}
      <View style={{ marginTop: 12 }}>
        <BigButton label="Leave for now" onPress={onLeave} />
      </View>
      <Text style={{ marginTop: 6, textAlign: "center", color: colors.muted, fontFamily: fonts.regular, fontSize: 17, lineHeight: 22 }}>
        Your workout is kept. Today offers to carry on with it, or end it.
      </Text>
    </View>
  );
}

/**
 * One card of the row, in full: the lift, the machine or the routine that is
 * "on screen" in the session it is given (see `Step`), with everything it
 * needs to be done there. Which card that is, and moving between them, is
 * the row's business — see `Deck`.
 */
function StepBody() {
  const { state, setState } = useSession();
  const barSpace = useBarSpace();
  const [picking, setPicking] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [guiding, setGuiding] = useState(false);
  // The ⋯ menu, open under the button it came from.
  const [menu, setMenu] = useState<Anchor | null>(null);
  const root = useRef<View>(null);
  // The weight, while it is being changed, closes on a tap anywhere else.
  const tapAway = useRef<TapAway>({ close: null, inside: false });
  // The exercise whose note is open — this lift's, or its superset partner's.
  const [noting, setNoting] = useState<string | null>(null);
  // What sits under the name — a word in italics, your note — measured, so
  // the gap above the weight gives way to it rather than the circles moving.
  const [underName, setUnderName] = useState<number | null>(null);

  const active = state.active;
  const done = !active || isComplete(state);

  // A lift done well gets its moment — see `useCheer` — and a send-off on
  // Next. Reduce Motion keeps the buzzes and drops the movement.
  const { cheer, well } = useCheer(state);
  const still = useReduceMotion();
  // Leaving a lift done well: a light passes over the button that comes up
  // under your thumb — see `SendOff`. It stands for a second, then is spent.
  const [glint, setGlint] = useState(0);
  useEffect(() => {
    if (!glint) return;
    const spent = setTimeout(() => setGlint(0), 1000);
    return () => clearTimeout(spent);
  }, [glint]);
  const sendOff = still ? 0 : glint;

  // Past the last card there is nothing to draw here: the row's end card is its own.
  if (done) return null;


  const item = active.items[active.cursor];
  const motion = cheer && !still ? cheer : null;

  // A goal's step is its own screen too: circles like a lift's, but the
  // step you are on where the weight would be. See `GoalBlock`.
  if (isGoal(item)) {
    return (
      <OnField family="goal" sendOff={sendOff}>
        <GoalBlock
          key={item.slot}
          item={item}
          motion={motion}
          onNext={(practised) => {
            if (well) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGlint((g) => g + 1);
            }
            setState((s) => completeGoal(s, practised));
          }}
        />
      </OnField>
    );
  }

  // Cardio and mobility are their own screens: no weight, no rep circles and
  // no rep ladder. They still sit inside the same session, so the bar's Back,
  // Leave and Skip work on them exactly as on a lift. Each is drawn on its
  // family's colour, like a lift.
  if (isMobility(item)) {
    return (
      <OnField family="mobility" sendOff={sendOff}>
        <Mobility key={item.slot} item={item} />
      </OnField>
    );
  }
  if (isConditioning(item)) {
    return (
      <OnField family="cardio" sendOff={sendOff}>
        <Conditioning key={item.slot} item={item} />
      </OnField>
    );
  }

  const family = itemFamily(item);
  // This screen sits on the family's colour: see `fieldColors`.
  const colors = fieldColors(family);

  const p = currentPrescription(state)!;
  const partner = item.supersetWith ? byId(item.supersetWith) : undefined;
  // The partner keeps its own scheme, set count and set log when folded in.
  const partnerP = partnerPrescription(state);
  const options = supersetOptions(state);
  const L = partner ? LAYOUT.paired : LAYOUT.solo;

  const warmup = currentWarmup(state);
  // Swapping after the first set is logged would throw that work away.
  const pool = currentPool(state);
  const canSwap = pool.length > 1 && !item.logged.some((r) => r !== null);

  // Your note on this lift: shown under the name until you change it.
  const myNote = noteFor(state, p.exercise.id);
  const noteSheet = (
    <NoteSheet
      visible={noting !== null}
      id={noting ?? p.exercise.id}
      name={byId(noting ?? p.exercise.id)?.name ?? ""}
      onClose={() => setNoting(null)}
    />
  );

  // The ramp up to the working weight: said on the card, under the name,
  // rather than standing in front of the lift as a screen of its own.
  const ramp =
    warmup.length > 0
      ? // "7.5 kg × 10, 12.5 × 6": the unit said once, each dumbbell's own weight.
        `Warm up first: ${warmup.map((w, i) => `${w.weight}${i === 0 ? " kg" : ""} × ${w.reps}`).join(", ")}`
      : "";
  // Gone once the first working set is in: it has done its job.
  const rampLine = item.logged.some((r) => r !== null) ? "" : ramp;

  // Moving on is always your call — a swipe — so filling the last circle
  // changes nothing but the line at the foot of the card, and a rep or a
  // weight can still be fixed before you go.
  const logged = allSetsLogged(state);
  const after = nextItemName(state);
  // Said before you move on, so what happens next time is never a surprise:
  // a line with some attitude, and the plain fact under it. It updates as
  // you correct a circle.
  const verdict = nextTime(state);
  const result = verdict
    ? {
        ...verdict,
        quip: pickLine(OUTCOME_LINES[verdict.say], `${active.startedAt}:${active.cursor}`),
      }
    : null;

  // Said in italics under the name, where it applies.
  const note = [
    p.reload ? "reload" : null,
    p.exercise.timed ? "seconds, not reps" : null,
    item.derive
      ? `${Math.round(item.derive.fraction * 100)}% of ${inSentence(byId(item.derive.from)!.name)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Opens the ⋯ menu under its button, in this screen's coordinates.
  const openMenu = (button: View) =>
    button.measureInWindow((x, y, width, height) =>
      root.current?.measureInWindow((rx, ry) => setMenu({ x: x - rx, y: y - ry, width, height })),
    );
  const tools: Tool[] = [
    { icon: "info", label: "How to do it", onPress: () => setGuiding(true) },
    canSwap ? { icon: "swap", label: "Swap for today", onPress: () => setSwapping(true) } : null,
    {
      icon: "note",
      label: myNote ? "Change your note" : "Add a note",
      onPress: () => setNoting(p.exercise.id),
    },
    !partner && options.length > 0
      ? { icon: "plus", label: "Add superset", onPress: () => setPicking(true) }
      : null,
  ].filter((t): t is Tool => t !== null);

  // Before it is measured, a fair guess at what sits under the name.
  const under = underName ?? (note ? 28 : 0) + (myNote ? 39 : 0) + (rampLine ? 48 : 0);

  return (
    <OnField family={family} sendOff={sendOff}>
    <View
      ref={root}
      onStartShouldSetResponderCapture={() => {
        const away = tapAway.current;
        if (away.close) {
          away.inside = false;
          // Once the touch has reached whatever it landed on, which marks it
          // if it landed on the weight.
          Promise.resolve().then(() => {
            if (!away.inside) away.close?.();
          });
        }
        return false;
      }}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <Header showRest />

      <ScrollView
        // With the number pad up, a tap on a circle or − and + still counts.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 22,
          paddingBottom: 8,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
        }}
      >
        <LiftTitle
          family={family}
          name={p.exercise.name}
          onMore={openMenu}
          style={{ marginTop: L.name }}
        >
          {note || myNote || rampLine ? (
            <View onLayout={(e) => setUnderName(e.nativeEvent.layout.height)}>
              {rampLine ? (
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: 4,
                    textAlign: "center",
                    color: colors.text,
                    fontFamily: fonts.regular,
                    fontSize: 17,
                    lineHeight: 22,
                  }}
                >
                  {rampLine}
                </Text>
              ) : null}
              {note ? (
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 4,
                    textAlign: "center",
                    color: colors.text,
                    fontFamily: fonts.italic,
                    fontSize: 19,
                  }}
                >
                  {note}
                </Text>
              ) : null}
              {myNote ? (
                <View style={{ paddingTop: 8 }}>
                  <NoteLine
                    text={myNote}
                    lines={partner ? 1 : 2}
                    center
                    onPress={() => setNoting(p.exercise.id)}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </LiftTitle>

        <View
          style={{
            height: L.number,
            marginTop: note || myNote || rampLine ? Math.max(10, L.weight - under) : L.weight,
            justifyContent: "center",
          }}
        >
          {p.exercise.unloaded ? (
            <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 24 }}>
              No weight — just the reps
            </Text>
          ) : item.derive ? (
            // Taken from the heavy day's weight, so there is nothing to edit.
            <View style={{ alignItems: "center" }}>
              <Weight weight={p.weight} unit={unitFor(p.exercise, p.weight)} size={L.number} />
            </View>
          ) : (
            <WeightControl
              key={item.slot}
              weight={p.weight}
              bodyweight={p.exercise.bodyweight}
              holds={p.exercise.holds}
              perHand={p.exercise.perHand}
              size={L.number}
              tapAway={tapAway}
              onNudge={(d) => setState((s) => nudgeWeight(s, d))}
              onSet={(w) => setState((s) => editWeight(s, w))}
            />
          )}
        </View>

        <View style={{ marginTop: L.sets }}>
          <Sets
            logged={item.logged}
            target={p.reps}
            role={partner ? "main" : "solo"}
            cheer={motion?.id ?? null}
            burst={motion?.big ? family : null}
            onTap={(i) => setState((s) => tapSet(s, i))}
            onReset={(i) => setState((s) => resetSet(s, i))}
          />
        </View>

        <View style={{ height: L.under, marginTop: L.underGap }}>
          <Why
            prescription={p}
            result={logged ? result : null}
            started={item.logged.some((r) => r !== null)}
            compact={!!partner}
            glow={motion?.big ? motion.id : null}
          />
        </View>

        {partner && partnerP && item.supersetLogged ? (
          <Partner
            id={partner.id}
            name={partner.name}
            cue={partner.cue}
            weight={partner.unloaded ? "No weight" : weightLabel(partner, partnerP.weight)}
            sets={partnerP.sets}
            target={partnerP.reps}
            timed={partner.timed}
            note={noteFor(state, partner.id)}
            onNote={() => setNoting(partner.id)}
            logged={item.supersetLogged}
            onTap={(i) => setState((s) => tapSet(s, i, "partner"))}
            onReset={(i) => setState((s) => resetSet(s, i, "partner"))}
            onRemove={() => setState((s) => removeSuperset(s))}
          />
        ) : null}
      </ScrollView>

      {/* The way on is a swipe — the next card's edge shows at the right —
          and once every circle is filled the card says so. Always laid out,
          so the line appearing moves nothing. */}
      <View style={{ height: 52, paddingHorizontal: 22, justifyContent: "center", marginBottom: barSpace + 6 }}>
        <Text
          numberOfLines={1}
          style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}
        >
          {logged ? (after ? `Done. Swipe on to ${inSentence(after)}.` : "Done. Swipe on to finish.") : ""}
        </Text>
      </View>

      {menu ? <ToolsMenu anchor={menu} tools={tools} onClose={() => setMenu(null)} /> : null}

      <GuideSheet
        visible={guiding}
        id={p.exercise.id}
        name={p.exercise.name}
        cue={p.exercise.cue}
        onClose={() => setGuiding(false)}
      />
      <Sheet visible={swapping} title="Swap for today" onClose={() => setSwapping(false)}>
        <SwapList
          options={pool}
          taken={currentTaken(state)}
          current={item.exerciseId}
          onPick={(id) => {
            setSwapping(false);
            setState((s) => swapForSession(s, id));
          }}
        />
      </Sheet>
      <Sheet visible={picking} title="Superset with" onClose={() => setPicking(false)}>
        <SupersetPicker
          options={options}
          onPick={(id) => {
            setPicking(false);
            setState((s) => addSuperset(s, id));
          }}
        />
      </Sheet>
      {noteSheet}
    </View>
    </OnField>
  );
}

/**
 * The send-off for a lift done well, while it stands: whichever button comes
 * up under your thumb after Next — the next lift's, its warm-up's Ready,
 * cardio's Done, the stretches' — has a light pass over it. See `Glint`.
 */
const SendOff = createContext(0);

/**
 * Draws everything inside on the family's colour, with the status bar to
 * match: light over the dark fields, dark over the light ones.
 */
function OnField({
  family,
  sendOff = 0,
  children,
}: PropsWithChildren<{ family: Family; sendOff?: number }>) {
  // A card sits under the row's white header, so the status bar stays dark.
  const onCard = useOnCard();
  return (
    <Field family={family}>
      {onCard ? null : <StatusBar style={FAMILY[family].dark ? "light" : "dark"} />}
      <SendOff.Provider value={sendOff}>{children}</SendOff.Provider>
    </Field>
  );
}

/**
 * Where you are in the session: the workout's name and how far in, the rest
 * since your last set, and one segment per block — the current one at full
 * strength, the ones behind you a step down.
 *
 * Shared by the lifting screen and the conditioning ones so the bar of
 * progress does not jump or reset when the session moves between them.
 */
function Header({ showRest = false }: { showRest?: boolean }) {
  const colors = useColors();
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const onCard = useOnCard();
  const active = state.active;
  // On a card of the row the session's header is the row's own: `DeckHeader`.
  if (!active || onCard) return null;

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 22 }}>
      <Column>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 32 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>
            {currentWorkout(state).name}
            {"  "}
            <Text style={{ fontFamily: fonts.italic }}>
              {exerciseCount(state, "done") + 1}/{exerciseCount(state, "total")}
            </Text>
          </Text>
          {showRest ? <RestTimer startedAt={active.lastSetAt} /> : null}
        </View>

        {/* The day's shape: one segment per exercise in its family's colour,
            filling in as you go and pale until you get there. Weighted — a
            paired screen holds two exercises, so it is twice as wide and the
            total never changes when you superset. On a white track, since
            the family colours sit too close to each other to read on a
            field; on white each one keeps its hue and 3:1. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: 2, marginTop: 10, padding: 2, borderRadius: 4, backgroundColor: colors.white }}
        >
          {active.items.map((it, i) => (
            <View
              key={i}
              style={{
                flex: it.supersetWith ? 2 : 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: FAMILY[itemFamily(it)].mark,
                opacity: i <= active.cursor ? 1 : 0.28,
              }}
            />
          ))}
        </View>
      </Column>
    </View>
  );
}

/**
 * What you are doing: the family's shape and the name on one line at full
 * width — a long name ends in an ellipsis rather than wrapping — with its
 * small round buttons (how-to, swap) right under it, and a word in italics
 * beside them where one applies.
 */
function Title({
  family,
  name,
  note,
  onNote,
  noteLabel,
  style,
  children,
}: PropsWithChildren<{
  family: Family;
  name: string;
  note?: string;
  /** Makes the note a button that opens what it says: "1 km ⌄". */
  onNote?: () => void;
  noteLabel?: string;
  style?: ViewStyle;
}>) {
  const colors = useColors();
  const tools = Children.toArray(children).length > 0 || !!note;
  return (
    <View style={style}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 34 }}>
        <Mark family={family} size={24} color={colors.text} />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 27, lineHeight: 33 }}
        >
          {name}
        </Text>
      </View>
      {tools ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 40, marginTop: 10, marginLeft: 36 }}>
          {children}
          {note && onNote ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={noteLabel ?? note}
              onPress={onNote}
              hitSlop={4}
              style={({ pressed }) => ({
                height: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingLeft: 16,
                paddingRight: 12,
                borderRadius: 999,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text numberOfLines={1} style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>
                {note}
              </Text>
              <Icon name="expand" size={16} color={colors.text} />
            </Pressable>
          ) : note ? (
            <Text
              numberOfLines={1}
              style={{ flex: 1, marginLeft: 4, color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}
            >
              {note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The lift's name, centred over the number and circles below it: the
 * family's shape, the name — a long one ends in an ellipsis rather than
 * wrapping — and ⋯ for everything else about the lift. Under it, whatever
 * applies (a word in italics, your note).
 */
function LiftTitle({
  family,
  name,
  onMore,
  style,
  children,
}: PropsWithChildren<{
  family: Family;
  name: string;
  /** Opens the menu under the ⋯, which is handed over to anchor it. */
  onMore: (button: View) => void;
  style?: ViewStyle;
}>) {
  const colors = useColors();
  const more = useRef<View>(null);
  return (
    <View style={style}>
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 40 }}
      >
        <Mark family={family} size={24} color={colors.text} />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: colors.text,
            fontFamily: fonts.medium,
            fontSize: 27,
            lineHeight: 33,
          }}
        >
          {name}
        </Text>
        <Pressable
          ref={more}
          accessibilityRole="button"
          accessibilityLabel="More for this exercise"
          onPress={() => more.current && onMore(more.current)}
          hitSlop={4}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            marginLeft: 2,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="more" size={20} color={colors.text} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

/** Where the ⋯ is on screen, so its menu opens under it. */
type Anchor = { x: number; y: number; width: number; height: number };
type Tool = { icon: IconName; label: string; onPress: () => void };

/**
 * What used to sit in round buttons around the lift — how-to, swap, a note,
 * a superset — in one small card off the ⋯. Each is wanted once a session at
 * most, so they wait a tap away rather than crowd the weight and circles.
 * White whatever the field, like the sheets they open; a tap anywhere else
 * closes it.
 */
function ToolsMenu({
  anchor,
  tools,
  onClose,
}: {
  anchor: Anchor;
  tools: Tool[];
  onClose: () => void;
}) {
  const { width: screen } = useWindowDimensions();
  const shown = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(shown, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shown]);

  const width = 250;
  // Its right edge on the button's, kept inside the screen's margins.
  const left = Math.max(22, Math.min(screen - 22 - width, anchor.x + anchor.width - width));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Close menu"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        accessibilityViewIsModal
        style={{
          position: "absolute",
          top: anchor.y + anchor.height + 8,
          left,
          width,
          paddingVertical: 6,
          borderRadius: 22,
          borderCurve: "continuous",
          backgroundColor: colors.bg,
          boxShadow: "0 10px 30px rgba(8, 28, 60, 0.28)",
          opacity: shown,
          transformOrigin: "top right",
          transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        {tools.map((tool, i) => (
          <View key={tool.label}>
            {i > 0 ? (
              <View
                style={{ height: StyleSheet.hairlineWidth, marginLeft: 52, backgroundColor: colors.line }}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                tool.onPress();
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                minHeight: 52,
                paddingHorizontal: 18,
                backgroundColor: pressed ? colors.surface : "transparent",
              })}
            >
              <Icon name={tool.icon} size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19 }}>
                {tool.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** A small round button under the name, in a tint of the field. */
function ToolButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

/**
 * What the number is in: "kg"; "kg ×2" for a dumbbell in each hand; "kg
 * added" on a bodyweight lift with a belt or a dumbbell; "kg assist" where a
 * negative number is the machine's help, so it never reads as an error; and
 * "s hold" on a lift that progresses by holding, where it is seconds.
 */
function unitFor(
  { perHand, bodyweight, holds }: { perHand?: boolean; bodyweight?: boolean; holds?: boolean },
  weight: number,
) {
  if (holds) return "s hold";
  return [
    "kg",
    perHand ? "×2" : null,
    weight < 0 ? "assist" : bodyweight && weight > 0 ? "added" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The weight and its unit, on one baseline. */
function Weight({
  weight,
  unit,
  size,
  line,
  faint,
  caret,
}: {
  /** A number, or what is being typed in its place. */
  weight: number | string;
  unit: string;
  size: number;
  /** Can be changed: dashes under the figures, a solid line while it is being changed. */
  line?: "dashed" | "solid";
  /** Held back like a placeholder: the weight before you type a new one. */
  faint?: boolean;
  /** Being typed: where the caret blinks. */
  caret?: "start" | "end";
}) {
  const colors = useColors();
  const text = String(weight);
  // A five-character weight (102.5) is set a size down, so it and its unit
  // still fit between the steppers.
  const fit = text.length > 4 ? Math.round(size * 0.84) : size;
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
      <Underline size={fit} line={line} caret={caret}>
        <Text
          style={{
            color: colors.text,
            opacity: faint ? 0.4 : 1,
            fontFamily: fonts.semibold,
            fontSize: fit,
            letterSpacing: -fit * 0.02,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {text}
        </Text>
      </Underline>
      <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>{unit}</Text>
    </View>
  );
}

/**
 * Under whatever it wraps, as wide as it is and just below the baseline: a
 * row of short dashes, which says a number can be changed without drawing a
 * box round it, or a solid line while it is being changed. With a caret, the
 * text is being typed.
 */
function Underline({
  size,
  line,
  caret,
  children,
}: PropsWithChildren<{ size: number; line?: "dashed" | "solid"; caret?: "start" | "end" }>) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const dash = 9;
  const gap = 5;
  const count = Math.max(1, Math.floor((width + gap) / (dash + gap)));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {children}
      {line && width > 0 ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Garamond's figures stand almost on the bottom of the line:
            // this puts the line a small gap under them.
            bottom: -Math.round(size * 0.07),
            flexDirection: "row",
            justifyContent: "space-between",
            opacity: line === "solid" ? 1 : 0.55,
          }}
        >
          {line === "solid" ? (
            <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.text }} />
          ) : (
            Array.from({ length: count }, (_, i) => (
              <View
                key={i}
                style={{ width: dash, height: 2, borderRadius: 1, backgroundColor: colors.text }}
              />
            ))
          )}
        </View>
      ) : null}
      {caret ? <Caret size={size} at={caret} /> : null}
    </View>
  );
}

/** The text cursor, blinking the way iOS's does: before a placeholder, after typing. */
function Caret({ size, at }: { size: number; at: "start" | "end" }) {
  const colors = useColors();
  const on = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const step = (toValue: number) =>
      Animated.timing(on, { toValue, duration: 0, useNativeDriver: true });
    const blink = Animated.loop(
      Animated.sequence([Animated.delay(530), step(0), Animated.delay(530), step(1)]),
    );
    blink.start();
    return () => blink.stop();
  }, [on]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        [at === "start" ? "left" : "right"]: -Math.max(5, Math.round(size * 0.06)),
        bottom: Math.round(size * 0.02),
        width: Math.max(2, Math.round(size * 0.03)),
        height: Math.round(size * 0.7),
        borderRadius: 2,
        backgroundColor: colors.text,
        opacity: on,
      }}
    />
  );
}

/** A cardio block: the machine, how long, the score, one action. */
function Conditioning({ item }: { item: Item }) {
  const colors = useColors();
  const barSpace = useBarSpace();
  const { state, setState } = useSession();
  const [swapping, setSwapping] = useState(false);
  const [noting, setNoting] = useState(false);
  const [lengthening, setLengthening] = useState(false);
  // One line of note until it is measured, so the weight does not jump.
  const [noteHeight, setNoteHeight] = useState(31);

  const cardio = currentCardio(state);
  const pool = conditioningPool(state, item);
  // "Speed 10.5, incline 1": kept per machine, whatever the distance.
  const note = cardio ? noteFor(state, cardio.id, "cardio") : "";

  const advance = () => {
    setSwapping(false);
    setState((s) => completeCardio(s));
  };
  // With a record to go on, an untouched box means "same as last time".
  const last = lastScore(state, item);
  const needsScore = isCardio(item) && scoreOf(item) === null && last === null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 20,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
        }}
      >
        <Title
          style={{ marginTop: LAYOUT.solo.name }}
          family="cardio"
          name={cardio?.name ?? ""}
          note={isTimed(item) && cardio ? courseLabel(cardio, item.course!) : `${item.minutes} minutes`}
          onNote={cardio ? () => setLengthening(true) : undefined}
          noteLabel={isTimed(item) ? "Change how far, today or for good" : "Change how long, today or for good"}
        >
          {cardio ? <GuideButton id={cardio.id} name={cardio.name} cue={cardio.cue} size={40} /> : null}
          {pool.length > 1 ? (
            <ToolButton icon="swap" label="Choose a different machine" onPress={() => setSwapping(true)} />
          ) : null}
          {cardio && !note ? (
            <ToolButton icon="note" label="Add a note" onPress={() => setNoting(true)} />
          ) : null}
        </Title>

        {note ? (
          <View
            style={{ marginLeft: 36, paddingTop: 8 }}
            onLayout={(e) => setNoteHeight(e.nativeEvent.layout.height)}
          >
            <NoteLine text={note} onPress={() => setNoting(true)} />
          </View>
        ) : null}
        {cardio ? (
          <NoteSheet
            visible={noting}
            id={cardio.id}
            kind="cardio"
            name={cardio.name}
            onClose={() => setNoting(false)}
          />
        ) : null}

        <Sheet
          visible={swapping}
          title="Swap for today"
          onClose={() => setSwapping(false)}
        >
          <ConditioningSwap
            options={pool}
            current={item.exerciseId}
            onPick={(id) => {
              setSwapping(false);
              setState((s) => swapConditioning(s, id));
            }}
          />
        </Sheet>

        {cardio ? (
          <LengthSheet
            visible={lengthening}
            cardio={cardio}
            item={item}
            onClose={() => setLengthening(false)}
          />
        ) : null}

        {cardio ? (
          <View
            style={{
              marginTop: note ? Math.max(10, CARDIO_WEIGHT - noteHeight) : CARDIO_WEIGHT,
            }}
          >
          <CardioBody
            cardio={cardio}
            item={item}
            end={cardioEnd(item)}
            last={last}
            record={cardioRecord(state, item)}
            onNudge={(d) => setState((s) => nudgeScore(s, d))}
            onSet={(v) => setState((s) => setScore(s, v))}
          />
          </View>
        ) : null}

      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        {/* Waits for a first score; the line under the number says so. */}
        <Column>
          <Action
            label="Done"
            fill
            disabled={needsScore}
            onPress={advance}
          />
        </Column>
      </View>
    </View>
  );
}

/**
 * How far or how long, changed in the middle of the session: you feel like
 * 2 km today, not 1. − and + change today's block as you press; then Just
 * today leaves the workout as it was, and Every time keeps it there too.
 */
function LengthSheet({
  visible,
  cardio,
  item,
  onClose,
}: {
  visible: boolean;
  cardio: CardioExercise;
  item: Item;
  onClose: () => void;
}) {
  const colors = useColors();
  const { state, setState } = useSession();
  const today = itemLength(item);
  const planned = plannedLength(state, item);
  const workout = state.active ? workoutById(state, state.active.workoutId) : undefined;
  const say = (l: CardioLength) =>
    l.course !== undefined ? courseLabel(cardio, l.course) : `${l.minutes} minutes`;
  const changed = !!planned && say(planned) !== say(today);
  const timed = today.course !== undefined;

  return (
    <Sheet visible={visible} title={timed ? "How far" : "How long"} closeLabel="Done" onClose={onClose}>
      <View style={{ gap: 28, paddingTop: 12 }}>
        <View style={{ height: 84, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Step label="−" onPress={() => setState((s) => nudgeTodayLength(s, -1))} />
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: colors.text,
              fontFamily: fonts.semibold,
              fontSize: 48,
              fontVariant: ["lining-nums", "tabular-nums"],
            }}
          >
            {say(today)}
          </Text>
          <Step label="+" onPress={() => setState((s) => nudgeTodayLength(s, 1))} />
        </View>

        <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 }}>
          {changed && planned
            ? `${workout?.name ?? "This workout"} usually has ${say(planned)}. Your ${
                timed ? "times" : "distances"
              } for ${say(today)} are kept apart from ${say(planned)}, so you only ever compare like with like.`
            : `${timed ? "Further or shorter" : "Longer or shorter"} than usual — for today, or for every time.`}
        </Text>

        {/* Only once it differs from the workout: then it is a choice. */}
        {changed && workout ? (
          <View style={{ gap: 12 }}>
            <BigButton label="Just today" onPress={onClose} />
            <BigButton
              label={`Every time in ${workout.name}`}
              quiet
              onPress={() => {
                setState((s) => keepTodayLength(s));
                onClose();
              }}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

/**
 * Your score, and the mark to beat — laid out like a lift: the number between
 * − and +, a line on last time under it, and the machine's cue.
 *
 * One side of the block is fixed — the minutes, or the distance — so the only
 * number that moves is the other: how far you got, or how long it took. That
 * makes the comparison with last time honest without anything else to track.
 */
function CardioBody({
  cardio,
  item,
  end,
  last,
  record,
  onNudge,
  onSet,
}: {
  cardio: CardioExercise;
  item: Item;
  /** A warm-up is never a race: no cheer for going faster, and an easy pace. */
  end: CardioEnd;
  /** Last session's score: what the box shows until you change it. */
  last: number | null;
  record: ReturnType<typeof cardioRecord>;
  onNudge: (direction: 1 | -1) => void;
  onSet: (score: number | null) => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<string | null>(null);
  const timed = isTimed(item);
  const score = scoreOf(item);
  const { decimals, unit } = cardio.metric;
  // Skipping is counted, not measured; anything away from the gym is
  // no machine, and its number is optional.
  const counted = unit === "skips";
  const away = AWAY_CARDIO.some((c) => c.id === cardio.id);
  // Untouched, the box holds last time's score: that is what Done records.
  const shown = score ?? last;

  // The box shows a bare number; the line under it says what it means.
  const show = (v: number) => (timed ? timeLabel(v) : v.toFixed(decimals));
  const label = (v: number) => (timed ? timeLabel(v) : distanceLabel(cardio, v));

  const commit = () => {
    if (draft !== null) {
      const parsed = timed ? parseTime(draft) : parseFloat(draft.replace(",", "."));
      onSet(parsed === null || Number.isNaN(parsed) ? null : parsed);
    }
    setDraft(null);
  };

  // Only the finish cheers a faster time; in the warm-up it would read as a dare.
  const cheers = end === "close" && record && score !== null;
  const beat = cheers && isBetter(item, score, record.last);
  const isBest = cheers && isBetter(item, score, record.best);
  const line = { textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 24 } as const;
  const number: TextStyle = {
    fontFamily: fonts.semibold,
    fontSize: 76,
    letterSpacing: -1.5,
    fontVariant: ["lining-nums", "tabular-nums"],
  };

  return (
    <View>
      {/* The score, entered the way a weight is: step it, or tap to type. */}
      <View style={{ height: 84, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Step label="−" onPress={() => onNudge(-1)} />

        {draft !== null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              autoFocus
              value={draft}
              onChangeText={setDraft}
              onBlur={commit}
              onSubmitEditing={commit}
              // A number pad on both: a time types as 4.52 or 452 and reads back as 4:52.
              keyboardType="decimal-pad"
              selectTextOnFocus
              accessibilityLabel={timed ? "Your time" : counted ? "Skips" : `Distance in ${unit}`}
              style={[number, { width: timed ? 190 : 150, padding: 0, color: colors.text, textAlign: timed ? "center" : "right" }]}
            />
            {timed ? null : <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>{unit}</Text>}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${shown === null ? "Nothing entered" : label(shown)}. Tap to type ${timed ? "your time" : "the distance"}`}
            onPress={() => setDraft(shown === null ? "" : show(shown))}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              {/* Last time's score until you change it, a shade back so it
                  reads as a starting point rather than something entered.
                  With nothing to start from, a dash: a 0 would read as a
                  score of nothing. */}
              <Text style={[number, { color: score === null ? colors.dim : colors.text }]}>
                {shown === null ? "—" : show(shown)}
              </Text>
              {timed ? null : <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>{unit}</Text>}
            </View>
          </Pressable>
        )}

        <Step label="+" onPress={() => onNudge(1)} />
      </View>

      {/* What to beat, or what this first go is for. Fixed height, so the
          "yet" line arriving moves nothing. */}
      <View style={{ height: 96, marginTop: 40, alignItems: "center", gap: 4 }}>
        {record ? (
          <>
            <View
              accessible
              accessibilityLabel={`To beat: ${label(record.last)}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 30 }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>To beat</Text>
              <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>{label(record.last)}</Text>
            </View>
            <Text numberOfLines={1} style={line}>
              {timed ? "Fastest" : counted ? "Most" : "Furthest"} {label(record.best)} · {record.sessions}{" "}
              {record.sessions === 1 ? "time" : "times"}
            </Text>
          </>
        ) : (
          <Text numberOfLines={3} style={line}>
            {timed
              ? `First ${courseLabel(cardio, item.course!)} on the ${cardio.name.toLowerCase()}. Enter your time when you finish — it becomes the mark to beat.`
              : away
                ? `${item.minutes} minutes. ${counted ? "Count the skips" : "Enter the distance"} if you like — it becomes the mark to beat.`
                : `First ${item.minutes} minutes on the ${cardio.name.toLowerCase()}. Enter the distance when the clock runs out — it becomes the mark to beat.`}
          </Text>
        )}
        {/* Said only when it is true — a line that always shows says nothing. */}
        {isBest || beat ? (
          <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 22 }}>
            {isBest
              ? timed ? "Fastest yet." : counted ? "Most yet." : "Furthest yet."
              : timed ? "Faster than last time." : counted ? "More than last time." : "Past last time."}
          </Text>
        ) : null}
      </View>

      {/* How hard, by where the block sits; then how, if the machine says. */}
      <Text style={[line, { marginTop: 12, fontSize: 17, lineHeight: 23 }]}>
        {EFFORT[end]}
        {cardio.cue ? `\n${cardio.cue}` : ""}
      </Text>
    </View>
  );
}

/**
 * The mobility routine as a deck of cards: one per stretch, one per side where
 * a stretch has two. Each card is the picture, the name, a line on how, and a
 * countdown. Start it once and it runs itself: when a hold runs out the phone
 * buzzes, the next card comes up, and after a moment to change position its
 * clock starts — so the phone can lie on the floor from the first stretch to
 * the last, and the screen stays on while it runs. The button is the whole
 * control, so it never moves: Start, Pause, Resume, Done for a stretch done
 * for reps, and Finish on the last card.
 *
 * Nothing here is recorded: a pose is marked done once its timer has run out
 * on every side, only so the session knows the block was worked through.
 */
function Mobility({ item }: { item: Item }) {
  const barSpace = useBarSpace();
  const { state, setState } = useSession();
  const [swapping, setSwapping] = useState(false);
  const colors = useColors();
  const routine = currentRoutine(state);
  const pool = conditioningPool(state, item);
  if (!routine) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header />

      <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
        <Column>
          <Title family="mobility" name={routine.name}>
            {pool.length > 1 ? (
              <ToolButton icon="swap" label="Choose a different routine" onPress={() => setSwapping(true)} />
            ) : null}
          </Title>
        </Column>
      </View>

      <Sheet visible={swapping} title="Swap for today" onClose={() => setSwapping(false)}>
        <ConditioningSwap
          options={pool}
          current={item.exerciseId}
          onPick={(id) => {
            setSwapping(false);
            setState((s) => swapConditioning(s, id));
          }}
        />
      </Sheet>

      {/* Keyed by routine and its holds: a swap, or an edit in Plan, deals a
          fresh deck with fresh timers. */}
      <MobilityDeck
        key={`${routine.id}:${routine.moves.map((m) => `${m.id}/${m.seconds}/${m.perSide ? 2 : 1}`).join(",")}`}
        routine={routine}
        barSpace={barSpace}
        onMoveDone={(i) => setState((s) => completeMove(s, i))}
        onFinish={() => setState((s) => completeExercise(s))}
      />
    </View>
  );
}

/**
 * A goal's step, on the goal's violet. Laid out like a lift so it reads at a
 * glance the same way: the drill's name with ⋯ beside it, the goal it is for
 * in italics, then — where a lift has its weight — the step you are on, with
 * the whole ladder in small under it. Then the work, and what it means:
 *
 * - reps are circles exactly like a lift's;
 * - holds are circles too, each its own clock — tap to start, it buzzes at
 *   the target, tap to stop early and log what you held;
 * - practice is one clock, and a button for when you've got it.
 *
 * Owning a step gets the lift's cheer with the goal's stars, and the line
 * under it says what comes next.
 */
function GoalBlock({
  item,
  motion,
  onNext,
}: {
  item: Item;
  /** A step done well, just now — see `useCheer`. */
  motion: Cheer | null;
  /** Next, with the seconds practised where practice was timed. */
  onNext: (practised?: number) => void;
}) {
  const { state, setState } = useSession();
  const colors = useColors();
  const barSpace = useBarSpace();
  const root = useRef<View>(null);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const [editing, setEditing] = useState(false);
  // Practice's clock, here so Next knows how long it ran: what is left, and
  // when it runs out while it runs. Null until it is started.
  const [practice, setPractice] = useState<{ left: number; endAt: number | null } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!practice?.endAt) return;
    const endAt = practice.endAt;
    const timer = setInterval(() => {
      if (endAt - Date.now() > 0) return tick((t) => t + 1);
      clearInterval(timer);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPractice({ left: 0, endAt: null });
    }, 200);
    return () => clearInterval(timer);
  }, [practice?.endAt]);

  const found = goalStepOf(state, item);
  const after = nextItemName(state);
  const next = after ? `Next: ${after}` : "Finish workout";

  if (!found) {
    // Deleted in Plan while the session ran: nothing left to do here.
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 22 }}>
          <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 22 }}>
            This goal has been deleted.
          </Text>
        </View>
        <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
          <Column>
            <Action label={next} arrow fill onPress={() => setState((s) => completeExercise(s))} />
          </Column>
        </View>
      </View>
    );
  }

  const { goal, step, index } = found;
  const timed = step.measure === "practice";
  const total = step.target * 60;
  const left = practice
    ? practice.endAt
      ? Math.max(0, (practice.endAt - Date.now()) / 1000)
      : practice.left
    : total;
  const ready = timed || item.logged.every((r) => r !== null);

  const openMenu = (button: View) =>
    button.measureInWindow((x, y, width, height) =>
      root.current?.measureInWindow((rx, ry) => setMenu({ x: x - rx, y: y - ry, width, height })),
    );
  const tools: Tool[] = [
    hasTutorial(goal.link)
      ? { icon: "play", label: "Watch the tutorial", onPress: () => openTutorial(goal.link) }
      : null,
    { icon: "note", label: "Change the goal", onPress: () => setEditing(true) },
  ].filter((t): t is Tool => t !== null);

  return (
    <View ref={root} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header showRest />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 22,
          paddingBottom: 8,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
        }}
      >
        <LiftTitle family="goal" name={step.name} onMore={openMenu} style={{ marginTop: LAYOUT.solo.name }}>
          <Text
            numberOfLines={1}
            style={{ marginTop: 4, textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 20 }}
          >
            {goal.name}
          </Text>
          {step.note ? (
            <View style={{ paddingTop: 6 }}>
              <NoteLine text={step.note} lines={2} center onPress={() => setEditing(true)} />
            </View>
          ) : null}
        </LiftTitle>

        <View
          accessible
          accessibilityLabel={`Step ${index + 1} of ${goal.steps.length}`}
          // Practice carries a clock and a button under it, so it sits a little higher.
          style={{ marginTop: (step.note ? 26 : 40) - (timed ? 8 : 0), alignItems: "center", gap: 12 }}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.semibold,
                fontSize: LAYOUT.solo.number,
                lineHeight: LAYOUT.solo.number + 4,
                letterSpacing: -2,
                fontVariant: ["lining-nums"],
              }}
            >
              {index + 1}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 24 }}>
              of {goal.steps.length}
            </Text>
          </View>
          <Pips goal={goal} at={index} color={colors.text} size="large" />
        </View>

        <View style={{ marginTop: timed ? 16 : 36 }}>
          {timed ? (
            <PracticeClock
              left={left}
              total={total}
              running={!!practice?.endAt}
              cheer={motion?.id ?? null}
              onStart={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPractice({ left, endAt: Date.now() + left * 1000 });
              }}
              onPause={() => setPractice({ left, endAt: null })}
            />
          ) : step.measure === "hold" ? (
            <HoldSets
              logged={item.logged}
              target={step.target}
              cheer={motion?.id ?? null}
              burst={motion?.big ? "goal" : null}
              onLog={(i, held) => setState((s) => logGoalSet(s, i, held))}
              onTap={(i) => setState((s) => tapGoalSet(s, i))}
              onReset={(i) => setState((s) => resetGoalSet(s, i))}
            />
          ) : (
            <Sets
              logged={item.logged}
              target={step.target}
              cheer={motion?.id ?? null}
              burst={motion?.big ? "goal" : null}
              onTap={(i) => setState((s) => tapGoalSet(s, i))}
              onReset={(i) => setState((s) => resetGoalSet(s, i))}
            />
          )}
        </View>

        <View style={{ minHeight: LAYOUT.solo.under, marginTop: timed ? 14 : LAYOUT.solo.underGap }}>
          <GoalWhy
            goal={goal}
            step={step}
            index={index}
            item={item}
            glow={motion?.big ? motion.id : null}
          />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        <Column>
          <Action
            label={next}
            arrow
            fill
            disabled={!ready}
            onPress={() => {
              setMenu(null);
              // Practice counts at what the clock ran, or the whole time if it never started.
              onNext(timed && practice ? total - left : undefined);
            }}
          />
        </Column>
      </View>

      {menu ? <ToolsMenu anchor={menu} tools={tools} onClose={() => setMenu(null)} /> : null}
      <GoalSheet goalId={editing ? goal.id : null} onClose={() => setEditing(false)} />
    </View>
  );
}

/**
 * A step's holds: the lift's circles, each one its own clock. Tap an empty
 * one and it counts down from the target, the ring running down with it;
 * at zero it buzzes and logs the full hold, so you never have to reach for
 * the phone mid-handstand. Tap it while it runs to stop early and log what
 * you held. A hold already in comes down five seconds a tap, like a timed
 * lift; holding resets it to the target. One clock runs at a time.
 */
function HoldSets({
  logged,
  target,
  cheer,
  burst,
  onLog,
  onTap,
  onReset,
}: {
  logged: (number | null)[];
  target: number;
  cheer: number | null;
  burst: Family | null;
  onLog: (index: number, seconds: number) => void;
  onTap: (index: number) => void;
  onReset: (index: number) => void;
}) {
  // Kept as an end time, like a stretch's, so a slow frame or a locked phone
  // cannot stretch the hold.
  const [running, setRunning] = useState<{ index: number; endAt: number } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (running.endAt - Date.now() > 0) return tick((t) => t + 1);
      clearInterval(timer);
      setRunning(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLog(running.index, target);
    }, 200);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const left = running ? Math.max(0, (running.endAt - Date.now()) / 1000) : 0;
  return (
    <Sets
      logged={logged}
      target={target}
      seconds
      clock={running ? { index: running.index, left } : null}
      cheer={cheer}
      burst={burst}
      onTap={(i) => {
        if (running) {
          if (running.index !== i) return;
          setRunning(null);
          const held = target - left;
          if (held >= 1) onLog(i, held);
          return;
        }
        if (logged[i] === null) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setRunning({ index: i, endAt: Date.now() + target * 1000 });
          return;
        }
        onTap(i);
      }}
      onReset={(i) => {
        if (running?.index === i) setRunning(null);
        onReset(i);
      }}
    />
  );
}

/**
 * Practice: one clock for the minutes, and nothing to count. It is a guide,
 * not a gate — Next is there all along — and it buzzes when the time is up.
 */
function PracticeClock({
  left,
  total,
  running,
  cheer,
  onStart,
  onPause,
}: {
  left: number;
  total: number;
  running: boolean;
  /** You've got it, just now: the goal's stars go up from the clock. */
  cheer: number | null;
  onStart: () => void;
  onPause: () => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const done = left <= 0;
  const started = left < total;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ alignItems: "center", gap: 10 }}
    >
      {cheer !== null && width > 0 ? (
        <Burst
          key={cheer}
          family="goal"
          from={[0.3, 0.5, 0.7].map((f, i) => ({ x: width * f, y: 44, at: i * 0.12 }))}
          radius={40}
        />
      ) : null}
      <View
        accessible
        accessibilityLabel={`${timeLabel(Math.ceil(left))} of practice ${done ? "done" : "left"}`}
        style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.semibold,
            fontSize: 76,
            lineHeight: 84,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {timeLabel(Math.ceil(left))}
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>
          {done ? "practised" : "practice"}
        </Text>
      </View>
      {done ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={running ? onPause : onStart}
          style={({ pressed }) => ({
            minWidth: 180,
            height: 52,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.button,
            backgroundColor: running ? colors.surface : colors.cloud,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              color: running ? colors.text : colors.ink,
              fontFamily: fonts.medium,
              fontSize: 21,
            }}
          >
            {running ? "Pause" : started ? "Resume" : "Start"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * The words under a step, like a lift's: before it is done, a line from
 * Milo and what owning the step takes; once every circle is in, what
 * that means for next time — the next step, lit up, when this one is owned.
 * Practice says it is your call, and carries the button that makes it.
 */
function GoalWhy({
  goal,
  step,
  index,
  item,
  glow,
}: {
  goal: Goal;
  step: GoalStep;
  index: number;
  item: Item;
  glow: number | null;
}) {
  const { state, setState } = useSession();
  const colors = useColors();
  const seed = `${state.active?.startedAt}:${item.slot}`;
  const verdict = goalVerdict(state, item);
  const line = { textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 24 } as const;
  const voice = { textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 24, lineHeight: 28 } as const;

  const live = Math.min(goal.at, goal.steps.length - 1) === index && !goal.learned;
  const said = !verdict
    ? null
    : verdict.learned
      ? "learned"
      : verdict.outcome === "owned"
        ? step.measure === "practice"
          ? "got"
          : "owned"
        : verdict.outcome === "hit"
          ? "hit"
          : "miss";
  const quip = said
    ? pickLine(GOAL_LINES[said], seed)
    : step.measure === "practice"
      ? null
      : pickLine(live && goal.streak > 0 ? GOAL_LINES.once : GOAL_LINES.start, seed);
  const fact = verdict
    ? verdict.outcome === "owned"
      ? nextStepLine(goal, index)
      : verdict.outcome === "hit"
        ? "Same step next time. Once more moves you on."
        : "Same step next time."
    : ruleLine(step);

  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 6 }}>
      {quip ? (
        <Text numberOfLines={2} style={voice}>
          {quip}
        </Text>
      ) : null}
      <View>
        {glow !== null ? <Glow key={glow} /> : null}
        <Text numberOfLines={2} style={line}>
          {fact}
        </Text>
      </View>
      {step.measure === "practice" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: !!item.got }}
          onPress={() => setState((s) => setGot(s, !item.got))}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            marginTop: 4,
            paddingHorizontal: 20,
            borderRadius: radii.button,
            backgroundColor: item.got ? colors.cloud : colors.surface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {item.got ? <Icon name="check" size={16} color={colors.ink} /> : null}
          <Text
            style={{
              color: item.got ? colors.ink : colors.text,
              fontFamily: item.got ? fonts.medium : fonts.regular,
              fontSize: 19,
            }}
          >
            {item.got ? "Got it — tap to undo" : "I've got it — next step"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type Card = { move: MobilityMove; index: number; side: "Left side" | "Right side" | null };

/** Seconds between one hold and the next, to change side or position. */
const CHANGE_SECONDS = 5;
/** What keeps the screen on while the routine runs itself. */
const AWAKE = "mobility";

function MobilityDeck({
  routine,
  barSpace,
  onMoveDone,
  onFinish,
}: {
  routine: MobilityRoutine;
  barSpace: number;
  onMoveDone: (index: number) => void;
  onFinish: () => void;
}) {
  const colors = useColors();
  const cards = routine.moves.flatMap((move, index): Card[] =>
    move.perSide
      ? [
          { move, index, side: "Left side" },
          { move, index, side: "Right side" },
        ]
      : [{ move, index, side: null }],
  );

  const pager = useRef<ScrollView>(null);
  // The pager's own size: pages are sized to it, since a horizontal scroller
  // does not stretch its children to fill its height.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width } = size;
  const [page, setPage] = useState(0);
  // Seconds left on each card. A card at zero is done.
  const [left, setLeft] = useState<number[]>(() => cards.map((c) => c.move.seconds));
  // The card whose clock is running, and when it runs out. Kept as an end
  // time rather than counted down tick by tick, so a slow frame or a locked
  // phone cannot stretch the hold.
  const [running, setRunning] = useState<{ page: number; endAt: number } | null>(null);
  // Running itself: started, and not paused since. Each hold then follows
  // the last without a tap.
  const [flowing, setFlowing] = useState(false);

  // A phone that locks would stop the clock, and the routine with it.
  useEffect(() => {
    if (!flowing) return;
    activateKeepAwakeAsync(AWAKE).catch(() => {});
    return () => {
      deactivateKeepAwake(AWAKE).catch(() => {});
    };
  }, [flowing]);

  // Between holds: the card on screen starts by itself after a moment to
  // change position. A stretch done for reps has no clock, and waits for Done.
  const waiting = flowing && !running && left[page] > 0 && !cards[page].move.reps;
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRunning({ page, endAt: Date.now() + left[page] * 1000 });
    }, CHANGE_SECONDS * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, page]);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      const rem = (running.endAt - Date.now()) / 1000;
      if (rem > 0) {
        setLeft((l) => l.map((v, i) => (i === running.page ? rem : v)));
        return;
      }
      clearInterval(tick);
      setRunning(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finish(running.page);
      // On to the next by itself; the last one waits for Finish.
      if (running.page < cards.length - 1) goTo(running.page + 1);
    }, 200);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  /** A card done: its clock run out, or its reps said done. */
  const finish = (p: number) =>
    setLeft((l) => {
      const next = l.map((v, i) => (i === p ? 0 : v));
      const { index } = cards[p];
      // The pose is done once every side of it is.
      if (cards.every((c, i) => c.index !== index || next[i] <= 0)) onMoveDone(index);
      return next;
    });

  const pause = () => {
    setFlowing(false);
    if (!running) return;
    const rem = Math.max(0, (running.endAt - Date.now()) / 1000);
    setLeft((l) => l.map((v, i) => (i === running.page ? rem : v)));
    setRunning(null);
  };

  const goTo = (p: number) => pager.current?.scrollTo({ x: p * width, animated: true });

  const card = cards[page];
  const done = left[page] <= 0;
  const last = page === cards.length - 1;
  const started = left[page] < card.move.seconds;
  const action = running || waiting
    ? { label: "Pause", onPress: pause }
    : done
      ? last
        ? { label: "Finish", onPress: onFinish }
        : { label: "Next", onPress: () => goTo(page + 1) }
      : card.move.reps
        ? // Reps have no clock: you say when they're done, and move on.
          {
            label: "Done",
            onPress: () => {
              finish(page);
              setFlowing(true);
              if (!last) goTo(page + 1);
            },
          }
        : {
            label: started ? "Resume" : `Start · ${timeLabel(card.move.seconds)}`,
            onPress: () => {
              setFlowing(true);
              setRunning({ page, endAt: Date.now() + left[page] * 1000 });
            },
          };

  return (
    <>
      <View style={{ flex: 1, marginTop: 14 }} onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        {width > 0 ? (
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            // A sideways swipe moves along the workout's row of cards; the
            // stretches inside this card follow each other by themselves.
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const p = Math.round(e.nativeEvent.contentOffset.x / width);
              if (p !== page && p >= 0 && p < cards.length) {
                // Swiping away mid-hold pauses it; the time left is kept.
                // Between holds a swipe only chooses which one starts next.
                if (running) pause();
                setPage(p);
              }
            }}
          >
            {cards.map((c, i) => (
              <View key={i} style={{ width, height: size.height, paddingHorizontal: 22 }}>
                <Column style={{ flex: 1 }}>
                  <MobilityCard
                    card={c}
                    left={left[i]}
                    position={`${i + 1} / ${cards.length}`}
                  />
                </Column>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: barSpace + 14 }}>
        <Column style={{ gap: 8 }}>
          {/* Always laid out, so the hint appearing moves nothing. */}
          <Text style={{ height: 22, textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 17 }}>
            {waiting ? "Get into position" : ""}
          </Text>
          <Action label={action.label} fill onPress={action.onPress} />
        </Column>
      </View>
    </>
  );
}

function MobilityCard({ card, left, position }: { card: Card; left: number; position: string }) {
  const colors = useColors();
  const { move, side } = card;
  const done = left <= 0;
  const progress = 1 - left / move.seconds;

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: 24,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flex: 1 }}>
        {/* Twice, then still: the card is up for the whole hold. */}
        <Illustration id={pictureOf(move)} plays={2} style={{ flex: 1 }} />
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <GuideButton id={pictureOf(move)} name={move.name} cue={move.cue} onPicture />
        </View>
      </View>

      <View style={{ gap: 6, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>
            {side ?? (move.reps ? "Reps" : "Hold")}
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 17 }}>{position}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <Text
            numberOfLines={2}
            style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 26, lineHeight: 30 }}
          >
            {move.name}
          </Text>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.semibold,
              fontSize: 52,
              lineHeight: 56,
              fontVariant: ["lining-nums", "tabular-nums"],
            }}
          >
            {done ? "Done" : move.reps ? move.reps : timeLabel(Math.ceil(left))}
            {!done && move.reps ? (
              <Text style={{ fontFamily: fonts.regular, fontSize: 22 }}> reps</Text>
            ) : null}
          </Text>
        </View>

        {/* Two lines kept whether or not there is a cue, so cards line up. */}
        <Text numberOfLines={2} style={{ minHeight: 44, color: colors.text, fontFamily: fonts.regular, fontSize: 17, lineHeight: 22 }}>
          {move.cue ?? "Ease in, breathe slowly, and stop when the tension fades."}
        </Text>
      </View>

      {/* The hold, filling along the foot of the card once the clock runs —
          an empty track would read as a ledge under the card. */}
      <View style={{ height: 6, backgroundColor: progress > 0 ? colors.line : "transparent" }}>
        <View
          style={{
            width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
            height: 6,
            backgroundColor: colors.text,
          }}
        />
      </View>
    </View>
  );
}

/** The machines or routines this block could use instead. */
function ConditioningSwap({
  options,
  current,
  onPick,
}: {
  options: { id: string; name: string }[];
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <View
      style={{
        gap: 2,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 10,
      }}
    >
      {options.map((o) => {
        const active = o.id === current;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onPick(o.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              minHeight: 50,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: active ? colors.cloud : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                flex: 1,
                color: active ? colors.ink : colors.text,
                fontSize: 16,
                fontWeight: active ? "800" : "600",
              }}
            >
              {o.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The exercises that can fill this slot. Picking one also makes it the
 * module's default from now on.
 */
function SwapList({
  options,
  taken,
  current,
  onPick,
}: {
  options: string[];
  /** Exercises another slot in this module is using — shown, but unavailable. */
  taken: Set<string>;
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <View
      style={{
        gap: 2,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 10,
      }}
    >
      {options.map((id) => {
        const active = id === current;
        const used = taken.has(id) && !active;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: used }}
            disabled={used}
            onPress={() => onPick(id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 50,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: active ? colors.cloud : "transparent",
              opacity: used ? 0.35 : pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                flex: 1,
                color: active ? colors.ink : colors.text,
                fontSize: 16,
                fontWeight: active ? "800" : "600",
              }}
            >
              {byId(id)!.name}
            </Text>
            {used ? (
              <Text style={{ color: colors.faint, fontSize: 13, fontStyle: "italic" }}>in use</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}


/**
 * One circle per set. An empty circle is an outline with the target in it;
 * tapped, it fills solid at the target reps, counting down on each further
 * tap and clearing when it passes 1. A set short of the target fills with a
 * tint instead, so a miss reads at a glance without shouting.
 */
function Sets({
  logged,
  target,
  onTap,
  onReset,
  role = "solo",
  cheer = null,
  burst = null,
  seconds = false,
  clock = null,
}: {
  logged: (number | null)[];
  target: number;
  onTap: (index: number) => void;
  /** Long press: back to the target in one go. */
  onReset: (index: number) => void;
  /** Which lift these are for — see `CIRCLES`. */
  role?: keyof typeof CIRCLES;
  /** A lift done well, just now: see `useCheer`. */
  cheer?: number | null;
  /** The heavier weight earned, too: the circles let loose this family's marks. */
  burst?: Family | null;
  /** Holds: each circle counts seconds, and says so. */
  seconds?: boolean;
  /** The hold whose clock is running: what is left of it, drawn as a ring that runs down. */
  clock?: { index: number; left: number } | null;
}) {
  const colors = useColors();
  // On target: a ripple runs through the circles, left to right, each one
  // swelling a touch and sending a thin ring out that fades. A fresh value
  // per cheer, so it starts at rest-before rather than flashing.
  const wave = useMemo(() => new Animated.Value(cheer === null ? 1 : 0), [cheer]);
  useEffect(() => {
    if (cheer === null) return;
    Animated.timing(wave, {
      toValue: 1,
      duration: RIPPLE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [cheer, wave]);
  // Every circle is the same fixed size, centred as a group, and the row
  // is always the same height — two sets must not make bigger circles than
  // four, or the screen changes shape from one exercise to the next. Only
  // when there are too many to fit do they shrink, and then inside the same
  // row height.
  const [width, setWidth] = useState(0);
  const { full, gap, font } = CIRCLES[role];
  const n = logged.length;
  const fits = width > 0 ? (width - gap * (n - 1)) / n : full;
  const size = Math.max(36, Math.min(full, fits));
  const fontSize = Math.round((font * size) / full);
  // Each circle's turn in the ripple, spread so the last starts by 0.4.
  const stagger = n > 1 ? Math.min(0.14, 0.4 / (n - 1)) : 0;
  const first = (width - n * size - (n - 1) * gap) / 2 + size / 2;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height: full,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap,
      }}
    >
      {/* First, so the circles cover where the marks start from. */}
      {burst && cheer !== null ? (
        <Burst
          key={cheer}
          family={burst}
          from={logged.map((_, i) => ({
            x: first + i * (size + gap),
            y: full / 2,
            at: i * stagger,
          }))}
          radius={size / 2}
        />
      ) : null}
      {logged.map((reps, i) => {
        const running = clock?.index === i;
        const filled = reps !== null && !running;
        const short = filled && reps < target;
        const shown = running ? Math.ceil(clock.left) : filled ? reps : target;
        const at = i * stagger;
        const swell = wave.interpolate({
          inputRange: [at, at + 0.06, at + 0.12, at + 0.26, at + 0.4],
          outputRange: [1, 1.06, 1.09, 1.03, 1],
          extrapolate: "clamp",
        });
        const ring = wave.interpolate({
          inputRange: [at, at + 0.55],
          outputRange: [1, 1.55],
          extrapolate: "clamp",
        });
        const ringFade = wave.interpolate({
          inputRange: [at, at + 0.04, at + 0.55],
          outputRange: [0, 0.7, 0],
          extrapolate: "clamp",
        });
        return (
          <Animated.View key={i} style={{ transform: [{ scale: swell }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                seconds
                  ? `Hold ${i + 1}${
                      running
                        ? `, ${shown} seconds left`
                        : filled
                          ? `, ${reps} seconds`
                          : `, target ${target} seconds, not started`
                    }`
                  : `Set ${i + 1}${filled ? `, ${reps} reps` : `, target ${target}, not logged`}`
              }
              accessibilityHint={
                seconds
                  ? running
                    ? "Tap to stop and log what you held."
                    : "Tap to start its clock, or to take five seconds off. Hold to reset to the target."
                  : "Tap to log or count down. Hold to reset to the target."
              }
              onPress={() => onTap(i)}
              onLongPress={() => {
                // The circle is under the thumb, so say it happened by touch.
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onReset(i);
              }}
              delayLongPress={400}
              style={({ pressed }) => ({
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                borderWidth: filled || running ? 0 : role === "partner" ? 2 : 3,
                borderColor: colors.text,
                backgroundColor: filled
                  ? short
                    ? colors.raised
                    : colors.cloud
                  : running
                    ? colors.surface
                    : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {running ? <Countdown size={size} left={clock.left / target} /> : null}
              <Text
                style={{
                  // Garamond's figures sit a touch low in a circle: lift them
                  // to its optical centre.
                  marginTop: -Math.round(fontSize * 0.08),
                  color: filled && !short ? colors.ink : colors.text,
                  fontFamily: fonts.semibold,
                  fontSize: seconds ? Math.round(fontSize * 0.92) : fontSize,
                  fontVariant: ["lining-nums", "tabular-nums"],
                }}
              >
                {shown}
                {seconds ? (
                  <Text style={{ fontFamily: fonts.semibold, fontSize: Math.round(fontSize * 0.4) }}>
                    {" s"}
                  </Text>
                ) : null}
              </Text>
            </Pressable>
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: size,
                height: size,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.text,
                opacity: ringFade,
                transform: [{ scale: ring }],
                pointerEvents: "none",
              }}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

/**
 * A running hold's ring: a faint track, and the time left on it as an arc
 * from the top, running down clockwise as the seconds go.
 */
function Countdown({ size, left }: { size: number; left: number }) {
  const colors = useColors();
  const r = (size - 3) / 2;
  const round = 2 * Math.PI * r;
  return (
    <Svg
      width={size}
      height={size}
      style={{ position: "absolute", left: 0, top: 0, transform: [{ rotate: "-90deg" }] }}
    >
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.line} strokeWidth={3} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.text}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0, Math.min(1, left)) * round} ${round}`}
      />
    </Svg>
  );
}

/**
 * Hears every touch on the lift screen before anything else does, so a
 * control can put itself away on a tap anywhere but on it: the control marks
 * the touches that land on it, and once a touch has been handed out an
 * unmarked one closes it.
 */
type TapAway = { close: (() => void) | null; inside: boolean };

/** Keeps decimals only, with a dot whichever separator you type. */
function cleanNumber(typed: string) {
  const [whole, ...rest] = typed.replace(",", ".").replace(/[^0-9.]/g, "").split(".");
  return (rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole).slice(0, 6);
}

/**
 * The weight. Milo sets it and you rarely change it, so it stands alone,
 * its figures underlined in dashes to say they can be changed.
 *
 * Tap it and it is being changed, all at once: the number pad comes up, the
 * dashes turn to a solid line, and − and + come in at the row's ends. Until
 * you type, the weight is held back like a placeholder, with the caret before
 * it; what you type is drawn in its place at the same size, so nothing
 * jumps. − and + still step it while the pad is up. A tap on the number or
 * anywhere else keeps what you typed and puts it all away.
 * VoiceOver steps it with a swipe up or down without opening anything.
 */
function WeightControl({
  weight,
  bodyweight,
  holds,
  perHand,
  size,
  tapAway,
  onNudge,
  onSet,
}: {
  weight: number;
  bodyweight?: boolean;
  /** Progresses by holding: the number is seconds, from bodyweight up. */
  holds?: boolean;
  /** Held in each hand: the number shown is one dumbbell, marked ×2. */
  perHand?: boolean;
  /** How big the number is drawn — see `LAYOUT`. */
  size: number;
  tapAway: RefObject<TapAway>;
  onNudge: (direction: 1 | -1) => void;
  onSet: (weight: number) => void;
}) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Finishing runs once, whichever way it comes: a tap on the number or
  // anywhere else, or Return on a hardware keyboard. Not on the pad going down: iOS reports that as soon
  // as a field takes focus with no pad to show (a hardware keyboard).
  const open = useRef(false);
  const input = useRef<NativeTextInput>(null);
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shown, {
      toValue: editing ? 1 : 0,
      duration: editing ? 160 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editing, shown]);

  const keep = () => {
    const typed = parseFloat(draft);
    if (draft !== "" && !Number.isNaN(typed)) onSet(typed);
    setDraft("");
  };
  const start = () => {
    open.current = true;
    setDraft("");
    setEditing(true);
  };
  const finish = () => {
    if (!open.current) return;
    open.current = false;
    keep();
    setEditing(false);
  };
  const close = () => {
    finish();
    Keyboard.dismiss();
  };
  // A step keeps what you typed, then steps from it; the pad stays up, and
  // the field keeps the keys (a click on the web moves focus off it).
  const nudge = (direction: 1 | -1) => {
    keep();
    onNudge(direction);
    input.current?.focus();
  };

  useEffect(() => {
    const away = tapAway.current;
    if (!editing || !away) return;
    away.close = close;
    return () => {
      away.close = null;
    };
  });

  // A touch on the number or on − and + is the weight's own; anything else,
  // even the empty ends of its row, puts it away.
  const mine = () => {
    if (tapAway.current) tapAway.current.inside = true;
    return false;
  };

  const typed = editing && draft !== "";
  const typedNumber = parseFloat(draft);
  const unit = unitFor(
    { perHand, bodyweight, holds },
    typed && !Number.isNaN(typedNumber) ? typedNumber : weight,
  );
  const line = editing ? "solid" : "dashed";
  const caret = editing ? (typed ? "end" : "start") : undefined;
  // An unloaded bodyweight lift has no number worth showing — a bare "0 kg"
  // reads as an error — until you type a load (belt, dumbbell).
  const label = !typed && bodyweight && weight === 0;
  const half = Math.round(size * 0.5);

  return (
    <View style={{ height: size, alignItems: "center", justifyContent: "center" }}>
      <View onStartShouldSetResponderCapture={mine}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={holds ? "Hold" : "Weight"}
          accessibilityValue={{
            text: label ? (holds ? "Bodyweight, no hold" : "Bodyweight") : `${weight} ${unit}`,
          }}
          accessibilityHint={holds ? "Tap to type a hold" : "Tap to type a weight"}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => onNudge(e.nativeEvent.actionName === "increment" ? 1 : -1)}
          onPress={() => (editing ? close() : start())}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed && !editing ? 0.6 : 1 })}
        >
          {label ? (
            <Underline size={half} line={line} caret={caret}>
              <Text
                style={{
                  color: colors.text,
                  opacity: editing ? 0.4 : 1,
                  fontFamily: fonts.medium,
                  fontSize: half,
                }}
              >
                Bodyweight
              </Text>
            </Underline>
          ) : (
            <Weight
              weight={typed ? draft : weight}
              unit={unit}
              size={size}
              line={line}
              faint={editing && !typed}
              caret={caret}
            />
          )}
        </Pressable>
      </View>

      {/* The field you type into is never seen: the number above draws what
          you type, so it stays exactly where it was. */}
      {editing ? (
        <TextInput
          ref={input}
          autoFocus
          value={draft}
          onChangeText={(t) => setDraft(cleanNumber(t))}
          onSubmitEditing={close}
          keyboardType="decimal-pad"
          returnKeyType="done"
          caretHidden
          contextMenuHidden
          accessibilityLabel={holds ? "Hold in seconds" : "Weight in kilograms"}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* At the row's ends, each on its own so the number between them
          stays tappable. */}
      {([-1, 1] as const).map((direction) => (
        <Animated.View
          key={direction}
          onStartShouldSetResponderCapture={mine}
          accessibilityElementsHidden={!editing}
          importantForAccessibility={editing ? "auto" : "no-hide-descendants"}
          style={{
            position: "absolute",
            top: (size - 48) / 2,
            [direction < 0 ? "left" : "right"]: 0,
            opacity: shown,
            pointerEvents: editing ? "auto" : "none",
          }}
        >
          <Step label={direction < 0 ? "−" : "+"} onPress={() => nudge(direction)} />
        </Animated.View>
      ))}
    </View>
  );
}

/** − or +: a soft circle in a tint of the field. */
function Step({ label, onPress }: { label: "−" | "+"; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "More" : "Less"}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={label === "+" ? "plus" : "minus"} size={22} color={colors.text} />
    </Pressable>
  );
}

/** A lift done well, just now: on target, or the heavier weight earned (`big`). */
type Cheer = { id: number; key: string; big: boolean };

/** How long a cheer stands: past its longest movement, then it is spent. */
const CHEER_MS = 2600;

/**
 * How long the circles must sit still before a lift done well is cheered.
 * A short set passes through the target on its way down — tap for 6, tap
 * again for 5 — so the moment waits to see where the circles settle. Long
 * enough for a quick count down, short enough to still feel like an answer.
 */
const SETTLE_MS = 650;

/**
 * When a lift gets its moment. On target — every set at its reps — and more
 * so when that earns the heavier weight. Never for a set short or a weight
 * going down: those keep their plain, calm line. A goal's step gets the same:
 * on target, and more so when that owns the step.
 *
 * It comes once the circles have settled on target, whether the last one
 * just filled or a correction made it a hit, and once per lift: putting a
 * circle right afterwards does not play it again, and coming back to a lift
 * already done well is not the moment. A circle put wrong while it plays
 * takes it away at once. A success buzz says it under the thumb; the
 * heavier weight gets a second, firmer one.
 *
 * `well` is the lift as it stands, done well or not, for the send-off on Next.
 */
function useCheer(state: ReturnType<typeof useSession>["state"]): {
  cheer: Cheer | null;
  well: boolean;
} {
  const active = state.active;
  const item = active && !isComplete(state) ? active.items[active.cursor] : undefined;
  const lift = !!item && isLift(item) && currentWarmup(state).length === 0;
  const say = lift && allSetsLogged(state) ? nextTime(state)?.say : undefined;
  // A goal's step: on target, and more so when that owns it — or practice
  // you've got, which owns it outright.
  const goal = item && isGoal(item) ? goalVerdict(state, item)?.outcome : undefined;
  const good = lift ? say === "hit" || say === "owned" : goal === "hit" || goal === "owned";
  const big = lift ? say === "owned" : goal === "owned";
  const key = active && item ? `${active.startedAt}:${active.cursor}` : "";
  // What the circles say now, the partner's too: any tap starts the wait again.
  const circles =
    (lift || goal !== undefined) && item
      ? `${item.logged.join()}|${item.supersetLogged?.join() ?? ""}|${item.got ? 1 : 0}`
      : "";

  const [track, setTrack] = useState<{
    key: string;
    done: string[];
    count: number;
    cheer: Cheer | null;
  }>(() => ({ key, done: good ? [key] : [], count: 0, cheer: null }));
  if (track.key !== key) {
    // Arriving at a lift already done well — Back to it — is not the moment.
    const done = good && !track.done.includes(key) ? [...track.done, key] : track.done;
    setTrack({ ...track, key, done, cheer: null });
  } else if (!good && track.cheer) {
    setTrack({ ...track, cheer: null });
  }

  const waiting = good && track.key === key && !track.done.includes(key);
  useEffect(() => {
    if (!waiting) return;
    const settled = setTimeout(
      () =>
        setTrack((t) =>
          t.key !== key || t.done.includes(key)
            ? t
            : {
                key,
                done: [...t.done, key],
                count: t.count + 1,
                cheer: { id: t.count + 1, key, big },
              },
        ),
      SETTLE_MS,
    );
    return () => clearTimeout(settled);
  }, [waiting, key, circles, big]);

  const id = track.cheer?.id;
  const firm = track.cheer?.big;
  useEffect(() => {
    if (id === undefined) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const second = firm
      ? setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 220)
      : undefined;
    // Spent once it has played, so a line drawn again later stays still.
    const spent = setTimeout(
      () => setTrack((t) => (t.cheer?.id === id ? { ...t, cheer: null } : t)),
      CHEER_MS,
    );
    return () => {
      clearTimeout(second);
      clearTimeout(spent);
    };
  }, [id, firm]);

  return { cheer: good && track.cheer?.key === key ? track.cheer : null, well: good };
}

/** How long the ripple takes to run through the circles and settle. */
const RIPPLE_MS = 1100;

/**
 * The heavier weight earned: each circle lets loose a few marks of the
 * lift's family as the ripple reaches it. They come out from behind it and
 * fan upward and away from the middle, turning a little, and fade before
 * they get far — around the weight rather than over it. A handful, not a
 * shower, some fainter so they sit at different depths. Touches nothing.
 */
function Burst({
  family,
  from,
  radius,
}: {
  family: Family;
  /** Each circle's centre in the row, and its turn in the ripple (0–1). */
  from: { x: number; y: number; at: number }[];
  radius: number;
}) {
  const colors = useColors();
  // Worked out once, as it appears: the screen redraws every second while
  // resting, and the marks must not start again each time.
  const [pieces] = useState(() => {
    const per = from.length > 3 ? 2 : 3;
    const middle = (from.length - 1) / 2;
    return from.flatMap((c, i) =>
      Array.from({ length: per }, (_, j) => {
        // A fan over the top of the circle, leaning away from the middle.
        const spread = per === 3 ? (j - 1) * 50 : (j - 0.5) * 60;
        const angle =
          ((-90 + spread + (i - middle) * 24 + (Math.random() - 0.5) * 24) * Math.PI) / 180;
        const far = radius * 0.9 + 40 + Math.random() * 45;
        return {
          x: c.x,
          y: c.y,
          dx: Math.cos(angle) * far,
          dy: Math.sin(angle) * far,
          turn: Math.round((Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 80)),
          size: 13 + Math.round(Math.random() * 7),
          delay: Math.round(c.at * RIPPLE_MS + 40 + Math.random() * 120),
          duration: 1100 + Math.round(Math.random() * 400),
          soft: (i + j) % 3 === 0,
          t: new Animated.Value(0),
        };
      }),
    );
  });
  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.t, {
          toValue: 1,
          delay: p.delay,
          duration: p.duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      {pieces.map((p, i) => {
        const along = (to: number) => p.t.interpolate({ inputRange: [0, 1], outputRange: [0, to] });
        const turn = p.t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.turn}deg`] });
        const grow = p.t.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.5, 1, 0.8] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              opacity: p.t.interpolate({
                inputRange: [0, 0.1, 0.55, 1],
                outputRange: [0, p.soft ? 0.5 : 0.95, p.soft ? 0.4 : 0.75, 0],
              }),
              transform: [
                { translateX: along(p.dx) },
                { translateY: along(p.dy) },
                { rotate: turn },
                { scale: grow },
              ],
            }}
          >
            <Mark family={family} size={p.size} color={colors.text} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/** A soft light behind a line, coming up and going again: the heavier weight, earned. */
function Glow() {
  const colors = useColors();
  const t = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      delay: 520,
      duration: 1500,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [t]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -3,
        bottom: -3,
        left: -14,
        right: -14,
        borderRadius: 999,
        backgroundColor: colors.white,
        opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.26, 0] }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.92, 1, 1.04] }) },
        ],
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * The line under the circles, which follows the exercise through. Before the
 * first set, where today's number came from — last time's weight and reps,
 * the reps in small circles like the ones above, or why it changed. Between
 * sets, how to own the next one: the position to hold. Once every set is in,
 * what that means for next time: a line from Milo, and the plain fact
 * under it.
 */
function Why({
  prescription,
  result,
  started,
  compact,
  glow = null,
}: {
  prescription: ReturnType<typeof currentPrescription>;
  /** Every set is in: what it means for next time, shown in the hint's place. */
  result: { fact: string; quip: string } | null;
  /** A set is logged, so where the number came from has been read. */
  started: boolean;
  /** Sharing the screen with a superset: one line for the remark. */
  compact?: boolean;
  /** The heavier weight earned, just now: its line lights up for a moment. */
  glow?: number | null;
}) {
  const colors = useColors();
  if (!prescription) return null;
  const line = { textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 24 } as const;

  if (result) {
    return (
      <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 4 }}>
        <Text
          numberOfLines={compact ? 1 : 2}
          adjustsFontSizeToFit={compact}
          minimumFontScale={0.75}
          style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 24, lineHeight: 28 }}
        >
          {result.quip}
        </Text>
        <View>
          {glow !== null ? <Glow key={glow} /> : null}
          <Text numberOfLines={1} style={line}>
            {result.fact}
          </Text>
        </View>
      </View>
    );
  }
  const { last, deloaded, skippedLast, exercise } = prescription;

  if (exercise.unloaded) {
    return (
      <Text numberOfLines={3} style={line}>
        Maximum effort every rep. Rest as long as you need between sets.
      </Text>
    );
  }

  if (started) {
    // Every cue opens on a verb, so it carries on the sentence: "Own it: pause…".
    const cue = ownCue(exercise.id, exercise.holds ? prescription.weight : 0);
    return (
      <Text numberOfLines={compact ? 2 : 3} style={line}>
        <Text style={{ fontFamily: fonts.italic }}>Own it: </Text>
        {cue.charAt(0).toLowerCase() + cue.slice(1)}
      </Text>
    );
  }

  const text = prescription.decay
    ? decayLabel(prescription.decay)
    : skippedLast
      ? "Skipped last time. Same weight and reps as before."
      : deloaded
        ? exercise.holds || exercise.timed
          ? "Easier after two sessions short of target. Build it up again."
          : "10% lighter after two sessions short of target. Build it up again."
        : prescription.reload === "start"
          ? `Reload: same ${exercise.holds ? "hold" : "weight"}, back to ${prescription.reps} reps. Own it before the next step.`
          : last
            ? null
            : exercise.bodyweight && !exercise.assistable
              ? "First time on this one. Slow, controlled reps, with two to spare."
              : "First time on this one. Pick a weight you control, with two reps to spare.";

  if (text !== null || !last) {
    return (
      <Text numberOfLines={compact ? 2 : 3} style={line}>
        {text}
      </Text>
    );
  }

  const weight = weightLabel(exercise, last.weight);
  // Five or more sets would crowd the line, so their circles come down a size.
  const mini = last.reps.length > 4 ? 26 : 30;
  // Drawn exactly as the big circles were: solid at the target, a tint where
  // a set fell short of it.
  return (
    <View
      accessible
      accessibilityLabel={`Last time: ${weight}, ${last.reps.join(", ")} reps`}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 32 }}
    >
      <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>Last time</Text>
      <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>{weight}</Text>
      <View style={{ flexDirection: "row", gap: 6, marginLeft: 4 }}>
        {last.reps.map((r, i) => (
          <View
            key={i}
            style={{
              width: mini,
              height: mini,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              backgroundColor: r < last.target ? colors.raised : colors.cloud,
            }}
          >
            <Text
              style={{
                marginTop: -2,
                color: r < last.target ? colors.text : colors.ink,
                fontFamily: fonts.semibold,
                fontSize: Math.round(mini * 0.6),
                fontVariant: ["lining-nums", "tabular-nums"],
              }}
            >
              {r}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The folded-in partner: its own weight, target and tappable circles. */
function Partner({
  id,
  name,
  cue,
  weight,
  sets,
  target,
  timed,
  note,
  onNote,
  logged,
  onTap,
  onReset,
  onRemove,
}: {
  id: string;
  name: string;
  cue?: string;
  weight: string;
  sets: number;
  target: number;
  timed?: boolean;
  /** Your note on the partner, if you wrote one. */
  note: string;
  onNote: () => void;
  logged: (number | null)[];
  onTap: (index: number) => void;
  onReset: (index: number) => void;
  /** Unpair it: goes back to its own place in the workout, keeping its sets. */
  onRemove: () => void;
}) {
  const colors = useColors();
  // Kept short — two rows over its circles — so a paired screen still fits
  // above the bar without scrolling.
  return (
    <View
      style={{
        gap: 8,
        marginTop: 12,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.italic, fontSize: 18 }}>
          Superset · {sets} sets of {target}
          {timed ? " seconds" : ""}
        </Text>
        <GuideButton id={id} name={name} cue={cue} size={36} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from this superset`}
          onPress={onRemove}
          hitSlop={4}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            marginRight: -8,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Icon name="close" size={16} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 21 }}>
          {name}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.semibold,
            fontSize: 24,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {weight}
        </Text>
      </View>

      {/* One line, and only when there is one: the pair still has to fit. */}
      {note ? <NoteLine text={note} lines={1} size={15} onPress={onNote} /> : null}

      <Sets logged={logged} target={target} onTap={onTap} onReset={onReset} role="partner" />
    </View>
  );
}

function SupersetPicker({
  options,
  onPick,
}: {
  options: { id: string; name: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <View
      style={{
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 10,
      }}
    >
      {options.map((o) => (
        <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Superset with ${o.name}`}
            onPress={() => onPick(o.id)}
            style={({ pressed }) => ({
              flex: 1,
              justifyContent: "center",
              minHeight: 52,
              borderRadius: 14,
              paddingHorizontal: 14,
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
              {o.name}
            </Text>
          </Pressable>
          <GuideButton id={o.id} name={o.name} cue={byId(o.id)?.cue} size={36} />
        </View>
      ))}
    </View>
  );
}

/**
 * The way on: a full-width slab under the thumb. Waiting, it is a soft tint
 * with its label held back; ready, it turns solid — white or navy on a
 * field, blue on white — with an arrow.
 */
function Action({
  label,
  onPress,
  fill,
  arrow,
  disabled,
}: {
  label: string;
  onPress: () => void;
  /** The affirmative action: solid once it can be pressed. */
  fill?: boolean;
  /** Points on to what comes next. */
  arrow?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const glint = useContext(SendOff);
  const on = !!fill && !disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 60,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 18,
        borderRadius: radii.action,
        borderCurve: "continuous",
        backgroundColor: on ? colors.cloud : colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color: on ? colors.ink : colors.text,
          opacity: disabled ? 0.6 : 1,
          fontFamily: on ? fonts.medium : fonts.regular,
          fontSize: 21,
        }}
      >
        {label}
      </Text>
      {arrow && on ? <Icon name="forward" size={20} color={colors.ink} /> : null}
      {glint > 0 ? <Glint key={glint} /> : null}
    </Pressable>
  );
}

/**
 * The send-off for a lift done well: as you press Next, a soft band of light
 * passes over the button now in its place, left to right, once. The screen
 * has already moved on, so it is whatever comes next that carries it.
 */
function Glint() {
  const [width, setWidth] = useState(0);
  const t = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    if (!width) return;
    Animated.timing(t, {
      toValue: 1,
      duration: 700,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [t, width]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        overflow: "hidden",
        borderRadius: radii.action,
        borderCurve: "continuous",
        pointerEvents: "none",
      }}
    >
      {width ? (
        <Animated.View
          style={{
            position: "absolute",
            top: -24,
            bottom: -24,
            left: 0,
            width: 16,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            boxShadow: "0 0 22px 10px rgba(255, 255, 255, 0.45)",
            opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-40, width + 40] }) },
              { rotate: "16deg" },
            ],
          }}
        />
      ) : null}
    </View>
  );
}

function Finished({
  hasSession,
  onCard,
}: {
  hasSession: boolean;
  /** As the last card of the row: go to one of the cards not done. */
  onCard?: (index: number) => void;
}) {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  // What is left, said plainly and never asked about: leaving early counts.
  const left = onCard
    ? (state.active?.items ?? []).map((_, i) => i).filter((i) => cardMark(state, i) === "todo")
    : [];

  // How it went, before the session is committed and gone.
  const t = sessionTally(state);
  const scored = t.hit + t.miss + t.drop;
  const mood: FinishedMood =
    t.lifts === 0
      ? "done"
      : t.unfinished * 2 >= t.lifts
        ? "partial"
        : t.drop > 0 || t.miss > t.hit
          ? "rough"
          : t.miss > 0 || t.unfinished > 0
            ? "mixed"
            : "perfect";
  const quip = pickLine(FINISHED_LINES[mood], String(state.active?.startedAt ?? ""));
  const nextUp = nextAfterSession(state);
  const facts = [
    scored > 0 ? `${t.hit} of ${scored} ${scored === 1 ? "lift" : "lifts"} on target.` : null,
    t.drop > 0 ? `${t.drop} going 10% lighter.` : null,
    t.reload > 0 ? `${t.reload} ${t.reload === 1 ? "lift reloads" : "lifts reload"} next time.` : null,
    nextUp ? `Next up: ${nextUp.name || "Untitled"}.` : null,
  ].filter(Boolean);

  const close = () => {
    if (hasSession) setState((s) => finishWorkout(s));
    router.replace("/");
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "space-between",
        // As the row's last card it is a card like the others, in the quiet grey.
        backgroundColor: onCard ? colors.surface : colors.bg,
        paddingTop: onCard ? 44 : insets.top + 90,
        paddingHorizontal: 22,
        // The floating bar sits over the foot of the screen; clear it.
        paddingBottom: barSpace + (onCard ? 22 : 14),
      }}
    >
      <Column style={{ gap: 12 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 60, lineHeight: 66 }}>
          {left.length > 0 ? "The end." : "Done."}
        </Text>
        {left.length > 0 ? (
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 26 }}>
              Not done — tap one to go back to it, or finish as it is:
            </Text>
            {left.map((i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Go back to ${cardName(state, i)}`}
                onPress={() => onCard?.(i)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 44,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <CardDot mark="todo" color={FAMILY[itemFamily(state.active!.items[i])].mark} size={16} />
                <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 21 }}>
                  {cardName(state, i)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {hasSession ? (
          <>
            <Text
              style={{
                color: mood === "perfect" ? colors.rise : colors.text,
                fontFamily: fonts.italic,
                fontSize: 28,
                lineHeight: 34,
              }}
            >
              {quip}
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 19, lineHeight: 26 }}>
              {facts.join(" ")}
            </Text>
          </>
        ) : null}
      </Column>
      <Column>
        <Action label={onCard ? "Finish workout" : "Close"} fill onPress={close} />
      </Column>
    </View>
  );
}
