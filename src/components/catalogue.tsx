import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { BigButton, OpenRow, SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { colors, radii } from "@/constants/theme";
import {
  CARDIO_MINUTES,
  COURSE_STEP,
  METRICS,
  cardioById,
  cardioPool,
  courseLabel,
  mobilityPool,
  routineSeconds,
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
import {
  addCardio,
  addExercise,
  addMobility,
  canRemove,
  canRemoveConditioning,
  catalogue,
  courseFor,
  editExercise,
  hiddenConditioningList,
  hiddenExercises,
  isCustom,
  isCustomConditioning,
  nudgeCourse,
  removeConditioning,
  removeExercise,
  restoreConditioning,
  restoreExercise,
  useSession,
} from "@/store/session";

/** "2.5 kg steps", "bodyweight" — the one detail worth showing in a list. */
const stepLabel = (ex: Exercise) =>
  ex.unloaded ? "no weight" : `${ex.increment || 2.5} kg steps`;

/**
 * Your exercises, grouped the way you train them: push, pull, legs, core —
 * then the cardio machines and mobility routines. Rendered inside the Plan
 * tab's "Exercises" segment — see `plan.tsx`.
 *
 * The page is just the groups. Each opens a sheet listing what is in it;
 * each exercise opens its own sheet on top, with room for what you can
 * change. Built-ins you are not using are the library, offered by Add.
 */
type Group = Category | "cardio" | "mobility";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Catalogue() {
  const { state } = useSession();
  const [open, setOpen] = useState<Group | null>(null);

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
      <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
        Tap a group to see what is in it, change an exercise, or add one.
      </Text>

      <View style={{ gap: 10 }}>
        {CATEGORY_ORDER.map((c) => (
          <OpenRow
            key={c}
            large
            title={CATEGORY_LABEL[c]}
            detail={plural((byCategory.get(c) ?? []).length, "exercise", "exercises")}
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
          detail={plural(cardio.length, "machine", "machines")}
          onPress={() => setOpen("cardio")}
        />
        <OpenRow
          large
          title="Mobility"
          detail={plural(mobility.length, "routine", "routines")}
          onPress={() => setOpen("mobility")}
        />
      </View>

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
        <AddLink label="Add exercise" onPress={() => setAdding(true)} />
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 56,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="plus" size={16} color={colors.rise} weight="semibold" />
      <Text style={{ color: colors.rise, fontSize: 16, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
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
      {library.length > 0 ? (
        <>
          <Label>From the library</Label>
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
              <Icon name="plus" size={18} color={colors.rise} weight="semibold" />
            </Pressable>
          ))}
        </>
      ) : null}

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
    </View>
  );
}

/**
 * One exercise: its name and how far − and + move its weight, and a way to
 * remove it. Edits apply as you make them.
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

      {exercise.unloaded ? null : (
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
              ? `How much one press of − or + moves the weight${exercise.perHand ? ", per dumbbell" : ""}. Changes save automatically.`
              : "Enter a number greater than 0. Your previous step is kept until then."}
          </Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        {confirming ? (
          <>
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
        <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
          {!removable
            ? "The last of its kind stays, or a slot would have nothing to use."
            : mine
              ? "Deleting keeps its history, in case you make it again."
              : "Removing puts it back in the library, history and all."}
        </Text>
      </View>
    </View>
  );
}

/** Kinds of equipment, each with the weight step it usually moves by. */
const EQUIPMENT: { label: string; increment: number; perHand?: boolean; bodyweight?: boolean }[] =
  [
    { label: "Barbell", increment: 2.5 },
    { label: "Dumbbells", increment: 2, perHand: true },
    { label: "Machine", increment: 5 },
    { label: "Bodyweight", increment: 2.5, bodyweight: true },
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

  const ready = !!name.trim() && picked.length > 0;

  const submit = () => {
    if (!ready) return;
    const trimmed = name.trim();
    const gear = EQUIPMENT[kind];
    onCreate({
      // Prefixed so a custom exercise can never collide with a built-in id.
      id: `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: trimmed,
      patterns: picked,
      increment: gear.increment,
      perHand: gear.perHand,
      bodyweight: gear.bodyweight,
    });
    setName("");
    setPicked([types[0]]);
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
        {machines.map((c) => {
          const course = courseFor(state, c.id);
          return (
            <OpenRow
              key={c.id}
              title={c.name}
              detail={
                course !== undefined
                  ? `${courseLabel(c, course)}, timed`
                  : `${CARDIO_MINUTES} minutes, distance in ${c.metric.unit}`
              }
              onPress={() => setEditing(c.id)}
            />
          );
        })}
        <AddLink label="Add machine" onPress={() => setAdding(true)} />
      </View>

      <Sheet
        visible={!!editing && machines.some((c) => c.id === editing)}
        title="Machine"
        closeLabel="Done"
        onClose={() => setEditing(null)}
      >
        {editing ? <MachineEditor id={editing} onRemoved={() => setEditing(null)} /> : null}
      </Sheet>

      <Sheet visible={adding} title="Add to Cardio" onClose={() => setAdding(false)}>
        <AddPanel
          library={hiddenConditioningList(state)
            .filter((row) => row.kind === "cardio")
            .map((row) => ({ id: row.id, name: row.name }))}
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

/** One machine: its set distance, if it runs one, and removing it. */
function MachineEditor({ id, onRemoved }: { id: string; onRemoved: () => void }) {
  const { state, setState } = useSession();
  const machine = cardioById(id);
  if (!machine) return null;
  const course = courseFor(state, id);

  return (
    <View style={{ gap: 36, paddingTop: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>{machine.name}</Text>
        <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
          {course !== undefined
            ? "A set distance, timed. Your time is the score."
            : `${CARDIO_MINUTES} minutes every time. The distance you cover is the score.`}
        </Text>
      </View>

      {course !== undefined ? (
        <CourseEditor
          cardioId={id}
          course={course}
          onNudge={(d) => setState((s) => nudgeCourse(s, id, d))}
        />
      ) : null}

      <RemoveConditioning id={id} name={machine.name} onRemoved={onRemoved} />
    </View>
  );
}

/** The mobility routines. Tap one to see its holds; Add brings one in. */
function MobilitySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const routines = mobilityPool(state.hiddenConditioning);
  const routine = routines.find((m) => m.id === editing);

  const close = () => {
    setEditing(null);
    setAdding(false);
    onClose();
  };

  return (
    <Sheet visible={visible} title="Mobility" closeLabel="Done" onClose={close}>
      <View style={{ gap: 12, paddingTop: 12 }}>
        {routines.map((m) => (
          <OpenRow
            key={m.id}
            title={m.name}
            detail={`${plural(m.moves.length, "hold", "holds")} · about ${Math.round(
              routineSeconds(m) / 60,
            )} min`}
            onPress={() => setEditing(m.id)}
          />
        ))}
        <AddLink label="Add routine" onPress={() => setAdding(true)} />
      </View>

      <Sheet visible={!!routine} title="Routine" closeLabel="Done" onClose={() => setEditing(null)}>
        {routine ? (
          <View style={{ gap: 36, paddingTop: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>
                {routine.name}
              </Text>
              <Text style={{ color: colors.faint, fontSize: 15 }}>{routine.subtitle}</Text>
            </View>
            <View
              style={{
                borderRadius: radii.card,
                borderCurve: "continuous",
                backgroundColor: colors.surface,
                paddingHorizontal: 18,
              }}
            >
              {routine.moves.map((move, i) => (
                <View
                  key={move.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 56,
                    borderBottomWidth: i === routine.moves.length - 1 ? 0 : 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>
                    {move.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 15,
                      fontWeight: "700",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {move.seconds}s{move.perSide ? " ×2" : ""}
                  </Text>
                </View>
              ))}
            </View>
            <RemoveConditioning
              id={routine.id}
              name={routine.name}
              onRemoved={() => setEditing(null)}
            />
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={adding} title="Add to Mobility" onClose={() => setAdding(false)}>
        <AddPanel
          library={hiddenConditioningList(state)
            .filter((row) => row.kind === "mobility")
            .map((row) => ({ id: row.id, name: row.name }))}
          onTake={(id) => {
            setState((s) => restoreConditioning(s, id));
            setAdding(false);
          }}
          create={
            <AddMobility
              onAdd={(r) => {
                setAdding(false);
                setState((s) => addMobility(s, r));
              }}
            />
          }
        />
      </Sheet>
    </Sheet>
  );
}

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

  return (
    <View style={{ gap: 8 }}>
      {confirming ? (
        <>
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
      <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
        {!removable
          ? "The last one stays, or the block would have nothing to offer."
          : mine
            ? "Deleting it keeps its records."
            : "Removing puts it back in the library, records and all."}
      </Text>
    </View>
  );
}

/**
 * The distance a timed machine runs, stepped rather than typed: every
 * distance keeps its own record, so only whole steps are offered.
 */
function CourseEditor({
  cardioId,
  course,
  onNudge,
}: {
  cardioId: string;
  course: number;
  onNudge: (direction: 1 | -1) => void;
}) {
  const machine = cardioById(cardioId)!;
  const atMin = course <= COURSE_STEP[machine.metric.unit];

  const step = (label: string, direction: 1 | -1, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 1 ? "Longer" : "Shorter"}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onNudge(direction)}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: colors.surface,
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={label === "+" ? "plus" : "minus"} size={20} color={colors.text} weight="semibold" />
    </Pressable>
  );

  return (
    <View
      style={{
        gap: 10,
        borderRadius: 14,
        backgroundColor: colors.raised,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Label>Distance</Label>
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        {step("−", -1, atMin)}
        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: "800",
            letterSpacing: -0.8,
            fontVariant: ["tabular-nums"],
          }}
        >
          {courseLabel(machine, course)}
        </Text>
        {step("+", 1)}
      </View>
      <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
        Your time over it is the score. Each distance keeps its own times — change
        it back and your old ones are still there.
      </Text>
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
      id: `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
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
        placeholder="Machine name"
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
        Every cardio block runs {CARDIO_MINUTES} minutes. The distance you cover
        is the score, and it is tracked per machine.
      </Text>

      <Submit label="Add" disabled={!name.trim()} onPress={submit} />
    </View>
  );
}

/**
 * A mobility routine is a name and a list of holds. Holds are added one at a
 * time so the routine can be as short or as long as you want.
 */
function AddMobility({
  onAdd,
}: {
  onAdd: (routine: {
    id: string;
    name: string;
    subtitle: string;
    moves: { id: string; name: string; seconds: number; perSide?: boolean }[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [move, setMove] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [perSide, setPerSide] = useState(false);
  const [moves, setMoves] = useState<
    { id: string; name: string; seconds: number; perSide?: boolean }[]
  >([]);

  const addMove = () => {
    const trimmed = move.trim();
    if (!trimmed) return;
    setMoves((v) => [
      ...v,
      {
        id: `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${v.length}`,
        name: trimmed,
        seconds,
        perSide: perSide || undefined,
      },
    ]);
    setMove("");
    setPerSide(false);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || moves.length === 0) return;
    onAdd({
      id: `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: trimmed,
      subtitle: "your routine",
      moves,
    });
    setName("");
    setMoves([]);
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
        placeholder="Routine name"
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

      {/* The holds added so far. Tap one to take it back off the list. */}
      {moves.length > 0 ? (
        <View style={{ gap: 2 }}>
          {moves.map((m, i) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${m.name} from this routine`}
              onPress={() => setMoves((v) => v.filter((_, j) => j !== i))}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 40,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text
                style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" }}
              >
                {m.name}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 13,
                  fontWeight: "700",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {m.seconds}s{m.perSide ? " ×2" : ""}
              </Text>
              <Icon name="minus" size={14} color={colors.faint} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Label>Add a hold</Label>
        <TextInput
          value={move}
          onChangeText={setMove}
          onSubmitEditing={addMove}
          placeholder="Pose or stretch"
          placeholderTextColor={colors.faint}
          style={{
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: colors.raised,
            color: colors.text,
            fontSize: 15,
            fontWeight: "600",
          }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[30, 45, 60, 90].map((sec) => (
            <Chip
              key={sec}
              label={`${sec}s`}
              on={seconds === sec}
              onPress={() => setSeconds(sec)}
            />
          ))}
          <Chip
            label="Each side"
            on={perSide}
            onPress={() => setPerSide((v) => !v)}
          />
        </View>
        <Submit label="Add hold" disabled={!move.trim()} onPress={addMove} subtle />
      </View>

      <Submit
        label="Add routine"
        disabled={!name.trim() || moves.length === 0}
        onPress={submit}
      />
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.faint,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.9,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        justifyContent: "center",
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: on ? 0 : 1,
        borderColor: colors.line,
        backgroundColor: on ? colors.cloud : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{ color: on ? colors.ink : colors.muted, fontSize: 13, fontWeight: "700" }}
      >
        {label}
      </Text>
    </Pressable>
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
