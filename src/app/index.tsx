import { router } from "expo-router";
import { Button } from "@/components/buttons";
import { memo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { EasyWeek, easyWeekShowing } from "@/components/easy-week";
import { GrowthOffer } from "@/components/growth-offer";
import { Icon } from "@/components/icon";
import { ClaySheen } from "@/components/card-clay";
import { Mark } from "@/components/mark";
import { Column, COLUMN } from "@/components/screen";
import { Sheet, OpenRow } from "@/components/sheet";
import { CLAY_LOOK, CLAY_TONE, colors, FAMILY, fonts, mix, radii } from "@/constants/theme";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { Family } from "@/data/families";
import type { Workout } from "@/data/split";
import { TODAY_LINES, fillLine, pickLine, type TodayMood } from "@/data/voice";
import type { PreviewRow, SessionState } from "@/store/session";
import {
  buildWorkout,
  cardMark,
  cardName,
  currentWorkout,
  daysSinceTrained,
  didTrain,
  finishWorkout,
  itemFamily,
  loopInUse,
  loopName,
  sittingOut,
  setNextWorkout,
  upcomingWorkouts,
  upNext,
  useSession,
  workoutFamily,
  workoutPreview,
} from "@/store/session";


export default function TodayScreen() {
  const { state } = useSession();
  // A plan you have just made has nothing in it yet.
  if (!state.active && state.workouts.length === 0) return <EmptyPlan />;
  return <Deck />;
}

/** Today for a new plan: its name, and the way to fill it. */
function EmptyPlan() {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 22, paddingBottom: barSpace + 16 }}>
      <Column style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 48 }}>
          {loopName(state, loopInUse(state))}
        </Text>
        <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
          There are no workouts in this plan yet. Add your first one, and it will be here, ready to start.
        </Text>
      </Column>
      <Column>
        <View style={{ flexDirection: "row" }}>
          <BigButton label="Add a workout" primary="push" onPress={() => router.push("/new-workout")} />
        </View>
      </Column>
    </View>
  );
}

/** Today with workouts: the round as a deck of cards, and Start. */
function Deck() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  // A workout you stepped out of is still yours to finish: it stays on Today
  // until you continue it or end it — or open the app on a later day, which
  // closes it out (see `storage.ts`).
  const inProgress = !!state.active;
  // The round from here, today's first: the deck you swipe through. A
  // workout under way is the only card.
  const round = inProgress ? [currentWorkout(state)] : upcomingWorkouts(state, state.workouts.length);
  const [look, setLook] = useState(0);
  const at = round.length ? ((look % round.length) + round.length) % round.length : 0;
  // There is always one: Today shows the deck only with a workout to show.
  const workout = (round[at] ?? upNext(state))!;
  const [ending, setEnding] = useState(false);

  const idleDays = daysSinceTrained(state);

  const start = () => {
    const id = workout.id;
    goTo(0);
    // Never over the top of one in progress — that would throw its sets away.
    // The deck is the round and the swipe only moves where you are in it:
    // Start does the one on top, and next time the one after it is on top.
    setState((s) => (s.active ? s : buildWorkout(setNextWorkout(s, id))));
    router.push("/workout");
  };

  const end = () => {
    setEnding(false);
    setState((s) => finishWorkout(s));
  };

  const family = workoutFamily(state, workout);
  // The same workouts as the round, but in the plan's order, each once.
  const inPlanOrder = state.workouts.filter((w) => round.some((r) => r.id === w.id));
  // The next two in the round after the one on top, under it: the deck's edges.
  const behind = [1, 2]
    .filter((k) => round.length > k)
    .map((k) => round[(at + k) % round.length])
    .reverse();

  // Sideways turns the deck. Left throws the top card off and the one after
  // is already there under it; right brings the one before in from the left,
  // over the top. Every card is the same size, so nothing moves but the card
  // in your hand, and once it lands the deck simply is one further round.
  const { width } = useWindowDimensions();
  const away = width + 60;
  const x = useSharedValue(0);
  // Which card is on top, as the deck itself knows it: changed on the UI
  // thread in the same frame the thrown card lands, so every card simply
  // takes its new place — nothing is drawn again, nothing jumps.
  const base = useSharedValue(look);
  const n = round.length;
  // The shapes under the deck move the moment you let go, not when it lands.
  const turn = (by: number) => setLook((l) => l + by);
  // Straight to one (a tap on its shape, or Start): the deck goes with it.
  const goTo = (i: number) => {
    setLook(i);
    base.value = i;
    x.value = 0;
  };
  const swipe = Gesture.Pan()
    .enabled(round.length > 1)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onChange((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > width * 0.25 || Math.abs(e.velocityX) > 700;
      if (!far) {
        x.value = withSpring(0, { damping: 20, stiffness: 240 });
        return;
      }
      const by = e.translationX < 0 ? 1 : -1;
      scheduleOnRN(turn, by);
      x.value = withTiming(-by * away, { duration: 220 }, (done) => {
        if (!done) return;
        // Landed: the deck is one further round. The thrown card is now the
        // one waiting off to the left, exactly where it already is.
        base.value += by;
        x.value = 0;
      });
    });

  // Today always points to the next workout, including after training today.
  // Only first-use guidance and returning need a remark.
  // Seeded by the day and workout so it holds still while you look at it.
  const seed = `${new Date().toDateString()}:${workout.id}`;
  const mood: TodayMood | null = idleDays === null
    ? "first"
    : idleDays >= 7
      ? "back"
      : null;
  const remark = mood
    ? fillLine(pickLine(TODAY_LINES[mood], seed), {
        days: idleDays ?? undefined,
      })
    : null;
  // Where you are, or what comes next — said plainly.
  const fact = inProgress
    ? // Counted as the workout card counts: a card is done or it is not.
      `In progress: ${state.active!.items.filter((_, i) => cardMark(state, i) === "done").length} of ${state.active!.items.length} done.`
    : null;
  const line = fact ?? remark;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          gap: 20,
        }}
      >
        {inProgress ? null : <EasyWeek />}
        {/* Nothing grows in an easy week, or while one is on offer. */}
        {inProgress || easyWeekShowing(state) ? null : <GrowthOffer />}
        {/* The round as a deck, the one on top the day's: all one size, the
            room the screen has, so turning it moves only the card in your
            hand. The next two show their edges under it, in their colours;
            a long list scrolls inside its card. */}
        <View style={{ flex: 1, marginBottom: 8 * behind.length }}>
          {behind.map((w, k) => {
            const depth = behind.length - k;
            return (
              <View
                key={`edge-${depth}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: -8 * depth,
                  left: 10 * depth,
                  right: 10 * depth,
                  borderRadius: CLAY_LOOK.corner,
                  borderCurve: "continuous",
                  boxShadow: "inset 0 -6px 12px rgba(0, 0, 0, 0.12), 0 8px 14px -8px rgba(80, 50, 20, 0.4)",
                  backgroundColor: CLAY_TONE[workoutFamily(state, w)].card,
                }}
              >
                {/* Deeper in the deck, deeper in its shade. */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    borderRadius: CLAY_LOOK.corner,
                    borderCurve: "continuous",
                    backgroundColor: "#000000",
                    opacity: SHADE * (depth + 1),
                  }}
                />
              </View>
            );
          })}
          {/* Every card of the round, each always itself: the deck only
              moves them — on top, under it, or waiting off to the left. */}
          <GestureDetector gesture={swipe}>
            <View style={{ flex: 1 }}>
              {round.map((w, i) => (
                <DeckSlot key={`${w.id}-${i}`} index={i} count={n} base={base} x={x} away={away} width={width} onTop={i === at}>
                  <DayCard state={state} workout={w} inProgress={inProgress} />
                </DeckSlot>
              ))}
            </View>
          </GestureDetector>
        </View>

        {/* The plan, one shape a workout, always in the plan's own order —
            push, pull, legs — so it is learned once and never read again.
            Only the light moves: the one on top full size, which on opening
            is today's, so it says where you are in the cycle. A tap goes
            straight to one. */}
        {round.length > 1 ? (
          <View style={{ marginTop: -6, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
            {inPlanOrder.map((w) => {
              const lit = w.id === workout.id;
              return (
                <Pressable
                  key={w.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${w.name || "Untitled"}`}
                  accessibilityState={{ selected: lit }}
                  hitSlop={6}
                  onPress={() => goTo(round.findIndex((r) => r.id === w.id))}
                  style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: lit ? 1 : 0.4 }}
                >
                  <Mark family={workoutFamily(state, w)} size={lit ? 20 : 14} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Always a clear gap between the card and the buttons. */}
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: barSpace + 16 }}>
        <Column style={{ gap: 18 }}>
          {/* Klay's word, kept apart from the day it comments on: under
              the list, just before you start. */}
          {line ? (
            <Text
              style={{
                color: colors.text,
                fontSize: 19,
                lineHeight: 25,
                // Klay's remark in italics; a plain fact in roman.
                fontStyle: fact ? "normal" : "italic",
              }}
            >
              {line}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {inProgress ? <BigButton label="End" onPress={() => setEnding(true)} /> : null}
            <BigButton label={inProgress ? "Continue" : "Start"} primary={family} onPress={start} />
          </View>
        </Column>
      </View>
      <Sheet visible={ending} title={workout.name} onClose={() => setEnding(false)}>
        <View style={{ paddingTop: 12, gap: 12 }}>
          <OpenRow
            title="End workout"
            detail={
              didTrain(state.active)
                ? "What you logged counts. The rest is marked skipped and the cycle moves on."
                : `Nothing logged yet, so ${workout.name} stays next.`
            }
            onPress={end}
          />
        </View>
      </Sheet>
    </View>
  );
}

/**
 * One workout as a card of the deck: its head in its colour — the shape, the
 * name, what it trains and how long — and under it, on paper, what is in it,
 * scrolling inside the card when it is long. Fills whatever room it is given,
 * so every card in the deck is the same size.
 */
/**
 * One card's place in the deck, worked out on the UI thread from which card
 * is on top (`base`) and the finger (`x`): on top, going left with the finger
 * and tilting a little; the one before, waiting off to the left and following
 * a rightward finger in over the top; the one after, still, under the top;
 * the rest out of sight.
 */
/** How dark the card under the top one is, at most. */
const SHADE = 0.08;

function DeckSlot({
  index,
  count,
  base,
  x,
  away,
  width,
  onTop,
  children,
}: {
  index: number;
  count: number;
  base: SharedValue<number>;
  x: SharedValue<number>;
  away: number;
  width: number;
  onTop: boolean;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const d = (((index - base.value) % count) + count) % count;
    const tilt = (v: number) => `${(v / Math.max(1, width)) * 8}deg`;
    if (d === 0) {
      const v = Math.min(0, x.value);
      return { opacity: 1, zIndex: 3, transform: [{ translateX: v }, { rotate: tilt(v) }] };
    }
    // With two, the other one is both after and before: before while the finger goes right.
    if (d === count - 1 && (count > 2 || x.value > 0)) {
      const v = Math.max(0, x.value) - away;
      return { opacity: 1, zIndex: 4, transform: [{ translateX: v }, { rotate: tilt(v) }] };
    }
    if (d === 1) return { opacity: 1, zIndex: 2, transform: [{ translateX: 0 }, { rotate: "0deg" }] };
    return { opacity: 0, zIndex: 0, transform: [{ translateX: 0 }, { rotate: "0deg" }] };
  });
  // In the shade of the card above it, as in a real deck: the one under the
  // top a little darker, lifting as the top card is thrown off it; the top
  // one darkening as the one before comes in over it.
  const shade = useAnimatedStyle(() => {
    const d = (((index - base.value) % count) + count) % count;
    const off = Math.min(1, Math.abs(x.value) / away);
    if (d === 0) return { opacity: x.value > 0 ? off * SHADE : 0 };
    if (d === 1 && x.value <= 0) return { opacity: (1 - off) * SHADE };
    return { opacity: 0 };
  });
  return (
    <Animated.View
      pointerEvents={onTop ? "auto" : "none"}
      accessibilityElementsHidden={!onTop}
      importantForAccessibility={onTop ? "auto" : "no-hide-descendants"}
      style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, style]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#000000" },
          { borderRadius: CLAY_LOOK.corner, borderCurve: "continuous" },
          shade,
        ]}
      />
    </Animated.View>
  );
}

// Drawn again only when what it shows changes, so turning the deck redraws nothing.
export const DayCard = memo(function DayCard({ state, workout, inProgress = false }: { state: SessionState; workout: Workout; inProgress?: boolean }) {
  const family = workoutFamily(state, workout);
  const card = cardInk(family);
  const rows = inProgress ? [] : workoutPreview(state, workout);
  // Slots with nothing here to do them with, said rather than hidden.
  const missing = inProgress ? [] : sittingOut(state, workout);
  // Whether the list runs past the card, and whether it has been scrolled to its end.
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [atFoot, setAtFoot] = useState(false);
  const overflows = box > 0 && content > box + 1;
  // The list sits straight on the day's clay, in its ink; each shape keeps
  // its own clay and fine edge, so one of the day's own family still shows.
  const body: CardInk = { ...card, marks: true, line: `${CLAY_TONE[family].ink}1A` };
  return (
    <View
      style={{
        flex: 1,
        borderRadius: CLAY_LOOK.corner,
        borderCurve: "continuous",
        backgroundColor: CLAY_TONE[family].card,
        // A puffy lump of clay.
        boxShadow: CLAY_LOOK.puff,
        overflow: "hidden",
      }}
    >
      <ClaySheen id={`today-${workout.id}`} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: GAP }}>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={{ flex: 1, color: card.ink, fontFamily: fonts.display, fontSize: 40, lineHeight: 48 }}
          >
            {workout.name || "Untitled"}
          </Text>
        </View>
        {workout.subtitle ? (
          <Text style={{ color: card.soft, fontSize: 19, fontStyle: "italic" }}>{workout.subtitle}</Text>
        ) : null}
      </View>
      {/* A fine line pressed into the clay between the day and its list. */}
      <View style={{ marginHorizontal: 16, height: 2, borderRadius: 1, backgroundColor: CLAY_TONE[family].deep, boxShadow: "0 1px 0 rgba(255, 255, 255, 0.35)" }} />
      <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        onLayout={(e) => setBox(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContent(h)}
        onScroll={(e) => setAtFoot(e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height >= e.nativeEvent.contentSize.height - 4)}
        scrollEventThrottle={32}
        // Room under the last row, so it can be scrolled clear of the fade.
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: overflows ? FADE : 16, gap: 12 }}
      >
        {inProgress ? <Progress ink={body} /> : <Preview rows={rows} ink={body} />}
        {missing.length > 0 ? (
          <Text style={{ marginLeft: INDENT, color: body.soft, fontSize: 16, lineHeight: 22 }}>
            {missingLine(missing.map((e) => e.slot))}
          </Text>
        ) : null}
      </ScrollView>
      {/* More below: the list fades into the card's foot, rather than being cut by its edge. */}
      {overflows && !atFoot ? <FootFade color={CLAY_TONE[family].card} /> : null}
      </View>
    </View>
  );
});

/** How tall the fade at the foot of a long list is. */
const FADE = 44;

/** A list's foot, fading out into the card's colour. Never takes a touch. */
function FootFade({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: FADE }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="foot-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.85" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#foot-fade)" />
      </Svg>
    </View>
  );
}

/** "No chest fly or vertical press today. Nothing here to do them with." */
function missingLine(slots: string[]): string {
  const list = slots.map((s) => s.toLowerCase());
  const named =
    list.length < 2 ? list[0] : `${list.slice(0, -1).join(", ")} or ${list.at(-1)}`;
  return `No ${named} today. No suitable equipment or lighter weight here for ${list.length === 1 ? "it" : "them"}.`;
}

/**
 * What words and shapes are drawn in: on the day's clay, its ink and a
 * softer one; in the cream well, the warm ink, each shape in its own colour
 * (`marks`).
 */
type CardInk = { field: string; ink: string; soft: string; marks?: boolean; line?: string };
const cardInk = (family: Family): CardInk => {
  const { card, ink } = CLAY_TONE[family];
  return { field: card, ink, soft: mix(ink, card, 0.15) };
};

/** A shape in a list: its own colours in the well, else the card's ink. */
function RowMark({ family, size, ink }: { family: Family; size: number; ink: CardInk }) {
  return <Mark family={family} size={size} color={ink.marks ? undefined : ink.ink} />;
}

/** The left column every shape sits in, and the edge every word starts on. */
const MARKS = 30;
const GAP = 14;
const INDENT = MARKS + GAP;

/** Today's rows: roomy when there is space, never under the tightest that still reads. */
const ROWS = { most: 44, least: 36 } as const;

/** The next workout, with short change labels tucked beneath the figures. */
function Preview({ rows, rowHeight = ROWS.most, ink }: { rows: PreviewRow[]; rowHeight?: number; ink: CardInk }) {
  return (
    <View accessibilityRole="list">
      {rows.map((r, i) => {
        const timed = r.family === "cardio" || r.family === "mobility" || r.family === "goal";
        const strong = !!r.adjustmentLabel || r.family === "goal";
        const figure = timed ? r.amount : r.guess ? undefined : (r.weight ?? r.amount);
        return (
          <View
            key={r.id}
            accessible
            accessibilityLabel={[r.name, figure, r.adjustment].filter(Boolean).join(". ")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: GAP,
              minHeight: rowHeight,
              paddingVertical: rowHeight >= ROWS.most ? 6 : 4,
              // A hairline between rows, faint, in the card's ink.
              ...(i > 0 && ink.line ? { borderTopWidth: 1, borderTopColor: ink.line } : {}),
            }}
          >
            <View style={{ width: MARKS, alignItems: "center" }}>
              <RowMark family={r.family} size={22} ink={ink} />
            </View>
            <Text style={{ flex: 1, color: ink.ink, fontFamily: fonts.regular, fontSize: 17, lineHeight: 22 }}>
              {r.name}
            </Text>
            {figure ? (
              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text
                  style={{
                    color: strong ? ink.ink : ink.soft,
                    fontFamily: strong ? fonts.medium : fonts.regular,
                    fontSize: 15,
                    lineHeight: 19,
                    textAlign: "right",
                    fontVariant: ["lining-nums", "tabular-nums"],
                  }}
                >
                  {figure}
                </Text>
                {r.adjustmentLabel ? (
                  <Text style={{ color: ink.soft, fontFamily: fonts.italic, fontSize: 13, lineHeight: 16, textAlign: "right" }}>
                    {r.adjustmentLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The two things Today asks: big enough to hit without looking twice. Start
 * is drawn in the day's colour — the field it opens onto — with that field's
 * own words, white or navy.
 */
/**
 * The workout you left part way: its cards as they stand — a filled circle
 * and "Done" for what is done, an empty one for what is not — the same
 * marks as the workout card in the session.
 */
function Progress({ ink }: { ink: CardInk }) {
  const { state } = useSession();
  const active = state.active;
  if (!active) return null;
  return (
    <View accessibilityRole="list" style={{ gap: 4 }}>
      {active.items.map((it, i) => {
        const done = cardMark(state, i) === "done";
        const color = ink.marks ? FAMILY[itemFamily(it)].mark : ink.ink;
        // Done is a band in its own colour with a tick, as in the workout's
        // own list (the pull-down): the same list, marked the same way.
        // Padded out past the column, so the words stay where they were.
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={`${cardName(state, i)}, ${done ? "done" : "not done"}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: GAP,
              minHeight: 44,
              marginHorizontal: -10,
              paddingHorizontal: 10,
              borderRadius: radii.button,
              borderCurve: "continuous",
              // Done: a solid band, a clear shade darker than the card.
              backgroundColor: done ? mix(ink.field, ink.ink, 0.2) : "transparent",
            }}
          >
            <View style={{ width: MARKS, alignItems: "center" }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: color,
                  backgroundColor: done ? color : "transparent",
                }}
              />
            </View>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: ink.ink,
                fontFamily: fonts.regular,
                fontSize: 17,
                textDecorationLine: done ? "line-through" : "none",
              }}
            >
              {cardName(state, i)}
            </Text>
            {done ? <Icon name="check" size={20} color={ink.ink} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function BigButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  /** The day's family, on the one button that moves you on. */
  primary?: Family;
  onPress: () => void;
}) {
  // Always solid ink: a pale grey day would make it look switched off.
  return (
    <Button
      label={label}
      kind={primary ? "primary" : "secondary"}
      // The day's clay, its word in the warm ink.
      fill={primary ? CLAY_TONE[primary].card : undefined}
      onFill={primary ? CLAY_TONE[primary].ink : colors.bg}
      // Start is the answer nearly every time, so it takes twice the room.
      flex={primary ? 2 : 1}
      onPress={onPress}
    />
  );
}
