import { useState, type ReactNode } from "react";
import { LinkButton, Chip } from "@/components/buttons";
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
import { byMovement, exerciseTags, hasName, searchExercises } from "@/lib/find-exercise";
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
  // The name typed before Create your own, to start the form with it.
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  // The body area Create your own was opened from, for its first guess.
  const [from, setFrom] = useState<Pattern | null>(null);
  // A block opened from the top — choosing a cardio machine, say.
  const [block, setBlock] = useState<string | null>(null);

  const close = () => {
    setQuery("");
    setCreating(false);
    setBlock(null);
    onClose();
  };

  const name = workout.name || "this workout";
  const inIt = new Set(workout.exercises.map((e) => chosen(state, workout.id, e)));
  const all = everyExercise(state);
  const typed = query.trim();
  const kind = kindOf(workout);
  // A few to start from: what this kind of workout doesn't train yet. The
  // warm-up and cool-down take anything, so they get none.
  const suggested = part ? [] : suggestFor(all, kind, workout, inIt, state.hidden);

  const chosenBlock = blocks.find((b) => b.id === block);

  const add = (id: string) => {
    setState((s) => addExerciseToWorkout(s, workout.id, id, undefined, part));
    close();
  };

  return (
    <Sheet visible={visible} title={part === "start" ? "Add to Start" : part === "finish" ? "Add to Finish" : `Add to ${name}`} onClose={close}>
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
          fallback={from ?? KIND_MAIN[kind]}
          onCreate={(exercise) => {
            setState((s) => createExerciseInWorkout(s, workout.id, exercise, undefined, part));
            close();
          }}
          onBack={() => setCreating(false)}
        />
      ) : (
        <LibraryBrowser
          key={visible ? "open" : "shut"}
          mode="add"
          exercises={all}
          blocks={blocks}
          onBlock={setBlock}
          suggested={suggested}
          suggestedLabel={`Suggested for ${name}`}
          inIt={inIt}
          onPick={add}
          onCreate={(typedName, from) => {
            setQuery(typedName);
            setFrom(from ?? null);
            setCreating(true);
          }}
        />
      )}
    </Sheet>
  );
}

/** What a tap on an exercise does: add it, open it to edit, or swap it in. */
type Mode = "add" | "edit" | "swap";

/**
 * "Any exercise…": the last row of a swap list, for when the same kind of
 * exercise isn't what you want. Opens `SwapBrowser`.
 */
export function AnyExerciseRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Any exercise: search the whole library"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 58,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="search" size={18} color={colors.text} />
      <View style={{ flex: 1, gap: 2, paddingVertical: 8 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>Any exercise…</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 20 }}>Search the whole library</Text>
      </View>
      <Icon name="forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

/**
 * The whole library to swap from, the same browser as Add: search, then the
 * body by area. `note` says anything that narrows it — away from a full
 * gym, only what is there. Back returns to the list it came from.
 */
export function SwapBrowser({
  exercises,
  inIt,
  note,
  onPick,
  onBack,
}: {
  exercises: Exercise[];
  inIt: Set<string>;
  note?: string;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <View style={{ gap: 4, paddingTop: 8 }}>
      <BackRow label="Similar exercises" onPress={onBack} />
      {note ? <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24, paddingTop: 8 }}>{note}</Text> : null}
      <LibraryBrowser mode="swap" exercises={exercises} blocks={[]} onBlock={() => {}} inIt={inIt} onPick={onPick} />
    </View>
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

/**
 * The library, the same wherever you meet it — adding to a workout, or the
 * Library tab: a search over everything, then cardio and mobility, then the
 * body in seven areas. Tap an area and you see only its exercises. Never one
 * long list to scroll. Only what a tap on an exercise does differs: `add`
 * puts it in the workout (a + says so), `edit` opens it to change it
 * everywhere (an arrow says so). Create your own is at the foot of both.
 */
export function LibraryBrowser({
  mode,
  exercises,
  blocks,
  onBlock,
  suggested = [],
  suggestedLabel,
  inIt = new Set<string>(),
  onPick,
  onCreate,
  moves = [],
  onMove,
}: {
  mode: Mode;
  exercises: Exercise[];
  blocks: { id: string; label: string; detail: string; family: Family }[];
  onBlock: (id: string) => void;
  suggested?: Exercise[];
  suggestedLabel?: string;
  inIt?: Set<string>;
  onPick: (id: string) => void;
  /** With what was typed in the search, if anything, and the area it was made from. None: no Create. */
  onCreate?: (name: string, area?: Pattern) => void;
  /** Stretches and mobility moves, found by the same search; a tap opens one. */
  moves?: { id: string; name: string }[];
  onMove?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<AreaId | null>(null);
  const typed = query.trim();
  const opened = area ? AREAS.find((a) => a.id === area)! : null;

  // Inside an area: back, its name, its exercises.
  if (opened && !typed) {
    const list = exercises.filter((e) => e.patterns.some((p) => opened.patterns.includes(p))).sort(byMovement);
    return (
      <View style={{ gap: 14, paddingTop: 8 }}>
        <BackRow label="All areas" onPress={() => setArea(null)} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Mark family={opened.family} size={24} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 30, fontWeight: "600" }}>{opened.label}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 18, fontStyle: "italic" }}>
          {mode === "add" ? "Tap one to add it." : mode === "swap" ? "Tap one to use it instead." : "Tap one to change it."}
        </Text>
        <Rows list={list} mode={mode} inIt={inIt} onPick={onPick} />
        {onCreate ? <CreateButton label="Create your own" onPress={() => onCreate("", opened.patterns[0])} /> : null}
      </View>
    );
  }

  return (
    <View style={{ gap: 26, paddingTop: 8 }}>
      {/* What to do here, in one line. */}
      <Text style={{ color: colors.muted, fontSize: 18, lineHeight: 24, fontStyle: "italic" }}>
        {mode !== "edit"
          ? "Search, or tap a group to see what is in it."
          : "Change something here and it changes in every workout that uses it."}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 54,
          paddingHorizontal: 16,
          borderRadius: radii.action,
          borderWidth: 1.5,
          borderColor: colors.line,
          backgroundColor: colors.bg,
        }}
      >
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search, like squat or dumbbell"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search exercises"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={{ flex: 1, minHeight: 54, color: colors.text, fontSize: 19 }}
        />
      </View>

      {typed ? (
        <View style={{ gap: 10 }}>
          {(() => {
            const found = searchExercises(exercises, typed);
            const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
            const foundMoves = onMove
              ? moves.filter((m) => words.every((w) => m.name.toLowerCase().includes(w)))
              : [];
            return found.length === 0 && foundMoves.length === 0 ? (
              <Text style={{ color: colors.muted, fontSize: 18, fontStyle: "italic" }}>Nothing by that name.</Text>
            ) : (
              <>
                {found.length > 0 ? <Rows list={found} mode={mode} inIt={inIt} onPick={onPick} /> : null}
                {foundMoves.length > 0 ? (
                  <View style={{ gap: 6, marginTop: found.length > 0 ? 12 : 0 }}>
                    <SectionLabel>Mobility</SectionLabel>
                    <MoveRows list={foundMoves} onPick={onMove!} />
                  </View>
                ) : null}
              </>
            );
          })()}
          {!onCreate || hasName(exercises, typed) ? null : <CreateButton label={`Create “${typed}”`} onPress={() => onCreate(typed)} />}
        </View>
      ) : (
        <>
          {suggested.length > 0 ? (
            <View style={{ gap: 6 }}>
              <SectionLabel>{suggestedLabel ?? "Suggested"}</SectionLabel>
              <Rows list={suggested} mode={mode} inIt={inIt} onPick={onPick} />
            </View>
          ) : null}
          {blocks.length > 0 ? (
            <View style={{ gap: 12 }}>
              <SectionLabel>Cardio and mobility</SectionLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {blocks.map((b) => (
                  <Tile key={b.id} label={b.label} detail={b.detail} family={b.family} onPress={() => onBlock(b.id)} />
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ gap: 12 }}>
            <SectionLabel>Exercises by body area</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {AREAS.map((a) => (
                <Tile
                  key={a.id}
                  label={a.label}
                  family={a.family}
                  detail={`${exercises.filter((e) => a.patterns.includes(e.patterns[0])).length} exercises`}
                  onPress={() => setArea(a.id)}
                />
              ))}
            </View>
          </View>
          {onCreate ? <CreateButton label="Create your own" onPress={() => onCreate("")} /> : null}
        </>
      )}
    </View>
  );
}

/** Stretches and mobility moves found by a search: a mark, the name, an arrow. */
function MoveRows({ list, onPick }: { list: { id: string; name: string }[]; onPick: (id: string) => void }) {
  return (
    <View>
      {list.map((m, i) => (
        <Pressable
          key={m.id}
          accessibilityRole="button"
          accessibilityLabel={m.name}
          onPress={() => onPick(m.id)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            minHeight: 60,
            marginHorizontal: -10,
            paddingHorizontal: 10,
            borderRadius: 14,
            borderCurve: "continuous",
            backgroundColor: pressed ? colors.surface : "transparent",
          })}
        >
          <Mark family="mobility" size={18} />
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              alignSelf: "stretch",
              borderTopWidth: i === 0 ? 0 : 1,
              borderColor: colors.line,
            }}
          >
            <View style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: 20 }}>{m.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 15, fontStyle: "italic" }}>Stretch</Text>
            </View>
            <Icon name="forward" size={16} color={colors.muted} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/** Back out of an area or a block, to where you were. */
function BackRow({ label, onPress }: { label: string; onPress: () => void }) {
  return <LinkButton kind="back" label={label} accessibilityLabel={`Back to ${label.toLowerCase()}`} onPress={onPress} />;
}

/**
 * A big square to tap: an area of the body, or cardio. A dusk card in its
 * family's colour, like the workouts on Plan, so the groups can be told
 * apart at a glance: its shape, then its name on a line of its own so a long
 * one wraps cleanly, then how many — and an arrow, saying it opens.
 */
function Tile({ label, detail, family, onPress }: { label: string; detail: string; family: Family; onPress: () => void }) {
  const ink = colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${detail}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexBasis: "47%",
        flexGrow: 1,
        minHeight: 108,
        gap: 6,
        padding: 14,
        overflow: "hidden",
        borderRadius: radii.card,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderColor: colors.line,
        backgroundColor: pressed ? colors.surface : colors.bg,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Mark family={family} size={22} color={ink} />
        <Icon name="forward" size={16} color={ink} />
      </View>
      <Text numberOfLines={2} style={{ color: ink, fontSize: 21, lineHeight: 25, fontWeight: "600" }}>{label}</Text>
      <Text style={{ marginTop: "auto", color: ink, fontSize: 16, fontStyle: "italic" }}>{detail}</Text>
    </Pressable>
  );
}

/**
 * Plain rows with a hairline between: the shape, the name, what it uses —
 * and at the end what a tap does: a + to add it, or an arrow to open it.
 * One already in the workout says so, with a tick, and can't be added again.
 */
function Rows({
  list,
  mode,
  inIt,
  onPick,
}: {
  list: Exercise[];
  mode: Mode;
  inIt: Set<string>;
  onPick: (id: string) => void;
}) {
  return (
    <View>
      {list.map((e, i) => {
        const used = mode !== "edit" && inIt.has(e.id);
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityLabel={used ? `${e.name}, already in this workout` : mode === "add" ? `Add ${e.name}` : mode === "swap" ? `Use ${e.name} instead` : e.name}
            accessibilityState={{ disabled: used }}
            disabled={used}
            onPress={() => onPick(e.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              minHeight: 60,
              marginHorizontal: -10,
              paddingHorizontal: 10,
              borderRadius: 14,
              borderCurve: "continuous",
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <View style={{ opacity: used ? 0.35 : 1 }}>
              <Mark family={familyOf(e)} size={18} />
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                alignSelf: "stretch",
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: colors.line,
              }}
            >
              <View style={{ flex: 1, paddingVertical: 10, gap: 2 }}>
                <Text style={{ color: used ? colors.muted : colors.text, fontSize: 20 }}>{e.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 15, fontStyle: "italic" }}>{exerciseTags(e).join(" · ")}</Text>
              </View>
              {used ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={16} color={colors.muted} />
                  <Text style={{ color: colors.muted, fontSize: 16, fontStyle: "italic" }}>In it</Text>
                </View>
              ) : mode !== "edit" ? (
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    borderWidth: 1.5,
                    borderColor: colors.text,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={mode === "swap" ? "swap" : "plus"} size={16} color={colors.text} />
                </View>
              ) : (
                <Icon name="forward" size={16} color={colors.muted} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Make your own: a dashed button, the same as the workout editor's + Add. */
function CreateButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 54,
        borderRadius: radii.card,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.muted,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="plus" size={16} color={colors.text} />
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "600" }}>{label}</Text>
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

/** Not sure what you lift: plain weight steps, no gear assumed. */
const NOT_SURE_GEAR = { equipment: [] as Gear[], increment: 2.5, perHand: undefined, bodyweight: undefined, holds: undefined };

/** What a workout of each kind mostly trains: a new exercise's last guess. */
const KIND_MAIN: Partial<Record<WorkoutKind, Pattern>> = {
  push: "horizontal_push",
  pull: "horizontal_pull",
  legs: "squat",
  full: "squat",
  bodyweight: "horizontal_push",
};

/**
 * What a name gives away about what it works: "DB fly" a chest fly, "Leg
 * curl" hamstrings. The first that matches; the more particular first, so
 * a split squat is a lunge and a leg curl is not biceps.
 */
const WORDS: [RegExp, Pattern][] = [
  [/\b(hanging |lying )?leg raises?\b|\bknee raises?\b/, "abs"],
  [/\b(split squat|lunges?|step-?ups?)\b/, "lunge"],
  [/\bleg extensions?\b|\bquads?\b|\bsissy\b/, "quads"],
  [/\b(leg|hamstring|nordic) curls?\b|\bhamstrings?\b|\bnordics?\b/, "hamstrings"],
  [/\bcalf|calves\b/, "calves"],
  [/\b(deadlifts?|rdl|hip thrusts?|good mornings?|swings?|glute bridges?|hinge)\b/, "hinge"],
  [/\b(squats?|leg press)\b/, "squat"],
  [/\b(flyes?|flys?|pec deck|crossover)\b/, "chest_iso"],
  [/\b(lateral|front|rear delt|y) raises?\b|\braises?\b|\bface pulls?\b/, "shoulders"],
  [/\b(overhead|shoulder|military|arnold) press\b|\bohp\b|\bpike\b/, "vertical_push"],
  [/\b(triceps?|pushdowns?|skull ?crushers?|kickbacks?|dips?)\b/, "triceps"],
  [/\b(bench|chest press|push-?ups?|floor press)\b/, "horizontal_push"],
  [/\bcurls?\b|\bbiceps?\b/, "biceps"],
  [/\b(pull-?ups?|chin-?ups?|pulldowns?|lat)\b/, "vertical_pull"],
  [/\brows?\b/, "horizontal_pull"],
  [/\b(planks?|crunch(es)?|sit-?ups?|abs?|core|dead ?bugs?|leg raises?|rollouts?|pallof)\b/, "abs"],
];
const worksIn = (name: string): Pattern[] => {
  const n = ` ${name.toLowerCase()} `;
  const hit = WORDS.find(([words]) => words.test(n));
  return hit ? [hit[1]] : [];
};

/** Why a question is asked, or that it is already answered by a guess. */
function Why({ children }: { children: string }) {
  return <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 21, fontStyle: "italic" }}>{children}</Text>;
}

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
export function Create({
  initialName,
  workoutName,
  fallback,
  onCreate,
  onBack,
}: {
  initialName: string;
  workoutName: string;
  /** What it works when neither the name nor you say: where it was made from. */
  fallback?: Pattern;
  onCreate: (exercise: Exercise) => void;
  onBack: () => void;
}) {
  // Only the name is needed. Both questions start on Klay's guess — from
  // the name, else from where you were — and "Not sure" keeps the guess, or
  // a safe default when there is none. A guess follows the name as you type
  // until you choose for yourself. All of it can be changed in the Library.
  const [name, setName] = useState(initialName);
  const [gear, setGear] = useState<number | null>(() => gearIn(initialName));
  const [gearChosen, setGearChosen] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>(() => worksIn(initialName));
  const [worksChosen, setWorksChosen] = useState(false);
  const trimmed = name.trim();
  const ready = !!trimmed;
  const guessedGear = !gearChosen && gear !== null;
  const guessedWorks = !worksChosen && patterns.length > 0;
  const submit = () => {
    if (!ready) return;
    const g = gear === null ? NOT_SURE_GEAR : GEAR[gear];
    const works: Pattern[] = patterns.length ? patterns : [fallback ?? "horizontal_push"];
    onCreate({
      // Prefixed so a custom exercise can never collide with a built-in id.
      id: newId("custom"),
      name: trimmed,
      patterns: works,
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
          if (!gearChosen) setGear(gearIn(text));
          if (!worksChosen) setPatterns(worksIn(text));
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
        <View style={{ gap: 2 }}>
          <SectionLabel>What do you lift?</SectionLabel>
          <Why>{guessedGear ? "Guessed from the name. Change it if it's wrong." : "So Klay knows how much to add each time."}</Why>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {GEAR.map((g, i) => (
            <Chip key={g.label} label={g.label} on={gear === i} onPress={() => { setGear(i); setGearChosen(true); }} />
          ))}
          <Chip label="Not sure" on={gear === null} onPress={() => { setGear(null); setGearChosen(true); }} />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ gap: 2 }}>
          <SectionLabel>What does it work?</SectionLabel>
          <Why>{guessedWorks ? "Guessed from the name. Change it if it's wrong." : "So it's listed in the right place, and Swap offers sensible ones. Pick one or more."}</Why>
        </View>
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
                    onPress={() => {
                      setWorksChosen(true);
                      setPatterns((current) => current.includes(o.pattern) ? current.filter((p) => p !== o.pattern) : [...current, o.pattern]);
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
          <View style={{ paddingLeft: 28, flexDirection: "row" }}>
            <Chip label="Not sure" on={patterns.length === 0} onPress={() => { setPatterns([]); setWorksChosen(true); }} />
          </View>
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
