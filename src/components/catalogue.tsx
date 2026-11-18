import { useEffect, useState } from "react";
import { LinkButton, Chip } from "@/components/buttons";
import { Image, Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/text";

import { Create, LibraryBrowser } from "@/components/add-exercise";
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
import { hasIllustration, Illustration } from "@/components/illustration";
import { Guide, GuideInstructions } from "@/components/guide";
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
import {
  addCardio,
  addExercise,
  canRemove,
  canRemoveConditioning,
  cardioTarget,
  catalogue,
  hiddenExercises,
  everyExercise,
  createRoutine,
  editExercise,
  editRoutine,
  hiddenConditioningList,
  isCustom,
  isCustomConditioning,
  removeConditioning,
  removeExercise,
  restoreConditioning,
  routineMinutes,
  useSession,
  workoutsUsing,
} from "@/store/session";


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
  const { state, setState } = useSession();
  const [open, setOpen] = useState<"cardio" | "mobility" | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // Making your own: the name typed so far, or null while not.
  const [making, setMaking] = useState<string | null>(null);
  const [makingFrom, setMakingFrom] = useState<Pattern | undefined>(undefined);
  // Every exercise the app knows, and any you made: nothing is kept out of
  // the Library. Which ones the app picks for your workouts is separate.
  const all = [...catalogue(state), ...hiddenExercises(state)];
  // A stretch found by the search opens in Mobility.
  const [stretch, setStretch] = useState<string | null>(null);
  const cardio = cardioPool();
  const mobility = mobilityPool(state.hiddenConditioning);

  // The same library as adding to a workout, so it looks and works the same;
  // here a tap opens a thing to change it everywhere.
  return (
    <View>
      <LibraryBrowser
        mode="edit"
        exercises={all}
        moves={STRETCHES}
        onMove={(id) => {
          setStretch(id);
          setOpen("mobility");
        }}
        blocks={[
          { id: "cardio", label: "Cardio", detail: plural(cardio.length, "machine or run", "machines and runs"), family: "cardio" },
          { id: "mobility", label: "Mobility", detail: plural(mobility.length, "routine", "routines"), family: "mobility" },
        ]}
        onBlock={(id) => setOpen(id as "cardio" | "mobility")}
        onPick={setEditing}
        onCreate={(name, area) => {
          setMakingFrom(area);
          setMaking(name);
        }}
      />
      <ExerciseSheet exercise={all.find((e) => e.id === editing)} onClose={() => setEditing(null)} />
      <CardioSheet visible={open === "cardio"} onClose={() => setOpen(null)} />
      <MobilitySheet
        visible={open === "mobility"}
        start={stretch}
        onClose={() => {
          setStretch(null);
          setOpen(null);
        }}
      />
      <Sheet visible={making !== null} title="Create your own" onClose={() => setMaking(null)}>
        {making !== null ? (
          <Create
            initialName={making}
            workoutName="your library"
            fallback={makingFrom}
            onCreate={(exercise) => {
              setState((s) => addExercise(s, exercise));
              setMaking(null);
            }}
            onBack={() => setMaking(null)}
          />
        ) : null}
      </Sheet>
    </View>
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
 * One exercise: its name, how it's done (the figure and the steps), the
 * weight it opens at, how far − and + move that weight, and — for one you
 * made — a way to delete it. Edits apply as you make them.
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

      {/* How it's done comes first: the Library is where you learn a lift.
          A lift with no guide (one you made) goes straight to its settings. */}
      {guideFor(exercise.id) || hasIllustration(exercise.id) ? <Guide id={exercise.id} /> : null}

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

      {/* Only one you made can be deleted: the app's own exercises are the
          library itself. To stop using one, swap it in the workout. */}
      {mine ? (
        <View style={{ gap: 8 }}>
          {confirming ? (
            <>
              <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
                {`${exercise.name} will be deleted for good. Workouts that use it get another exercise of the same kind instead.`}
              </Text>
              <BigButton
                label={`Delete ${exercise.name}`}
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
              label="Delete exercise"
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
      ) : null}
    </View>
  );
}


/** The full cardio library, including built-ins hidden by older versions. */
function CardioSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const machines = cardioPool();

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
      {isCustomConditioning(state, id) ? <RemoveConditioning id={id} name={exercise.name} onRemoved={onRemoved} /> : null}
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
function MobilitySheet({
  visible,
  start,
  onClose,
}: {
  visible: boolean;
  /** A move to open straight away, from the Library's search. */
  start?: string | null;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState(false);
  // "All moves" opened, and one move in it.
  const [browsing, setBrowsing] = useState(false);
  const [move, setMove] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (visible && start) {
      setBrowsing(true);
      setMove(start);
    }
  }, [visible, start]);
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
          {hasIllustration(shown.id) ? (
            <Illustration key={shown.id} id={shown.id} style={{ height: 240, borderRadius: radii.card, borderCurve: "continuous" }} />
          ) : PHOTOS[shown.id]?.[0] ? (
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
  const usual = routine ? "Klay's usual routine" : "Klay's usual cardio";

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
 * Klay's own machines or routines that aren't in your list — ones you
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
