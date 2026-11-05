import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/text";

import { AddExerciseSheet } from "@/components/add-exercise";
import { Count, Setting, Step } from "@/components/controls";
import { DragList, type Drag } from "@/components/drag-list";
import { WorkoutGoals } from "@/components/goals";
import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { RoutineEditor } from "@/components/routine";
import { Segments } from "@/components/segments";
import { Swipe } from "@/components/swipe";
import { BigButton, OpenRow, SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { WeightField } from "@/components/weight-field";
import { FAMILY, colors, fonts, radii } from "@/constants/theme";
import {
  COURSE_STEP,
  MINUTES_MAX,
  MINUTES_STEP,
  cardioPool,
  courseLabel,
  mobilityPool,
  type CardioEnd,
} from "@/data/conditioning";
import { PATTERN_LABEL, byId } from "@/data/exercises";
import { familyOf } from "@/data/families";
import {
  REPS_RANGE,
  REP_STEP,
  newId,
  rangeScheme,
  repLabel,
  repRange,
  setsFor,
  type Entry,
  type Workout,
} from "@/data/split";
import {
  SETS_RANGE,
  addWorkout,
  canPauseWorkout,
  cardioAmount,
  cardioPlan,
  chooseCardio,
  chooseExercise,
  copyRoutineFor,
  copyWorkout,
  chosen,
  deleteWorkout,
  mobilityPlan,
  moveEntry,
  moveWorkout,
  nudgeCardio,
  pauseWorkout,
  poolFor,
  removeEntry,
  renameWorkout,
  resumeWorkout,
  routineMinutes,
  setCardio,
  setCardioMode,
  setMobility,
  setNextWorkout,
  takenElsewhere,
  upNext,
  updateEntry,
  useSession,
  workoutFamily,
  workoutsUsing,
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
  const next = upNext(state).id;
  // The workout whose sheet is open.
  const [editing, setEditing] = useState<string | null>(null);
  // A workout just created opens with its name ready to type.
  const [fresh, setFresh] = useState<string | null>(null);

  const create = () => {
    const id = newId("w");
    setState((s) => addWorkout(s, id, `Workout ${s.workouts.length + 1}`));
    setFresh(id);
    setEditing(id);
  };

  const copy = (fromId: string) => {
    const id = newId("w");
    setState((s) => copyWorkout(s, fromId, id));
    setFresh(id);
    setEditing(id);
  };

  const workout = state.workouts.find((w) => w.id === editing);

  return (
    <View style={{ gap: 24 }}>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        Your workouts take turns, top to bottom, then back to the top. Tap one
        to change it. Hold and drag to move it. Swipe left to pause it.
      </Text>

      <DragList
        data={state.workouts}
        keyOf={(w) => w.id}
        gap={10}
        onDragChange={onDragChange}
        onMove={(from, to) => setState((s) => moveWorkout(s, from, to))}
        renderItem={(w, drag) => (
          <WorkoutRow
            workout={w}
            isNext={w.id === next}
            drag={drag}
            onOpen={() => {
              setFresh(null);
              setEditing(w.id);
            }}
          />
        )}
      />

      <NewWorkout onBlank={create} onCopy={copy} />

      <PausedWorkouts />

      {/* Rendered once, for whichever workout is open. A workout paused
          from inside its own sheet closes it by disappearing. */}
      <WorkoutSheet
        workout={workout}
        isNext={workout?.id === next}
        naming={!!workout && fresh === workout.id}
        onClose={() => {
          setEditing(null);
          setFresh(null);
        }}
      />
    </View>
  );
}

/**
 * New workout: start blank, or from a copy of one you have — the copy is the
 * template. Opens in place rather than as a sheet, so the new workout's own
 * sheet can slide straight up after it.
 */
function NewWorkout({
  onBlank,
  onCopy,
}: {
  onBlank: () => void;
  onCopy: (fromId: string) => void;
}) {
  const { state } = useSession();
  const [open, setOpen] = useState(false);
  const sources = [...state.workouts, ...state.removedWorkouts.map((r) => r.workout)];

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 60,
          borderRadius: radii.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: colors.line,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon name="plus" size={16} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 16, fontWeight: "700" }}>New workout</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        gap: 14,
        padding: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
      }}
    >
      <Pill
        onPress={() => {
          setOpen(false);
          onBlank();
        }}
      >
        <Icon name="plus" size={14} color={colors.text} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Start blank</Text>
      </Pill>
      <Text style={{ color: colors.muted, fontSize: 15, fontStyle: "italic" }}>Or copy one</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {sources.map((w) => (
          <Pill
            key={w.id}
            label={`Copy ${w.name || "Untitled"}`}
            onPress={() => {
              setOpen(false);
              onCopy(w.id);
            }}
          >
            <Mark family={workoutFamily(state, w)} size={12} />
            <Text style={{ color: colors.text, fontSize: 16 }}>{w.name || "Untitled"}</Text>
          </Pill>
        ))}
      </View>
      <TextButton label="Cancel" onPress={() => setOpen(false)} />
    </View>
  );
}

/** A white pill on the grey: one choice in New workout. */
function Pill({
  label,
  onPress,
  children,
}: {
  label?: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: radii.action,
        backgroundColor: colors.bg,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/**
 * Paused workouts: out of the loop, kept exactly as they are, one tap from
 * coming back to where they sat. Outlined rather than washed — they are not
 * part of the run of colours you train through. Swipe one left to delete it
 * for good.
 */
function PausedWorkouts() {
  const { state, setState } = useSession();
  const rows = state.removedWorkouts.map((r) => r.workout);
  if (rows.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 4, paddingBottom: 2 }}>
        <SectionLabel>Paused</SectionLabel>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Out of the loop and kept as they are. Swipe left to delete one for good.
        </Text>
      </View>
      {rows.map((w) => {
        const name = w.name || "Untitled";
        return (
          <Swipe
            key={w.id}
            label="Delete"
            radius={radii.card}
            onAction={() => setState((s) => deleteWorkout(s, w.id))}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                minHeight: 76,
                paddingLeft: 18,
                paddingRight: 12,
                paddingVertical: 12,
                borderRadius: radii.card,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <View style={{ width: 26, alignItems: "center", opacity: 0.4 }}>
                <Mark family={workoutFamily(state, w)} size={20} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.muted,
                    fontFamily: fonts.display,
                    fontSize: 23,
                    lineHeight: 29,
                  }}
                >
                  {name}
                </Text>
                {w.subtitle ? (
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.faint, fontSize: 15, fontStyle: "italic" }}
                  >
                    {w.subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Resume ${name}`}
                accessibilityActions={[{ name: "delete", label: `Delete ${name} for good` }]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === "delete") {
                    setState((s) => deleteWorkout(s, w.id));
                  }
                }}
                onPress={() => setState((s) => resumeWorkout(s, w.id))}
                hitSlop={6}
                style={({ pressed }) => ({
                  justifyContent: "center",
                  minHeight: 44,
                  paddingHorizontal: 18,
                  borderRadius: radii.action,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Resume</Text>
              </Pressable>
            </View>
          </Swipe>
        );
      })}
    </View>
  );
}

/**
 * One workout in the list, the way Today shows it: its shape, its name, what
 * it trains, on a wash of its colour — so the plan reads as the run of
 * colours you will train through. Swipe left to pause it.
 */
function WorkoutRow({
  workout,
  isNext,
  drag,
  onOpen,
}: {
  workout: Workout;
  isNext: boolean;
  drag: Drag;
  onOpen: () => void;
}) {
  const { state, setState } = useSession();
  const family = workoutFamily(state, workout);
  const count = workout.exercises.length;
  return (
    <Swipe
      label="Pause"
      // The last workout cannot go: the loop needs something in it.
      disabled={!canPauseWorkout(state) || drag.active}
      radius={radii.card}
      onAction={() => setState((s) => pauseWorkout(s, workout.id))}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the workout. Hold and drag to reorder."
        {...moveActions(drag)}
        onPress={onOpen}
        onLongPress={drag.start}
        onPressOut={drag.cancel}
        delayLongPress={250}
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
          backgroundColor: `${FAMILY[family].field}${drag.active ? "33" : "1A"}`,
          borderWidth: 1.5,
          borderColor: drag.active ? FAMILY[family].mark : "transparent",
          opacity: pressed && !drag.active ? 0.7 : 1,
        })}
      >
        <View style={{ width: 26, alignItems: "center" }}>
          <Mark family={family} size={24} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 }}
          >
            {workout.name || "Untitled"}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: colors.muted, fontSize: 16, fontStyle: "italic" }}
          >
            {[workout.subtitle, `${count} exercise${count === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        {isNext ? (
          <Text
            style={{ color: colors.text, fontSize: 16, fontStyle: "italic", fontWeight: "500" }}
          >
            Next
          </Text>
        ) : null}
        <Icon name="open" size={15} color={colors.muted} />
      </Pressable>
    </Swipe>
  );
}

/** A block of conditioning in a workout: cardio at one end, or the mobility. */
type Block = CardioEnd | "mobility";

/**
 * Everything about one workout, with room to breathe: its name, the whole
 * session in the order it runs — warm-up cardio, any goals, exercises, then
 * the finishing cardio and mobility — and the few things you can do to it as
 * a whole.
 */
function WorkoutSheet({
  workout,
  isNext,
  naming,
  onClose,
}: {
  workout: Workout | undefined;
  isNext: boolean;
  naming: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [slot, setSlot] = useState<string | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState(false);

  const close = () => {
    setSlot(null);
    setBlock(null);
    setAdding(false);
    onClose();
  };

  if (!workout) return <Sheet visible={false} title="" onClose={close} />;

  const pausable = canPauseWorkout(state);
  const entry = workout.exercises.find((e) => e.id === slot);

  return (
    <Sheet
      visible
      title="Workout"
      closeLabel="Done"
      scrollEnabled={!dragging}
      onClose={close}
    >
      <View style={{ gap: 36, paddingTop: 12 }}>
        <View style={{ gap: 10 }}>
          <Field
            value={workout.name}
            placeholder="Name"
            size="large"
            autoFocus={naming}
            onChange={(name) => setState((s) => renameWorkout(s, workout.id, { name }))}
          />
          <Field
            value={workout.subtitle}
            placeholder="What it trains (optional)"
            onChange={(subtitle) => setState((s) => renameWorkout(s, workout.id, { subtitle }))}
          />
        </View>

        <View style={{ gap: 12 }}>
          <SectionLabel>Warm-up</SectionLabel>
          <CardioRow workout={workout} where="open" onOpen={() => setBlock("open")} />
        </View>

        <WorkoutGoals workoutId={workout.id} />

        <View style={{ gap: 12 }}>
          <SectionLabel>Exercises</SectionLabel>
          <DragList
            data={workout.exercises}
            keyOf={(e) => e.id}
            gap={8}
            onDragChange={setDragging}
            onMove={(from, to) => setState((s) => moveEntry(s, workout.id, from, to))}
            renderItem={(e, drag) => (
              <SlotRow
                workoutId={workout.id}
                entry={e}
                drag={drag}
                onOpen={() => setSlot(e.id)}
              />
            )}
          />
          {workout.exercises.length === 0 ? (
            <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
              No exercises yet.
            </Text>
          ) : null}

          <AddRow label="Add exercise" onPress={() => setAdding(true)} />
        </View>

        <View style={{ gap: 12 }}>
          <SectionLabel>Finish</SectionLabel>
          <CardioRow workout={workout} where="close" onOpen={() => setBlock("close")} />
          <MobilityRow workout={workout} onOpen={() => setBlock("mobility")} />
        </View>

        <View style={{ gap: 12 }}>
          {isNext ? (
            <Text style={{ color: colors.faint, fontSize: 15, textAlign: "center" }}>
              This is the next workout.
            </Text>
          ) : (
            <BigButton
              label="Do this one next"
              onPress={() => setState((s) => setNextWorkout(s, workout.id))}
            />
          )}

          <BigButton
            label="Pause workout"
            quiet
            // The last workout cannot go: the loop needs something in it.
            disabled={!pausable}
            onPress={() => {
              setState((s) => pauseWorkout(s, workout.id));
              close();
            }}
          />
          <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center" }}>
            {pausable
              ? "It waits under the loop, exactly as it is, until you resume it."
              : "The last workout stays — the loop needs something in it."}
          </Text>
        </View>
      </View>

      {/* Sheets over the sheet: one exercise slot, or one block, opened from
          the list above. */}
      <SlotSheet workoutId={workout.id} entry={entry} onClose={() => setSlot(null)} />
      <AddExerciseSheet workout={workout} visible={adding} onClose={() => setAdding(false)} />
      <CardioSheet
        workout={workout}
        where={block === "open" || block === "close" ? block : null}
        onClose={() => setBlock(null)}
      />
      <MobilitySheet
        workout={block === "mobility" ? workout : undefined}
        onClose={() => setBlock(null)}
      />
    </Sheet>
  );
}

/** A quiet + link at the foot of a list: Add exercise, Add cardio. */
function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 52,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="plus" size={16} color={colors.rise} />
      <Text style={{ color: colors.rise, fontSize: 16, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

/**
 * A workout's cardio at one end: the machine and how long, or — if the
 * workout has none there — a link to put the default back.
 */
function CardioRow({
  workout,
  where,
  onOpen,
}: {
  workout: Workout;
  where: CardioEnd;
  onOpen: () => void;
}) {
  const { state, setState } = useSession();
  const plan = cardioPlan(state, workout, where);
  if (!plan) {
    return (
      <AddRow
        label="Add cardio"
        onPress={() => setState((s) => setCardio(s, workout.id, where, undefined))}
      />
    );
  }
  return (
    <OpenRow
      title={plan.machine.name}
      detail={`Cardio · ${cardioAmount(plan)}${plan.course !== undefined ? ", timed" : ""}`}
      onPress={onOpen}
    />
  );
}

/** The routine a workout ends on, or a link to put one back. */
function MobilityRow({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  const { state, setState } = useSession();
  const routine = mobilityPlan(state, workout);
  if (!routine) {
    return (
      <AddRow
        label="Add mobility"
        onPress={() => setState((s) => setMobility(s, workout.id, undefined))}
      />
    );
  }
  return (
    <OpenRow
      title={routine.name}
      detail={`Mobility · about ${routineMinutes(routine)} min`}
      onPress={onOpen}
    />
  );
}

/**
 * One cardio block, opened: which machine, and how long — a set distance
 * you time, or a set time you measure the distance of. Changes apply as you
 * make them, from the next time this workout runs.
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
  const plan = where ? cardioPlan(state, workout, where) : null;
  if (!where || !plan) return <Sheet visible={false} title="" onClose={onClose} />;

  const machines = cardioPool(state.hiddenConditioning);
  const timed = plan.course !== undefined;
  const atMin = timed
    ? plan.course <= COURSE_STEP[plan.machine.metric.unit]
    : plan.minutes <= MINUTES_STEP;
  const atMax = !timed && plan.minutes >= MINUTES_MAX;
  const nudge = (direction: 1 | -1) =>
    setState((s) => nudgeCardio(s, workout.id, where, direction));

  return (
    <Sheet
      visible
      title={where === "open" ? "Warm-up cardio" : "Finishing cardio"}
      closeLabel="Done"
      onClose={onClose}
    >
      <View style={{ gap: 36, paddingTop: 12 }}>
        <View style={{ gap: 12 }}>
          <SectionLabel>Machine</SectionLabel>
          {machines.length > 1 ? (
            <View style={{ gap: 6 }}>
              {machines.map((c) => (
                <Choice
                  key={c.id}
                  label={c.name}
                  active={c.id === plan.machine.id}
                  onPress={() => setState((s) => chooseCardio(s, workout.id, where, c.id))}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
              {plan.machine.name}. Nothing else to swap to — add more under Exercises.
            </Text>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <SectionLabel>How long</SectionLabel>
          <Segments
            options={[
              { value: "distance", label: "Set distance" },
              { value: "time", label: "Set time" },
            ]}
            value={timed ? "distance" : "time"}
            onChange={(mode) => {
              if (mode !== (timed ? "distance" : "time")) {
                setState((s) => setCardioMode(s, workout.id, where, mode));
              }
            }}
          />
          <View
            style={{
              borderRadius: radii.card,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              paddingHorizontal: 18,
              paddingVertical: 6,
            }}
          >
            <Setting label={timed ? "Distance" : "Minutes"} last>
              <Step
                icon="minus"
                label={timed ? "Shorter distance" : "Fewer minutes"}
                disabled={atMin}
                onPress={() => nudge(-1)}
              />
              <Count value={timed ? courseLabel(plan.machine, plan.course) : plan.minutes} />
              <Step
                icon="plus"
                label={timed ? "Longer distance" : "More minutes"}
                disabled={atMax}
                onPress={() => nudge(1)}
              />
            </Setting>
          </View>
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
            {timed
              ? "Your time over the distance is the score. Each distance keeps its own times."
              : "The distance you cover in the time is the score. Each length keeps its own record."}
          </Text>
        </View>

        <BigButton
          label="Remove from workout"
          quiet
          onPress={() => {
            setState((s) => setCardio(s, workout.id, where, null));
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

/**
 * The mobility a workout ends on, opened: pick a routine, and change its
 * stretches right here. A routine is shared by every workout that uses it,
 * so the sheet says who else an edit reaches — and offers a copy for this
 * workout alone.
 */
function MobilitySheet({
  workout,
  onClose,
}: {
  workout: Workout | undefined;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [dragging, setDragging] = useState(false);
  const routine = workout ? mobilityPlan(state, workout) : null;
  if (!workout || !routine) return <Sheet visible={false} title="" onClose={onClose} />;

  const routines = mobilityPool(state.hiddenConditioning);
  const others = workoutsUsing(state, routine.id).filter((w) => w.id !== workout.id);
  const name = workout.name || "this workout";

  return (
    <Sheet
      visible
      title="Mobility"
      closeLabel="Done"
      scrollEnabled={!dragging}
      onClose={onClose}
    >
      <View style={{ gap: 36, paddingTop: 12 }}>
        <View style={{ gap: 12 }}>
          <SectionLabel>Routine</SectionLabel>
          <View style={{ gap: 6 }}>
            {routines.map((m) => (
              <Choice
                key={m.id}
                label={m.name}
                detail={`${routineMinutes(m)} min`}
                active={m.id === routine.id}
                onPress={() => setState((s) => setMobility(s, workout.id, m.id))}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <SectionLabel>Stretches</SectionLabel>
          {others.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
                {`${namesOf(others)} ${others.length === 1 ? "ends" : "end"} on this routine too, so changes here change ${others.length === 1 ? "it" : "them"} as well.`}
              </Text>
              <AddRow
                label={`Make a copy just for ${name}`}
                onPress={() => setState((s) => copyRoutineFor(s, workout.id))}
              />
            </View>
          ) : null}
          <RoutineEditor routineId={routine.id} onDragChange={setDragging} />
        </View>

        <BigButton
          label="Remove from workout"
          quiet
          onPress={() => {
            setState((s) => setMobility(s, workout.id, null));
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

/** "Push A", "Push A and Legs", "Push A, Pull A and 2 more". */
const namesOf = (workouts: Workout[]): string => {
  const names = workouts.map((w) => w.name || "Untitled");
  if (names.length <= 2) return names.join(" and ");
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
};

/** One slot in a workout's list: the exercise filling it, and its sets and reps. */
function SlotRow({
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
  const { state, setState } = useSession();
  const exercise = byId(chosen(state, workoutId, entry));
  return (
    <Swipe
      label="Remove"
      disabled={drag.active}
      radius={18}
      onAction={() => setState((s) => removeEntry(s, workoutId, entry.id))}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the exercise. Hold and drag to reorder."
        {...moveActions(drag)}
        onPress={onOpen}
        onLongPress={drag.start}
        onPressOut={drag.cancel}
        delayLongPress={250}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 64,
          paddingHorizontal: 16,
          borderRadius: 18,
          borderCurve: "continuous",
          backgroundColor: drag.active ? colors.raised : colors.surface,
          borderWidth: 1,
          borderColor: drag.active ? colors.text : colors.surface,
          opacity: pressed && !drag.active ? 0.7 : 1,
        })}
      >
        <Mark family={familyOf(exercise)} size={16} />
        <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "600" }}>
          {exercise?.name ?? "—"}
        </Text>
        <Text
          style={{
            color: colors.faint,
            fontSize: 14,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {setsFor(entry)} × {repLabel(entry.scheme)}
        </Text>
        <Icon name="open" size={13} color={colors.faint} />
      </Pressable>
    </Swipe>
  );
}

/**
 * One slot, opened: which exercise fills it, how many sets, what rep range.
 * Every change applies as you make it; Done just closes.
 */
function SlotSheet({
  workoutId,
  entry,
  onClose,
}: {
  workoutId: string;
  entry: Entry | undefined;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setConfirming(false);
    onClose();
  };

  if (!entry) return <Sheet visible={false} title="" onClose={close} />;

  const options = poolFor(state, workoutId, entry);
  const taken = takenElsewhere(state, workoutId, entry);
  const exerciseId = chosen(state, workoutId, entry);
  // Speed work takes its reps and weight from elsewhere; there is no range to pick.
  const fixedRange = entry.scheme === "speed" || !!entry.derive;
  const sets = setsFor(entry);
  const reps = repRange(entry.scheme);
  const update = (patch: Parameters<typeof updateEntry>[3]) =>
    setState((s) => updateEntry(s, workoutId, entry.id, patch));

  return (
    <Sheet visible title={PATTERN_LABEL[entry.pattern]} closeLabel="Done" onClose={close}>
      <View style={{ gap: 36, paddingTop: 12 }}>
        <View style={{ gap: 12 }}>
          <SectionLabel>Exercise</SectionLabel>
          {options.length > 1 ? (
            <View style={{ gap: 6 }}>
              {options.map((id) => {
                const active = id === exerciseId;
                return (
                  <Choice
                    key={id}
                    label={byId(id)!.name}
                    active={active}
                    used={taken.has(id) && !active}
                    onPress={() => setState((s) => chooseExercise(s, workoutId, entry.id, id))}
                  />
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
              {byId(exerciseId)?.name}. Nothing else to swap to — add more under Exercises.
            </Text>
          )}
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
              // adds weight. A changed range is a new record at its own weight.
              <>
                <Setting label="Fewest reps">
                  <Step
                    icon="minus"
                    label="Lower the bottom of the rep range"
                    disabled={reps.min <= REPS_RANGE.min}
                    onPress={() => update({ scheme: rangeScheme(reps.min - REP_STEP, reps.max) })}
                  />
                  <Count value={reps.min} />
                  <Step
                    icon="plus"
                    label="Raise the bottom of the rep range"
                    disabled={reps.min >= reps.max}
                    onPress={() => update({ scheme: rangeScheme(reps.min + REP_STEP, reps.max) })}
                  />
                </Setting>
                <Setting label="Most reps" last>
                  <Step
                    icon="minus"
                    label="Lower the top of the rep range"
                    disabled={reps.max <= reps.min}
                    onPress={() => update({ scheme: rangeScheme(reps.min, reps.max - REP_STEP) })}
                  />
                  <Count value={reps.max} />
                  <Step
                    icon="plus"
                    label="Raise the top of the rep range"
                    disabled={reps.max >= REPS_RANGE.max}
                    onPress={() => update({ scheme: rangeScheme(reps.min, reps.max + REP_STEP) })}
                  />
                </Setting>
              </>
            )}
          </View>
          {fixedRange ? null : (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              Reps climb two at a time from the fewest to the most, then the weight goes up.
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          {confirming ? (
            <>
              <BigButton
                label="Remove from workout"
                danger
                onPress={() => {
                  setConfirming(false);
                  setState((s) => removeEntry(s, workoutId, entry.id));
                  onClose();
                }}
              />
              <TextButton label="Keep it" onPress={() => setConfirming(false)} />
            </>
          ) : (
            <BigButton label="Remove from workout" quiet onPress={() => setConfirming(true)} />
          )}
        </View>
      </View>
    </Sheet>
  );
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
}: {
  label: string;
  detail?: string;
  active: boolean;
  /** Taken by another slot in the same workout, so not offered. */
  used?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: used }}
      disabled={used}
      onPress={() => {
        if (!active) onPress();
      }}
      style={({ pressed }) => ({
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
        <Text
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
        <Text style={{ color: colors.faint, fontSize: 14, fontStyle: "italic" }}>in use</Text>
      ) : active ? (
        <Icon name="check" size={16} color={colors.ink} />
      ) : null}
    </Pressable>
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
