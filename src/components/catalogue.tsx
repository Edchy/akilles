import { useMemo, useState } from "react";
import { LinkButton, Chip } from "@/components/buttons";
import { Image, Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/text";

import { ExerciseFilters } from "@/components/exercise-filters";
import { exerciseTags, matchesExerciseFilters, searchExercises } from "@/lib/find-exercise";
import { Count, Setting, Step } from "@/components/controls";
import { Icon } from "@/components/icon";
import { NoteField } from "@/components/note";
import { RoutineEditor } from "@/components/routine";
import { BigButton, OpenRow, SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { WeightField, parseWeight } from "@/components/weight-field";
import { FAMILY, colors, radii } from "@/constants/theme";
import { Mark } from "@/components/mark";
import { PHOTOS } from "@/data/photos";
import { guideFor } from "@/data/guides";
import { GuideInstructions } from "@/components/guide";
import {
  METRICS,
  cardioById,
  cardioPool,
  courseLabel,
  mobilityPool,
  routineUse,
  STRETCHES,
  stretchById,
  mobilityById,
  type MobilityRoutine,
} from "@/data/conditioning";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  PATTERN_LABEL,
  categoriesOf,
  patternsIn,
  type Category,
  type Exercise,
  type Pattern,
} from "@/data/exercises";
import { newId } from "@/data/split";
import type { Gear } from "@/data/kit";
import {
  addCardio,
  addExercise,
  canRemove,
  canRemoveConditioning,
  cardioTarget,
  catalogue,
  everyExercise,
  createRoutine,
  editExercise,
  editRoutine,
  hiddenConditioningList,
  hiddenExercises,
  isCustom,
  isCustomConditioning,
  removeConditioning,
  removeExercise,
  restoreConditioning,
  restoreExercise,
  routineMinutes,
  useSession,
  workoutsUsing,
} from "@/store/session";

/** "2.5 kg steps", "holds" — the one detail worth showing in a list. */
const stepLabel = (ex: Exercise) =>
  ex.unloaded
    ? "no weight"
    : ex.holds
      ? "longer holds"
      : ex.timed
        ? "seconds"
        : `${ex.increment || 2.5} kg steps`;

/**
 * Your exercises, grouped the way you train them: push, pull, legs, core —
 * then the cardio machines and mobility routines. Rendered inside the Plan
 * tab's "Exercises" segment — see `plan.tsx`.
 *
 * The page is just the groups. Each opens a sheet listing what is in it;
 * each exercise opens its own sheet on top, with room for what you can
 * change. Built-ins you are not using are the library, offered by Add.
 */
const CATEGORY_DESCRIPTION: Record<Category, string> = {
  push: "Pressing · chest, shoulders & triceps",
  pull: "Pulling · back & biceps",
  legs: "Squats, hinges & lunges",
  core: "Trunk strength & stability",
};

type Group = Category | "cardio" | "mobility";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Catalogue() {
  const { state } = useSession();
  const [open, setOpen] = useState<Group | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [equipment, setEquipment] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const all = everyExercise(state);
  const browsing = !!(query.trim() || categoryFilter || equipment);
  const filtered = all.filter((e) => matchesExerciseFilters(e, categoryFilter, equipment));
  const results = query.trim() ? searchExercises(filtered, query) : filtered;

  // An exercise spanning two groups — a face pull is shoulders and a row — is
  // listed under both.
  const byCategory = useMemo(() => {
    const map = new Map<Category, Exercise[]>();
    for (const e of catalogue(state)) {
      for (const c of categoriesOf(e)) map.set(c, [...(map.get(c) ?? []), e]);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [state]);

  const cardio = cardioPool(state.hiddenConditioning);
  const mobility = mobilityPool(state.hiddenConditioning);
  const category = open && open !== "cardio" && open !== "mobility" ? open : null;

  return (
    <View style={{ gap: 24 }}>
      {/* The same voice and size as the Workouts intro beside it: this says
          what the tab is for, not only how to tap it. */}
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        Everything Humbell can put in a workout lives here: exercises, cardio and
        mobility. Change something here and it changes in every workout that
        uses it. To choose what goes in a workout, open the workout under
        Workouts.
      </Text>

      <TextInput value={query} onChangeText={setQuery} placeholder="Search exercises, muscles or equipment" accessibilityLabel="Search exercise library" clearButtonMode="while-editing" autoCorrect={false} style={{ minHeight: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface, color: colors.text, fontSize: 17 }} />
      <ExerciseFilters category={categoryFilter} equipment={equipment} onCategory={setCategoryFilter} onEquipment={setEquipment} />
      {browsing ? <View style={{ gap: 8 }}>
        {results.map((e) => <OpenRow key={e.id} title={e.name} detail={exerciseTags(e).join(" · ")} onPress={() => setEditing(e.id)} />)}
        {!categoryFilter && !equipment ? <>
          {cardio.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())).map((e) => <OpenRow key={e.id} title={e.name} detail="Cardio" onPress={() => setOpen("cardio")} />)}
          {mobility.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())).map((e) => <OpenRow key={e.id} title={e.name} detail="Mobility routine" onPress={() => setOpen("mobility")} />)}
        </> : null}
        {!results.length ? <Text style={{ color: colors.muted, fontSize: 16 }}>No strength exercises match. Try another filter or add your own from a workout.</Text> : null}
      </View> : <>
      <View style={{ gap: 10 }}>
        {CATEGORY_ORDER.map((c) => (
          <OpenRow
            key={c}
            large
            title={CATEGORY_LABEL[c]}
            detail={`${CATEGORY_DESCRIPTION[c]} · ${plural((byCategory.get(c) ?? []).length, "exercise", "exercises")}`}
            onPress={() => setOpen(c)}
          />
        ))}
      </View>

      {/* Cardio and mobility are pools in the same sense — add to them,
          remove from them — but they are not push, pull, legs or core, so
          they sit apart rather than being filed under one. */}
      <View style={{ gap: 10 }}>
        <OpenRow
          large
          title="Cardio"
          detail={plural(cardio.length, "exercise", "exercises")}
          onPress={() => setOpen("cardio")}
        />
        <OpenRow
          large
          title="Mobility"
          detail={`${plural(mobility.length, "routine", "routines")} · ${STRETCHES.length} moves`}
          onPress={() => setOpen("mobility")}
        />
      </View>

      </>}
      <ExerciseSheet exercise={all.find((e) => e.id === editing)} onClose={() => setEditing(null)} />
      <CategorySheet
        category={category}
        list={category ? (byCategory.get(category) ?? []) : []}
        onClose={() => setOpen(null)}
      />
      <CardioSheet visible={open === "cardio"} onClose={() => setOpen(null)} />
      <MobilitySheet visible={open === "mobility"} onClose={() => setOpen(null)} />
    </View>
  );
}

/** One group's exercises. Tap one to change it; Add brings one in. */
function CategorySheet({
  category,
  list,
  onClose,
}: {
  category: Category | null;
  list: Exercise[];
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const close = () => {
    setEditing(null);
    setAdding(false);
    onClose();
  };

  const library = category
    ? hiddenExercises(state)
        .filter((e) => categoriesOf(e).includes(category))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <Sheet
      visible={!!category}
      title={category ? CATEGORY_LABEL[category] : ""}
      closeLabel="Done"
      onClose={close}
    >
      <View style={{ gap: 12, paddingTop: 12 }}>
        <AddLink label="Add exercise" onPress={() => setAdding(true)} />
        {list.map((exercise) => (
          <OpenRow
            key={exercise.id}
            title={exercise.name}
            detail={stepLabel(exercise)}
            onPress={() => setEditing(exercise.id)}
          />
        ))}
        {list.length === 0 ? (
          <Text style={{ color: colors.faint, fontSize: 15, paddingVertical: 12 }}>
            Nothing here yet.
          </Text>
        ) : null}
      </View>

      <ExerciseSheet
        exercise={list.find((e) => e.id === editing)}
        onClose={() => setEditing(null)}
      />

      {category ? (
        <Sheet
          visible={adding}
          title={`Add to ${CATEGORY_LABEL[category]}`}
          onClose={() => setAdding(false)}
        >
          <AddPanel
            library={library.map((e) => ({ id: e.id, name: e.name }))}
            onTake={(id) => {
              setState((s) => restoreExercise(s, id));
              setAdding(false);
            }}
            create={
              <CreateExercise
                category={category}
                onCreate={(exercise) => {
                  setAdding(false);
                  setState((s) => addExercise(s, exercise));
                }}
              />
            }
          />
        </Sheet>
      ) : null}
    </Sheet>
  );
}

/** "+ Add exercise" at the foot of a list in a sheet. */
function AddLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <LinkButton kind="add" label={label} onPress={onPress} />;
}

/**
 * Adding to a group: the library first — one tap and it is yours — and
 * making your own behind a link, since that is the rarer case.
 */
function AddPanel({
  library,
  onTake,
  create,
}: {
  library: { id: string; name: string }[];
  onTake: (id: string) => void;
  create: React.ReactNode;
}) {
  const [creating, setCreating] = useState(library.length === 0);

  return (
    <View
      style={{
        gap: 6,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: colors.raised,
        padding: 12,
        marginBottom: 8,
      }}
    >
      {creating ? (
        create
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setCreating(true)}
          style={({ pressed }) => ({
            justifyContent: "center",
            minHeight: 48,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>
            + Create your own
          </Text>
        </Pressable>
      )}
      {library.length > 0 ? (
        <>
          <Label>Available exercises</Label>
          {library.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${row.name}`}
              onPress={() => onTake(row.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 48,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>
                {row.name}
              </Text>
              <Icon name="plus" size={18} color={colors.rise} />
            </Pressable>
          ))}
        </>
      ) : null}


    </View>
  );
}

/**
 * One exercise: its name, the weight it opens at, how far − and + move that
 * weight, and a way to remove it. Edits apply as you make them.
 */
function ExerciseSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise | undefined;
  onClose: () => void;
}) {
  return (
    <Sheet visible={!!exercise} title="Exercise" closeLabel="Done" onClose={onClose}>
      {exercise ? <ExerciseEditor key={exercise.id} exercise={exercise} onRemoved={onClose} /> : null}
    </Sheet>
  );
}

function ExerciseEditor({ exercise, onRemoved }: { exercise: Exercise; onRemoved: () => void }) {
  const { state, setState } = useSession();
  const [name, setName] = useState(exercise.name);
  const [weightStep, setWeightStep] = useState(String(exercise.increment || 2.5));
  const parsedStep = Number(weightStep.trim().replace(",", "."));
  const validStep = /^\d*([.,]\d*)?$/.test(weightStep.trim()) &&
    Number.isFinite(parsedStep) && parsedStep > 0;
  const [confirming, setConfirming] = useState(false);
  const removable = canRemove(state, exercise.id);
  const mine = isCustom(state, exercise.id);

  return (
    <View style={{ gap: 36, paddingTop: 12 }}>
      <TextInput
        value={name}
        onChangeText={(text) => {
          setName(text);
          // A blank name is ignored by the store, so clearing to retype is safe.
          setState((s) => editExercise(s, exercise.id, { name: text }));
        }}
        onBlur={() => setName((n) => (n.trim() ? n : exercise.name))}
        returnKeyType="done"
        placeholder="Name"
        placeholderTextColor={colors.faint}
        style={{
          minHeight: 64,
          paddingHorizontal: 16,
          borderRadius: 16,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: 24,
          fontWeight: "700",
        }}
      />

      <WeightField exerciseId={exercise.id} />

      {/* A hold steps a second at a time and a timed hold not at all:
          there is no weight step to choose. */}
      {exercise.unloaded || exercise.holds || exercise.timed ? null : (
        <View style={{ gap: 12 }}>
          <SectionLabel>Weight step</SectionLabel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TextInput
              value={weightStep}
              onChangeText={(text) => {
                setWeightStep(text);
                const normalized = text.trim().replace(",", ".");
                const step = Number(normalized);
                if (/^\d*(\.\d*)?$/.test(normalized) && Number.isFinite(step) && step > 0) {
                  setState((s) => editExercise(s, exercise.id, { increment: step }));
                }
              }}
              onBlur={() => setWeightStep(String(exercise.increment || 2.5))}
              keyboardType="decimal-pad"
              selectTextOnFocus
              accessibilityLabel="Weight step in kilograms"
              selectionColor={colors.text}
              style={{
                flex: 1,
                minHeight: 64,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: colors.surface,
                color: colors.text,
                fontSize: 24,
                fontWeight: "700",
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 17 }}>kg</Text>
          </View>
          <Text style={{ color: validStep ? colors.muted : colors.bend, fontSize: 13, lineHeight: 19 }}>
            {validStep
              ? `Used by the − and + buttons and automatic weight increases${exercise.perHand ? ", per dumbbell" : ""}. Changes save automatically.`
              : "Enter a number greater than 0. Your previous step is kept until then."}
          </Text>
        </View>
      )}

      <View style={{ gap: 12 }}>
        <SectionLabel>Note</SectionLabel>
        <NoteField id={exercise.id} hint="Shared by every workout that uses this exercise. Notes edited during training are for that session only." />
      </View>

      <View style={{ gap: 8 }}>
        {confirming ? (
          <>
            <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
              {mine
                ? `${exercise.name} will be deleted for good. Workouts that use it get another exercise of the same kind instead.`
                : `${exercise.name} goes back into Humbell's library, out of your list. Workouts that use it get another exercise of the same kind instead. To bring it back, tap Add exercise.`}
            </Text>
            <BigButton
              label={`${mine ? "Delete" : "Remove"} ${exercise.name}`}
              danger
              onPress={() => {
                setConfirming(false);
                setState((s) => removeExercise(s, exercise.id));
                onRemoved();
              }}
            />
            <TextButton label="Keep it" onPress={() => setConfirming(false)} />
          </>
        ) : (
          <BigButton
            label={mine ? "Delete exercise" : "Remove exercise"}
            quiet
            // The last exercise of a type cannot go: a slot of that type
            // would have nothing to prescribe.
            disabled={!removable}
            onPress={() => setConfirming(true)}
          />
        )}
        {!removable ? (
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
            The last of its kind stays, so a workout always has one to use.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Kinds of equipment, each with the weight step it usually moves by. */
const EQUIPMENT: {
  label: string;
  equipment: Gear[];
  increment: number;
  perHand?: boolean;
  bodyweight?: boolean;
  holds?: boolean;
}[] =
  [
    { label: "Barbell", equipment: ["barbell"], increment: 2.5 },
    { label: "Dumbbells", equipment: ["dumbbells"], increment: 2.5, perHand: true },
    { label: "Kettlebell", equipment: ["kettlebell"], increment: 4 },
    { label: "Machine", equipment: ["machine"], increment: 5 },
    { label: "Cable", equipment: ["cable"], increment: 2.5 },
    // Nothing to add to your own bodyweight in the gym, so it gets longer
    // holds instead of kilograms — see `holds` in exercises.ts.
    { label: "Bodyweight", equipment: [], increment: 1, bodyweight: true, holds: true },
  ];

/** Name it, say what it is, and it joins this group. */
function CreateExercise({
  category,
  onCreate,
}: {
  category: Category;
  onCreate: (exercise: Exercise) => void;
}) {
  const types = patternsIn(category);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(0);
  // Which movement types it counts as. A group holds several — Push has
  // presses, flyes, raises and triceps — so this has to be asked.
  const [picked, setPicked] = useState<Pattern[]>([types[0]]);
  // Left blank, it starts from a guess for its movement type.
  const [start, setStart] = useState("");
  const startWeight = parseWeight(start);
  const gear = EQUIPMENT[kind];

  const ready = !!name.trim() && picked.length > 0 && (!start.trim() || startWeight !== null);

  const submit = () => {
    if (!ready) return;
    const trimmed = name.trim();
    onCreate({
      // Prefixed so a custom exercise can never collide with a built-in id.
      id: newId("cardio"),
      name: trimmed,
      patterns: picked,
      equipment: gear.equipment,
      increment: gear.increment,
      perHand: gear.perHand,
      bodyweight: gear.bodyweight,
      holds: gear.holds,
      ...(startWeight !== null ? { startWeight } : {}),
    });
    setName("");
    setPicked([types[0]]);
    setStart("");
  };

  return (
    <View style={{ gap: 12, paddingTop: 6 }}>
      <Label>Create your own</Label>
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder="Exercise name"
        placeholderTextColor={colors.faint}
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
        }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EQUIPMENT.map((g, i) => (
          <Chip key={g.label} label={g.label} on={kind === i} onPress={() => setKind(i)} />
        ))}
      </View>

      <TextInput
        value={start}
        onChangeText={setStart}
        keyboardType="decimal-pad"
        accessibilityLabel="Starting weight in kilograms"
        placeholder={
          gear.holds
            ? "Seconds to hold, if any"
            : `Starting weight in kg${gear.perHand ? ", per dumbbell" : ""}`
        }
        placeholderTextColor={colors.faint}
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.surface,
          color: start.trim() && startWeight === null ? colors.bend : colors.text,
          fontSize: 16,
          fontWeight: "600",
        }}
      />

      {types.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Label>Counts as</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {types.map((p) => {
              const on = picked.includes(p);
              return (
                <Chip
                  key={p}
                  label={PATTERN_LABEL[p]}
                  on={on}
                  onPress={() =>
                    setPicked((v) => (on ? v.filter((x) => x !== p) : [...v, p]))
                  }
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <Submit label="Add" disabled={!ready} onPress={submit} />
    </View>
  );
}

/** The cardio machines. Tap one to change it; Add brings one in. */
function CardioSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const machines = cardioPool(state.hiddenConditioning);

  const close = () => {
    setEditing(null);
    setAdding(false);
    onClose();
  };

  return (
    <Sheet visible={visible} title="Cardio" closeLabel="Done" onClose={close}>
      <View style={{ gap: 12, paddingTop: 12 }}>
        {machines.map((c) => (
          <OpenRow
            key={c.id}
            title={c.name}
            detail={cardioTarget(state, c.id).course !== undefined
              ? `${courseLabel(c, cardioTarget(state, c.id).course!)} · log your time`
              : `${cardioTarget(state, c.id).minutes} min · log your ${c.metric.unit === "reps" || c.metric.unit === "skips" ? "reps" : "distance"}`}
            onPress={() => setEditing(c.id)}
          />
        ))}
        <AddLink label="Add cardio exercise" onPress={() => setAdding(true)} />
        <RemovedList kind="cardio" />
      </View>

      <Sheet
        visible={!!editing && machines.some((c) => c.id === editing)}
        title="Cardio exercise"
        closeLabel="Done"
        onClose={() => setEditing(null)}
      >
        {editing ? <MachineEditor id={editing} onRemoved={() => setEditing(null)} /> : null}
      </Sheet>

      <Sheet visible={adding} title="Add to Cardio" onClose={() => setAdding(false)}>
        <AddPanel
          library={[]}
          onTake={(id) => {
            setState((s) => restoreConditioning(s, id));
            setAdding(false);
          }}
          create={
            <AddCardio
              onAdd={(machine) => {
                setAdding(false);
                setState((s) => addCardio(s, machine));
              }}
            />
          }
        />
      </Sheet>
    </Sheet>
  );
}

/** Shared cardio settings and notes, wherever this exercise appears. */
function MachineEditor({ id, onRemoved }: { id: string; onRemoved: () => void }) {
  const { state, setState } = useSession();
  const exercise = cardioById(id);
  if (!exercise) return null;
  return (
    <View style={{ gap: 28, paddingTop: 12 }}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "500" }}>{exercise.name}</Text>
      <View style={{ gap: 8 }}>
        <SectionLabel>Usual target</SectionLabel>
        <Text style={{ color: colors.text, fontSize: 24 }}>{cardioTarget(state, id).course !== undefined ? courseLabel(exercise, cardioTarget(state, id).course!) : `${cardioTarget(state, id).minutes} min`}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 23 }}>
        Change this target in Workouts. It applies wherever {exercise.name} is used. Each distance or time target keeps its own records.
      </Text>
      <View style={{ gap: 12 }}>
        <SectionLabel>Note</SectionLabel>
        <NoteField id={id} kind="cardio" hint={`Saved for ${exercise.name} in every workout.`} />
      </View>
      <RemoveConditioning id={id} name={exercise.name} onRemoved={onRemoved} />
    </View>
  );
}

/** The mobility routines. Tap one to see its holds; Add brings one in. */
/**
 * Mobility, in the Library: the one place it is made and changed. Two layers,
 * the way a workout is made of exercises —
 *
 * - Routines: the sets of moves a workout's warm-up or cool-down uses. Each
 *   is a card with pictures of its moves, how long it takes, and where it is
 *   used; open one to change its moves.
 * - All moves: every stretch and mobility move one by one — how it's done,
 *   how long, and which routines it is in.
 *
 * A routine is best before lifting or after; it says so, and the workout's
 * Add offers the fitting ones first, but any routine goes either end.
 */
function MobilitySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState(false);
  // "All moves" opened, and one move in it.
  const [browsing, setBrowsing] = useState(false);
  const [move, setMove] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const routines = mobilityPool(state.hiddenConditioning);
  const routine = routines.find((m) => m.id === editing);

  const close = () => {
    setEditing(null);
    setAdding(false);
    setBrowsing(false);
    setMove(null);
    setQuery("");
    onClose();
  };

  const shown = move ? stretchById(move) : undefined;
  const typed = query.trim().toLowerCase();
  const moves = STRETCHES.filter((m) => !typed || m.name.toLowerCase().includes(typed));
  const inRoutines = (id: string) => routines.filter((r) => r.moves.some((m) => m.stretch === id));

  return (
    <Sheet visible={visible} title="Mobility" closeLabel="Done" onClose={close}>
      {shown ? (
        <View style={{ gap: 20, paddingTop: 8 }}>
          <LinkButton kind="back" label="All moves" onPress={() => setMove(null)} />
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>{shown.name}</Text>
          {PHOTOS[shown.id]?.[0] ? (
            <Image source={PHOTOS[shown.id][0]} resizeMode="contain" style={{ width: "100%", height: 200, borderRadius: 16, backgroundColor: colors.surface }} />
          ) : null}
          <Text ui style={{ color: colors.muted, fontSize: 16 }}>{moveAmount(shown)}</Text>
          {guideFor(shown.id) ? (
            <GuideInstructions key={shown.id} id={shown.id} />
          ) : shown.cue ? (
            <Text style={{ color: colors.text, fontSize: 18, lineHeight: 25 }}>{shown.cue}</Text>
          ) : null}
          <Text ui style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>
            {inRoutines(shown.id).length > 0
              ? `In ${inRoutines(shown.id).map((r) => r.name).join(", ")}.`
              : "Not in any routine yet. Open a routine to add it."}
          </Text>
        </View>
      ) : browsing ? (
        <View style={{ gap: 16, paddingTop: 8 }}>
          <LinkButton kind="back" label="Routines" onPress={() => { setBrowsing(false); setQuery(""); }} />
          <TextInput
            ui
            value={query}
            onChangeText={setQuery}
            placeholder="Search moves"
            placeholderTextColor={colors.faint}
            accessibilityLabel="Search moves"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={{ minHeight: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface, color: colors.text, fontSize: 17 }}
          />
          <View style={{ gap: 8 }}>
            {moves.map((m) => (
              <OpenRow key={m.id} title={m.name} detail={moveAmount(m)} onPress={() => setMove(m.id)} />
            ))}
          </View>
        </View>
      ) : (
        <View style={{ gap: 28, paddingTop: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            A routine is a few stretches and mobility moves, done one after
            another. A workout can start with one to warm you up, and end with
            one to cool you down. You choose which in the workout, under
            Workouts. Change a routine here and it changes in every workout
            that uses it.
          </Text>
          <View style={{ gap: 12 }}>
            <SectionLabel>Routines</SectionLabel>
            {routines.map((m) => (
              <RoutineCard
                key={m.id}
                routine={m}
                usedIn={workoutsUsing(state, m.id).map((w) => w.name || "Untitled")}
                onPress={() => setEditing(m.id)}
              />
            ))}
            <AddLink label="New routine" onPress={() => setAdding(true)} />
          </View>
          <View style={{ gap: 12 }}>
            <SectionLabel>Moves</SectionLabel>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              Every move on its own: how to do it, and which routines it is in.
            </Text>
            <OpenRow
              large
              title="All moves"
              detail={`${STRETCHES.length} stretches and mobility moves`}
              onPress={() => setBrowsing(true)}
            />
          </View>
          <RemovedList kind="mobility" />
        </View>
      )}

      <Sheet
        visible={!!routine}
        full
        title="Routine"
        closeLabel="Done"
        scrollEnabled={!dragging}
        onClose={() => setEditing(null)}
      >
        {routine ? (
          <View style={{ gap: 36, paddingTop: 12 }}>
            <View style={{ gap: 8 }}>
              <TextInput
                value={routine.name}
                onChangeText={(name) => setState((s) => editRoutine(s, routine.id, { name }))}
                placeholder="Name"
                placeholderTextColor={colors.faint}
                returnKeyType="done"
                style={{
                  minHeight: 64,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: 26,
                  fontWeight: "700",
                }}
              />
              <Text ui style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
                {usedBy(workoutsUsing(state, routine.id).map((w) => w.name || "Untitled"))}
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              <SectionLabel>Moves</SectionLabel>
              <RoutineEditor routineId={routine.id} onDragChange={setDragging} />
            </View>
            <RemoveConditioning
              id={routine.id}
              name={routine.name}
              onRemoved={() => setEditing(null)}
            />
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={adding} title="New routine" onClose={() => setAdding(false)}>
        <AddPanel
          library={[]}
          onTake={(id) => {
            setState((s) => restoreConditioning(s, id));
            setAdding(false);
          }}
          create={
            <AddMobility
              onAdd={(name) => {
                const id = newId("m");
                setAdding(false);
                setState((s) => createRoutine(s, id, name));
                setEditing(id);
              }}
            />
          }
        />
      </Sheet>
    </Sheet>
  );
}

/** How long a move is done for, in a few words: "45 s", "10 reps, each side". */
const moveAmount = (m: { seconds: number; reps?: number; perSide?: boolean }): string =>
  `${m.reps ? `${m.reps} reps` : `${m.seconds} s`}${m.perSide ? ", each side" : ""}`;

/**
 * A routine in the Library: a card, not a row, so it reads as a set of
 * moves — small pictures of the moves that have one, its name, how long, when
 * it is best done, and where it is used.
 */
function RoutineCard({
  routine,
  usedIn,
  onPress,
}: {
  routine: MobilityRoutine;
  usedIn: string[];
  onPress: () => void;
}) {
  const pictures = routine.moves
    .map((m) => (m.stretch ? PHOTOS[m.stretch]?.[0] : undefined))
    .filter((p) => p !== undefined)
    .slice(0, 5);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${routine.name}, ${plural(routine.moves.length, "move", "moves")}, about ${routineMinutes(routine)} minutes`}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: 10,
        padding: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: `${FAMILY.mobility.field}2E`,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Mark family="mobility" size={18} />
        <Text style={{ flex: 1, color: colors.text, fontSize: 22, fontWeight: "600" }}>{routine.name}</Text>
        <Icon name="open" size={14} color={colors.muted} />
      </View>
      {pictures.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {pictures.map((p, i) => (
            <Image key={i} source={p} resizeMode="cover" style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.bg }} />
          ))}
        </View>
      ) : null}
      <Text ui style={{ color: colors.text, fontSize: 15 }}>
        {`${plural(routine.moves.length, "move", "moves")} · about ${routineMinutes(routine)} min · ${routineUse(routine) === "warmup" ? "best before lifting" : "best after lifting"}`}
      </Text>
      {usedIn.length > 0 ? (
        <Text ui style={{ color: colors.muted, fontSize: 14 }}>{`In ${usedIn.join(", ")}`}</Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Which workouts use a collection of stretches — so you know what an edit
 * here will reach. The Library is where a collection is changed; a workout
 * only picks one.
 */
const usedBy = (names: string[]): string =>
  names.length === 0
    ? "No workout uses this yet. Pick it in a workout under Workouts."
    : names.length === 1
      ? `Used in ${names[0]}. Changes here apply there.`
      : `Used in ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}. Changes here apply to all of them.`;

/** Two taps to remove a machine or routine; the last of its kind stays. */
function RemoveConditioning({
  id,
  name,
  onRemoved,
}: {
  id: string;
  name: string;
  onRemoved: () => void;
}) {
  const { state, setState } = useSession();
  const [confirming, setConfirming] = useState(false);
  const removable = canRemoveConditioning(state, id);
  const mine = isCustomConditioning(state, id);
  const routine = !!mobilityById(id);
  const usual = routine ? "Humbell's usual routine" : "Humbell's usual cardio";

  return (
    <View style={{ gap: 8 }}>
      {confirming ? (
        <>
          {/* Said before you do it: what goes, what happens to workouts, and the way back. */}
          <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
            {mine
              ? `${name} will be deleted for good. Workouts that use it get ${usual} instead.`
              : `${name} leaves this list, and workouts that use it get ${usual} instead. You can add it again any time, at the bottom of this page.`}
          </Text>
          <BigButton
            label={`${mine ? "Delete" : "Remove"} ${name}`}
            danger
            onPress={() => {
              setConfirming(false);
              setState((s) => removeConditioning(s, id));
              onRemoved();
            }}
          />
          <TextButton label="Keep it" onPress={() => setConfirming(false)} />
        </>
      ) : (
        <BigButton
          label={mine ? "Delete" : "Remove"}
          quiet
          disabled={!removable}
          onPress={() => setConfirming(true)}
        />
      )}
      {!removable ? (
        <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
          The last one stays, so there is always one to choose.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Humbell's own machines or routines that aren't in your list — ones you
 * removed, and ones a new phone starts without — at the foot of the list,
 * each a tap from coming in. Only there when there are some.
 */
function RemovedList({ kind }: { kind: "cardio" | "mobility" }) {
  const { state, setState } = useSession();
  const removed = hiddenConditioningList(state).filter((row) => row.kind === kind);
  if (removed.length === 0) return null;
  return (
    // The foot of the page, boxed off in red: out of use, a tap from coming back.
    <View
      style={{
        gap: 4,
        marginTop: 16,
        padding: 14,
        borderRadius: 16,
        borderCurve: "continuous",
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: colors.danger,
      }}
    >
      <SectionLabel>Not in your list</SectionLabel>
      {removed.map((row) => (
        <View key={row.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 18 }}>{row.name}</Text>
          <LinkButton
            kind="add"
            label="Add"
            accessibilityLabel={`Add ${row.name}`}
            onPress={() => setState((s) => restoreConditioning(s, row.id))}
          />
        </View>
      ))}
    </View>
  );
}

/** Name a machine and say what it measures. That is all a cardio block needs. */
function AddCardio({
  onAdd,
}: {
  onAdd: (machine: {
    id: string;
    name: string;
    metric: (typeof METRICS)[number]["metric"];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(0);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({
      // Prefixed so a machine you add can never collide with a built-in id.
      id: newId("cardio"),
      name: trimmed,
      metric: METRICS[unit].metric,
    });
    setName("");
  };

  return (
    <View
      style={{
        gap: 12,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder="Exercise name, e.g. Outdoor run"
        placeholderTextColor={colors.faint}
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

      <View style={{ gap: 8 }}>
        <Label>Measured in</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {METRICS.map((m, i) => (
            <Chip
              key={m.label}
              label={m.label}
              on={unit === i}
              onPress={() => setUnit(i)}
            />
          ))}
        </View>
      </View>

      <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
        Choose a time or distance target after adding it. No machine needed — outdoor runs and bodyweight cardio belong here too.
      </Text>

      <Submit label="Add" disabled={!name.trim()} onPress={submit} />
    </View>
  );
}

/**
 * A new routine is just a name: it starts as a copy of the everyday stretch,
 * so it works from the first tap, and opens to be changed from there.
 */
function AddMobility({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  };

  return (
    <View
      style={{
        gap: 12,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder="Name of the collection"
        placeholderTextColor={colors.faint}
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
      <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
        It starts as a copy of the everyday stretch. Add, take out and reorder
        stretches from there.
      </Text>
      <Submit label="Create" disabled={!name.trim()} onPress={submit} />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.faint,
        fontSize: 15,
        fontStyle: "italic",
      }}
    >
      {children}
    </Text>
  );
}


function Submit({
  label,
  disabled,
  onPress,
  subtle,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  /** The secondary action inside a form — adding one hold, not the routine. */
  subtle?: boolean;
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
        minHeight: subtle ? 44 : 50,
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: subtle ? colors.raised : colors.cloud,
        opacity: disabled ? 0.35 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: subtle ? colors.text : colors.ink,
          fontSize: subtle ? 14 : 15,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
