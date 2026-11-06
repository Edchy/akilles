import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/text";

import { Count, Setting, Step } from "@/components/controls";
import { DragList, type Drag } from "@/components/drag-list";
import { GuideButton } from "@/components/guide";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustration";
import { Segments } from "@/components/segments";
import { SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { colors, radii } from "@/constants/theme";
import {
  HOLD_RANGE,
  MOBILITY,
  REPS_RANGE_MOVE,
  STRETCHES,
  mobilityById,
  pictureOf,
  type MobilityMove,
} from "@/data/conditioning";
import {
  addHold,
  isRoutineEdited,
  moveHold,
  nudgeHold,
  removeHold,
  resetRoutine,
  setHoldSides,
  useSession,
} from "@/store/session";

/** "60s each side", "45s", "15 reps", "12 reps each side". */
export const holdLabel = (move: Pick<MobilityMove, "seconds" | "perSide" | "reps">): string =>
  `${move.reps ? `${move.reps} reps` : `${move.seconds}s`}${move.perSide ? " each side" : ""}`;

/**
 * A routine's holds, editable: tap one to change how long it runs, whether
 * it is held on each side, or to take it out; hold and drag to reorder; add
 * more from the stretches that have a photo, or type your own. Every change
 * applies as you make it — and to every workout that ends on this routine.
 */
export function RoutineEditor({
  routineId,
  onDragChange,
}: {
  routineId: string;
  /** Lets the host sheet freeze its scroll while a hold is being dragged. */
  onDragChange: (dragging: boolean) => void;
}) {
  const { state, setState } = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const routine = mobilityById(routineId);
  if (!routine) return null;

  const builtIn = MOBILITY.some((m) => m.id === routineId);
  const last = routine.moves.length <= 1;

  return (
    <View style={{ gap: 8 }}>
      <DragList
        data={routine.moves}
        keyOf={(m) => m.id}
        gap={8}
        onDragChange={onDragChange}
        onMove={(from, to) => setState((s) => moveHold(s, routineId, from, to))}
        renderItem={(move, drag) => (
          <HoldRow
            move={move}
            drag={drag}
            open={open === move.id}
            onToggle={() => setOpen((o) => (o === move.id ? null : move.id))}
          >
            <HoldControls
              move={move}
              last={last}
              onNudge={(d) => setState((s) => nudgeHold(s, routineId, move.id, d))}
              onSides={(perSide) => setState((s) => setHoldSides(s, routineId, move.id, perSide))}
              onRemove={() => {
                setOpen(null);
                setState((s) => removeHold(s, routineId, move.id));
              }}
            />
          </HoldRow>
        )}
      />

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
        <Icon name="plus" size={16} color={colors.rise} />
        <Text style={{ color: colors.rise, fontSize: 16, fontWeight: "700" }}>Add stretch</Text>
      </Pressable>

      {builtIn && isRoutineEdited(state, routineId) ? (
        <TextButton
          label="Put it back as it was"
          onPress={() => {
            setOpen(null);
            setState((s) => resetRoutine(s, routineId));
          }}
        />
      ) : null}

      <AddStretch
        visible={adding}
        inRoutine={new Set(routine.moves.flatMap((m) => (m.stretch ? [m.stretch] : [])))}
        onClose={() => setAdding(false)}
        onAdd={(add) => {
          setAdding(false);
          setState((s) => addHold(s, routineId, add));
        }}
      />
    </View>
  );
}

/** One hold in the list: its picture, name and time. Tap to open its controls. */
function HoldRow({
  move,
  drag,
  open,
  onToggle,
  children,
}: {
  move: MobilityMove;
  drag: Drag;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: drag.active ? colors.raised : colors.surface,
        borderWidth: 1,
        borderColor: drag.active ? colors.rise : colors.surface,
        overflow: "hidden",
      }}
    >
      {/* The ⓘ sits beside the row's tap target rather than inside it: a
          button inside a button is one screen readers cannot reach. */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityHint="Opens the hold. Hold and drag to reorder."
          accessibilityActions={[
            ...(drag.index > 0 ? [{ name: "moveUp", label: "Move up" }] : []),
            ...(drag.index < drag.count - 1 ? [{ name: "moveDown", label: "Move down" }] : []),
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === "moveUp") drag.moveBy(-1);
            if (e.nativeEvent.actionName === "moveDown") drag.moveBy(1);
          }}
          onPress={onToggle}
          onLongPress={drag.start}
          onPressOut={drag.cancel}
          delayLongPress={250}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            minHeight: 64,
            paddingLeft: 8,
            paddingRight: 8,
            paddingVertical: 8,
            opacity: pressed && !drag.active ? 0.7 : 1,
          })}
        >
          <Illustration
            id={pictureOf(move)}
            compact
            style={{ width: 64, height: 46, borderRadius: 10, borderCurve: "continuous" }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{move.name}</Text>
            <Text style={{ color: colors.faint, fontSize: 13, fontVariant: ["tabular-nums"] }}>
              {holdLabel(move)}
            </Text>
          </View>
          <Icon name={open ? "collapse" : "expand"} size={13} color={colors.faint} />
        </Pressable>
        {move.stretch ? (
          <GuideButton id={pictureOf(move)} name={move.name} cue={move.cue} size={32} />
        ) : null}
      </View>
      {open ? children : null}
    </View>
  );
}

/** How long, which sides, and out. */
function HoldControls({
  move,
  last,
  onNudge,
  onSides,
  onRemove,
}: {
  move: MobilityMove;
  /** The routine's only hold, which stays. */
  last: boolean;
  onNudge: (direction: 1 | -1) => void;
  onSides: (perSide: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <View style={{ gap: 12, paddingHorizontal: 14, paddingBottom: 14 }}>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
        {move.reps ? (
          <Setting label="Reps" last>
            <Step
              icon="minus"
              label="Fewer reps"
              disabled={move.reps <= REPS_RANGE_MOVE.min}
              onPress={() => onNudge(-1)}
            />
            <Count value={move.reps} />
            <Step
              icon="plus"
              label="More reps"
              disabled={move.reps >= REPS_RANGE_MOVE.max}
              onPress={() => onNudge(1)}
            />
          </Setting>
        ) : (
          <Setting label="Hold" last>
            <Step
              icon="minus"
              label="Shorter hold"
              disabled={move.seconds <= HOLD_RANGE.min}
              onPress={() => onNudge(-1)}
            />
            <Count value={`${move.seconds}s`} />
            <Step
              icon="plus"
              label="Longer hold"
              disabled={move.seconds >= HOLD_RANGE.max}
              onPress={() => onNudge(1)}
            />
          </Setting>
        )}
      </View>
      <Segments
        options={[
          { value: "once", label: "Once" },
          { value: "each", label: "Each side" },
        ]}
        value={move.perSide ? "each" : "once"}
        onChange={(v) => onSides(v === "each")}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: last }}
        disabled={last}
        onPress={onRemove}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          justifyContent: "center",
          minHeight: 44,
          opacity: last ? 0.3 : pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.bend, fontSize: 15, fontWeight: "700" }}>
          {last ? "The last stretch stays" : "Remove from routine"}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Every stretch with a photo, one tap to add — or a name of your own, which
 * comes without a picture or guide.
 */
function AddStretch({
  visible,
  inRoutine,
  onClose,
  onAdd,
}: {
  visible: boolean;
  /** Stretches the routine already has, marked so you can see them. */
  inRoutine: Set<string>;
  onClose: () => void;
  onAdd: (add: { stretch: string } | { name: string }) => void;
}) {
  const [name, setName] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name });
    setName("");
  };

  return (
    <Sheet visible={visible} title="Add a stretch" onClose={onClose}>
      <View style={{ gap: 28, paddingTop: 12 }}>
        <View style={{ gap: 8 }}>
          {STRETCHES.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${s.name}`}
              onPress={() => onAdd({ stretch: s.id })}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 64,
                paddingLeft: 8,
                paddingRight: 14,
                paddingVertical: 8,
                borderRadius: 16,
                borderCurve: "continuous",
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Illustration
                id={s.id}
                compact
                style={{ width: 64, height: 46, borderRadius: 10, borderCurve: "continuous" }}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{s.name}</Text>
                <Text style={{ color: colors.faint, fontSize: 13 }}>{holdLabel(s)}</Text>
              </View>
              {inRoutine.has(s.id) ? (
                <Text style={{ color: colors.faint, fontSize: 14, fontStyle: "italic" }}>in it</Text>
              ) : (
                <Icon name="plus" size={16} color={colors.rise} />
              )}
            </Pressable>
          ))}
        </View>

        <View
          style={{
            gap: 10,
            borderRadius: radii.card,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            padding: 14,
          }}
        >
          <SectionLabel>Your own</SectionLabel>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="Name of the stretch"
            placeholderTextColor={colors.faint}
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
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
            Starts at 45 seconds. One you type in has no photo or guide.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !name.trim() }}
            disabled={!name.trim()}
            onPress={submit}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              borderRadius: 999,
              backgroundColor: colors.raised,
              opacity: !name.trim() ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}
