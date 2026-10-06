import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { useBarActions } from "@/components/bar-actions";
import { ActionButton, useBarSpace } from "@/components/bottom-bar";
import { HoldButton } from "@/components/hold-button";
import { Icon, type IconName } from "@/components/icon";
import { GuideButton } from "@/components/guide";
import { Illustration } from "@/components/illustration";
import { Sheet } from "@/components/sheet";
import { colors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
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
  chooseConditioning,
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
  swapForSession,
  tapSet,
  completeMove,
  useSession,
  type Item,
} from "@/store/session";


/**
 * Fixed heights for everything on the exercise screen whose content varies.
 *
 * Mid-workout you tap without really looking, so nothing may move under the
 * thumb: each block is sized for its largest case — a two-line name, a
 * 68pt weight, three lines of "last time", the tallest action — and smaller
 * content sits inside that space rather than shrinking it.
 */
const FIXED = {
  /** Two lines of the exercise name; longer names shrink to fit. */
  name: 80,
  /** The "seconds, not reps" line, reserved whether or not it shows. */
  note: 20,
  /** Weight row: the 44pt steppers are the tallest of its forms. */
  weight: 56,
  /** Set circles never grow past this, so two sets are as tall as four. */
  circle: 96,
  /** Up to three lines of "last time". */
  why: 57,
  /** The tallest answer: a two-line quip and its fact above a 60pt button. */
  action: 140,
} as const;

export default function WorkoutScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
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
        <HoldButton
          icon="close"
          label="Leave"
          onHold={() => {
            // Leaving ends the session: whatever went unlogged is recorded as
            // skipped, and the cycle moves on. Nothing is owed. Leaving before
            // anything was logged cancels instead — see `finishWorkout`. Held
            // rather than tapped so a stray thumb mid-set can't end the workout.
            setState((s) => finishWorkout(s));
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
  // Leave and Skip work on them exactly as on a lift.
  if (isMobility(item)) return <Mobility key={item.slot} item={item} />;
  if (isConditioning(item)) return <Conditioning key={item.slot} item={item} />;

  const p = currentPrescription(state)!;
  const partner = item.supersetWith ? byId(item.supersetWith) : undefined;
  // The partner keeps its own scheme, set count and set log when folded in.
  const partnerP = partnerPrescription(state);
  const options = supersetOptions(state);

  const logged = allSetsLogged(state);
  const warmup = currentWarmup(state);
  // Swapping after the first set is logged would throw that work away.
  const pool = currentPool(state);
  const canSwap = pool.length > 1 && !item.logged.some((r) => r !== null);

  if (warmup.length > 0) {
    return (
      <Warmup
        name={p.exercise.name}
        sets={warmup}
        perHand={p.exercise.perHand}
        refusal={skipWarned ? pickLine(WARMUP_SKIP_LINES, `${active.startedAt}:${item.slot}`) : null}
        onReady={() => setState((s) => dismissWarmup(s))}
      />
    );
  }

  const next = () => {
    setPicking(false);
    setState((s) => completeExercise(s));
  };
  // Said before you move on, so what happens next time is never a surprise:
  // a line with some attitude, and the plain fact under it.
  const verdict = nextTime(state);
  const quip = verdict
    ? pickLine(OUTCOME_LINES[verdict.outcome], `${active.startedAt}:${active.cursor}`)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 22,
          paddingBottom: 12,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          gap: 14,
        }}
      >
        {/* What and how heavy: compact, at the top. Read once, then left alone. */}
        <View style={{ gap: 2 }}>
          <View
            style={{ height: FIXED.name, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: fonts.display,
                textTransform: "uppercase",
                fontSize: 36,
                lineHeight: 38,
                letterSpacing: 0.3,
              }}
            >
              {p.exercise.name}
            </Text>
            <GuideButton id={p.exercise.id} name={p.exercise.name} cue={p.exercise.cue} />
            {canSwap ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a different exercise"
                onPress={() => setSwapping((v) => !v)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: swapping ? colors.cloud : colors.raised,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="swap" size={20} color={swapping ? colors.ink : colors.muted} />
              </Pressable>
            ) : null}
          </View>
          <Text
            style={{ height: FIXED.note, color: colors.muted, fontSize: 15, fontWeight: "600" }}
          >
            {p.exercise.timed ? "seconds, not reps" : ""}
          </Text>
        </View>

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

        <View style={{ height: FIXED.weight, justifyContent: "center" }}>
        {p.exercise.unloaded ? (
          <Text style={{ textAlign: "center", color: colors.faint, fontSize: 17, fontWeight: "700" }}>
            No weight — just the reps
          </Text>
        ) : item.derive ? (
          // Derived from the heavy day's weight, so there is nothing to edit.
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Text
              style={{
                color: colors.rise,
                fontFamily: fonts.displayBold,
                fontSize: 48,
                letterSpacing: 0,
                fontVariant: ["tabular-nums"],
              }}
            >
              {p.weight}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 18, fontWeight: "700" }}>
              {p.exercise.perHand ? "kg ×2" : "kg"}
            </Text>
            <Text style={{ color: colors.faint, fontSize: 13, marginLeft: 6 }}>
              {Math.round(item.derive.fraction * 100)}% of{" "}
              {byId(item.derive.from)!.name.toLowerCase()}
            </Text>
          </View>
        ) : (
          <WeightControl
            weight={p.weight}
            bodyweight={p.exercise.bodyweight}
            perHand={p.exercise.perHand}
            onNudge={(d) => setState((s) => nudgeWeight(s, d))}
            onSet={(w) => setState((s) => editWeight(s, w))}
          />
        )}
        </View>

        {/* The circles are the screen: centred in whatever room is left, so
            they sit in the same place on every exercise. */}
        <View style={{ flex: 1, minHeight: FIXED.circle + FIXED.why + 60, justifyContent: "center", gap: 18 }}>
          <Sets
            logged={item.logged}
            target={p.reps}
            onTap={(i) => setState((s) => tapSet(s, i))}
            onReset={(i) => setState((s) => resetSet(s, i))}
          />
          <Why prescription={p} />
        </View>

        {partner && partnerP && item.supersetLogged ? (
          <Partner
            name={partner.name}
            weight={partner.unloaded ? "No weight — just the reps" : weightLabel(partner, partnerP.weight)}
            sets={partnerP.sets}
            target={partnerP.reps}
            timed={partner.timed}
            logged={item.supersetLogged}
            onTap={(i) => setState((s) => tapSet(s, i, "partner"))}
            onReset={(i) => setState((s) => resetSet(s, i, "partner"))}
            onRemove={() => setState((s) => removeSuperset(s))}
          />
        ) : options.length > 0 ? (
          // Offered, not pushed: a quiet link under the circles.
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking(true)}
            hitSlop={8}
            style={({ pressed }) => ({
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 12,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon name="plus" size={14} color={colors.muted} weight="semibold" />
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>
              Superset
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

      {/* The action: once every set is logged, one button on. The reps
          already say how it went, so nothing is asked. */}
      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        <Column style={{ height: FIXED.action, justifyContent: "flex-end" }}>
          {logged ? (
            <View style={{ gap: 12 }}>
              {verdict && quip ? (
                <View style={{ alignItems: "center", gap: 3 }}>
                  <Text
                    style={{
                      textAlign: "center",
                      color: verdict.outcome === "hit" ? colors.rise : colors.bend,
                      fontFamily: fonts.voice,
                      fontSize: 22,
                    }}
                  >
                    {quip}
                  </Text>
                  <Text style={{ textAlign: "center", color: colors.faint, fontSize: 13 }}>
                    {verdict.fact}
                  </Text>
                </View>
              ) : null}
              <Action label="Next exercise" fill onPress={next} />
            </View>
          ) : null}
        </Column>
      </View>

    </View>
  );
}

/**
 * Where you are in the session: the module's name, and one segment per block.
 *
 * Shared by the lifting screen and the conditioning ones so the bar of
 * progress does not jump or reset when the session moves between them.
 */
function Header() {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const active = state.active;
  if (!active) return null;

  return (
    <View
      style={{ paddingTop: insets.top + 14, paddingHorizontal: 22, paddingBottom: 14 }}
    >
      <Column style={{ gap: 12 }}>
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 1.3,
            textTransform: "uppercase",
          }}
        >
          {currentWorkout(state).name}
        </Text>

        {/* One segment per exercise, weighted: a paired screen holds two
            exercises, so it is twice as wide and the total never changes
            when you superset. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, flexDirection: "row", gap: 3 }}>
            {active.items.map((it, i) => (
              <View
                key={i}
                style={{
                  flex: it.supersetWith ? 2 : 1,
                  height: 3,
                  borderRadius: 999,
                  backgroundColor:
                    i < active.cursor
                      ? colors.rise
                      : i === active.cursor
                        ? colors.muted
                        : colors.line,
                }}
              />
            ))}
          </View>
          <Text
            style={{
              color: colors.faint,
              fontSize: 11,
              fontWeight: "800",
              fontVariant: ["tabular-nums"],
            }}
          >
            {exerciseCount(state, "done") + 1}/{exerciseCount(state, "total")}
          </Text>
        </View>
      </Column>
    </View>
  );
}

/** A cardio block: heading, swap button, the score, one action. */
function Conditioning({ item }: { item: Item }) {
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
          gap: 22,
        }}
      >
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: colors.rise,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            {isTimed(item) && cardio ? courseLabel(cardio, item.course!) : `${item.minutes} minutes`}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: fonts.display,
                textTransform: "uppercase",
                fontSize: 48,
                lineHeight: 49,
                letterSpacing: 0.3,
              }}
            >
              {cardio?.name ?? ""}
            </Text>

            {cardio ? <GuideButton id={cardio.id} name={cardio.name} cue={cardio.cue} /> : null}

            {pool.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a different machine"
                onPress={() => setSwapping((v) => !v)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: swapping ? colors.cloud : colors.raised,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="swap" size={20} color={swapping ? colors.ink : colors.muted} />
              </Pressable>
            ) : null}
          </View>

        </View>

        <Sheet
          visible={swapping}
          title="Choose a machine"
          onClose={() => setSwapping(false)}
        >
          <ConditioningSwap
            options={pool}
            current={item.exerciseId}
            onPick={(id) => {
              setSwapping(false);
              setState((s) => chooseConditioning(s, item.slot, id));
            }}
          />
        </Sheet>

        {cardio ? (
          <CardioBody
            cardio={cardio}
            item={item}
            last={last}
            record={cardioRecord(state, item)}
            onNudge={(d) => setState((s) => nudgeScore(s, d))}
            onSet={(v) => setState((s) => setScore(s, v))}
          />
        ) : null}

      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        <Column style={{ gap: 10 }}>
          {needsScore ? (
            <Text style={{ textAlign: "center", color: colors.faint, fontSize: 13 }}>
              {isTimed(item)
                ? "Enter your time when you finish — or skip the block."
                : "Enter the distance when the clock runs out — or skip the block."}
            </Text>
          ) : null}
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
 * Your score, and the mark to beat.
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
  const [draft, setDraft] = useState<string | null>(null);
  const timed = isTimed(item);
  const score = scoreOf(item);
  const { decimals, unit } = cardio.metric;

  // The box shows a bare number; the card around it says what it means.
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

  return (
    <View style={{ gap: 22 }}>
      {/* The target: what you did last time on this machine, over this same
          length. Absent the first time — there is nothing to chase yet. */}
      <View
        style={{
          gap: 10,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          padding: 18,
        }}
      >
        {record ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
              <Text
                style={{
                  color: colors.faint,
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                To beat
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: "800",
                  letterSpacing: -0.8,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {label(record.last)}
              </Text>
            </View>
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              {timed ? "Fastest" : "Furthest"} {label(record.best)} · {record.sessions}{" "}
              {record.sessions === 1 ? "session" : "sessions"}
              {timed ? ` over ${courseLabel(cardio, item.course!)}.` : " on this machine."}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
            {timed
              ? `First ${courseLabel(cardio, item.course!)} on the ${cardio.name.toLowerCase()}. Your time becomes the mark to beat next time.`
              : `First ${item.minutes} minutes on the ${cardio.name.toLowerCase()}. Whatever you cover becomes the mark to beat next time.`}
          </Text>
        )}
      </View>

      {/* The score, entered the same way a weight is: type it or step it. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Step label="−" onPress={() => onNudge(-1)} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TextInput
            value={draft ?? (score === null ? "" : show(score))}
            // Last time's score until you change it, dimmed so it reads as
            // a starting point rather than something already logged.
            placeholder={show(last ?? 0)}
            placeholderTextColor={last === null ? colors.faint : colors.muted}
            onChangeText={setDraft}
            onFocus={() => setDraft((score ?? last) === null ? "" : show((score ?? last)!))}
            onBlur={commit}
            onSubmitEditing={commit}
            // A number pad on both: a time types as 4.52 or 452 and reads back as 4:52.
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={{
              // A time has no unit beside it, so it takes the unit's room.
              width: timed ? 214 : 160,
              color: colors.rise,
              fontFamily: fonts.displayBold,
              fontSize: 74,
              letterSpacing: 0,
              textAlign: timed ? "center" : "right",
              fontVariant: ["tabular-nums"],
            }}
          />
          {timed ? null : (
            <View style={{ width: 48 }}>
              <Text style={{ color: colors.muted, fontSize: 20, fontWeight: "700" }}>
                {unit}
              </Text>
            </View>
          )}
        </View>

        <Step label="+" onPress={() => onNudge(1)} />
      </View>

      {/* Said only when it is true — a line that always shows says nothing. */}
      {isBest ? (
        <Text
          style={{
            textAlign: "center",
            color: colors.rise,
            fontSize: 14,
            fontWeight: "800",
          }}
        >
          {timed ? "Fastest yet." : "Furthest yet."}
        </Text>
      ) : beat ? (
        <Text
          style={{
            textAlign: "center",
            color: colors.rise,
            fontSize: 14,
            fontWeight: "800",
          }}
        >
          {timed ? "Faster than last time." : "Past last time."}
        </Text>
      ) : null}

      <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
        {cardio.cue ??
          (timed
            ? "Same distance every session — the time is the score."
            : "Same minutes every session — the distance is the score.")}
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
  const routine = currentRoutine(state);
  const pool = conditioningPool(state, item);
  if (!routine) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header />

      <View style={{ paddingHorizontal: 22 }}>
        <Column style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: colors.rise,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              Mobility
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontFamily: fonts.display,
                textTransform: "uppercase",
                fontSize: 30,
                letterSpacing: 0.3,
              }}
            >
              {routine.name}
            </Text>
          </View>
          {pool.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a different routine"
              onPress={() => setSwapping(true)}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: colors.raised,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="swap" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </Column>
      </View>

      <Sheet visible={swapping} title="Choose a routine" onClose={() => setSwapping(false)}>
        <ConditioningSwap
          options={pool}
          current={item.exerciseId}
          onPick={(id) => {
            setSwapping(false);
            setState((s) => chooseConditioning(s, item.slot, id));
          }}
        />
      </Sheet>

      {/* Keyed by routine: a swap deals a fresh deck with fresh timers. */}
      <MobilityDeck
        key={routine.id}
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
          <Text style={{ height: 18, textAlign: "center", color: colors.faint, fontSize: 13 }}>
            {done && !last ? "Swipe for the next stretch" : ""}
          </Text>
          <Action label={action.label} fill onPress={action.onPress} />
        </Column>
      </View>
    </>
  );
}

function MobilityCard({ card, left, position }: { card: Card; left: number; position: string }) {
  const { move, side } = card;
  const done = left <= 0;
  const progress = 1 - left / move.seconds;

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flex: 1 }}>
        <Illustration id={move.id} style={{ flex: 1 }} />
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <GuideButton id={move.id} name={move.name} cue={move.cue} onPicture />
        </View>
      </View>

      <View style={{ gap: 6, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              flex: 1,
              color: colors.rise,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {side ?? "Hold"}
          </Text>
          <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "800" }}>{position}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: fonts.display,
              textTransform: "uppercase",
              fontSize: 32,
              lineHeight: 33,
              letterSpacing: 0.3,
            }}
          >
            {move.name}
          </Text>
          <Text
            style={{
              color: done ? colors.rise : colors.text,
              fontFamily: fonts.displayBold,
              fontSize: 52,
              lineHeight: 52,
              fontVariant: ["tabular-nums"],
            }}
          >
            {done ? "Done" : timeLabel(Math.ceil(left))}
          </Text>
        </View>

        {/* Two lines kept whether or not there is a cue, so cards line up. */}
        <Text numberOfLines={2} style={{ minHeight: 40, color: colors.muted, fontSize: 14, lineHeight: 20 }}>
          {move.cue ?? "Ease in, breathe slowly, and stop when the tension fades."}
        </Text>
      </View>

      {/* The hold, filling along the foot of the card. */}
      <View style={{ height: 6, backgroundColor: colors.raised }}>
        <View
          style={{
            width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
            height: 6,
            backgroundColor: colors.rise,
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
              <Text
                style={{
                  color: colors.faint,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                In use
              </Text>
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
  name,
  sets,
  perHand,
  refusal,
  onReady,
}: {
  name: string;
  sets: { weight: number; reps: number }[];
  perHand?: boolean;
  /** Akilles' answer to Skip, while it stands. */
  refusal: string | null;
  onReady: () => void;
}) {
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
          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: colors.rise,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              Warm up
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.display,
                textTransform: "uppercase",
                fontSize: 46,
                lineHeight: 47,
                letterSpacing: 0.3,
              }}
            >
              {name}
            </Text>
          </View>

          <View style={{ gap: 2 }}>
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
                  paddingVertical: 16,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    flex: 1,
                    color: done[i] ? colors.faint : colors.text,
                    fontFamily: fonts.displayBold,
                    fontSize: 36,
                    letterSpacing: 0,
                    fontVariant: ["tabular-nums"],
                    textDecorationLine: done[i] ? "line-through" : "none",
                  }}
                >
                  {set.weight} kg{perHand ? " ×2" : ""}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 18,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  × {set.reps}
                </Text>

                <View
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: done[i] ? 0 : 1.5,
                    borderColor: colors.line,
                    backgroundColor: done[i] ? colors.rise : "transparent",
                  }}
                >
                  {done[i] ? <Icon name="check" size={15} color={colors.ink} weight="bold" /> : null}
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
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
                    color: colors.bend,
                    fontFamily: fonts.voice,
                    fontSize: 22,
                  }}
                >
                  {refusal}
                </Text>
                <Text style={{ textAlign: "center", color: colors.faint, fontSize: 13 }}>
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
 * One circle per set. Empty until tapped, then filled at the target reps,
 * counting down on each further tap and clearing when it passes 1.
 */
function Sets({
  logged,
  target,
  onTap,
  onReset,
  compact,
}: {
  logged: (number | null)[];
  target: number;
  onTap: (index: number) => void;
  /** Long press: back to the target in one go. */
  onReset: (index: number) => void;
  /** Shorter circles for a supersetted partner, so the main lift stays primary. */
  compact?: boolean;
}) {
  // Every circle is the same fixed size, centred as a group, and the row
  // is always the same height — two sets must not make bigger circles than
  // four, or the screen changes shape from one exercise to the next. Only
  // when there are too many to fit do they shrink, and then inside the same
  // row height.
  const [width, setWidth] = useState(0);
  const full = compact ? 56 : FIXED.circle;
  const gap = compact ? 12 : 16;
  const n = logged.length;
  const fits = width > 0 ? (width - gap * (n - 1)) / n : full;
  const size = Math.max(36, Math.min(full, fits));
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
            accessibilityLabel={`Set ${i + 1}${filled ? `, ${reps} reps` : ", not logged"}`}
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
              borderWidth: filled ? 0 : 2,
              borderColor: colors.line,
              backgroundColor: filled
                ? short
                  ? colors.bend
                  : colors.rise
                : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: filled ? colors.ink : colors.faint,
                fontFamily: fonts.displayBold,
                fontSize: compact ? 24 : 38,
                fontVariant: ["tabular-nums"],
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

/** Weight, editable at any time: type into it or step it by one increment. */
function WeightControl({
  weight,
  bodyweight,
  perHand,
  onNudge,
  onSet,
}: {
  weight: number;
  bodyweight?: boolean;
  /** Held in each hand: the number shown is one dumbbell, marked ×2. */
  perHand?: boolean;
  onNudge: (direction: 1 | -1) => void;
  onSet: (weight: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null) {
      const parsed = parseFloat(draft.replace(",", "."));
      if (!Number.isNaN(parsed)) onSet(parsed);
    }
    setDraft(null);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <Step label="−" small onPress={() => onNudge(-1)} />

      {/* The input needs an explicit width: on web a TextInput has an
          intrinsic size that ignores flex and overflows its row. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {bodyweight && weight === 0 && draft === null ? (
          // An unloaded bodyweight lift has no number worth showing — a bare
          // "0 kg" reads as an error. Tap it to add weight (belt, dumbbell).
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bodyweight, tap to add load"
            onPress={() => setDraft("0")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={{
                width: 166,
                textAlign: "center",
                color: colors.rise,
                fontFamily: fonts.displayBold,
                fontSize: 31,
                letterSpacing: 0,
              }}
            >
              Bodyweight
            </Text>
          </Pressable>
        ) : (
          <>
        <TextInput
          value={draft ?? String(weight)}
          onChangeText={setDraft}
          onFocus={() => setDraft(String(weight))}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{
            width: 104,
            color: colors.rise,
            fontFamily: fonts.displayBold,
            fontSize: 48,
            letterSpacing: 0,
            textAlign: "right",
            fontVariant: ["tabular-nums"],
          }}
        />
        <View style={{ width: 56 }}>
          <Text style={{ color: colors.muted, fontSize: 17, fontWeight: "700" }}>
            kg
          </Text>
          {perHand ? (
            <Text style={{ color: colors.faint, fontSize: 13, fontWeight: "700" }}>
              ×2
            </Text>
          ) : null}
          {/* A negative weight on an assisted movement is help from the
              machine, not load — say so, or the number reads as an error. */}
          {weight < 0 ? (
            <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "700" }}>
              assist
            </Text>
          ) : null}
          {bodyweight && weight > 0 ? (
            <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "700" }}>
              added
            </Text>
          ) : null}
        </View>
          </>
        )}
      </View>

      <Step label="+" small onPress={() => onNudge(1)} />
    </View>
  );
}

function Step({
  label,
  small,
  onPress,
}: {
  label: "−" | "+";
  /** The weight's steppers: the weight sits above the circles, not beside them. */
  small?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "More" : "Less"}
      onPress={onPress}
      style={({ pressed }) => ({
        width: small ? 44 : 52,
        height: small ? 44 : 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: colors.raised,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={label === "+" ? "plus" : "minus"} size={small ? 18 : 22} color={colors.text} weight="semibold" />
    </Pressable>
  );
}

/** The line that explains where today's number came from. */
function Why({ prescription }: { prescription: ReturnType<typeof currentPrescription> }) {
  if (!prescription) return null;
  const { last, deloaded, skippedLast } = prescription;

  if (prescription.exercise.unloaded) {
    return (
      <Text style={{ height: FIXED.why, color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
        Maximum effort every rep. Rest as long as you need between sets.
      </Text>
    );
  }

  const text = prescription.decay
    ? decayLabel(prescription.decay)
    : skippedLast
    ? "Skipped last time. Same weight and reps as before."
    : deloaded
      ? "10% lighter after two sessions short of target. Build it up again."
      : last
        ? `Last time: ${weightLabel(prescription.exercise, last.weight)} · ${last.reps.join(" ")}`
        : "First time on this one. Pick a weight you could do two more reps with.";

  return (
    <Text
      numberOfLines={3}
      style={{ height: FIXED.why, color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: "center" }}
    >
      {text}
    </Text>
  );
}

/** The folded-in partner: its own weight, target and tappable circles. */
function Partner({
  name,
  weight,
  sets,
  target,
  timed,
  logged,
  onTap,
  onReset,
  onRemove,
}: {
  name: string;
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
  return (
    <View
      style={{
        gap: 14,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: colors.rise,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Superset with
          </Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {name}
          </Text>
          <Text
            style={{
              color: colors.rise,
              fontFamily: fonts.displayBold,
              fontSize: 28,
              fontVariant: ["tabular-nums"],
            }}
          >
            {weight}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
            {sets} sets of {target}
            {timed ? " seconds" : ""}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from this superset`}
          onPress={onRemove}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            marginTop: -8,
            marginRight: -8,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Icon name="close" size={16} color={colors.muted} />
        </Pressable>
      </View>

      <Sets logged={logged} target={target} onTap={onTap} onReset={onReset} compact />
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
        <Pressable
          key={o.id}
          onPress={() => onPick(o.id)}
          style={({ pressed }) => ({
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
      ))}
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  fill,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  /** The affirmative action: the cloud-white pill. */
  fill?: boolean;
  disabled?: boolean;
}) {
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
        gap: 8,
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: fill ? colors.cloud : colors.raised,
        opacity: disabled ? 0.3 : pressed ? 0.75 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={20} color={fill ? colors.ink : colors.text} /> : null}
      <Text
        style={{
          color: fill ? colors.ink : colors.text,
          fontSize: 15,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
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
        paddingBottom: barSpace + 20,
      }}
    >
      <Column style={{ gap: 12 }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.display,
            textTransform: "uppercase",
            fontSize: 55,
            lineHeight: 55,
            letterSpacing: 0.3,
          }}
        >
          Done.
        </Text>
        {hasSession ? (
          <>
            <Text
              style={{
                color: mood === "perfect" ? colors.rise : colors.text,
                fontFamily: fonts.voice,
                fontSize: 27,
                lineHeight: 31,
              }}
            >
              {quip}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
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
