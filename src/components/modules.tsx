import { useEffect, useState, type ReactNode } from "react";
import { Button, Chip, Chips, LinkButton } from "@/components/buttons";
import { LoopScope, setPlanFocus, usePlanFocus } from "@/components/loop-scope";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/text";
import { router } from "expo-router";

import { CardioChoices, CardioTarget } from "@/components/cardio-target";
import { AddExerciseSheet, type AddBlock } from "@/components/add-exercise";
import { Count, Setting, Step } from "@/components/controls";
import { DragList, type Drag } from "@/components/drag-list";
import { WorkoutGoals } from "@/components/goals";
import { GOALS_ON } from "@/data/goals";
import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { Segments } from "@/components/segments";
import { Swipe } from "@/components/swipe";
import {
  BigButton,
  OpenRow,
  SectionLabel,
  Sheet,
  TextButton,
} from "@/components/sheet";
import { WeightField } from "@/components/weight-field";
import { FAMILY, WORKOUT_STAGE, colors, familyWash, fonts, radii } from "@/constants/theme";
import {
  cardioPool,
  mobilityPool,
  routineUse,
  type CardioEnd,
} from "@/data/conditioning";
import { byId, highReps, isPattern } from "@/data/exercises";
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
import { repBounds, schemeOf } from "@/lib/progression";
import {
  SETS_RANGE,
  canPauseWorkout,
  copyToLoop,
  deleteLoop,
  deleteWorkout,
  hasLoops,
  inLoop,
  loopInUse,
  loopsOf,
  moveToLoop,
  renameLoop,
  switchLoop,
  cardioAmount,
  cardioPlan,
  chooseCardio,

  chosen,
  mobilityPlan,
  moveEntry,
  movePlanWorkout,
  planWorkouts,
  pauseWorkout,
  poolFor,
  removeEntry,
  renameWorkout,
  resumeWorkout,
  routineMinutes,
  setCardio,
  setMobility,
  setWarmup,
  balanceNotes,
  workoutMinutes,
  swapInPlan,
  hiddenExercises,
  takenElsewhere,
  upNext,
  updateEntry,
  useSession,
  warmupPlan,
  workoutFamily,
  workoutsUsing,
  type RoutineEnd,
  type SessionState,
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
 * Your workouts and what fills each slot. Rendered inside the Plan tab's
 * "Workouts" segment — see `plan.tsx` for the host, which freezes its scroll
 * while a row is being dragged.
 *
 * The list itself is only names, big enough to hit. Everything you can change
 * about a workout lives in its sheet, where there is room for it.
 */
export function Modules({ onDragChange }: { onDragChange: (dragging: boolean) => void }) {
  const { state, setState } = useSession();
  const inUse = loopInUse(state);
  const focus = usePlanFocus();
  const [shown, setShown] = useState(inUse);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [moving, setMoving] = useState<Workout | null>(null);
  const loops = loopsOf(state);
  // The loop on screen: the one chosen, while it is still there.
  const viewing = loops.some((l) => l.id === shown) ? shown : inUse;

  // Back from making a workout: show the loop it went to, and say so.
  useEffect(() => {
    if (!focus) return;
    setShown(focus.loop);
    setNotice(focus.note ? { text: focus.note } : null);
    setPlanFocus(null);
  }, [focus]);

  /** Change something, say what happened, and offer to put it back. */
  const change = (after: SessionState, text: string) => {
    if (after === state) return;
    setNotice({ text, before: state, after });
    setState(after);
  };

  return (
    <View style={{ gap: 24 }}>
      {hasLoops(state) ? (
        <Loops
          viewing={viewing}
          onShow={(id) => {
            setShown(id);
            setNotice(null);
          }}
          onChange={change}
        />
      ) : null}

      <LoopScope loop={viewing}>
        <LoopWorkouts
          onDragChange={onDragChange}
          onMove={setMoving}
          onChange={(before, after, text) => {
            if (after === before) return;
            // The change was made to the loop on screen; put it back in the whole.
            change(inLoop(state, viewing, () => after), text);
          }}
        />
      </LoopScope>

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

      <NewWorkout loop={viewing} />

      {hasLoops(state) ? null : (
        <View style={{ gap: 4 }}>
          <LinkButton kind="add" label="New loop" onPress={() => router.push({ pathname: "/new-workout", params: { start: "1" } })} />
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            A second set of workouts for when things change, like a holiday with no gym. You switch between them here.
          </Text>
        </View>
      )}

      {moving ? (
        <MoveSheet
          workout={moving}
          from={viewing}
          onClose={() => setMoving(null)}
          onDone={(after, text, to) => {
            setMoving(null);
            change(after, text);
            setShown(to);
          }}
        />
      ) : null}
    </View>
  );
}

/** A line under the list saying what just happened, with Undo when it can be undone. */
type Notice = { text: string; before?: SessionState; after?: SessionState };

/**
 * The loops, by name, with the one on screen picked out; the one in use
 * says so, and any other offers to be used. Rename and delete are here too.
 */
function Loops({
  viewing,
  onShow,
  onChange,
}: {
  viewing: string;
  onShow: (id: string) => void;
  onChange: (after: SessionState, text: string) => void;
}) {
  const { state } = useSession();
  const loops = loopsOf(state);
  const inUse = loops.find((l) => l.inUse)!;
  const shown = loops.find((l) => l.id === viewing) ?? inUse;
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const count = shown.workouts.length;

  return (
    <View style={{ gap: 14 }}>
      <Chips>
        {loops.map((l) => (
          <Chip key={l.id} label={l.inUse ? `${l.name} ·  in use` : l.name} on={l.id === shown.id}
            onPress={() => { onShow(l.id); setRenaming(null); setDeleting(false); }} />
        ))}
        <Chip label="+ New loop" on={false} onPress={() => router.push({ pathname: "/new-workout", params: { start: "1", loop: shown.id } })} />
      </Chips>

      {shown.inUse ? (
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
          In use: your workouts come from {shown.name}.
        </Text>
      ) : (
        <View style={{ gap: 12, padding: 18, borderRadius: radii.card, borderCurve: "continuous", backgroundColor: colors.surface }}>
          <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
            Not in use. Your workouts come from {inUse.name} right now.
          </Text>
          <Button
            label={`Use ${shown.name}`}
            disabled={!!state.active}
            onPress={() => {
              const after = switchLoop(state, shown.id);
              onChange(after, `Now using ${shown.name}. Next up: ${upNext(after).name}. ${inUse.name} waits where you left it.`);
            }}
          />
          {state.active ? (
            <Text style={{ color: colors.muted, fontSize: 15 }}>Finish your workout first.</Text>
          ) : null}
        </View>
      )}

      {renaming !== null ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TextInput
            autoFocus
            accessibilityLabel="Loop name"
            value={renaming}
            onChangeText={setRenaming}
            returnKeyType="done"
            maxLength={30}
            onSubmitEditing={() => {
              onChange(renameLoop(state, shown.id, renaming), `Renamed to ${renaming.trim()}.`);
              setRenaming(null);
            }}
            style={{ flex: 1, minHeight: 52, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.surface, color: colors.text, fontSize: 19 }}
          />
          <LinkButton kind="link" label="Done" onPress={() => {
            onChange(renameLoop(state, shown.id, renaming), `Renamed to ${renaming.trim()}.`);
            setRenaming(null);
          }} />
        </View>
      ) : deleting ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
            Delete {shown.name}? Its {count} workout{count === 1 ? "" : "s"} can go with it, or move to {inUse.name}.
          </Text>
          <Button kind="secondary" label={`Move them to ${inUse.name}`} onPress={() => {
            onShow(inUse.id);
            onChange(deleteLoop(state, shown.id, inUse.id), `${shown.name} deleted. Its workouts are in ${inUse.name}.`);
            setDeleting(false);
          }} />
          <Button kind="remove" label="Delete them too" onPress={() => {
            onShow(inUse.id);
            onChange(deleteLoop(state, shown.id), `${shown.name} deleted, with its workouts.`);
            setDeleting(false);
          }} />
          <LinkButton kind="quiet" label="Cancel" onPress={() => setDeleting(false)} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 20 }}>
          <LinkButton kind="link" label="Rename" onPress={() => setRenaming(shown.name)} />
          {shown.inUse ? null : <LinkButton kind="link" label="Delete loop" onPress={() => setDeleting(true)} />}
        </View>
      )}
    </View>
  );
}

/** The workouts of the loop on screen — see `LoopScope` — to open, drag, swipe. */
function LoopWorkouts({
  onDragChange,
  onMove,
  onChange,
}: {
  onDragChange: (dragging: boolean) => void;
  onMove: (workout: Workout) => void;
  onChange: (before: SessionState, after: SessionState, text: string) => void;
}) {
  const { state, setState } = useSession();
  const next = upNext(state).id;
  const rows = planWorkouts(state);
  const loops = hasLoops(state);
  const isPaused = (w: Workout) => state.removedWorkouts.some((r) => r.workout.id === w.id);

  return (
    <View style={{ gap: 24 }}>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        Your workouts take turns, top to bottom, then back to the top. Tap one
        to change it. Hold and drag to move it. Swipe left to pause, resume{loops ? ", move" : ""} or delete.
      </Text>

      <DragList
        data={rows}
        keyOf={(w) => w.id}
        gap={10}
        onDragChange={onDragChange}
        onMove={(from, to) => setState((s) => movePlanWorkout(s, from, to))}
        renderItem={(w, drag) => (
          <WorkoutRow
            workout={w}
            paused={isPaused(w)}
            canManage={state.active?.workoutId !== w.id && (isPaused(w) || canPauseWorkout(state))}
            onPause={() => setState((s) => (isPaused(w) ? resumeWorkout(s, w.id) : pauseWorkout(s, w.id)))}
            onDelete={() => onChange(state, deleteWorkout(state, w.id), `${w.name || "Untitled"} deleted.`)}
            onMove={loops ? () => onMove(w) : undefined}
            isNext={w.id === next}
            drag={drag}
            onOpen={() => {
              router.push({ pathname: "/plan-editor", params: { id: w.id } });
            }}
          />
        )}
      />
    </View>
  );
}

/** Move a workout to another loop, or copy it there. */
function MoveSheet({
  workout,
  from,
  onClose,
  onDone,
}: {
  workout: Workout;
  from: string;
  onClose: () => void;
  onDone: (after: SessionState, text: string, to: string) => void;
}) {
  const { state } = useSession();
  const others = loopsOf(state).filter((l) => l.id !== from);
  const name = workout.name || "Untitled";
  return (
    <Sheet visible title={`Move ${name}`} onClose={onClose}>
      <View style={{ gap: 10, paddingTop: 8 }}>
        {others.map((l) => {
          const after = moveToLoop(state, workout.id, from, l.id);
          return (
            <Button key={l.id} label={`Move to ${l.name}`} disabled={after === state}
              onPress={() => onDone(after, `${name} moved to ${l.name}.`, l.id)} />
          );
        })}
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }}>
          Or keep it here, and put a copy in another loop:
        </Text>
        {others.map((l) => (
          <Button key={`copy-${l.id}`} kind="secondary" label={`Copy to ${l.name}`}
            onPress={() => onDone(copyToLoop(state, workout.id, from, l.id, newId("w")), `A copy of ${name} is in ${l.name}.`, l.id)} />
        ))}
        {others.some((l) => moveToLoop(state, workout.id, from, l.id) === state) ? (
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            {state.active?.workoutId === workout.id
              ? "It can't move while you're training it."
              : "It's the last workout in its loop, so it stays. Copy it instead."}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

/** The entry point stays in place; its choices open fully in view. */
function NewWorkout({ loop }: { loop: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/new-workout", params: { loop } })}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 60, borderRadius: radii.card, borderCurve: "continuous", borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="plus" size={16} color={colors.muted} />
      <Text ui style={{ color: colors.muted, fontSize: 16, fontWeight: "700" }}>New workout</Text>
    </Pressable>
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
  canManage,
  onPause,
  onDelete,
  onMove,
  isNext,
  drag,
  onOpen,
}: {
  workout: Workout;
  paused: boolean;
  canManage: boolean;
  onPause: () => void;
  onDelete: () => void;
  /** Present when there are other loops to move it to. */
  onMove?: () => void;
  isNext: boolean;
  drag: Drag;
  onOpen: () => void;
}) {
  const { state } = useSession();
  const family = workoutFamily(state, workout);
  const count = workout.exercises.length;
  return (
    <Swipe
      actions={[
        { label: paused ? "Resume" : "Pause", onPress: onPause, disabled: !canManage },
        ...(onMove ? [{ label: "Move", onPress: onMove }] : []),
        { label: "Delete", onPress: onDelete, disabled: !canManage, destructive: true },
      ]}
      // The last workout cannot go: the loop needs something in it.
      disabled={drag.active}
      radius={radii.card}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? `${workout.name || "Untitled"}, paused` : undefined}
        accessibilityHint={paused ? "Opens the workout. Swipe left to resume or delete it." : "Opens the workout. Hold and drag to reorder."}
        {...moveActions(drag)}
        accessibilityActions={[...moveActions(drag).accessibilityActions, ...(canManage ? [{ name: "pause", label: paused ? "Resume workout" : "Pause workout" }, { name: "delete", label: "Delete workout" }] : [])]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "pause" && canManage) onPause(); else if (e.nativeEvent.actionName === "delete" && canManage) onDelete(); else moveActions(drag).onAccessibilityAction(e); }}
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
          paddingLeft: 18,
          paddingRight: 20,
          paddingVertical: 16,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: paused ? colors.surface : familyWash(family),
          borderWidth: 1.5,
          borderColor: drag.active ? FAMILY[family].mark : "transparent",
          opacity: pressed && !drag.active ? 0.7 : 1,
        })}
      >
        {/* Paused: the shape goes grey and the words step back, so it reads
            as out of the loop at a glance; "Paused" says it in words too, and
            it comes back with a swipe left, Resume. */}
        <View style={{ width: 26, alignItems: "center" }}>
          <Mark family={family} size={24} color={paused ? colors.faint : undefined} />
        </View>
        <View style={{ flex: 1, gap: 2, opacity: paused ? 0.5 : 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 }}
          >
            {workout.name || "Untitled"}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: paused ? colors.muted : colors.text, fontSize: 16, fontStyle: "italic" }}
          >
            {[paused ? "Paused" : "", workout.subtitle, `${count} exercise${count === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        {paused ? null : isNext ? (
          <Text ui
            style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
          >
            {nextWord(state)}
          </Text>
        ) : null}
        <Icon name="open" size={15} color={colors.text} />
      </Pressable>
    </Swipe>
  );
}

/** A block of conditioning in a workout: cardio at one end, or a routine at one. */
type Block = CardioEnd | RoutineEnd;

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
  const [block, setBlock] = useState<Block | null>(null);
  // Which part of the workout Add exercise is adding to, if open.
  const [adding, setAdding] = useState<EntryPart | "main" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const close = () => {
    setSlot(null);
    setBlock(null);
    setAdding(null);
    setRenaming(false);
    onClose();
  };

  if (!workout) return <Sheet visible={false} title="" onClose={close} />;

  const entry = workout.exercises.find((e) => e.id === slot);
  const editingName = renaming || naming;
  const cardioStop = (where: CardioEnd) => {
    const plan = cardioPlan(state, workout, where);
    return plan ? (
      <Stop
        family="cardio"
        mark={<Mark family="cardio" size={16} />}
        title={plan.machine.name}
        detail={cardioAmount(plan)}
        onPress={() => setBlock(where)}
      />
    ) : null;
  };
  const routineStop = (where: RoutineEnd) => {
    const routine = routineAt(state, workout, where);
    return routine ? (
      <Stop
        family="mobility"
        mark={<Mark family="mobility" size={16} />}
        title={routine.name}
        detail={`about ${routineMinutes(routine)} min`}
        onPress={() => setBlock(where)}
      />
    ) : null;
  };

  // The exercises of one part, to drag among themselves, and a way to add one.
  // A part's list moves its own entries; the others keep their places.
  const lifts = (part: EntryPart | "main") => {
    const list = workout.exercises.filter((e) => (e.part ?? "main") === part);
    return (
      <>
        <DragList
          data={list}
          keyOf={(e) => e.id}
          onDragChange={setDragging}
          onMove={(from, to) => {
            const all = workout.exercises;
            setState((s) => moveEntry(s, workout.id, all.indexOf(list[from]), all.indexOf(list[to])));
          }}
          renderItem={(e, drag) => (
            <LiftStop workoutId={workout.id} entry={e} drag={drag} onOpen={() => embedded ? router.push({ pathname: "/plan-editor/exercise", params: { id: workout.id, slot: e.id } }) : setSlot(e.id)} />
          )}
        />
      </>
    );
  };

  // One "Add" at the foot of each part, and one sheet behind it. The
  // warm-up and cool-down also take cardio and mobility or stretches: those
  // are offered at the top of the same sheet and chosen there.
  const ends = { start: { cardio: "open", routine: "warmup" }, finish: { cardio: "close", routine: "end" } } as const;
  const blocksFor = (part: EntryPart): AddBlock[] => {
    const where = ends[part];
    const plan = cardioPlan(state, workout, where.cardio);
    const routine = routineAt(state, workout, where.routine);
    const use = where.routine === "warmup" ? "warmup" : "end";
    return [
      {
        id: "cardio",
        label: "Cardio",
        detail: plan ? `Instead of ${plan.machine.name}` : "A machine, or a run",
        family: "cardio",
        choose: (done) => (
          <CardioChoices
            options={cardioPool(state.hiddenConditioning)}
            current={plan?.machine.id ?? ""}
            onPick={(id) => {
              setState((s) => (plan ? chooseCardio(s, workout.id, where.cardio, id) : setCardio(s, workout.id, where.cardio, { machine: id })));
              done();
            }}
          />
        ),
      },
      {
        id: "routine",
        label: "Mobility",
        detail: routine ? `Instead of ${routine.name}` : use === "warmup" ? "To get moving" : "To finish on",
        family: "mobility",
        choose: (done) => (
          <View style={{ gap: 6 }}>
            {routinesFor(state, use).map((m) => (
                <Choice
                  key={m.id}
                  label={m.name}
                  detail={`${routineMinutes(m)} min`}
                  active={m.id === routine?.id}
                  onPress={() => {
                    setState((s) => chooseRoutine(s, workout.id, where.routine, m.id));
                    done();
                  }}
                />
              ))}
          </View>
        ),
      },
    ];
  };
  const addRow = (part: EntryPart | "main") => (
    <Stop
      add
      title="Add"
      a11y={{ accessibilityLabel: part === "main" ? "Add an exercise" : `Add to the ${part === "start" ? "warm-up" : "cool-down"}` }}
      onPress={() => setAdding(part)}
    />
  );

  return (
    <Sheet embedded={embedded} visible full title={workout.name || "Untitled"} closeLabel="Done" scrollEnabled={!dragging} onClose={close}
      page={entry ? <SlotSheet key={entry.id} embedded workoutId={workout.id} entry={entry} onClose={() => setSlot(null)} /> : undefined}
    >
      <View style={{ gap: 22, paddingTop: 4 }}>
        {editingName ? (
          <View style={{ gap: 10 }}>
            <Field
              value={workout.name}
              placeholder="Name"
              size="large"
              autoFocus
              onChange={(name) => setState((s) => renameWorkout(s, workout.id, { name }))}
              onSubmit={() => setRenaming(false)}
            />
            <Field
              value={workout.subtitle}
              placeholder="What it trains (optional)"
              onChange={(subtitle) => setState((s) => renameWorkout(s, workout.id, { subtitle }))}
              onSubmit={() => setRenaming(false)}
            />
            {renaming ? <TextButton label="Done renaming" onPress={() => setRenaming(false)} /> : null}
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ flex: 1, color: colors.muted, fontSize: 18, fontStyle: "italic" }}>
              {[workout.subtitle, `about ${workoutMinutes(state, workout)} min`].filter(Boolean).join(" · ")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rename this workout"
              hitSlop={8}
              onPress={() => setRenaming(true)}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, opacity: pressed ? 0.6 : 1 })}
            >
              <Icon name="rename" size={16} color={colors.rise} />
              <Text ui style={{ color: colors.rise, fontSize: 17, fontWeight: "600" }}>Rename</Text>
            </Pressable>
          </View>
        )}

        {/* Three colour bands share one uninterrupted timeline and rail position. */}
        <View style={{ marginHorizontal: -10, borderRadius: radii.card, borderCurve: "continuous", overflow: "hidden" }}>
          <View style={{ paddingHorizontal: 10, backgroundColor: WORKOUT_STAGE.warmup }}>
            <Part label="Warm-up" first />
            {cardioStop("open")}
            {routineStop("warmup")}
            {lifts("start")}
            {addRow("start")}
          </View>

          <View style={{ paddingHorizontal: 10, backgroundColor: WORKOUT_STAGE.exercises }}>
            <Part label="Exercises" />
            {lifts("main")}
            {addRow("main")}
            {balanceNotes(state, workout).map((note) => (
              <Rail key={note}>
                <Text style={{ paddingVertical: 6, color: colors.text, fontSize: 16, lineHeight: 22, fontStyle: "italic" }}>{note}</Text>
              </Rail>
            ))}
          </View>

          <View style={{ paddingHorizontal: 10, backgroundColor: WORKOUT_STAGE.cooldown }}>
            <Part label="Cool-down" />
            {lifts("finish")}
            {cardioStop("close")}
            {routineStop("end")}
            {addRow("finish")}
            <Rail last />
          </View>
        </View>

        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
          Tap any part to change it. Hold an exercise and drag to move it.
        </Text>

        {GOALS_ON ? <WorkoutGoals workoutId={workout.id} /> : null}
      </View>

      {/* Adding and conditioning keep their own editors. Lifts use the page above. */}
      <AddExerciseSheet
        workout={workout}
        part={adding === "main" ? undefined : (adding ?? undefined)}
        blocks={adding === "start" || adding === "finish" ? blocksFor(adding) : []}
        visible={adding !== null}
        onClose={() => setAdding(null)}
      />
      <CardioSheet
        workout={workout}
        where={block === "open" || block === "close" ? block : null}
        onClose={() => setBlock(null)}
      />
      <MobilitySheet
        workout={block === "warmup" || block === "end" ? workout : undefined}
        where={block === "warmup" ? "warmup" : "end"}
        onClose={() => setBlock(null)}
      />
    </Sheet>
  );
}

/** The thread's column: wide enough for a mark, with the line down its middle. */
const RAIL = 32;

/**
 * A stretch of the thread with something beside it. The line runs the full
 * height, from the top of the first part to the end of the last.
 */
function Rail({ children, mark, first, last }: { children?: ReactNode; mark?: ReactNode; first?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", minHeight: last ? 10 : undefined }}>
      <View style={{ width: RAIL, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            position: "absolute",
            top: first ? "50%" : 0,
            bottom: last ? "50%" : 0,
            width: 2,
            borderRadius: 1,
            backgroundColor: colors.muted,
            opacity: 0.35,
          }}
        />
        {mark ? (
          // A white disc behind the mark, so the thread stops at its edge.
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
            {mark}
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** The name of a stretch of the workout, small, beside the thread. */
function Part({ label, first }: { label: string; first?: boolean }) {
  return (
    <Rail first={first}>
      <Text ui style={{ paddingTop: 14, paddingBottom: 8, paddingLeft: 12, color: colors.text, fontSize: 15, fontWeight: "700" }}>
        {label}
      </Text>
    </Rail>
  );
}

/**
 * One part of the workout on the thread: its mark, its name and what it is,
 * and a way in. `add` is a part the workout doesn't have yet. `handle` makes it
 * one you hold and drag, like a workout in Plan.
 */
function Stop({
  mark,
  family,
  title,
  detail,
  onPress,
  add,
  handle,
  lifted,
  a11y,
}: {
  mark?: ReactNode;
  family?: Family;
  title: string;
  detail?: string;
  onPress: () => void;
  add?: boolean;
  handle?: Drag;
  lifted?: boolean;
  a11y?: object;
}) {
  const tint = family ? familyWash(family) : undefined;
  const ink = colors.text;
  return (
    <Rail
      mark={
        add ? (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.text, alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={11} color={colors.text} />
          </View>
        ) : (
          mark
        )
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginVertical: 3,
          borderRadius: 16,
          borderCurve: "continuous",
          backgroundColor: add ? "transparent" : tint ?? (lifted ? colors.raised : colors.bg),
          borderWidth: 1,
          borderColor: lifted ? ink : "transparent",
        }}
      >
        <Pressable
          accessibilityRole="button"
          {...a11y}
          onPress={onPress}
          onLongPress={handle?.start}
          onPressOut={handle?.cancel}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minHeight: add ? 48 : 60,
            paddingLeft: 14,
            paddingRight: 14,
            paddingVertical: 8,
            opacity: pressed && !lifted ? 0.6 : 1,
          })}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text ui={add} style={{ color: ink, fontSize: 18, fontWeight: add ? "700" : "600" }}>{title}</Text>
            {detail ? <Text ui style={{ color: tint ? ink : colors.muted, fontSize: 15 }}>{detail}</Text> : null}
          </View>
          {add ? null : <Icon name="open" size={13} color={tint ? ink : colors.faint} />}
        </Pressable>
      </View>
    </Rail>
  );
}

/** A lift on the thread: the exercise filling the slot and its sets and reps. Hold it to drag. */
function LiftStop({
  workoutId,
  entry,
  drag,
  onOpen,
}: {
  workoutId: string;
  entry: Entry;
  drag: Drag;
  onOpen: () => void;
}) {
  const { state } = useSession();
  const exercise = byId(chosen(state, workoutId, entry));
  const family = familyOf(exercise);
  return (
    <Stop
      family={family}
      mark={<Mark family={family} size={16} />}
      title={exercise?.name ?? "—"}
      detail={`${setsFor(entry)} × ${repLabel(schemeOf(exercise, entry.scheme))}`}
      onPress={onOpen}
      handle={drag}
      lifted={drag.active}
      a11y={{ accessibilityHint: "Opens the exercise to swap, change or remove it.", ...moveActions(drag) }}
    />
  );
}

/** A quiet + link at the foot of a list: Add exercise, Add cardio. */

/** The routine at one end of a workout. */
const routineAt = (state: SessionState, workout: Workout, where: RoutineEnd) =>
  where === "warmup" ? warmupPlan(state, workout) : mobilityPlan(state, workout);

/** Choose the routine at one end of a workout, or take it out with null. */
const chooseRoutine = (s: SessionState, workoutId: string, where: RoutineEnd, id: string | null) =>
  where === "warmup" ? setWarmup(s, workoutId, id) : setMobility(s, workoutId, id);

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
  where: CardioEnd | null;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [choosing, setChoosing] = useState(false);
  const plan = where ? cardioPlan(state, workout, where) : null;
  if (!where) return <Sheet visible={false} title="" onClose={onClose} />;
  if (!plan) return <Sheet visible title="Add cardio" onClose={onClose}>
    <CardioChoices options={cardioPool(state.hiddenConditioning)} current="" onPick={(id) => setState((s) => setCardio(s, workout.id, where, { machine: id }))} />
  </Sheet>;
  const close = () => { setChoosing(false); onClose(); };
  const target = plan.course !== undefined ? { course: plan.course } : { minutes: plan.minutes };

  return (
    <Sheet visible title={choosing ? "Choose cardio" : where === "open" ? "Cardio to start" : "Cardio to finish"}
      closeLabel={choosing ? "Back" : "Done"} onClose={choosing ? () => setChoosing(false) : close}>
      {choosing ? (
        <View style={{ gap: 12, paddingTop: 12 }}>
          <CardioChoices options={cardioPool(state.hiddenConditioning)} current={plan.machine.id} onPick={(id) => {
            setState((s) => chooseCardio(s, workout.id, where, id));
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
  onClose,
}: {
  workout: Workout | undefined;
  where: RoutineEnd;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  if (!workout) return <Sheet visible={false} title="" onClose={onClose} />;
  const routine = routineAt(state, workout, where);
  const pick = (id: string) => {
    setState((s) => chooseRoutine(s, workout.id, where, id));
    onClose();
  };

  return (
    <Sheet visible title="Mobility" closeLabel="Done" onClose={onClose}>
      <View style={{ gap: 28, paddingTop: 12 }}>
        <View style={{ gap: 6 }}>
          {routinesFor(state, where === "warmup" ? "warmup" : "end").map((m) => (
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
  // A small muscle climbs its own range in any slot — 10 to 14 — and the
  // buttons stay inside it. See `schemeOf`.
  const reps = repRange(schemeOf(exercise, entry.scheme));
  const bounds = repBounds(exercise);
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
              {exercise && highReps(exercise)
                ? " Small muscles like this one do best with more reps, so it never goes below 10."
                : ""}
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
