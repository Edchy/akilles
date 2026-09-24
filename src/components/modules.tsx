import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { DragList, type Drag } from "@/components/drag-list";
import { Icon, type IconName } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { colors, radii } from "@/constants/theme";
import { PATTERN_LABEL, PATTERN_ORDER, byId } from "@/data/exercises";
import {
  REPS_RANGE,
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
  addEntry,
  addWorkout,
  addablePatterns,
  canRemoveWorkout,
  chooseExercise,
  isBuiltInWorkout,
  chosen,
  moveEntry,
  moveWorkout,
  poolFor,
  removeEntry,
  removeWorkout,
  renameWorkout,
  restoreWorkout,
  setNextWorkout,
  takenElsewhere,
  upNext,
  updateEntry,
  useSession,
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

  const workout = state.workouts.find((w) => w.id === editing);

  return (
    <View style={{ gap: 24 }}>
      <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
        Your workouts run top to bottom, then start again. Tap one to change
        it; hold and drag to reorder.
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

      <Pressable
        accessibilityRole="button"
        onPress={create}
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
        <Icon name="plus" size={16} color={colors.muted} weight="semibold" />
        <Text style={{ color: colors.muted, fontSize: 16, fontWeight: "700" }}>New workout</Text>
      </Pressable>

      <RemovedWorkouts />

      {/* Rendered once, for whichever workout is open. A workout removed
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
 * Built-in workouts you have removed, one tap from coming back — the same
 * idea, and the same look, as removed exercises in the catalogue.
 */
function RemovedWorkouts() {
  const { state, setState } = useSession();
  const [open, setOpen] = useState(false);
  const rows = state.removedWorkouts.map((r) => r.workout);
  if (rows.length === 0) return null;

  return (
    <View
      style={{
        gap: 6,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: open ? colors.surface : "transparent",
        borderWidth: 1,
        borderColor: open ? colors.surface : colors.line,
        padding: 16,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: 44,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ flex: 1, color: colors.muted, fontSize: 19, fontWeight: "700" }}>
          Removed
        </Text>
        <Text
          style={{
            color: colors.faint,
            fontSize: 11,
            fontWeight: "800",
            fontVariant: ["tabular-nums"],
          }}
        >
          {rows.length}
        </Text>
        <Icon name={open ? "collapse" : "expand"} size={14} color={colors.faint} />
      </Pressable>

      {open ? (
        <>
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
            Kept, not deleted. Put one back and it returns where it was, exactly
            as you left it.
          </Text>

          {rows.map((w) => (
            <View
              key={w.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}
            >
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>
                  {w.name || "Untitled"}
                </Text>
                {w.subtitle ? (
                  <Text style={{ color: colors.faint, fontSize: 12 }}>{w.subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Put ${w.name} back`}
                onPress={() => setState((s) => restoreWorkout(s, w.id))}
                hitSlop={8}
                style={({ pressed }) => ({
                  justifyContent: "center",
                  minHeight: 44,
                  marginRight: -6,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: colors.raised,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>
                  Put back
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** One workout in the list: its name, what it trains, and whether it is next. */
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
  const count = workout.exercises.length;
  return (
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
        gap: 12,
        minHeight: 84,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: drag.active ? colors.raised : colors.surface,
        borderWidth: 1,
        borderColor: drag.active ? colors.rise : colors.surface,
        opacity: pressed && !drag.active ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: 21, fontWeight: "700" }}>
          {workout.name || "Untitled"}
        </Text>
        <Text style={{ color: colors.faint, fontSize: 14 }}>
          {[workout.subtitle, `${count} exercise${count === 1 ? "" : "s"}`]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      {isNext ? (
        <Text
          style={{
            color: colors.rise,
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Next
        </Text>
      ) : null}
      <Icon name="open" size={15} color={colors.faint} weight="semibold" />
    </Pressable>
  );
}

/**
 * Everything about one workout, with room to breathe: its name, its
 * exercises in order, and the few things you can do to it as a whole.
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
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);

  const close = () => {
    setSlot(null);
    setAdding(false);
    setConfirming(false);
    onClose();
  };

  if (!workout) return <Sheet visible={false} title="" onClose={close} />;

  const addable = new Set(addablePatterns(state, workout.id));
  const removable = canRemoveWorkout(state);
  // A built-in goes to Removed and can be put back; one of yours is gone for good.
  const builtIn = isBuiltInWorkout(workout.id);
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
              No exercises yet. Cardio and mobility still run either side.
            </Text>
          ) : null}

          {adding ? (
            <View style={{ gap: 12, paddingTop: 8 }}>
              <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
                Pick a movement. You can choose the exercise for it next.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PATTERN_ORDER.filter((p) => addable.has(p)).map((pattern) => (
                  <Chip
                    key={pattern}
                    label={PATTERN_LABEL[pattern]}
                    onPress={() => {
                      const entryId = newId("s");
                      setState((s) => addEntry(s, workout.id, pattern, entryId));
                      setAdding(false);
                      setSlot(entryId);
                    }}
                  />
                ))}
              </View>
              <TextButton label="Cancel" onPress={() => setAdding(false)} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdding(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                minHeight: 52,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name="plus" size={16} color={colors.rise} weight="semibold" />
              <Text style={{ color: colors.rise, fontSize: 16, fontWeight: "700" }}>
                Add exercise
              </Text>
            </Pressable>
          )}
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

          {confirming ? (
            <BigButton
              label={`${builtIn ? "Remove" : "Delete"} ${workout.name || "this workout"}`}
              danger
              onPress={() => {
                setConfirming(false);
                setState((s) => removeWorkout(s, workout.id));
                close();
              }}
            />
          ) : (
            <BigButton
              label={builtIn ? "Remove workout" : "Delete workout"}
              quiet
              // The last workout cannot go: the cycle needs something in it.
              disabled={!removable}
              onPress={() => setConfirming(true)}
            />
          )}
          {confirming ? (
            <TextButton label="Keep it" onPress={() => setConfirming(false)} />
          ) : !removable ? (
            <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center" }}>
              The last workout stays — the cycle needs something in it.
            </Text>
          ) : builtIn ? (
            <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center" }}>
              Removed workouts can be put back later, exactly as they were.
            </Text>
          ) : null}
        </View>
      </View>

      {/* A sheet over the sheet: one exercise slot, opened from the list above. */}
      <SlotSheet workoutId={workout.id} entry={entry} onClose={() => setSlot(null)} />
    </Sheet>
  );
}

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
  const { state } = useSession();
  const exerciseId = chosen(state, workoutId, entry);
  return (
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
        borderColor: drag.active ? colors.rise : colors.surface,
        opacity: pressed && !drag.active ? 0.7 : 1,
      })}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "600" }}>
        {byId(exerciseId)?.name ?? "—"}
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
      <Icon name="open" size={13} color={colors.faint} weight="semibold" />
    </Pressable>
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
                const used = taken.has(id) && !active;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: used }}
                    disabled={used}
                    onPress={() => {
                      if (!active) setState((s) => chooseExercise(s, workoutId, entry.id, id));
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
                      {byId(id)!.name}
                    </Text>
                    {used ? (
                      <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}>
                        IN USE
                      </Text>
                    ) : active ? (
                      <Icon name="check" size={16} color={colors.ink} weight="bold" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
              {byId(exerciseId)?.name}. Nothing else to swap to — add more under Exercises.
            </Text>
          )}
        </View>

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
                    onPress={() => update({ scheme: rangeScheme(reps.min - 1, reps.max) })}
                  />
                  <Count value={reps.min} />
                  <Step
                    icon="plus"
                    label="Raise the bottom of the rep range"
                    disabled={reps.min >= reps.max}
                    onPress={() => update({ scheme: rangeScheme(reps.min + 1, reps.max) })}
                  />
                </Setting>
                <Setting label="Most reps" last>
                  <Step
                    icon="minus"
                    label="Lower the top of the rep range"
                    disabled={reps.max <= reps.min}
                    onPress={() => update({ scheme: rangeScheme(reps.min, reps.max - 1) })}
                  />
                  <Count value={reps.max} />
                  <Step
                    icon="plus"
                    label="Raise the top of the rep range"
                    disabled={reps.max >= REPS_RANGE.max}
                    onPress={() => update({ scheme: rangeScheme(reps.min, reps.max + 1) })}
                  />
                </Setting>
              </>
            )}
          </View>
          {fixedRange ? null : (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              Reps climb from the fewest to the most, then the weight goes up.
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

/** The number between a pair of steppers. */
function Count({ value }: { value: number }) {
  return (
    <Text
      style={{
        minWidth: 36,
        textAlign: "center",
        color: colors.text,
        fontSize: 22,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
      }}
    >
      {value}
    </Text>
  );
}

/** A labelled row of controls in a grouped panel, divided from the next. */
function Setting({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 68,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>{children}</View>
    </View>
  );
}

/** A small heading over a group in a sheet. */
function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.faint,
        fontSize: 13,
        fontWeight: "800",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

/** A full-width action at the foot of a sheet. */
function BigButton({
  label,
  danger,
  quiet,
  disabled,
  onPress,
}: {
  label: string;
  /** The second tap of a removal. */
  danger?: boolean;
  /** Present but not inviting: the first tap of a removal. */
  quiet?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56,
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: danger ? colors.bend : quiet ? "transparent" : colors.raised,
        borderWidth: quiet ? 1 : 0,
        borderColor: colors.line,
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: danger ? colors.ink : quiet ? colors.bend : colors.text,
          fontSize: 16,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: selected ? colors.cloud : colors.raised,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? colors.ink : colors.text,
          fontSize: 14,
          fontWeight: selected ? "800" : "600",
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Step({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        // Sits on a surface panel, so one step lighter.
        backgroundColor: colors.raised,
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={18} color={colors.text} weight="semibold" />
    </Pressable>
  );
}

/** A quiet way out: "Cancel", "Keep it". Centred under the action it undoes. */
function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "center",
        justifyContent: "center",
        minHeight: 48,
        paddingHorizontal: 20,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700" }}>{label}</Text>
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
