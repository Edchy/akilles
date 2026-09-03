import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { CYCLE, LADDERS, setsFor, type Entry, type Workout } from "@/data/split";
import {
  chooseExercise,
  chosen,
  poolFor,
  takenElsewhere,
  useSession,
} from "@/store/session";

/**
 * The five modules and what fills each slot. Rendered inside the Plan tab's
 * "Modules" segment — see `plan.tsx` for the host.
 */
export function Modules() {
  const { state } = useSession();
  const upcoming = state.cycleIndex % CYCLE.length;
  // One module open at a time; all start closed.
  const [open, setOpen] = useState<string | null>(null);

  return (
    <View style={{ gap: 24 }}>
      <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
        Five workouts on a loop. Each slot is fixed; tap one to choose which
        exercise fills it. S marks work you can fold into an earlier exercise's
        rest.
      </Text>

      {CYCLE.map((workout, i) => (
        <Module
          key={workout.id}
          workout={workout}
          isNext={i === upcoming}
          expanded={open === workout.id}
          onToggle={() => setOpen(open === workout.id ? null : workout.id)}
        />
      ))}
    </View>
  );
}

function Module({
  workout,
  isNext,
  expanded,
  onToggle,
}: {
  workout: Workout;
  isNext: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { state, setState } = useSession();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <View
      style={{
        gap: 6,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: isNext ? colors.surface : "transparent",
        borderWidth: 1,
        borderColor: isNext ? colors.surface : colors.line,
        padding: 16,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 52,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700" }}>
            {workout.name}
          </Text>
          <Text style={{ color: colors.faint, fontSize: 12 }}>
            {workout.subtitle}
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

      {expanded
        ? workout.exercises.map((entry) => (
            <Slot
              key={entry.slot}
              entry={entry}
              options={poolFor(state, workout.id, entry)}
              taken={takenElsewhere(state, workout.id, entry)}
              exerciseId={chosen(state, workout.id, entry)}
              expanded={open === entry.slot}
              onToggle={() => setOpen(open === entry.slot ? null : entry.slot)}
              onPick={(id) => {
                setOpen(null);
                setState((s) => chooseExercise(s, workout.id, entry.slot, id));
              }}
            />
          ))
        : null}
    </View>
  );
}

/** One slot: what it is for, what fills it, and the alternatives. */
function Slot({
  entry,
  options,
  taken,
  exerciseId,
  expanded,
  onToggle,
  onPick,
}: {
  entry: Entry;
  options: string[];
  /** Exercises another slot in this module is using — shown, but unavailable. */
  taken: Set<string>;
  exerciseId: string;
  expanded: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
}) {
  const fixed = options.length < 2;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={fixed}
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 48,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Text
            style={{
              color: colors.faint,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 0.9,
              textTransform: "uppercase",
            }}
          >
            {entry.slot}
          </Text>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
            {byId(exerciseId)!.name}
          </Text>
        </View>

        {/* A floater can be folded into an earlier exercise's rest period. */}
        {entry.floater ? (
          <Text
            accessibilityLabel="Can be supersetted"
            style={{
              color: colors.line,
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 0.5,
            }}
          >
            S
          </Text>
        ) : null}

        <Text
          style={{
            color: colors.faint,
            fontSize: 13,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {setsFor(entry)} × {LADDERS[entry.scheme][0]}
        </Text>

        {fixed ? null : (
          <Text style={{ color: expanded ? colors.acid : colors.faint, fontSize: 14 }}>
            ⇄
          </Text>
        )}
      </Pressable>

      {expanded ? (
        <View style={{ gap: 2, paddingBottom: 8 }}>
          {options.map((id) => {
            const active = id === exerciseId;
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
                  minHeight: 48,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: active ? colors.acid : colors.raised,
                  opacity: used ? 0.35 : pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    flex: 1,
                    color: active ? colors.ink : colors.text,
                    fontSize: 15,
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
      ) : null}
    </View>
  );
}
