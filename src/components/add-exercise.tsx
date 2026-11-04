import { useState } from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, radii } from "@/constants/theme";
import type { Exercise, Pattern } from "@/data/exercises";
import { FAMILY_LABEL, familyOf, type Family } from "@/data/families";
import type { Workout } from "@/data/split";
import { byMovement, hasName, searchExercises } from "@/lib/find-exercise";
import {
  addExerciseToWorkout,
  chosen,
  createExerciseInWorkout,
  everyExercise,
  useSession,
} from "@/store/session";

/**
 * Add exercise: one list of everything you could add, searchable, grouped by
 * family. Tap one and it is in the workout. When the search finds nothing,
 * the last row makes it — two plain questions and it is in.
 *
 * Under the hood a workout is still a list of movement slots, so Swap knows
 * what to offer; the slot takes its movement from the exercise you pick.
 */
export function AddExerciseSheet({
  workout,
  visible,
  onClose,
}: {
  workout: Workout;
  visible: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const close = () => {
    setQuery("");
    setCreating(false);
    onClose();
  };

  const name = workout.name || "this workout";
  const inIt = new Set(workout.exercises.map((e) => chosen(state, workout.id, e)));
  const all = everyExercise(state);
  const typed = query.trim();
  const found = typed ? searchExercises(all, typed) : null;
  const exact = hasName(all, typed);

  const add = (id: string) => {
    setState((s) => addExerciseToWorkout(s, workout.id, id));
    close();
  };

  return (
    <Sheet visible={visible} title={`Add to ${name}`} onClose={close}>
      {creating ? (
        <Create
          initialName={typed}
          workoutName={name}
          onCreate={(exercise) => {
            setState((s) => createExerciseInWorkout(s, workout.id, exercise));
            close();
          }}
          onBack={() => setCreating(false)}
        />
      ) : (
        <View style={{ gap: 24, paddingTop: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 50,
              paddingHorizontal: 16,
              borderRadius: radii.action,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="search" size={16} color={colors.faint} weight="semibold" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              placeholderTextColor={colors.faint}
              accessibilityLabel="Search exercises"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={{ flex: 1, minHeight: 50, color: colors.text, fontSize: 18 }}
            />
          </View>

          {found ? (
            <View style={{ gap: 4 }}>
              {found.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 17, fontStyle: "italic", paddingBottom: 8 }}>
                  Nothing called “{typed}” yet.
                </Text>
              ) : (
                <Rows list={found} inIt={inIt} onPick={add} />
              )}
              {exact ? null : (
                <CreateRow label={`Create “${typed}”`} onPress={() => setCreating(true)} />
              )}
            </View>
          ) : (
            <>
              {FAMILIES.map((family) => {
                const list = all.filter((e) => familyOf(e) === family).sort(byMovement);
                if (list.length === 0) return null;
                return (
                  <View key={family} style={{ gap: 4 }}>
                    <SectionLabel>{FAMILY_LABEL[family]}</SectionLabel>
                    <Rows list={list} inIt={inIt} onPick={add} />
                  </View>
                );
              })}
              <CreateRow label="Create your own" onPress={() => setCreating(true)} />
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}

const FAMILIES: Family[] = ["push", "pull", "legs", "core"];

/** Plain rows on white with a hairline between: the shape, the name. */
function Rows({ list, inIt, onPick }: { list: Exercise[]; inIt: Set<string>; onPick: (id: string) => void }) {
  return (
    <View>
      {list.map((e, i) => {
        const used = inIt.has(e.id);
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityLabel={used ? `${e.name}, already in this workout` : `Add ${e.name}`}
            accessibilityState={{ disabled: used }}
            disabled={used}
            onPress={() => onPick(e.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              minHeight: 52,
              marginHorizontal: -10,
              paddingHorizontal: 10,
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <View style={{ opacity: used ? 0.35 : 1 }}>
              <Mark family={familyOf(e)} size={16} />
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                alignSelf: "stretch",
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: colors.surface,
              }}
            >
              <Text style={{ flex: 1, color: used ? colors.faint : colors.text, fontSize: 18 }}>{e.name}</Text>
              {used ? <Text style={{ color: colors.faint, fontSize: 14, fontStyle: "italic" }}>in it</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function CreateRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name="plus" size={15} color={colors.rise} weight="bold" />
      <Text style={{ color: colors.rise, fontSize: 18, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/** What you lift it with: its weight step, and whether it is one per hand. */
const GEAR: {
  label: string;
  increment: number;
  perHand?: boolean;
  bodyweight?: boolean;
  holds?: boolean;
}[] = [
  { label: "Barbell", increment: 2.5 },
  { label: "Dumbbells", increment: 2.5, perHand: true },
  { label: "Kettlebell", increment: 4 },
  { label: "Machine", increment: 5 },
  { label: "Cable", increment: 2.5 },
  // Nothing to add to your own bodyweight in the gym, so it gets longer
  // holds instead of kilograms — see `holds` in exercises.ts.
  { label: "Bodyweight", increment: 1, bodyweight: true, holds: true },
];

/** The gear a name already gives away: "Dumbbell fly", "Cable kickback". */
const gearIn = (name: string): number | null => {
  const n = ` ${name.toLowerCase()} `;
  if (/\b(dumbbells?|db)\b/.test(n)) return 1;
  if (/\b(kettlebells?|kb)\b/.test(n)) return 2;
  if (/\bmachine\b|\bsmith\b/.test(n)) return 3;
  if (/\bcable\b/.test(n)) return 4;
  if (/\b(barbell|bb)\b/.test(n)) return 0;
  return null;
};

/** What it works, in gym words, by family — the slot's movement underneath. */
const WORKS: { family: Family; options: { pattern: Pattern; label: string }[] }[] = [
  {
    family: "push",
    options: [
      { pattern: "horizontal_push", label: "Chest press" },
      { pattern: "chest_iso", label: "Chest fly" },
      { pattern: "vertical_push", label: "Shoulder press" },
      { pattern: "shoulders", label: "Raises" },
      { pattern: "triceps", label: "Triceps" },
    ],
  },
  {
    family: "pull",
    options: [
      { pattern: "horizontal_pull", label: "Row" },
      { pattern: "vertical_pull", label: "Pull-up or pulldown" },
      { pattern: "biceps", label: "Biceps" },
    ],
  },
  {
    family: "legs",
    options: [
      { pattern: "squat", label: "Squat" },
      { pattern: "hinge", label: "Deadlift" },
      { pattern: "lunge", label: "Lunge" },
      { pattern: "quads", label: "Quads" },
      { pattern: "hamstrings", label: "Hamstrings" },
      { pattern: "calves", label: "Calves" },
    ],
  },
  { family: "core", options: [{ pattern: "abs", label: "Abs" }] },
];

/** Make your own: a name, what you lift, what it works. */
function Create({
  initialName,
  workoutName,
  onCreate,
  onBack,
}: {
  initialName: string;
  workoutName: string;
  onCreate: (exercise: Exercise) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [gear, setGear] = useState<number | null>(() => gearIn(initialName));
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const trimmed = name.trim();
  const ready = !!trimmed && gear !== null && pattern !== null;
  const submit = () => {
    if (!ready) return;
    const g = GEAR[gear];
    onCreate({
      // Prefixed so a custom exercise can never collide with a built-in id.
      id: `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: trimmed,
      patterns: [pattern],
      increment: g.increment,
      perHand: g.perHand,
      bodyweight: g.bodyweight,
      holds: g.holds,
    });
  };

  return (
    <View style={{ gap: 32, paddingTop: 8 }}>
      <TextInput
        value={name}
        onChangeText={(text) => {
          setName(text);
          const said = gearIn(text);
          if (said !== null) setGear(said);
        }}
        placeholder="Exercise name"
        placeholderTextColor={colors.faint}
        accessibilityLabel="Exercise name"
        autoFocus={!initialName}
        returnKeyType="done"
        style={{
          minHeight: 56,
          paddingHorizontal: 18,
          borderRadius: radii.action,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: 22,
          fontWeight: "600",
        }}
      />

      <View style={{ gap: 12 }}>
        <SectionLabel>What do you lift?</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {GEAR.map((g, i) => (
            <Chip key={g.label} label={g.label} on={gear === i} onPress={() => setGear(i)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionLabel>What does it work?</SectionLabel>
        <View style={{ gap: 14 }}>
          {WORKS.map(({ family, options }) => (
            <View key={family} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ height: 44, justifyContent: "center" }}>
                <Mark family={family} size={16} />
              </View>
              <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {options.map((o) => (
                  <Chip
                    key={o.pattern}
                    label={o.label}
                    on={pattern === o.pattern}
                    onPress={() => setPattern(o.pattern)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={submit}
          style={({ pressed }) => ({
            alignItems: "center",
            justifyContent: "center",
            minHeight: 56,
            borderRadius: radii.action,
            // Navy, not a family's colour: what you make could be any family.
            backgroundColor: colors.text,
            opacity: !ready ? 0.3 : pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "700" }}>
            Add to {workoutName}
          </Text>
        </Pressable>
        <TextButton label="Back to the list" onPress={onBack} />
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: radii.action,
        backgroundColor: on ? colors.text : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: on ? colors.bg : colors.text, fontSize: 16, fontWeight: on ? "600" : "400" }}>
        {label}
      </Text>
    </Pressable>
  );
}
