import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Children, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Pressable, ScrollView, View, type TextStyle, type ViewStyle } from "react-native";
import { Text, TextInput } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { useBarActions } from "@/components/bar-actions";
import { ActionButton, useBarSpace } from "@/components/bottom-bar";
import { Field, useColors } from "@/components/field";
import { Icon, type IconName } from "@/components/icon";
import { Mark } from "@/components/mark";
import { GuideButton } from "@/components/guide";
import { Illustration } from "@/components/illustration";
import { Sheet } from "@/components/sheet";
import { RestTimer } from "@/components/rest-timer";
import { colors, FAMILY, fieldColors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { ownCue } from "@/data/guides";
import type { Family } from "@/data/families";
import {
  FINISHED_LINES,
  OUTCOME_LINES,
  pickLine,
  WARMUP_SKIP_LINES,
  type FinishedMood,
} from "@/data/voice";
import {
  courseLabel,
  distanceLabel,
  parseTime,
  pictureOf,
  timeLabel,
  type CardioExercise,
  type MobilityMove,
  type MobilityRoutine,
} from "@/data/conditioning";
import { decayLabel } from "@/lib/progression";
import { weightLabel } from "@/lib/warmup";
import {
  addSuperset,
  allSetsLogged,
  cardioRecord,
  completeCardio,
  completeExercise,
  conditioningPool,
  currentCardio,
  currentRoutine,
  currentPool,
  currentPrescription,
  currentTaken,
  currentWarmup,
  currentWorkout,
  exerciseCount,
  dismissWarmup,
  editWeight,
  finishWorkout,
  isCardio,
  isBetter,
  isComplete,
  isConditioning,
  itemFamily,
  isMobility,
  isTimed,
  lastScore,
  nudgeScore,
  nextAfterSession,
  nextTime,
  sessionTally,
  nudgeWeight,
  partnerPrescription,
  previousExercise,
  removeSuperset,
  resetSet,
  scoreOf,
  setScore,
  skipExercise,
  supersetOptions,
  swapConditioning,
  swapForSession,
  tapSet,
  nextItemName,
  completeMove,
  useSession,
  type Item,
} from "@/store/session";


/**
 * The lift screen's rhythm, top to bottom: the name with how-to and swap
 * under it, the weight, the circles, a line on last time, and room for a
 * superset — the gaps between them, and each block's height.
 *
 * Mid-workout you tap without really looking, so nothing may move under the
 * thumb: each block is sized for its largest case — a two-line remark, a
 * five-figure weight — and smaller content sits inside that space rather than
 * shrinking it. A superset folds a second lift in, so the same blocks are
 * drawn tighter to fit both above the bar.
 */
const LAYOUT = {
  solo: { name: 28, weight: 42, number: 84, sets: 40, under: 84, underGap: 20 },
  paired: { name: 18, weight: 22, number: 64, sets: 22, under: 58, underGap: 10 },
} as const;

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

export default function WorkoutScreen() {
  const { state, setState } = useSession();
  const barSpace = useBarSpace();
  const [picking, setPicking] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const active = state.active;
  const done = !active || isComplete(state);
  const inWarmup = !!active && !done && currentWarmup(state).length > 0;
  // Skip on a warm-up is refused once, with a word from Akilles; pressed
  // again it skips the warm-up only, never the exercise behind it.
  const [skipWarned, setSkipWarned] = useState(false);
  useEffect(() => setSkipWarned(false), [active?.cursor, inWarmup]);

  // The bar itself lives in the root layout; this only swaps its buttons.
  useBarActions(
    active && !done ? (
      <>
        <ActionButton
          icon="previous"
          label="Back"
          disabled={active.cursor === 0}
          onPress={() => {
            setPicking(false);
            setState((s) => previousExercise(s));
          }}
        />
        <ActionButton
          icon="leave"
          label="Leave"
          onPress={() => {
            // Leaving steps out without ending anything: the session stays
            // where it is, and Today offers to continue it or end it.
            setPicking(false);
            router.replace("/");
          }}
        />
        <ActionButton
          icon="next"
          label="Skip"
          onPress={() => {
            setPicking(false);
            if (!inWarmup) {
              setState((s) => skipExercise(s));
            } else if (!skipWarned) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setSkipWarned(true);
            } else {
              setState((s) => dismissWarmup(s));
            }
          }}
        />
      </>
    ) : null,
    [active?.cursor, done, inWarmup, skipWarned],
  );

  // Hooks must all run before this: the bar publish above is one of them.
  if (done) return <Finished hasSession={!!active} />;


  const item = active.items[active.cursor];

  // Cardio and mobility are their own screens: no weight, no rep circles and
  // no rep ladder. They still sit inside the same session, so the bar's Back,
  // Leave and Skip work on them exactly as on a lift. Each is drawn on its
  // family's colour, like a lift.
  if (isMobility(item)) {
    return (
      <OnField family="mobility">
        <Mobility key={item.slot} item={item} />
      </OnField>
    );
  }
  if (isConditioning(item)) {
    return (
      <OnField family="cardio">
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

  if (warmup.length > 0) {
    return (
      <OnField family={family}>
        <Warmup
          family={family}
          name={p.exercise.name}
          sets={warmup}
          perHand={p.exercise.perHand}
          refusal={skipWarned ? pickLine(WARMUP_SKIP_LINES, `${active.startedAt}:${item.slot}`) : null}
          onReady={() => setState((s) => dismissWarmup(s))}
        />
      </OnField>
    );
  }

  // Moving on is always your call: filling the last circle changes nothing
  // but this button, so a rep or a weight can still be fixed before you go.
  const logged = allSetsLogged(state);
  const after = nextItemName(state);
  const next = () => {
    setPicking(false);
    setState((s) => completeExercise(s));
  };
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

  // Said in italics beside the buttons under the name, where it applies.
  const note = [
    p.reload ? "reload" : null,
    p.exercise.timed ? "seconds, not reps" : null,
    item.derive
      ? `${Math.round(item.derive.fraction * 100)}% of ${byId(item.derive.from)!.name.toLowerCase()}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <OnField family={family}>
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        {/* What, and how to: read once, then left alone. */}
        <Title family={family} name={p.exercise.name} note={note} style={{ marginTop: L.name }}>
          <GuideButton id={p.exercise.id} name={p.exercise.name} cue={p.exercise.cue} size={40} />
          {canSwap ? (
            <ToolButton icon="swap" label="Choose a different exercise" onPress={() => setSwapping(true)} />
          ) : null}
        </Title>

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

        <View style={{ height: L.number, marginTop: L.weight, justifyContent: "center" }}>
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
              weight={p.weight}
              bodyweight={p.exercise.bodyweight}
              holds={p.exercise.holds}
              perHand={p.exercise.perHand}
              size={L.number}
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
            logged={item.supersetLogged}
            onTap={(i) => setState((s) => tapSet(s, i, "partner"))}
            onReset={(i) => setState((s) => resetSet(s, i, "partner"))}
            onRemove={() => setState((s) => removeSuperset(s))}
          />
        ) : options.length > 0 ? (
          // An extra, so a soft pill: the solid button below is the way on.
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking(true)}
            style={({ pressed }) => ({
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 44,
              marginTop: 14,
              paddingHorizontal: 18,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="plus" size={16} color={colors.text} weight="semibold" />
            <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19 }}>
              Add superset
            </Text>
          </Pressable>
        ) : null}

        <Sheet visible={picking} title="Superset with" onClose={() => setPicking(false)}>
          <SupersetPicker
            options={options}
            onPick={(id) => {
              setPicking(false);
              setState((s) => addSuperset(s, id));
            }}
          />
        </Sheet>
      </ScrollView>

      {/* Pinned where the warm-up's Ready and cardio's Done sit, so the way on
          is always under the same thumb and never scrolled away. It wakes up
          once every circle — the partner's too — is filled; moving on before
          that is Skip's job. */}
      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        <Column>
          <Action
            label={after ? `Next: ${after}` : "Finish workout"}
            arrow
            fill
            disabled={!logged}
            onPress={next}
          />
        </Column>
      </View>
    </View>
    </OnField>
  );
}

/**
 * Draws everything inside on the family's colour, with the status bar to
 * match: light over the dark fields, dark over the light ones.
 */
function OnField({ family, children }: PropsWithChildren<{ family: Family }>) {
  return (
    <Field family={family}>
      <StatusBar style={FAMILY[family].dark ? "light" : "dark"} />
      {children}
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
  const active = state.active;
  if (!active) return null;

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
  style,
  children,
}: PropsWithChildren<{ family: Family; name: string; note?: string; style?: ViewStyle }>) {
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
          {note ? (
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
function Weight({ weight, unit, size }: { weight: number; unit: string; size: number }) {
  const colors = useColors();
  const text = String(weight);
  // A five-character weight (102.5) is set a size down, so it and its unit
  // still fit between the steppers.
  const fit = text.length > 4 ? Math.round(size * 0.84) : size;
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.semibold,
          fontSize: fit,
          letterSpacing: -fit * 0.02,
          fontVariant: ["lining-nums", "tabular-nums"],
        }}
      >
        {text}
      </Text>
      <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>{unit}</Text>
    </View>
  );
}

/** A cardio block: the machine, how long, the score, one action. */
function Conditioning({ item }: { item: Item }) {
  const colors = useColors();
  const barSpace = useBarSpace();
  const { state, setState } = useSession();
  const [swapping, setSwapping] = useState(false);

  const cardio = currentCardio(state);
  const pool = conditioningPool(state, item);

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
        >
          {cardio ? <GuideButton id={cardio.id} name={cardio.name} cue={cardio.cue} size={40} /> : null}
          {pool.length > 1 ? (
            <ToolButton icon="swap" label="Choose a different machine" onPress={() => setSwapping(true)} />
          ) : null}
        </Title>

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
          <View style={{ marginTop: LAYOUT.solo.weight }}>
          <CardioBody
            cardio={cardio}
            item={item}
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
  last,
  record,
  onNudge,
  onSet,
}: {
  cardio: CardioExercise;
  item: Item;
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

  const beat = record && score !== null && isBetter(item, score, record.last);
  const isBest = record && score !== null && isBetter(item, score, record.best);
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
              accessibilityLabel={timed ? "Your time" : `Distance in ${unit}`}
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
              {timed ? "Fastest" : "Furthest"} {label(record.best)} · {record.sessions}{" "}
              {record.sessions === 1 ? "time" : "times"}
            </Text>
          </>
        ) : (
          <Text numberOfLines={3} style={line}>
            {timed
              ? `First ${courseLabel(cardio, item.course!)} on the ${cardio.name.toLowerCase()}. Enter your time when you finish — it becomes the mark to beat.`
              : `First ${item.minutes} minutes on the ${cardio.name.toLowerCase()}. Enter the distance when the clock runs out — it becomes the mark to beat.`}
          </Text>
        )}
        {/* Said only when it is true — a line that always shows says nothing. */}
        {isBest || beat ? (
          <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 22 }}>
            {isBest
              ? timed ? "Fastest yet." : "Furthest yet."
              : timed ? "Faster than last time." : "Past last time."}
          </Text>
        ) : null}
      </View>

      <Text style={[line, { marginTop: 12, fontSize: 17, lineHeight: 23 }]}>
        {cardio.cue ??
          (timed
            ? "Same distance each time — the time is the score."
            : "Same minutes each time — the distance is the score.")}
      </Text>
    </View>
  );
}

/**
 * The mobility routine as a deck of cards: one per stretch, one per side where
 * a stretch has two. Each card is the picture, the name, a line on how, and a
 * countdown. Start it, hold, and when it runs out swipe — or press Next — for
 * the next one. The button is the whole control, so it never moves: Start,
 * Pause, Resume, Next, and Finish on the last card.
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

type Card = { move: MobilityMove; index: number; side: "Left side" | "Right side" | null };

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
      setLeft((l) => {
        const next = l.map((v, i) => (i === running.page ? 0 : v));
        const { index } = cards[running.page];
        // The pose is done once every side of it is.
        if (cards.every((c, i) => c.index !== index || next[i] <= 0)) onMoveDone(index);
        return next;
      });
    }, 200);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const pause = () => {
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
  const action = running
    ? { label: "Pause", onPress: pause }
    : done
      ? last
        ? { label: "Finish", onPress: onFinish }
        : { label: "Next", onPress: () => goTo(page + 1) }
      : {
          label: started ? "Resume" : `Start · ${timeLabel(card.move.seconds)}`,
          onPress: () => setRunning({ page, endAt: Date.now() + left[page] * 1000 }),
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
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const p = Math.round(e.nativeEvent.contentOffset.x / width);
              if (p !== page && p >= 0 && p < cards.length) {
                // Swiping away mid-hold pauses it; the time left is kept.
                pause();
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
            {done && !last ? "Swipe for the next stretch" : ""}
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
        <Illustration id={pictureOf(move)} style={{ flex: 1 }} />
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <GuideButton id={pictureOf(move)} name={move.name} cue={move.cue} onPicture />
        </View>
      </View>

      <View style={{ gap: 6, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>
            {side ?? "Hold"}
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
            {done ? "Done" : timeLabel(Math.ceil(left))}
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
 * The ramp before the first exercise of a muscle group. Nothing here is
 * logged or progressed — it exists to get you ready to lift the real weight.
 */
function Warmup({
  family,
  name,
  sets,
  perHand,
  refusal,
  onReady,
}: {
  family: Family;
  name: string;
  sets: { weight: number; reps: number }[];
  perHand?: boolean;
  /** Akilles' answer to Skip, while it stands. */
  refusal: string | null;
  onReady: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  // Local: a warm-up is never recorded, so this only exists to stop you
  // tapping past the screen without reading it.
  const [done, setDone] = useState<boolean[]>(() => sets.map(() => false));
  const allDone = done.every(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingTop: insets.top,
        }}
      >
        <Column style={{ gap: 26 }}>
          <Title family={family} name={name} note="warm-up sets" />

          <View>
            {sets.map((set, i) => (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done[i] }}
                accessibilityLabel={`${set.weight} kg for ${set.reps} reps`}
                onPress={() =>
                  setDone((v) => v.map((d, j) => (j === i ? !d : d)))
                }
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderBottomWidth: i === sets.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  paddingVertical: 14,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    opacity: done[i] ? 0.6 : 1,
                    fontFamily: fonts.semibold,
                    fontSize: 36,
                    fontVariant: ["lining-nums", "tabular-nums"],
                    textDecorationLine: done[i] ? "line-through" : "none",
                  }}
                >
                  {set.weight} kg{perHand ? " ×2" : ""}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.regular,
                    fontSize: 22,
                    fontVariant: ["lining-nums", "tabular-nums"],
                  }}
                >
                  × {set.reps}
                </Text>

                <View
                  style={{
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: done[i] ? 0 : 2,
                    borderColor: colors.text,
                    backgroundColor: done[i] ? colors.cloud : "transparent",
                  }}
                >
                  {done[i] ? <Icon name="check" size={16} color={colors.ink} weight="bold" /> : null}
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 25 }}>
            Tap each set as you finish it. Not counted — move well and stop
            short of effort.
          </Text>
        </Column>
      </View>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        <Column style={{ gap: 14 }}>
          {/* Always this tall, empty until Skip is pressed, so the refusal
              appearing moves nothing under the thumb. */}
          <View style={{ height: 76, justifyContent: "flex-end", gap: 4 }}>
            {refusal ? (
              <>
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.text,
                    fontFamily: fonts.italic,
                    fontSize: 24,
                  }}
                >
                  {refusal}
                </Text>
                <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 17 }}>
                  Press Skip again to go straight to the working sets.
                </Text>
              </>
            ) : null}
          </View>
          <Action
            label="Ready"
            fill
            disabled={!allDone}
            onPress={onReady}
          />
        </Column>
      </View>
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
}: {
  logged: (number | null)[];
  target: number;
  onTap: (index: number) => void;
  /** Long press: back to the target in one go. */
  onReset: (index: number) => void;
  /** Which lift these are for — see `CIRCLES`. */
  role?: keyof typeof CIRCLES;
}) {
  const colors = useColors();
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
      {logged.map((reps, i) => {
        const filled = reps !== null;
        const short = filled && reps < target;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Set ${i + 1}${filled ? `, ${reps} reps` : `, target ${target}, not logged`}`}
            accessibilityHint="Tap to log or count down. Hold to reset to the target."
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
              borderWidth: filled ? 0 : role === "partner" ? 2 : 3,
              borderColor: colors.text,
              backgroundColor: filled ? (short ? colors.raised : colors.cloud) : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                // Garamond's figures sit a touch low in a circle: lift them
                // to its optical centre.
                marginTop: -Math.round(fontSize * 0.08),
                color: filled && !short ? colors.ink : colors.text,
                fontFamily: fonts.semibold,
                fontSize,
                fontVariant: ["lining-nums", "tabular-nums"],
              }}
            >
              {filled ? reps : target}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The weight, editable at any time: step it with − and +, or tap the number
 * to type one.
 */
function WeightControl({
  weight,
  bodyweight,
  holds,
  perHand,
  size,
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
  onNudge: (direction: 1 | -1) => void;
  onSet: (weight: number) => void;
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<string | null>(null);
  const unit = unitFor({ perHand, bodyweight, holds }, weight);

  const commit = () => {
    if (draft !== null) {
      const parsed = parseFloat(draft.replace(",", "."));
      if (!Number.isNaN(parsed)) onSet(parsed);
    }
    setDraft(null);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Step label="−" onPress={() => onNudge(-1)} />

      {draft !== null ? (
        // Typing: the number becomes a field with the number pad up. The
        // input needs an explicit width: on web a TextInput has an intrinsic
        // size that ignores flex and overflows its row.
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={holds ? "Hold in seconds" : "Weight in kilograms"}
            style={{
              width: Math.round(size * 2.1),
              padding: 0,
              color: colors.text,
              fontFamily: fonts.semibold,
              fontSize: size,
              letterSpacing: -size * 0.02,
              textAlign: "right",
              fontVariant: ["lining-nums", "tabular-nums"],
            }}
          />
          <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>{unit}</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            bodyweight && weight === 0
              ? holds
                ? "Bodyweight, no hold. Tap to type a hold in seconds"
                : "Bodyweight. Tap to add load"
              : `${weight} ${unit}. Tap to type ${holds ? "a hold" : "a weight"}`
          }
          onPress={() => setDraft(String(weight))}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          {bodyweight && weight === 0 ? (
            // An unloaded bodyweight lift has no number worth showing — a
            // bare "0 kg" reads as an error. Tap it to add weight (belt,
            // dumbbell).
            <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: Math.round(size * 0.5) }}>
              Bodyweight
            </Text>
          ) : (
            <Weight weight={weight} unit={unit} size={size} />
          )}
        </Pressable>
      )}

      <Step label="+" onPress={() => onNudge(1)} />
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

/**
 * The line under the circles, which follows the exercise through. Before the
 * first set, where today's number came from — last time's weight and reps,
 * the reps in small circles like the ones above, or why it changed. Between
 * sets, how to own the next one: the position to hold. Once every set is in,
 * what that means for next time: a line from Akilles, and the plain fact
 * under it.
 */
function Why({
  prescription,
  result,
  started,
  compact,
}: {
  prescription: ReturnType<typeof currentPrescription>;
  /** Every set is in: what it means for next time, shown in the hint's place. */
  result: { fact: string; quip: string } | null;
  /** A set is logged, so where the number came from has been read. */
  started: boolean;
  /** Sharing the screen with a superset: one line for the remark. */
  compact?: boolean;
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
        <Text numberOfLines={1} style={line}>
          {result.fact}
        </Text>
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
      {arrow && on ? <Icon name="forward" size={20} color={colors.ink} weight="semibold" /> : null}
    </Pressable>
  );
}

function Finished({ hasSession }: { hasSession: boolean }) {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();

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
        backgroundColor: colors.bg,
        paddingTop: insets.top + 90,
        paddingHorizontal: 22,
        // The floating bar sits over the foot of the screen; clear it.
        paddingBottom: barSpace + 14,
      }}
    >
      <Column style={{ gap: 12 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 60, lineHeight: 66 }}>
          Done.
        </Text>
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
        <Action label="Close" fill onPress={close} />
      </Column>
    </View>
  );
}
