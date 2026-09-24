import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { useBarActions } from "@/components/bar-actions";
import { BarButton } from "@/components/bottom-bar";
import { HoldButton } from "@/components/hold-button";
import { Icon, type IconName } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { colors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import {
  courseLabel,
  distanceLabel,
  parseTime,
  routineSeconds,
  timeLabel,
  type CardioExercise,
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
  madeTarget,
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
  toggleMove,
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
  name: 68,
  /** The "seconds, not reps" line, reserved whether or not it shows. */
  note: 20,
  /** Weight row: the 44pt steppers are the tallest of its forms. */
  weight: 56,
  /** Set circles never grow past this, so two sets are as tall as four. */
  circle: 96,
  /** Up to three lines of "last time". */
  why: 57,
  /** The tallest answer: a one-line note above a 60pt button. */
  action: 89,
} as const;

export default function WorkoutScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const active = state.active;
  const done = !active || isComplete(state);

  // The bar itself lives in the root layout; this only swaps its buttons.
  useBarActions(
    active && !done ? (
      <>
        <BarButton
          action
          icon="back"
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
        <BarButton
          action
          icon="forward"
          label="Skip"
          onPress={() => {
            setPicking(false);
            setState((s) => skipExercise(s));
          }}
        />
      </>
    ) : null,
    [active?.cursor, done],
  );

  // Hooks must all run before this: the bar publish above is one of them.
  if (done) return <Finished hasSession={!!active} />;


  const item = active.items[active.cursor];

  // Cardio and mobility are their own screens: no weight, no rep circles and
  // no thumbs. They still sit inside the same session, so the bar's Back,
  // Leave and Skip work on them exactly as on a lift.
  if (isConditioning(item)) {
    return (
      <Conditioning key={item.slot} item={item} />
    );
  }

  const p = currentPrescription(state)!;
  const partner = item.supersetWith ? byId(item.supersetWith) : undefined;
  // The partner keeps its own scheme, set count and set log when folded in.
  const partnerP = partnerPrescription(state);
  const options = supersetOptions(state);

  const logged = allSetsLogged(state);
  const made = madeTarget(state);
  const warmup = currentWarmup(state);
  // Speed work and jumps have no ladder, so they are never rated.
  const noProgression = !!item.derive || !!p.exercise.unloaded;
  // Swapping after the first set is logged would throw that work away.
  const pool = currentPool(state);
  const canSwap = pool.length > 1 && !item.logged.some((r) => r !== null);

  if (warmup.length > 0) {
    return (
      <Warmup
        name={p.exercise.name}
        sets={warmup}
        perHand={p.exercise.perHand}
        onReady={() => setState((s) => dismissWarmup(s))}
      />
    );
  }

  const next = (feedback?: "up" | "down") => {
    setPicking(false);
    setState((s) => completeExercise(s, feedback));
  };

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
                fontSize: 30,
                lineHeight: 34,
                letterSpacing: -0.6,
              }}
            >
              {p.exercise.name}
            </Text>
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
                fontSize: 40,
                letterSpacing: -0.8,
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

      {/* The action: one row, only when there is something to answer. */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Column style={{ height: FIXED.action, justifyContent: "flex-end" }}>
          {logged && made ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Feedback label="Felt good" icon="up" fill onPress={() => next("up")} />
              <Feedback label="Felt heavy" icon="down" onPress={() => next("down")} />
            </View>
          ) : logged && noProgression ? (
            // Speed and jump work: nothing to rate, just move on.
            <Feedback label="Next exercise" fill onPress={() => next()} />
          ) : logged ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{ textAlign: "center", color: colors.faint, fontSize: 13 }}
              >
                Short of target — same again next time.
              </Text>
              <Feedback label="Next exercise" fill onPress={() => next()} />
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

/**
 * A cardio or mobility block: the same frame — heading, swap button, body,
 * one action — around two quite different insides.
 */
function Conditioning({ item }: { item: Item }) {
  const { state, setState } = useSession();
  const [swapping, setSwapping] = useState(false);

  const cardio = currentCardio(state);
  const routine = currentRoutine(state);
  const pool = conditioningPool(state, item);

  const advance = () => {
    setSwapping(false);
    setState((s) => (isCardio(item) ? completeCardio(s) : completeExercise(s)));
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
            {!isCardio(item)
              ? "Mobility"
              : isTimed(item) && cardio
                ? courseLabel(cardio, item.course!)
                : `${item.minutes} minutes`}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: fonts.display,
                fontSize: 40,
                lineHeight: 44,
                letterSpacing: -0.8,
              }}
            >
              {cardio?.name ?? routine?.name ?? ""}
            </Text>

            {pool.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isCardio(item) ? "Choose a different machine" : "Choose a different routine"
                }
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

          {routine ? (
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>
              {routine.subtitle} · about {Math.round(routineSeconds(routine) / 60)} min
            </Text>
          ) : null}
        </View>

        <Sheet
          visible={swapping}
          title={isCardio(item) ? "Choose a machine" : "Choose a routine"}
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

        {cardio && isCardio(item) ? (
          <CardioBody
            cardio={cardio}
            item={item}
            last={last}
            record={cardioRecord(state, item)}
            onNudge={(d) => setState((s) => nudgeScore(s, d))}
            onSet={(v) => setState((s) => setScore(s, v))}
          />
        ) : null}

        {routine && isMobility(item) ? (
          <MobilityBody
            routine={routine}
            done={item.moves ?? []}
            onToggle={(i) => setState((s) => toggleMove(s, i))}
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Column style={{ gap: 10 }}>
          {needsScore ? (
            <Text style={{ textAlign: "center", color: colors.faint, fontSize: 13 }}>
              {isTimed(item)
                ? "Enter your time when you finish — or skip the block."
                : "Enter the distance when the clock runs out — or skip the block."}
            </Text>
          ) : null}
          <Feedback
            label={isMobility(item) ? "Finish" : "Done"}
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
              fontSize: 62,
              letterSpacing: -1.2,
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
 * The mobility routine: a list of holds to tick off. Nothing is timed for you
 * and nothing is recorded — it is a checklist so you do not skip the third one.
 */
function MobilityBody({
  routine,
  done,
  onToggle,
}: {
  routine: MobilityRoutine;
  done: boolean[];
  onToggle: (index: number) => void;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 2 }}>
        {routine.moves.map((move, i) => {
          const ticked = done[i] ?? false;
          return (
            <Pressable
              key={move.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ticked }}
              accessibilityLabel={`${move.name}, ${move.seconds} seconds${
                move.perSide ? " each side" : ""
              }`}
              onPress={() => onToggle(i)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                borderBottomWidth: i === routine.moves.length - 1 ? 0 : 1,
                borderBottomColor: colors.line,
                paddingVertical: 15,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: ticked ? colors.faint : colors.text,
                    fontSize: 17,
                    fontWeight: "600",
                    textDecorationLine: ticked ? "line-through" : "none",
                  }}
                >
                  {move.name}
                </Text>
                {move.cue ? (
                  <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
                    {move.cue}
                  </Text>
                ) : null}
              </View>

              <Text
                style={{
                  color: colors.muted,
                  fontSize: 15,
                  fontWeight: "700",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {move.seconds}s{move.perSide ? " ×2" : ""}
              </Text>

              <View
                style={{
                  width: 28,
                  height: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  borderWidth: ticked ? 0 : 1.5,
                  borderColor: colors.line,
                  backgroundColor: ticked ? colors.rise : "transparent",
                }}
              >
                {ticked ? <Icon name="check" size={15} color={colors.ink} weight="bold" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
        Nothing here is counted. Breathe, hold, and stop when the tension eases.
      </Text>
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
  onReady,
}: {
  name: string;
  sets: { weight: number; reps: number }[];
  perHand?: boolean;
  onReady: () => void;
}) {
  const insets = useSafeAreaInsets();
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
                fontSize: 38,
                lineHeight: 42,
                letterSpacing: -0.8,
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
                    fontSize: 30,
                    letterSpacing: -0.6,
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

      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Column>
          <Feedback
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
                fontSize: compact ? 19 : 30,
                fontWeight: "800",
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
                fontSize: 26,
                letterSpacing: -0.7,
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
            fontSize: 40,
            letterSpacing: -0.8,
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
      ? "Backed off 10% after two heavy sessions. Build it up again."
      : last
        ? `Last time: ${weightLabel(prescription.exercise, last.weight)} · ${last.reps.join(" ")}${
            last.feedback ? (last.feedback === "up" ? "  👍" : "  👎") : ""
          }`
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

/** The folded-in partner: its own target and its own tappable circles. */
function Partner({
  name,
  sets,
  target,
  timed,
  logged,
  onTap,
  onReset,
  onRemove,
}: {
  name: string;
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

function Feedback({
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
  const { setState } = useSession();
  const insets = useSafeAreaInsets();

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
        // The persistent bar already sits below, carrying the safe-area inset.
        paddingBottom: 20,
      }}
    >
      <Column style={{ gap: 12 }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.display,
            fontSize: 46,
            lineHeight: 49,
            letterSpacing: -0.9,
          }}
        >
          Done.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
          Next time picks up at the next workout in the cycle.
        </Text>
      </Column>
      <Column>
        <Feedback label="Close" fill onPress={close} />
      </Column>
    </View>
  );
}
