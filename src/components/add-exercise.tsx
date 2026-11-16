import { useState, type ReactNode } from "react";
import { LinkButton, Chip } from "@/components/buttons";
import { EquipmentFilters } from "@/components/exercise-filters";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, radii } from "@/constants/theme";
import type { Exercise, Pattern } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import { newId, type EntryPart, type Workout } from "@/data/split";
import type { Gear } from "@/data/kit";
import { byMovement, exerciseTags, hasName, matchesExerciseFilters, searchExercises } from "@/lib/find-exercise";
import { fitsKind, kindOf, type WorkoutKind } from "@/data/kinds";
import {
  addExerciseToWorkout,
  chosen,
  createExerciseInWorkout,
  everyExercise,
  useSession,
} from "@/store/session";

/**
 * Add exercise, made to find one fast: a search over everything, a few
 * suggestions for this workout, then the body in seven areas — tap one and
 * you see only its exercises, with what you lift to narrow it further. Never
 * one long list to scroll. When the search finds nothing, the last row makes
 * it — two plain questions and it is in.
 *
 * Under the hood a workout is still a list of movement slots, so Swap knows
 * what to offer; the slot takes its movement from the exercise you pick.
 */
/**
 * Something other than an exercise that this part of a workout takes — its
 * cardio, its mobility or stretches — offered first, and chosen in this same
 * sheet. `choose` draws the choice; it calls `done` once one is picked.
 */
export type AddBlock = {
  id: string;
  label: string;
  detail: string;
  family: Family;
  choose: (done: () => void) => ReactNode;
};

export function AddExerciseSheet({
  workout,
  part,
  blocks = [],
  visible,
  onClose,
}: {
  workout: Workout;
  /** Add to the workout's warm-up or cool-down; absent, among the exercises. */
  part?: EntryPart;
  /** Offered above the exercises: the warm-up's cardio and mobility, say. */
  blocks?: AddBlock[];
  visible: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  // The body area opened, if any, and what you lift, to narrow it.
  const [area, setArea] = useState<AreaId | null>(null);
  const [equipment, setEquipment] = useState("");
  // A block opened from the top — choosing a cardio machine, say.
  const [block, setBlock] = useState<string | null>(null);

  const close = () => {
    setQuery("");
    setCreating(false);
    setArea(null);
    setEquipment("");
    setBlock(null);
    onClose();
  };

  const name = workout.name || "this workout";
  const inIt = new Set(workout.exercises.map((e) => chosen(state, workout.id, e)));
  const all = everyExercise(state);
  const typed = query.trim();
  const exact = hasName(all, typed);
  const kind = kindOf(workout);
  const opened = area ? AREAS.find((a) => a.id === area)! : null;
  const inArea = opened
    ? all.filter((e) => e.patterns.some((p) => opened.patterns.includes(p)) && matchesExerciseFilters(e, "", equipment)).sort(byMovement)
    : [];
  // A few to start from: what this kind of workout doesn't train yet. The
  // warm-up and cool-down take anything, so they get none.
  const suggested = part ? [] : suggestFor(all, kind, workout, inIt, state.hidden);

  const chosenBlock = blocks.find((b) => b.id === block);

  const add = (id: string) => {
    setState((s) => addExerciseToWorkout(s, workout.id, id, undefined, part));
    close();
  };

  return (
    <Sheet visible={visible} title={part === "start" ? "Add to the warm-up" : part === "finish" ? "Add to the cool-down" : `Add to ${name}`} onClose={close}>
      {chosenBlock ? (
        <View style={{ gap: 16, paddingTop: 8 }}>
          <BackRow label="Everything" onPress={() => setBlock(null)} />
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>{chosenBlock.label}</Text>
          {chosenBlock.choose(close)}
        </View>
      ) : creating ? (
        <Create
          initialName={typed}
          workoutName={name}
          onCreate={(exercise) => {
            setState((s) => createExerciseInWorkout(s, workout.id, exercise, undefined, part));
            close();
          }}
          onBack={() => setCreating(false)}
        />
      ) : (
        <View style={{ gap: 24, paddingTop: 8 }}>
          {blocks.length > 0 && !typed ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {blocks.map((b) => (
                <Tile key={b.id} label={b.label} detail={b.detail} family={b.family} onPress={() => setBlock(b.id)} />
              ))}
            </View>
          ) : null}
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
            <Icon name="search" size={16} color={colors.faint} />
            <TextInput ui
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

          {typed ? (
            <View style={{ gap: 4 }}>
              {(() => {
                const found = searchExercises(all, typed);
                return found.length === 0 ? (
                  <Text style={{ color: colors.muted, fontSize: 17, fontStyle: "italic", paddingBottom: 8 }}>
                    No exercise has that name.
                  </Text>
                ) : (
                  <Rows list={found} inIt={inIt} onPick={add} />
                );
              })()}
              {exact ? null : <CreateRow label={`Create “${typed}”`} onPress={() => setCreating(true)} />}
            </View>
          ) : opened ? (
            <View style={{ gap: 16 }}>
              <BackRow label="All areas" onPress={() => { setArea(null); setEquipment(""); }} />
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>{opened.label}</Text>
              <EquipmentFilters value={equipment} onChange={setEquipment} />
              {inArea.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 17, fontStyle: "italic" }}>None with that.</Text>
              ) : (
                <Rows list={inArea} inIt={inIt} onPick={add} />
              )}
            </View>
          ) : (
            <>
              {suggested.length > 0 ? (
                <View style={{ gap: 4 }}>
                  <SectionLabel>{`Suggested for ${name}`}</SectionLabel>
                  <Rows list={suggested} inIt={inIt} onPick={add} />
                </View>
              ) : null}
              <View style={{ gap: 12 }}>
                <SectionLabel>By body area</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {AREAS.map((a) => (
                    <Tile
                      key={a.id}
                      label={a.label}
                      family={a.family}
                      detail={`${all.filter((e) => a.patterns.includes(e.patterns[0])).length} exercises`}
                      onPress={() => setArea(a.id)}
                    />
                  ))}
                </View>
              </View>
              <CreateRow label="Create your own" onPress={() => setCreating(true)} />
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}

/** The body, in seven places to look: by an exercise's main movement. */
type AreaId = "chest" | "shoulders" | "back" | "arms" | "legs" | "hips" | "core";
const AREAS: { id: AreaId; label: string; family: Family; patterns: Pattern[] }[] = [
  { id: "chest", label: "Chest", family: "push", patterns: ["horizontal_push", "chest_iso"] },
  { id: "shoulders", label: "Shoulders", family: "push", patterns: ["vertical_push", "shoulders"] },
  { id: "back", label: "Back", family: "pull", patterns: ["horizontal_pull", "vertical_pull"] },
  { id: "arms", label: "Arms", family: "pull", patterns: ["biceps", "triceps"] },
  { id: "legs", label: "Legs", family: "legs", patterns: ["squat", "lunge", "quads", "calves", "jump"] },
  { id: "hips", label: "Hips and hamstrings", family: "legs", patterns: ["hinge", "hamstrings"] },
  { id: "core", label: "Core", family: "core", patterns: ["abs"] },
];

/**
 * Up to five to add to a workout: for each area its kind trains that the
 * workout doesn't yet, the first exercise there you already have in your
 * catalogue; then more that fit, to make five.
 */
const suggestFor = (
  all: Exercise[],
  kind: WorkoutKind,
  workout: Workout,
  inIt: Set<string>,
  hidden: string[],
): Exercise[] => {
  const yours = all.filter((e) => !hidden.includes(e.id) && !inIt.has(e.id) && fitsKind(kind, e)).sort(byMovement);
  const trained = new Set(workout.exercises.map((e) => e.pattern));
  const picks: Exercise[] = [];
  for (const area of AREAS) {
    if (area.patterns.some((p) => trained.has(p))) continue;
    const first = yours.find((e) => area.patterns.includes(e.patterns[0]));
    if (first) picks.push(first);
  }
  for (const e of yours) if (picks.length < 5 && !picks.includes(e)) picks.push(e);
  return picks.slice(0, 5);
};

/** Back out of an area or a block, to where you were. */
function BackRow({ label, onPress }: { label: string; onPress: () => void }) {
  return <LinkButton kind="back" label={label} accessibilityLabel={`Back to ${label.toLowerCase()}`} onPress={onPress} />;
}

/** A big square to tap: an area of the body, or cardio. Its shape, its name, a word on it. */
function Tile({ label, detail, family, onPress }: { label: string; detail: string; family: Family; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${detail}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexBasis: "47%",
        flexGrow: 1,
        minHeight: 76,
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Mark family={family} size={14} />
        <Text ui style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: "600" }}>{label}</Text>
      </View>
      <Text ui style={{ color: colors.muted, fontSize: 14 }}>{detail}</Text>
    </Pressable>
  );
}

/** Plain rows on white with a hairline between: the shape, the name. */
function Rows({
  list,
  inIt,
  onPick,
}: {
  list: Exercise[];
  inIt: Set<string>;
  onPick: (id: string) => void;
}) {
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
              <View style={{ flex: 1, paddingVertical: 10, gap: 3 }}>
                <Text style={{ color: used ? colors.faint : colors.text, fontSize: 18 }}>{e.name}</Text>
                <Text ui style={{ color: colors.muted, fontSize: 13 }}>{exerciseTags(e).join(" · ")}</Text>
              </View>
              {used ? (
                <Text ui style={{ color: colors.faint, fontSize: 14, fontStyle: "italic" }}>in it</Text>
              ) : null}
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
      <Icon name="plus" size={15} color={colors.rise} />
      <Text ui style={{ color: colors.rise, fontSize: 18, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/** What you lift it with: its weight step, and whether it is one per hand. */
const GEAR: {
  label: string;
  equipment: Gear[];
  increment: number;
  perHand?: boolean;
  bodyweight?: boolean;
  holds?: boolean;
}[] = [
  { label: "Barbell", equipment: ["barbell"], increment: 2.5 },
  { label: "Dumbbells", equipment: ["dumbbells"], increment: 2.5, perHand: true },
  { label: "Kettlebell", equipment: ["kettlebell"], increment: 4 },
  { label: "Machine", equipment: ["machine"], increment: 5 },
  { label: "Cable", equipment: ["cable"], increment: 2.5 },
  // Nothing to add to your own bodyweight in the gym, so it gets longer
  // holds instead of kilograms — see `holds` in exercises.ts.
  { label: "Bodyweight", equipment: [], increment: 1, bodyweight: true, holds: true },
];

/** The gear a name already gives away: "DB fly", "Cable kickback". */
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
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const trimmed = name.trim();
  const ready = !!trimmed && gear !== null && patterns.length > 0;
  const submit = () => {
    if (!ready) return;
    const g = GEAR[gear];
    onCreate({
      // Prefixed so a custom exercise can never collide with a built-in id.
      id: newId("custom"),
      name: trimmed,
      patterns,
      equipment: g.equipment,
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
        <SectionLabel>What does it work? Choose all that apply</SectionLabel>
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
                    on={patterns.includes(o.pattern)}
                    onPress={() => setPatterns((current) => current.includes(o.pattern) ? current.filter((p) => p !== o.pattern) : [...current, o.pattern])}
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
          <Text ui style={{ color: colors.ink, fontSize: 17, fontWeight: "700" }}>
            Add to {workoutName}
          </Text>
        </Pressable>
        <TextButton label="Back to the list" onPress={onBack} />
      </View>
    </View>
  );
}
