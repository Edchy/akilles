import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { DragList, type Drag } from "@/components/drag-list";
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
 */
export function Modules({ onDragChange }: { onDragChange: (dragging: boolean) => void }) {
  const { state, setState } = useSession();
  const next = upNext(state).id;
  // One module open at a time; all start closed.
  const [open, setOpen] = useState<string | null>(null);
  // A workout just created opens with its name ready to type.
  const [fresh, setFresh] = useState<string | null>(null);

  const create = () => {
    const id = newId("w");
    setState((s) => addWorkout(s, id, `Workout ${s.workouts.length + 1}`));
    setOpen(id);
    setFresh(id);
  };

  return (
    <View style={{ gap: 24 }}>
      <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
        Your workouts run top to bottom, then start again. Tap one to change
        what is in it; hold and drag to reorder.
      </Text>

      <DragList
        data={state.workouts}
        keyOf={(w) => w.id}
        gap={24}
        onDragChange={onDragChange}
        onMove={(from, to) => setState((s) => moveWorkout(s, from, to))}
        renderItem={(workout, drag) => (
          <Module
            workout={workout}
            isNext={workout.id === next}
            expanded={open === workout.id}
            renaming={fresh === workout.id}
            onToggle={() => {
              setFresh(null);
              setOpen(open === workout.id ? null : workout.id);
            }}
            drag={drag}
            onDragChange={onDragChange}
          />
        )}
      />

      <Pressable
        accessibilityRole="button"
        onPress={create}
        style={({ pressed }) => ({
          alignItems: "center",
          justifyContent: "center",
          minHeight: 56,
          borderRadius: radii.card,
          borderCurve: "continuous",
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: colors.line,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700" }}>
          + New workout
        </Text>
      </Pressable>

      <RemovedWorkouts />
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
        <Text style={{ color: colors.faint, fontSize: 12 }}>{open ? "▲" : "▼"}</Text>
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

function Module({
  workout,
  isNext,
  expanded,
  renaming: startRenaming,
  onToggle,
  drag,
  onDragChange,
}: {
  workout: Workout;
  isNext: boolean;
  expanded: boolean;
  renaming: boolean;
  onToggle: () => void;
  drag: Drag;
  onDragChange: (dragging: boolean) => void;
}) {
  const { state, setState } = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(startRenaming);
  const [confirming, setConfirming] = useState(false);

  const addable = new Set(addablePatterns(state, workout.id));
  const removable = canRemoveWorkout(state);
  // A built-in goes to Removed and can be put back; one of yours is gone for good.
  const builtIn = isBuiltInWorkout(workout.id);

  return (
    <View
      style={{
        gap: 6,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: isNext || drag.active ? colors.surface : colors.bg,
        borderWidth: 1,
        borderColor: drag.active ? colors.acid : isNext ? colors.surface : colors.line,
        padding: 16,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint="Hold and drag to reorder"
        {...moveActions(drag)}
        onPress={onToggle}
        onLongPress={drag.start}
        onPressOut={drag.cancel}
        delayLongPress={250}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 52,
          opacity: pressed && !drag.active ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700" }}>
            {workout.name || "Untitled"}
          </Text>
          <Text style={{ color: colors.faint, fontSize: 12 }}>
            {workout.subtitle ||
              `${workout.exercises.length} exercise${workout.exercises.length === 1 ? "" : "s"}`}
          </Text>
        </View>
        {isNext ? (
          <Text
            style={{
              color: colors.acid,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Next
          </Text>
        ) : null}
        <Text style={{ color: colors.faint, fontSize: 12 }}>
          {expanded ? "▲" : "▼"}
        </Text>
      </Pressable>

      {expanded && renaming ? (
        <View style={{ gap: 8, paddingBottom: 8 }}>
          <Field
            value={workout.name}
            placeholder="Name"
            autoFocus
            onChange={(name) => setState((s) => renameWorkout(s, workout.id, { name }))}
          />
          <Field
            value={workout.subtitle}
            placeholder="What it trains (optional)"
            onChange={(subtitle) =>
              setState((s) => renameWorkout(s, workout.id, { subtitle }))
            }
            onSubmit={() => setRenaming(false)}
          />
        </View>
      ) : null}

      {expanded ? (
        <DragList
          data={workout.exercises}
          keyOf={(e) => e.id}
          onDragChange={onDragChange}
          onMove={(from, to) => setState((s) => moveEntry(s, workout.id, from, to))}
          renderItem={(entry, entryDrag) => (
            <Slot
              workoutId={workout.id}
              entry={entry}
              expanded={open === entry.id}
              onToggle={() => setOpen(open === entry.id ? null : entry.id)}
              drag={entryDrag}
            />
          )}
        />
      ) : null}

      {expanded && workout.exercises.length === 0 ? (
        <Text style={{ color: colors.faint, fontSize: 13, paddingVertical: 8 }}>
          No exercises yet. Cardio and mobility still run either side.
        </Text>
      ) : null}

      {expanded && adding ? (
        <View style={{ gap: 8, paddingTop: 8 }}>
          <Text style={{ color: colors.faint, fontSize: 12 }}>
            Pick a movement. You can swap the exercise afterwards.
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
                  setOpen(entryId);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {expanded ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
            paddingTop: 8,
            marginHorizontal: -12,
          }}
        >
          {confirming ? (
            <Confirm
              label={`${builtIn ? "Remove" : "Delete"} ${workout.name || "this workout"}`}
              onCancel={() => setConfirming(false)}
              onConfirm={() => {
                setConfirming(false);
                setState((s) => removeWorkout(s, workout.id));
              }}
            />
          ) : (
            <>
              <TextButton
                label={adding ? "Done adding" : "+ Add exercise"}
                accent
                onPress={() => setAdding((v) => !v)}
              />
              <TextButton
                label={renaming ? "Done" : "Rename"}
                onPress={() => setRenaming((v) => !v)}
              />
              {isNext ? null : (
                <TextButton
                  label="Do next"
                  onPress={() => setState((s) => setNextWorkout(s, workout.id))}
                />
              )}
              <View style={{ flex: 1 }} />
              <TextButton
                label={builtIn ? "Remove" : "Delete"}
                // The last workout cannot go: the cycle needs something in it.
                disabled={!removable}
                onPress={() => setConfirming(true)}
              />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

/**
 * One slot. Tapping it does the common thing — swap the exercise — in one
 * more tap, and closes. Sets, reps and removing the slot are rarer, so they
 * sit one level further in rather than crowding every swap.
 */
function Slot({
  workoutId,
  entry,
  expanded,
  onToggle,
  drag,
}: {
  workoutId: string;
  entry: Entry;
  expanded: boolean;
  onToggle: () => void;
  drag: Drag;
}) {
  const { state, setState } = useSession();
  // "Sets & reps" opened, rather than the swap list.
  const [tuning, setTuning] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const options = poolFor(state, workoutId, entry);
  const taken = takenElsewhere(state, workoutId, entry);
  const exerciseId = chosen(state, workoutId, entry);
  // Speed work takes its reps and weight from elsewhere; there is no range to pick.
  const fixedRange = entry.scheme === "speed" || !!entry.derive;
  const sets = setsFor(entry);
  const reps = repRange(entry.scheme);
  const update = (patch: Parameters<typeof updateEntry>[3]) =>
    setState((s) => updateEntry(s, workoutId, entry.id, patch));

  const close = () => {
    setTuning(false);
    setConfirming(false);
    onToggle();
  };

  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: drag.active || expanded ? colors.raised : "transparent",
        marginHorizontal: -10,
        paddingHorizontal: 10,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint="Tap to swap. Hold and drag to reorder."
        {...moveActions(drag)}
        onPress={expanded ? close : onToggle}
        onLongPress={drag.start}
        onPressOut={drag.cancel}
        delayLongPress={250}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 52,
          opacity: pressed && !drag.active ? 0.6 : 1,
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
          {sets} × {repLabel(entry.scheme)}
        </Text>
      </Pressable>

      {expanded && !tuning ? (
        <View style={{ gap: 6, paddingBottom: 10 }}>
          {options.length > 1 ? (
            options.map((id) => {
              const active = id === exerciseId;
              const used = taken.has(id) && !active;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: used }}
                  disabled={used}
                  onPress={() => {
                    // One tap: swapped, and out of the way.
                    if (!active) setState((s) => chooseExercise(s, workoutId, entry.id, id));
                    close();
                  }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 52,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: active ? colors.acid : colors.surface,
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
                    <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "700" }}>
                      in use
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <Text
              style={{ color: colors.faint, fontSize: 14, lineHeight: 20, paddingVertical: 6 }}
            >
              Nothing else to swap to. Add more under Exercises.
            </Text>
          )}

          <View style={{ flexDirection: "row", marginHorizontal: -12 }}>
            {confirming ? (
              <Confirm
                label="Remove"
                onCancel={() => setConfirming(false)}
                onConfirm={() => {
                  setConfirming(false);
                  setState((s) => removeEntry(s, workoutId, entry.id));
                }}
              />
            ) : (
              <>
                <TextButton label="Sets & reps" onPress={() => setTuning(true)} />
                <View style={{ flex: 1 }} />
                <TextButton label="Remove" onPress={() => setConfirming(true)} />
              </>
            )}
          </View>
        </View>
      ) : null}

      {expanded && tuning ? (
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <Setting label="Sets">
            <Step
              glyph="−"
              label="Fewer sets"
              disabled={sets <= SETS_RANGE.min}
              onPress={() => update({ sets: sets - 1 })}
            />
            <Count value={sets} />
            <Step
              glyph="+"
              label="More sets"
              disabled={sets >= SETS_RANGE.max}
              onPress={() => update({ sets: sets + 1 })}
            />
          </Setting>

          {fixedRange ? (
            <Setting label="Reps">
              <Text style={{ color: colors.faint, fontSize: 14 }}>
                {repLabel(entry.scheme)}, fast — speed work
              </Text>
            </Setting>
          ) : (
            // The ladder climbs from the bottom of the range to the top, then
            // adds weight. A changed range is a new record at its own weight.
            <>
              <Setting label="Fewest reps">
                <Step
                  glyph="−"
                  label="Lower the bottom of the rep range"
                  disabled={reps.min <= REPS_RANGE.min}
                  onPress={() => update({ scheme: rangeScheme(reps.min - 1, reps.max) })}
                />
                <Count value={reps.min} />
                <Step
                  glyph="+"
                  label="Raise the bottom of the rep range"
                  disabled={reps.min >= reps.max}
                  onPress={() => update({ scheme: rangeScheme(reps.min + 1, reps.max) })}
                />
              </Setting>
              <Setting label="Most reps">
                <Step
                  glyph="−"
                  label="Lower the top of the rep range"
                  disabled={reps.max <= reps.min}
                  onPress={() => update({ scheme: rangeScheme(reps.min, reps.max - 1) })}
                />
                <Count value={reps.max} />
                <Step
                  glyph="+"
                  label="Raise the top of the rep range"
                  disabled={reps.max >= REPS_RANGE.max}
                  onPress={() => update({ scheme: rangeScheme(reps.min, reps.max + 1) })}
                />
              </Setting>
            </>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={close}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              borderRadius: 999,
              backgroundColor: colors.acid,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>Done</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** The number between a pair of steppers. */
function Count({ value }: { value: number }) {
  return (
    <Text
      style={{
        minWidth: 28,
        textAlign: "center",
        color: colors.text,
        fontSize: 17,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
      }}
    >
      {value}
    </Text>
  );
}

/** A labelled line of controls inside an opened slot. */
function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text
        style={{
          width: 96,
          color: colors.faint,
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {children}
      </View>
    </View>
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
        backgroundColor: selected ? colors.acid : colors.raised,
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
  glyph,
  label,
  disabled,
  onPress,
}: {
  glyph: string;
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
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        // Sits on the opened slot's raised panel, so one step darker.
        backgroundColor: colors.surface,
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{glyph}</Text>
    </Pressable>
  );
}

function TextButton({
  label,
  accent = false,
  disabled = false,
  onPress,
}: {
  label: string;
  accent?: boolean;
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
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 12,
        opacity: disabled ? 0.25 : pressed ? 0.5 : 1,
      })}
    >
      <Text
        style={{
          color: accent ? colors.acid : colors.muted,
          fontSize: 13,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Two taps to remove: this is the second. */
function Confirm({
  label,
  onCancel,
  onConfirm,
}: {
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
      <TextButton label="Cancel" onPress={onCancel} />
      <View style={{ flex: 1 }} />
      <Pressable
        accessibilityRole="button"
        onPress={onConfirm}
        style={({ pressed }) => ({
          justifyContent: "center",
          minHeight: 44,
          paddingHorizontal: 14,
          marginRight: 12,
          borderRadius: 999,
          backgroundColor: colors.coral,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "800" }}>{label}</Text>
      </Pressable>
    </View>
  );
}

function Field({
  value,
  placeholder,
  autoFocus,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
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
        minHeight: 48,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.raised,
        color: colors.text,
        fontSize: 16,
        fontWeight: "600",
      }}
    />
  );
}
