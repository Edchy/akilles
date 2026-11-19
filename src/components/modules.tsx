import { useEffect, useState, type ReactNode } from "react";
import { Button, Chip, Chips } from "@/components/buttons";
import { Image, Pressable, View } from "react-native";
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { duration, PRESS_SCALE, spring } from "@/constants/motion";
import Svg, { Path } from "react-native-svg";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { Text, TextInput } from "@/components/text";
import { router } from "expo-router";

import { CardioChoices, CardioTarget } from "@/components/cardio-target";
import { AddExerciseSheet, type AddBlock } from "@/components/add-exercise";
import { Count, Setting, Step } from "@/components/controls";
import { DragList, type Drag } from "@/components/drag-list";
import { useDraft } from "@/components/draft-scope";
import { WorkoutGoals } from "@/components/goals";
import { GOALS_ON } from "@/data/goals";
import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { DuskGround } from "@/components/dusk";
import { Segments } from "@/components/segments";
import { Swipe, swipedRecently } from "@/components/swipe";
import { HINT_LABELS, InlineTip, playedHint } from "@/components/tips";
import { GestureHint } from "@/components/hint";
import {
  BigButton,
  OpenRow,
  SectionLabel,
  Sheet,
  TextButton,
} from "@/components/sheet";
import { WeightField } from "@/components/weight-field";
import { grain } from "@/constants/grain";
import { DUSK, DUSK_CARDS, LETTERPRESS, cardOf, mix, colors, familyWash, fonts, radii } from "@/constants/theme";
import {
  cardioPool,
  mobilityPool,
  routineUse,
} from "@/data/conditioning";
import { byId, isPattern } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import { KIND_NAME, KIND_ORDER, KIND_SUBTITLE, type WorkoutKind } from "@/data/kinds";
import {
  REP_STEP,
  newId,
  rangeScheme,
  repLabel,
  repRange,
  setsFor,
  type Entry,
  type EntryPart,
  type Workout,
} from "@/data/split";
import { ownRange, repBounds, schemeOf } from "@/lib/progression";
import {
  SETS_RANGE,
  arrangePlan,
  canPauseWorkout,
  deleteWorkout,
  cardioAmount,
  cardioPlan,
  chooseCardio,
  restoreConditioning,

  chosen,
  addExtra,
  arrangePart,
  chooseRoutine,
  partContents,
  routinePlan,
  type CardioWhere,
  type Placed,
  type RoutineWhere,
  movePlanWorkout,
  planWorkouts,
  pauseWorkout,
  poolFor,
  removeEntry,
  renameWorkout,
  resumeWorkout,
  routineMinutes,
  setCardio,
  balanceNotes,
  workoutMinutes,
  swapInPlan,
  hiddenExercises,
  takenElsewhere,
  upNext,
  updateEntry,
  useSession,
  workoutFamily,
  workoutsUsing,
  type SessionState,
  seeTip,
  seenTip,
} from "@/store/session";

/** Screen-reader stand-ins for dragging: step a row up or down one place. */
const moveActions = (drag: Drag) => ({
  accessibilityActions: [
    ...(drag.index > 0 ? [{ name: "moveUp", label: "Move up" }] : []),
    ...(drag.index < drag.count - 1 ? [{ name: "moveDown", label: "Move down" }] : []),
  ],
  onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => {
    if (e.nativeEvent.actionName === "moveUp") drag.moveBy(-1);
    if (e.nativeEvent.actionName === "moveDown") drag.moveBy(1);
  },
});

/**
 * Your workouts, in two lists. Active: the ones that take turns, top to
 * bottom and round again — drag to reorder. Paused: the ones waiting, out of
 * the turns until you resume them. Away from the gym for a while, pause what
 * you can't do there and add a workout you can: one plan, nothing to switch.
 *
 * The rows are only names, big enough to hit. Everything you can change
 * about a workout lives on its own screen. Rendered inside Plan — see
 * `plan.tsx`, which freezes its scroll while a row is dragged.
 */
export function Modules({ onDragChange }: { onDragChange: (dragging: boolean) => void }) {
  const { state, setState } = useSession();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dragging, setDragging] = useState(false);
  // One active row's height: the line and arrows are drawn from it.
  const [rowHeight, setRowHeight] = useState(0);
  const next = upNext(state).id;
  const paused = state.removedWorkouts.map((r) => r.workout);
  const training = state.active?.workoutId;
  // One list, so a workout can be dragged across: the active ones, the line
  // that says "Paused", then the paused ones. Where a row is dropped says
  // which it is.
  const items: PlanItem[] = [
    ...state.workouts.map((w) => ({ workout: w, paused: false })),
    DIVIDER,
    ...paused.map((w) => ({ workout: w, paused: true })),
  ];

  /** Change something, say what happened, and offer to put it back. */
  const change = (after: SessionState, text: string) => {
    if (after === state) return;
    setNotice({ text, before: state, after });
    setState(after);
  };
  const refuse = (id: string) =>
    setNotice({
      text: training === id
        ? "You're training it right now. Finish it first."
        : "Something has to be active. Add or resume another workout first, then pause this one.",
    });

  // Swiping a row, shown once with a finger: only on a later visit than the
  // one where the Plan tip was read, so the two never pile up.
  const [planReadBefore] = useState(() => seenTip(state, "plan"));
  const [rowHintGone, setRowHintGone] = useState(false);
  const rowHint = planReadBefore && !rowHintGone && !seenTip(state, "rows");
  const pause = (w: Workout) => {
    if (training === w.id || !canPauseWorkout(state)) return refuse(w.id);
    // Not destructive, and you see it move: nothing to say, nothing to undo.
    setNotice(null);
    setState(seeTip(pauseWorkout(state, w.id), "rows"));
  };
  const resume = (w: Workout) => {
    setNotice(null);
    setState(resumeWorkout(state, w.id));
  };
  const remove = (w: Workout) => change(seeTip(deleteWorkout(state, w.id), "rows"), `${w.name || "Untitled"} deleted.`);
  const open = (w: Workout) => router.push({ pathname: "/plan-editor", params: { id: w.id } });

  const drop = (from: number, to: number) => {
    const order = [...items];
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    const cut = order.indexOf(DIVIDER);
    const ids = (list: PlanItem[]) => list.map((i) => i.workout!.id);
    const after = arrangePlan(state, ids(order.slice(0, cut)), ids(order.slice(cut + 1)));
    if (after === state) return moved.workout ? refuse(moved.workout.id) : undefined;
    setNotice(null);
    setState(after);
  };

  return (
    <View style={{ gap: 16 }} onTouchStart={() => rowHint && setRowHintGone(true)}>
      {/* What the list is and how to handle it, said once (see `components/tips.tsx`). */}
      <InlineTip id="plan" />
      <Round count={state.workouts.length} rowHeight={rowHeight}>
        <DragList
          data={items}
          keyOf={(i) => i.workout?.id ?? "paused"}
          gap={TURN_GAP}
          onDragChange={(on) => {
            setDragging(on);
            onDragChange(on);
          }}
          onMove={drop}
          renderItem={(item, drag) =>
            item.workout ? (
              <View onLayout={item.paused ? undefined : (e) => setRowHeight(e.nativeEvent.layout.height)}>
                <WorkoutRow
                  workout={item.workout}
                  paused={!!item.paused}
                  onPause={() => (item.paused ? resume(item.workout!) : pause(item.workout!))}
                  onDelete={() => remove(item.workout!)}
                  canDelete={training !== item.workout.id && (item.paused || state.workouts.length > 1)}
                  isNext={item.workout.id === next}
                  drag={drag}
                  onOpen={() => open(item.workout!)}
                />
                {rowHint && item === items[0] && !item.paused ? (
                  <RowHint
                    onPlayed={() => {
                      setRowHintGone(true);
                      setState((s) => playedHint(s, "rows"));
                    }}
                  />
                ) : null}
              </View>
            ) : (
              // Always laid out, so rows can be dropped on either side of it;
              // shown once something is paused, or while a row is in the air.
              <View style={{ height: 30, justifyContent: "flex-end" }}>
                {paused.length || dragging ? <SectionLabel>Paused</SectionLabel> : null}
              </View>
            )
          }
        />
      </Round>

      {notice && (!notice.after || state === notice.after) ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: colors.text, fontSize: 17, lineHeight: 24 }}>
            {notice.text}
          </Text>
          {notice.before ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Undo" hitSlop={8}
              onPress={() => { setState((s) => (s === notice.after ? notice.before! : s)); setNotice(null); }}
              style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text ui style={{ color: colors.rise, fontSize: 17 }}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** A row of Plan's one list: a workout, or the line between active and paused. */
type PlanItem = { workout?: Workout; paused?: boolean };
const DIVIDER: PlanItem = {};

/** Room beside the active list for the line back to the top. */
const ROUND = 34;
/** Between workouts. */
const TURN_GAP = 10;
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The active workouts, with a line drawn beside them from the last back up
 * into the first — the same picture as the intro's "Come every day" — so
 * the list reads as one after another, round and round. No arrows between
 * rows: anything in a workout's colour vanishes against a next one of the
 * same colour (Push A into Push B), and the order says it already. Paused workouts below sit outside it. Drawn from one row's
 * measured height, so it never waits on the list's; it draws itself in, and
 * again when the number of active workouts changes.
 */
function Round({ count, rowHeight, children }: { count: number; rowHeight: number; children: ReactNode }) {
  const reduce = useReduceMotion();
  const drawn = useSharedValue(reduce ? 1 : 0);
  const height = count > 0 && rowHeight > 0 ? count * rowHeight + (count - 1) * TURN_GAP : 0;
  const first = rowHeight / 2;
  const last = height - rowHeight / 2;
  const length = 2 * (ROUND - 6) + Math.max(0, last - first);
  useEffect(() => {
    if (reduce || !height) return;
    drawn.value = 0;
    drawn.value = withTiming(1, { duration: 700 });
  }, [count, rowHeight > 0, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const line = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const head = useAnimatedProps(() => ({ strokeOpacity: drawn.value > 0.9 ? (drawn.value - 0.9) * 10 : 0 }));
  const shown = count > 1 && height > 0;
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
      <View style={{ width: ROUND }}>
        {shown ? (
          <Svg pointerEvents="none" width={ROUND} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AnimatedPath
              d={`M2 ${last} H10 Q${ROUND - 6} ${last} ${ROUND - 6} ${last - 18} V${first + 18} Q${ROUND - 6} ${first} 10 ${first} H4`}
              stroke={colors.muted}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${length} ${length}`}
              animatedProps={line}
            />
            <AnimatedPath
              d={`M11 ${first - 7} L4 ${first} L11 ${first + 7}`}
              stroke={colors.muted}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              animatedProps={head}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

/** A line under the list saying what just happened, with Undo when it can be undone. */
type Notice = { text: string; before?: SessionState; after?: SessionState };

/** The floating button's size: a thumb's width, and the room Plan leaves for it. */
export const NEW_SIZE = 60;

/**
 * New workout: a round ink button that floats above the bottom bar on Plan,
 * so it is in reach wherever the list is scrolled to.
 */
export function NewWorkoutButton({ bottom }: { bottom: number }) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", right: 22, bottom }, pressed]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New workout"
        onPress={() => router.push("/new-workout")}
        onPressIn={() => { if (!reduce) scale.value = withTiming(PRESS_SCALE, { duration: duration.press }); }}
        onPressOut={() => { scale.value = withSpring(1, spring.bouncy); }}
        style={{
          width: NEW_SIZE,
          height: NEW_SIZE,
          borderRadius: NEW_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.text,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Icon name="plus" size={24} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

/** The existing templates and copy choices, shared by the creation page. */
export function NewWorkoutOptions({ onKind, onCopy }: { onKind: (kind: WorkoutKind) => void; onCopy: (fromId: string) => void }) {
  const { state } = useSession();
  const [copying, setCopying] = useState(false);
  const sources = planWorkouts(state);
  const row = (key: string, label: string, detail: string, onPress: () => void, mark?: Family) => (
    <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${label}. ${detail}`} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderCurve: "continuous", backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 20, alignItems: "center" }}>{mark ? <Mark family={mark} size={18} /> : <Icon name="plus" size={16} color={colors.muted} />}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 19 }}>{label}</Text>
        <Text style={{ color: colors.muted, fontSize: 16, fontStyle: "italic" }}>{detail}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ gap: 10, paddingTop: 12 }}>
      <SectionLabel>{copying ? "Copy which workout?" : "What kind of workout?"}</SectionLabel>
      {copying
        ? sources.map((w) => row(w.id, w.name || "Untitled", `${w.exercises.length} exercise${w.exercises.length === 1 ? "" : "s"}`, () => onCopy(w.id), workoutFamily(state, w)))
        : KIND_ORDER.map((kind) => row(kind, kind === "free" ? "Build your own" : KIND_NAME[kind], KIND_SUBTITLE[kind], () => onKind(kind), KIND_MARK[kind]))}
      {!copying && sources.length > 0 ? (
        <Button icon="copy" label="Copy a workout" onPress={() => setCopying(true)} />
      ) : null}
      {copying ? <TextButton label="Back" onPress={() => setCopying(false)} /> : null}
    </View>
  );
}

/** Category shapes identify templates; the plus is reserved for building from scratch. */
const KIND_MARK: Record<WorkoutKind, Family | undefined> = {
  push: "push",
  pull: "pull",
  legs: "legs",
  full: "full",
  bodyweight: "full",
  free: undefined,
};

/**
 * What the Plan calls the workout the Next up tab shows: the one you are
 * doing, else the one up next — whichever day you get to it.
 */
export const nextWord = (state: SessionState): string =>
  state.active ? "In progress" : "Next up";

/**
 * One workout in the list, the way Today shows it: its shape, its name, what
 * it trains, on a wash of its colour — so the plan reads as the run of
 * colours you will train through. Swipe left for Pause/Resume and Delete.
 */

function WorkoutRow({
  workout,
  paused,
  canDelete,
  onPause,
  onDelete,
  isNext,
  drag,
  onOpen,
}: {
  workout: Workout;
  paused: boolean;
  canDelete: boolean;
  /** Pause it, or — paused — resume it. */
  onPause: () => void;
  onDelete: () => void;
  isNext: boolean;
  drag: Drag;
  onOpen: () => void;
}) {
  const { state } = useSession();
  const family = workoutFamily(state, workout);
  const count = workout.exercises.length;
  // Active: the day's colour at full strength, with white words on the dark
  // ones and ink on the light ones (legs, mobility), as on the Start button.
  // Paused: grey, stepped back.
  const fill = cardOf(family);
  const ink = paused ? colors.text : fill.ink;
  return (
    <Swipe
      actions={[
        { label: paused ? "Resume" : "Pause", onPress: onPause },
        { label: "Delete", onPress: onDelete, disabled: !canDelete, destructive: true },
      ]}
      disabled={drag.active}
      radius={radii.card}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? `${workout.name || "Untitled"}, paused` : undefined}
        accessibilityHint={paused ? "Opens the workout. Swipe left to resume or delete it." : "Opens the workout. Hold and drag to reorder."}
        {...moveActions(drag)}
        accessibilityActions={[...moveActions(drag).accessibilityActions, { name: "pause", label: paused ? "Resume workout" : "Pause workout" }, ...(canDelete ? [{ name: "delete", label: "Delete workout" }] : [])]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "pause") onPause(); else if (e.nativeEvent.actionName === "delete" && canDelete) onDelete(); else moveActions(drag).onAccessibilityAction(e); }}
        onPress={onOpen}
        onLongPress={drag.start}
        onPressOut={drag.cancel}
        delayLongPress={250}
        // Wait a moment before showing the press: a touch that becomes a
        // swipe or a scroll never flashes the row.
        unstable_pressDelay={90}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          minHeight: 84,
          paddingLeft: 24,
          paddingRight: 20,
          paddingVertical: 16,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: paused ? colors.surface : fill.bg,
          borderWidth: 1.5,
          borderColor: drag.active ? colors.text : "transparent",
          overflow: "hidden",
          opacity: pressed && !drag.active ? 0.7 : 1,
        })}
      >
        {DUSK_CARDS && !paused ? <DuskGround family={family} /> : null}
        <Watermark id={workout.id} family={family} ground={paused ? colors.surface : fill.bg} ink={ink} faint={paused} />
        {LETTERPRESS && !DUSK_CARDS && !paused ? <Grain /> : null}
        {/* Paused: the shape goes grey and the words step back, so it reads
            as out of the loop at a glance; "Paused" says it in words too, and
            it comes back with a swipe left, Resume. */}
        <View style={{ flex: 1, gap: 2, opacity: paused ? 0.5 : 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 }}
          >
            {workout.name || "Untitled"}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: paused ? colors.muted : ink, fontSize: 16, fontStyle: "italic" }}
          >
            {[paused ? "Paused" : "", workout.subtitle, `${count} exercise${count === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        {paused ? null : isNext ? (
          <Text ui
            style={{ color: ink, fontSize: 15, fontWeight: "600" }}
          >
            {nextWord(state)}
          </Text>
        ) : null}
        {paused ? (
          // Resuming is the one thing you come to a paused row for: in sight,
          // not behind a swipe.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resume ${workout.name || "Untitled"}`}
            hitSlop={8}
            onPress={onPause}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: 14,
              justifyContent: "center",
              borderRadius: radii.button,
              borderCurve: "continuous",
              borderWidth: 1.5,
              borderColor: colors.text,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text ui style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>Resume</Text>
          </Pressable>
        ) : (
          <Icon name="open" size={15} color={ink} />
        )}
      </Pressable>
    </Swipe>
  );
}

/** A block of conditioning in a workout: cardio at one end, or a routine at one. */
type BlockName = "start" | "main" | "finish";

/**
 * A workout, opened from Plan: the whole of it on one screen, in the order
 * you will do it — the cardio and warm-up that open it, the lifts, the cardio
 * and stretch that finish it — threaded on one line like the list inside a
 * workout. Every action is in sight: tap any part to swap, change or remove
 * it; drag a lift by its handle to move it; add an exercise where the lifts
 * end. A part the workout has none of is a quiet "Add" in its place.
 */
export function WorkoutSheet({
  workout,
  embedded = false,
  naming,
  onClose,
}: {
  workout: Workout | undefined;
  embedded?: boolean;
  naming: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [slot, setSlot] = useState<string | null>(null);
  // The cardio or routine opened, and the block it is in.
  const [block, setBlock] = useState<{ placed: Placed; part: BlockName } | null>(null);
  // Which part of the workout Add exercise is adding to, if open.
  const [adding, setAdding] = useState<EntryPart | "main" | null>(null);
  const [dragging, setDragging] = useState(false);
  const draft = useDraft();

  const close = () => {
    setSlot(null);
    setBlock(null);
    setAdding(null);
    onClose();
  };

  if (!workout) return <Sheet visible={false} title="" onClose={close} />;

  const entry = workout.exercises.find((e) => e.id === slot);

  // One block: everything in it — exercises, cardio, routines — in the order
  // it runs, held and dragged among themselves. Tap to change, swipe left to
  // remove, as anywhere.
  const part = (name: BlockName) => {
    const list = partContents(state, workout, name);
    return list.length ? (
      <DragList
        data={list}
        keyOf={(p) => p.id}
        gap={8}
        onDragChange={setDragging}
        onMove={(from, to) => {
          const ids = list.map((p) => p.id);
          const [moved] = ids.splice(from, 1);
          ids.splice(to, 0, moved);
          setState((s) => arrangePart(s, workout.id, name, ids));
        }}
        renderItem={(p, drag) => {
          if ("entry" in p) {
            const e = p.entry;
            return (
              <LiftRow
                workoutId={workout.id}
                entry={e}
                drag={drag}
                onOpen={() => embedded ? router.push({ pathname: "/plan-editor/exercise", params: { id: workout.id, slot: e.id } }) : setSlot(e.id)}
                onRemove={() => setState((s) => removeEntry(s, workout.id, e.id))}
              />
            );
          }
          if ("cardio" in p) {
            const plan = cardioPlan(state, workout, p.cardio)!;
            return (
              <Row
                family="cardio"
                title={plan.machine.name}
                detail={cardioAmount(plan)}
                drag={drag}
                onPress={() => setBlock({ placed: p, part: name })}
                onRemove={() => setState((s) => setCardio(s, workout.id, p.cardio, null))}
              />
            );
          }
          const routine = routinePlan(state, workout, p.routine)!;
          return (
            <Row
              family="mobility"
              title={routine.name}
              detail={`about ${routineMinutes(routine)} min`}
              drag={drag}
              onPress={() => setBlock({ placed: p, part: name })}
              onRemove={() => setState((s) => chooseRoutine(s, workout.id, p.routine, null))}
            />
          );
        }}
      />
    ) : null;
  };

  // One "Add" at the foot of each block, and one sheet behind it: exercises,
  // and at its top, cardio and mobility. Adding always adds — what is there
  // stays — so a block can hold as many of each as you like.
  const blocksFor = (name: BlockName): AddBlock[] => [
    {
      id: "cardio",
      label: "Cardio",
      detail: "A machine, or a run",
      family: "cardio",
      choose: (done) => (
        <CardioChoices
          options={cardioPool()}
          current=""
          onPick={(id) => {
            setState((s) => addExtra(restoreConditioning(s, id), workout.id, name, { cardio: { machine: id } }));
            done();
          }}
        />
      ),
    },
    {
      id: "routine",
      label: "Mobility",
      detail: name === "start" ? "To get moving" : "Stretches and moves",
      family: "mobility",
      choose: (done) => (
        <View style={{ gap: 6 }}>
          {routinesFor(state, name === "start" ? "warmup" : "end").map((m) => (
            <Choice
              key={m.id}
              label={m.name}
              detail={`${routineMinutes(m)} min`}
              active={false}
              onPress={() => {
                setState((s) => addExtra(s, workout.id, name, { routine: m.id }));
                done();
              }}
            />
          ))}
        </View>
      ),
    },
  ];
  const addButton = (part: EntryPart | "main") => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add to ${BLOCK_NAME[part]}`}
      onPress={() => setAdding(part)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 52,
        borderRadius: radii.card,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.muted,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="plus" size={16} color={colors.text} />
      <Text ui style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>Add</Text>
    </Pressable>
  );
  const minutes = workoutMinutes(state, workout);

  return (
    <Sheet embedded={embedded} visible full title={draft?.isNew ? "New workout" : "Edit workout"} closeLabel="Done" scrollEnabled={!dragging} onClose={close}
      page={entry ? <SlotSheet key={entry.id} embedded workoutId={workout.id} entry={entry} onClose={() => setSlot(null)} /> : undefined}
    >
      <View style={{ gap: 28, paddingTop: 4 }}>
        {/* The name, and what it trains, ready to type in: no Rename step. */}
        <View style={{ gap: 10 }}>
          <Field
            value={workout.name}
            placeholder="Name"
            size="large"
            autoFocus={naming || !!draft?.isNew}
            onChange={(name) => setState((s) => renameWorkout(s, workout.id, { name }))}
          />
          <Field
            value={workout.subtitle}
            placeholder="What it trains (optional)"
            onChange={(subtitle) => setState((s) => renameWorkout(s, workout.id, { subtitle }))}
          />
          <Text style={{ color: colors.muted, fontSize: 16, fontStyle: "italic", paddingLeft: 4 }}>
            About {minutes} min
          </Text>
        </View>

        {/* Three blocks, in the order you do them, named by where they sit
            and not by what goes in them: anything can go anywhere. Every row:
            tap to change, swipe left to remove; exercises also hold to move. */}
        <Part label={BLOCK_NAME.start}>
          {part("start")}
          {addButton("start")}
        </Part>

        <Part label={BLOCK_NAME.main}>
          {part("main")}
          {addButton("main")}
          {balanceNotes(state, workout).map((note) => (
            <Text key={note} style={{ color: colors.text, fontSize: 16, lineHeight: 22, fontStyle: "italic" }}>{note}</Text>
          ))}
        </Part>

        <Part label={BLOCK_NAME.finish}>
          {part("finish")}
          {addButton("finish")}
        </Part>

        {GOALS_ON ? <WorkoutGoals workoutId={workout.id} /> : null}
      </View>

      {/* Adding and conditioning keep their own editors. Lifts use the page above. */}
      <AddExerciseSheet
        workout={workout}
        part={adding === "main" ? undefined : (adding ?? undefined)}
        blocks={adding ? blocksFor(adding) : []}
        visible={adding !== null}
        onClose={() => setAdding(null)}
      />
      <CardioSheet
        workout={workout}
        where={block && "cardio" in block.placed ? block.placed.cardio : null}
        onClose={() => setBlock(null)}
      />
      <MobilitySheet
        workout={block && "routine" in block.placed ? workout : undefined}
        where={block && "routine" in block.placed ? block.placed.routine : "end"}
        use={block?.part === "start" ? "warmup" : "end"}
        onClose={() => setBlock(null)}
      />
    </Sheet>
  );
}

/**
 * The three blocks of a workout, by where they sit. Usually cardio to get
 * warm, then the lifts, then something to finish on — but that is yours to
 * decide, so the names don't say it.
 */
const BLOCK_NAME: Record<EntryPart | "main", string> = { start: "Start", main: "Main", finish: "Finish" };

/** One part of a workout: its name, small, and what is in it. */
function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

/**
 * One thing in a workout. Tap to change it (the › says so), swipe left to
 * remove it — as a workout swipes in Plan. `drag` makes it one you hold and
 * move, and shows the ≡ that says so.
 */
function Row({
  family,
  title,
  detail,
  onPress,
  onRemove,
  drag,
  a11y,
}: {
  /** Its type: the row is that colour, so a workout reads at a glance as mostly legs, say. */
  family: Family;
  title: string;
  detail?: string;
  onPress: () => void;
  onRemove: () => void;
  drag?: Drag;
  a11y?: object;
}) {
  const lifted = !!drag?.active;
  const fill = cardOf(family);
  const ink = fill.ink;
  return (
    <Swipe actions={[{ label: "Remove", onPress: onRemove, destructive: true }]} disabled={lifted} radius={radii.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityActions={[{ name: "remove", label: "Remove" }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "remove") onRemove(); }}
        {...a11y}
        onPress={() => { if (!swipedRecently()) onPress(); }}
        onLongPress={drag?.start}
        onPressOut={drag?.cancel}
        delayLongPress={250}
        unstable_pressDelay={90}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 64,
          paddingLeft: drag ? 10 : 16,
          paddingRight: 16,
          paddingVertical: 10,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: fill.bg,
          borderWidth: 1.5,
          borderColor: lifted ? colors.text : "transparent",
          overflow: "hidden",
          opacity: pressed && !lifted ? 0.6 : 1,
        })}
      >
        {DUSK_CARDS ? <DuskGround family={family} /> : LETTERPRESS ? <Grain /> : null}
        {drag ? <Icon name="grip" size={16} color={ink} /> : null}
        <View style={{ width: 18, alignItems: "center" }}><Mark family={family} size={16} color={ink} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: ink, fontSize: 19 }}>{title}</Text>
          {detail ? <Text ui style={{ color: ink, opacity: 0.85, fontSize: 15 }}>{detail}</Text> : null}
        </View>
        <Icon name="open" size={14} color={ink} />
      </Pressable>
    </Swipe>
  );
}

/** An exercise in a workout: what fills the slot, and its sets and reps. Hold to move it. */
function LiftRow({
  workoutId,
  entry,
  drag,
  onOpen,
  onRemove,
}: {
  workoutId: string;
  entry: Entry;
  drag: Drag;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { state } = useSession();
  const exercise = byId(chosen(state, workoutId, entry));
  const family = familyOf(exercise);
  return (
    <Row
      family={family}
      title={exercise?.name ?? "—"}
      detail={`${setsFor(entry)} × ${repLabel(schemeOf(exercise, entry.scheme))}`}
      onPress={onOpen}
      onRemove={onRemove}
      drag={drag}
      a11y={{
        accessibilityHint: "Opens the exercise to swap or change it. Swipe left to remove it.",
        accessibilityActions: [{ name: "remove", label: "Remove" }, ...moveActions(drag).accessibilityActions],
        onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => {
          if (e.nativeEvent.actionName === "remove") onRemove();
          else moveActions(drag).onAccessibilityAction(e);
        },
      }}
    />
  );
}

/** A quiet + link at the foot of a list: Add exercise, Add cardio. */

/**
 * One cardio block, opened: which machine, and how long — a set distance
 * you time, or a set time you measure the distance of. Like everything in a
 * workout's editor, it changes this workout and nothing else.
 */
function CardioSheet({
  workout,
  where,
  onClose,
}: {
  workout: Workout;
  where: CardioWhere | null;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [choosing, setChoosing] = useState(false);
  const plan = where ? cardioPlan(state, workout, where) : null;
  if (!where) return <Sheet visible={false} title="" onClose={onClose} />;
  if (!plan) return <Sheet visible title="Add cardio" onClose={onClose}>
    <CardioChoices options={cardioPool()} current="" onPick={(id) => setState((s) => setCardio(restoreConditioning(s, id), workout.id, where, { machine: id }))} />
  </Sheet>;
  const close = () => { setChoosing(false); onClose(); };
  const target = plan.course !== undefined ? { course: plan.course } : { minutes: plan.minutes };

  return (
    <Sheet visible title={choosing ? "Choose cardio" : "Cardio"}
      closeLabel={choosing ? "Back" : "Done"} onClose={choosing ? () => setChoosing(false) : close}>
      {choosing ? (
        <View style={{ gap: 12, paddingTop: 12 }}>
          <CardioChoices options={cardioPool()} current={plan.machine.id} onPick={(id) => {
            setState((s) => chooseCardio(restoreConditioning(s, id), workout.id, where, id));
            setChoosing(false);
          }} />
        </View>
      ) : (
        <View style={{ gap: 28, paddingTop: 12 }}>
          <OpenRow title={plan.machine.name} detail="Swap for another" onPress={() => setChoosing(true)} />
          <CardioTarget
            exercise={plan.machine}
            target={target}
            onChange={(length) => setState((s) => setCardio(s, workout.id, where, { machine: plan.machine.id, ...length }))}
          />
          <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 23 }}>
            Changes here are for {workout.name || "this workout"} only.
          </Text>
          <BigButton label="Remove from this workout" quiet onPress={() => { setState((s) => setCardio(s, workout.id, where, null)); close(); }} />
        </View>
      )}
    </Sheet>
  );
}

/**
 * The mobility a workout opens with, or the stretches it ends on, opened. A
 * workout only picks a collection, or takes it out; what is inside one
 * are changed in the Library, where it says every workout it reaches. One
 * place to change a thing, so you always know what you are changing.
 */
function MobilitySheet({
  workout,
  where,
  use,
  onClose,
}: {
  workout: Workout | undefined;
  where: RoutineWhere;
  /** Which routines to offer first: ones to get moving, or to finish on. */
  use: "warmup" | "end";
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  if (!workout) return <Sheet visible={false} title="" onClose={onClose} />;
  const routine = routinePlan(state, workout, where);
  const pick = (id: string) => {
    setState((s) => chooseRoutine(s, workout.id, where, id));
    onClose();
  };

  return (
    <Sheet visible title="Mobility" closeLabel="Done" onClose={onClose}>
      <View style={{ gap: 28, paddingTop: 12 }}>
        <View style={{ gap: 6 }}>
          {routinesFor(state, use).map((m) => (
            <Choice
              key={m.id}
              label={m.name}
              detail={`${plural(m.moves.length, "move", "moves")} · about ${routineMinutes(m)} min`}
              active={m.id === routine?.id}
              onPress={() => pick(m.id)}
            />
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 23 }}>
          To change the moves in a routine, open it in the Library, under Mobility.
        </Text>
        {routine ? (
          <BigButton
            label="Remove from this workout"
            quiet
            onPress={() => {
              setState((s) => chooseRoutine(s, workout.id, where, null));
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

/**
 * Every routine, the ones best at this end of a workout first — mobility
 * before lifting, stretching after — though any can go either end.
 */
const routinesFor = (state: SessionState, use: "warmup" | "end") => {
  const all = mobilityPool(state.hiddenConditioning);
  return [...all.filter((m) => routineUse(m) === use), ...all.filter((m) => routineUse(m) !== use)];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Push A", "Push A and Legs", "Push A, Pull A and 2 more". */
const namesOf = (workouts: Workout[]): string => {
  const names = workouts.map((w) => w.name || "Untitled");
  if (names.length <= 2) return names.join(" and ");
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
};

/**
 * One lift's settings. Swap replaces the body with a focused chooser;
 * Cancel returns without changing anything, and a pick returns to the new
 * exercise's settings. Every settings change saves immediately.
 */
export function SlotSheet({
  workoutId,
  embedded = false,
  entry,
  replacements = false,
  onClose,
}: {
  workoutId: string;
  embedded?: boolean;
  entry: Entry | undefined;
  replacements?: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const close = () => {
    setConfirming(false);
    setChoosing(false);
    onClose();
  };

  if (!entry) return <Sheet embedded={embedded} visible={false} title="" onClose={close} />;

  const options = poolFor(state, workoutId, entry);
  // Swap reaches the whole library: the same movement, not yet in your catalogue.
  const library = hiddenExercises(state).filter((e) => !e.restricted && isPattern(e, entry.pattern));
  const taken = takenElsewhere(state, workoutId, entry);
  const exerciseId = chosen(state, workoutId, entry);
  // Speed work takes its reps and weight from elsewhere; there is no range to pick.
  const fixedRange = entry.scheme === "speed" || !!entry.derive;
  const sets = setsFor(entry);
  const exercise = byId(exerciseId);
  // A lift with a range of its own — 10 to 14 for a small muscle — climbs it
  // in any slot, and the buttons stay inside it. See `schemeOf`.
  const reps = repRange(schemeOf(exercise, entry.scheme));
  const bounds = repBounds(exercise);
  const own = ownRange(exercise);
  const range = (min: number, max: number) => update({ scheme: rangeScheme(min, max, bounds) });
  const update = (patch: Parameters<typeof updateEntry>[3]) =>
    setState((s) => updateEntry(s, workoutId, entry.id, patch));

  const preview = (id: string) => router.push({ pathname: "/plan-editor/guide", params: { id } });

  if (choosing || replacements) {
    const cancel = () => replacements ? onClose() : setChoosing(false);
    const pick = (id: string) => {
      setState((s) => swapInPlan(s, workoutId, entry.id, id));
      if (replacements) onClose();
      else setChoosing(false);
    };
    return (
      <Sheet embedded={embedded} visible onBack={cancel} scrollKey="replacements" title={`Replace ${exercise?.name ?? "exercise"}`} onClose={cancel}>
        <View style={{ gap: 6, paddingTop: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 22, marginBottom: 12 }}>
            Choose a replacement for future sessions of this workout.
          </Text>
          {[...options, ...library.map((e) => e.id)].filter((id) => id !== exerciseId).map((id) => (
            <Choice
              key={id}
              label={byId(id)!.name}
              active={false}
              used={taken.has(id)}
              onPress={() => pick(id)}
              onPreview={() => preview(id)}
            />
          ))}
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet embedded={embedded} visible onBack={close} scrollKey="settings" title={exercise?.name ?? "Exercise"} closeLabel="Done" onClose={close}>
      <View style={{ gap: 36, paddingTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Action icon="swap" label="Swap exercise" onPress={() => embedded ? router.push({ pathname: "/plan-editor/replacements", params: { id: workoutId, slot: entry.id } }) : setChoosing(true)} />
          <Action icon="info" label="How to do it" onPress={() => preview(exerciseId)} />
        </View>

        {entry.derive ? null : <WeightField key={exerciseId} exerciseId={exerciseId} />}

        <View style={{ gap: 12 }}>
          <SectionLabel>Sets and reps</SectionLabel>
          <View
            style={{
              borderRadius: radii.card,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              paddingHorizontal: 18,
              paddingVertical: 6,
            }}
          >
            <Setting label="Sets">
              <Step
                icon="minus"
                label="Fewer sets"
                disabled={sets <= SETS_RANGE.min}
                onPress={() => update({ sets: sets - 1 })}
              />
              <Count value={sets} />
              <Step
                icon="plus"
                label="More sets"
                disabled={sets >= SETS_RANGE.max}
                onPress={() => update({ sets: sets + 1 })}
              />
            </Setting>

            {fixedRange ? (
              <Setting label="Reps" last>
                <Text style={{ color: colors.faint, fontSize: 15 }}>
                  {repLabel(entry.scheme)}, fast
                </Text>
              </Setting>
            ) : (
              // The ladder climbs from the bottom of the range to the top, then
              // adds weight. Rep ranges share the exercise's latest weight.
              <>
                <Setting label="Fewest reps">
                  <Step
                    icon="minus"
                    label="Lower the bottom of the rep range"
                    disabled={reps.min <= bounds.min}
                    onPress={() => range(reps.min - REP_STEP, reps.max)}
                  />
                  <Count value={reps.min} />
                  <Step
                    icon="plus"
                    label="Raise the bottom of the rep range"
                    disabled={reps.min >= reps.max}
                    onPress={() => range(reps.min + REP_STEP, reps.max)}
                  />
                </Setting>
                <Setting label="Most reps" last>
                  <Step
                    icon="minus"
                    label="Lower the top of the rep range"
                    disabled={reps.max <= reps.min}
                    onPress={() => range(reps.min, reps.max - REP_STEP)}
                  />
                  <Count value={reps.max} />
                  <Step
                    icon="plus"
                    label="Raise the top of the rep range"
                    disabled={reps.max >= bounds.max}
                    onPress={() => range(reps.min, reps.max + REP_STEP)}
                  />
                </Setting>
              </>
            )}
          </View>
          {fixedRange ? null : (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              Reps climb two at a time from the fewest to the most, then the weight goes up.
              {own ? ` This one does its best work at ${own.min} to ${own.max} reps, so it stays there.` : ""}
            </Text>
          )}
        </View>
        <View style={{ gap: 4 }}>
          {confirming ? (
            <>
              <BigButton label={`Remove ${exercise?.name ?? "exercise"}`} danger onPress={() => {
                setState((s) => removeEntry(s, workoutId, entry.id));
                close();
              }} />
              <TextButton label="Keep it" onPress={() => setConfirming(false)} />
            </>
          ) : (
            <BigButton label="Remove from this workout" quiet onPress={() => setConfirming(true)} />
          )}
        </View>
      </View>
    </Sheet>
  );
}

/** The two related actions for a lift; removal stays below its settings. */
function Action({ icon, label, onPress }: { icon: "swap" | "info"; label: string; onPress: () => void }) {
  return <Button icon={icon} label={label} kind="secondary" flex={1} onPress={onPress} />;
}


/**
 * One of a list to pick from: an exercise for a slot, a machine, a routine.
 * The picked one is filled in and ticked; one another slot is using is dimmed.
 */
function Choice({
  label,
  detail,
  active,
  used = false,
  onPress,
  onPreview,
}: {
  label: string;
  detail?: string;
  active: boolean;
  /** Taken by another slot in the same workout, so not offered. */
  used?: boolean;
  onPress: () => void;
  /** Preview independently, including exercises already used elsewhere. */
  onPreview?: () => void;
}) {
  const choice = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: used }}
      disabled={used}
      onPress={() => {
        if (!active) onPress();
      }}
      style={({ pressed }) => ({
        flex: onPreview ? 1 : undefined,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 58,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: active ? colors.cloud : colors.surface,
        opacity: used ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          flex: 1,
          color: active ? colors.ink : colors.text,
          fontSize: 17,
          fontWeight: active ? "800" : "600",
        }}
      >
        {label}
      </Text>
      {detail ? (
        <Text ui
          style={{
            color: active ? colors.ink : colors.faint,
            fontSize: 14,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {detail}
        </Text>
      ) : null}
      {used ? (
        <Text ui style={{ color: colors.faint, fontSize: 14, fontStyle: "italic" }}>in use</Text>
      ) : active ? (
        <Icon name="check" size={16} color={colors.ink} />
      ) : null}
    </Pressable>
  );
  if (!onPreview) return choice;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {choice}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How to do ${label}`}
        onPress={onPreview}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.raised,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="info" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function Field({
  value,
  placeholder,
  size,
  autoFocus,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  /** The workout's name: the heading of its sheet, set at heading size. */
  size?: "large";
  autoFocus?: boolean;
  onChange: (text: string) => void;
  onSubmit?: () => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      autoFocus={autoFocus}
      // Opened to be named — a new workout or a copy — the name starts
      // selected, so typing replaces "Push 2" rather than adding to it.
      selectTextOnFocus={autoFocus}
      returnKeyType="done"
      style={{
        minHeight: size ? 64 : 52,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        color: colors.text,
        fontSize: size ? 26 : 16,
        fontWeight: size ? "700" : "600",
      }}
    />
  );
}

/** How big a workout row's shape is drawn, behind its words, on average. */
const WATERMARK = 108;

/** A whole number from a workout's id, the same every time: its shape's own placement. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The family's shape, big, behind a workout row's words: run off the right
 * edge and cut by it, and pressed into the card — a shade of the card, with a
 * shadow along its top-left edge and a catch of light along its bottom-right,
 * as a blind stamp in card stock. Each workout sets its own a little
 * differently — size, tilt, how far it runs off, how high — from its id, so
 * the list looks set by hand and a workout keeps its look.
 */
function Watermark({ id, family, ground, ink, faint }: { id: string; family: Family; ground: string; ink: string; faint: boolean }) {
  const h = hash(id);
  const pick = (shift: number, from: number, to: number) => from + (((h >>> shift) & 255) / 255) * (to - from);
  const size = Math.round(pick(0, WATERMARK * 0.88, WATERMARK * 1.12));
  const lean = pick(8, 5, 16) * ((h >>> 16) & 1 ? 1 : -1);
  const off = pick(17, 0.18, 0.4);
  const rise = pick(24, -12, 12);
  // The pressed face: just off the card, toward its words.
  const face = mix(ground, ink, faint ? 0.06 : 0.12);
  const edge = faint ? 1 : 1.5;
  const layer = (dx: number, dy: number, color: string) => (
    <View style={{ position: "absolute", left: dx, top: dy }}>
      <Mark family={family} size={size} color={color} plain />
    </View>
  );
  // At dusk the shape glows faintly in its family's light instead.
  const glow = DUSK_CARDS && !faint;
  return (
    <View
      style={{
        position: "absolute",
        opacity: glow ? 0.26 : 1,
        right: -size * off,
        top: "50%",
        marginTop: -size / 2 + rise,
        width: size,
        height: size,
        transform: [{ rotate: `${lean}deg` }],
        pointerEvents: "none",
      }}
    >
      {glow ? (
        layer(0, 0, DUSK[family].glow)
      ) : (
        <>
          {layer(edge, edge, faint ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.14)")}
          {layer(-edge, -edge, faint ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.3)")}
          {layer(0, 0, face)}
        </>
      )}
    </View>
  );
}

/** The letterpress card stock's grain, laid over a row. */
function Grain() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <Image source={grain()} resizeMode="repeat" style={{ width: "100%", height: "100%", opacity: 0.14 }} />
    </View>
  );
}

/** A finger swiping the first workout to the left, over it: Pause and Delete are there. */
function RowHint({ onPlayed }: { onPlayed: () => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const y = size.height / 2;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {size.width > 0 ? (
        <GestureHint
          from={{ x: size.width * 0.72, y }}
          to={{ x: size.width * 0.28, y }}
          label={HINT_LABELS.rows}
          labelAt={{ x: 0, y: -20 }}
          onPlayed={onPlayed}
        />
      ) : null}
    </View>
  );
}
