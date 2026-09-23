import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors, radii } from "@/constants/theme";
import {
  CARDIO_MINUTES,
  METRICS,
  cardioPool,
  mobilityPool,
  routineSeconds,
} from "@/data/conditioning";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  INCREMENTS,
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
  editExercise,
  hiddenConditioningList,
  hiddenExercises,
  isCustom,
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
 * Your exercises, grouped the way you train them: push, pull, legs, core.
 * Rendered inside the Plan tab's "Exercises" segment — see `plan.tsx`.
 *
 * Built-ins you are not using are not listed here at all; they are the
 * library, offered by the + on each group.
 */
export function Catalogue() {
  const { state } = useSession();
  // One group open at a time — together they are too long to scroll.
  const [open, setOpen] = useState<Category | null>(null);

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

  return (
    <View style={{ gap: 22 }}>
      <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
        Tap an exercise to rename it or change how much the weight moves. + adds
        one from the library, or one of your own.
      </Text>

      {CATEGORY_ORDER.map((category) => (
        <CategoryCard
          key={category}
          category={category}
          list={byCategory.get(category) ?? []}
          open={open === category}
          onToggle={() => setOpen(open === category ? null : category)}
        />
      ))}

      {/* Cardio and mobility are pools in the same sense — add to them,
          remove from them — but they are not push, pull, legs or core, so
          they sit below rather than being filed under one. */}
      <Conditioning />
    </View>
  );
}

function CategoryCard({
  category,
  list,
  open,
  onToggle,
}: {
  category: Category;
  list: Exercise[];
  open: boolean;
  onToggle: () => void;
}) {
  const { state, setState } = useSession();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const library = hiddenExercises(state)
    .filter((e) => categoriesOf(e).includes(category))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View
      style={{
        gap: 6,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: open ? colors.surface : "transparent",
        // The border stays at 1px either way — dropping it when open shifted
        // everything inside by a pixel.
        borderWidth: 1,
        borderColor: open ? colors.surface : colors.line,
        padding: 16,
      }}
    >
      <CardHeader
        label={CATEGORY_LABEL[category]}
        count={list.length}
        open={open}
        adding={adding}
        onToggle={() => {
          setEditing(null);
          onToggle();
        }}
        onAdd={() => {
          if (!open) onToggle();
          setAdding((v) => !v);
        }}
      />

      {open && adding ? (
        <AddPanel
          library={library.map((e) => ({ id: e.id, name: e.name }))}
          onTake={(id) => setState((s) => restoreExercise(s, id))}
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
      ) : null}

      {open
        ? list.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              editing={editing === exercise.id}
              onToggle={() => setEditing(editing === exercise.id ? null : exercise.id)}
            />
          ))
        : null}

      {open && list.length === 0 ? (
        <Text style={{ color: colors.faint, fontSize: 14, paddingVertical: 12 }}>
          Nothing here yet. + adds one.
        </Text>
      ) : null}
    </View>
  );
}

/** A group's header: its name and count, and the + that opens adding. */
function CardHeader({
  label,
  count,
  open,
  adding,
  onToggle,
  onAdd,
}: {
  label: string;
  count: number;
  open: boolean;
  adding: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        // Fixed so the row cannot change height when the card opens.
        height: 48,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: "100%",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ flex: 1, color: colors.text, fontSize: 21, fontWeight: "700" }}>
          {label}
        </Text>
        <Text
          style={{
            color: colors.faint,
            fontSize: 13,
            fontWeight: "800",
            fontVariant: ["tabular-nums"],
          }}
        >
          {count}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add to ${label}`}
        onPress={onAdd}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          marginRight: -6,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          // A filled circle, so adding reads as an action rather than a stray
          // glyph next to the count.
          backgroundColor: adding ? colors.acid : colors.raised,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            color: adding ? colors.ink : colors.text,
            fontSize: 22,
            fontWeight: "600",
            // No lineHeight: it boxes the glyph, and "+" and "×" have
            // different baselines, so neither ends up centred.
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
        >
          {adding ? "×" : "+"}
        </Text>
      </Pressable>
    </View>
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
              <Text style={{ color: colors.acid, fontSize: 20, fontWeight: "700" }}>+</Text>
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
 * One exercise. Tapped open, it shows the two things worth changing — its
 * name and how far − and + move the weight — and a way to remove it.
 */
function ExerciseRow({
  exercise,
  editing,
  onToggle,
}: {
  exercise: Exercise;
  editing: boolean;
  onToggle: () => void;
}) {
  const { state, setState } = useSession();
  const [name, setName] = useState(exercise.name);
  const [confirming, setConfirming] = useState(false);
  const removable = canRemove(state, exercise.id);
  const mine = isCustom(state, exercise.id);

  const saveName = () => {
    if (name.trim() && name.trim() !== exercise.name) {
      setState((s) => editExercise(s, exercise.id, { name }));
    } else {
      setName(exercise.name);
    }
  };

  const close = () => {
    saveName();
    setConfirming(false);
    onToggle();
  };

  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: editing ? colors.raised : "transparent",
        marginHorizontal: -10,
        paddingHorizontal: 10,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: editing }}
        onPress={editing ? close : onToggle}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 52,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "600" }}>
          {exercise.name}
        </Text>
        <Text style={{ color: colors.faint, fontSize: 13, fontWeight: "700" }}>
          {stepLabel(exercise)}
        </Text>
      </Pressable>

      {editing ? (
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            returnKeyType="done"
            placeholder="Name"
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

          {exercise.unloaded ? null : (
            <View style={{ gap: 8 }}>
              <Label>Weight step</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {INCREMENTS.map((step) => (
                  <Chip
                    key={step}
                    label={`${step}`}
                    on={(exercise.increment || 2.5) === step}
                    onPress={() => setState((s) => editExercise(s, exercise.id, { increment: step }))}
                  />
                ))}
              </View>
              <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
                How many kg one press of − or + moves the weight
                {exercise.perHand ? ", per dumbbell" : ""}.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {confirming ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirming(false)}
                  style={({ pressed }) => ({
                    justifyContent: "center",
                    minHeight: 44,
                    paddingHorizontal: 4,
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Text style={{ color: colors.faint, fontSize: 14, fontWeight: "700" }}>
                    Cancel
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Confirm removing ${exercise.name}`}
                  onPress={() => {
                    setConfirming(false);
                    onToggle();
                    setState((s) => removeExercise(s, exercise.id));
                  }}
                  style={({ pressed }) => ({
                    justifyContent: "center",
                    minHeight: 44,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: colors.coral,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
                    {mine ? "Delete" : "Remove"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !removable }}
                  disabled={!removable}
                  onPress={() => setConfirming(true)}
                  style={({ pressed }) => ({
                    justifyContent: "center",
                    minHeight: 44,
                    paddingHorizontal: 4,
                    // The last exercise of a type cannot go: a slot of that
                    // type would have nothing to prescribe.
                    opacity: !removable ? 0.25 : pressed ? 0.5 : 1,
                  })}
                >
                  <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>
                    {mine ? "Delete" : "Remove"}
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={({ pressed }) => ({
                    justifyContent: "center",
                    minHeight: 44,
                    paddingHorizontal: 22,
                    borderRadius: 999,
                    backgroundColor: colors.acid,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
          {!removable ? (
            <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
              The last of its kind stays, or a slot would have nothing to use.
            </Text>
          ) : !mine ? (
            <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
              Removing puts it back in the library, history and all.
            </Text>
          ) : null}
        </View>
      ) : null}
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

/** The cardio and mobility pools, edited exactly like the exercise groups. */
function Conditioning() {
  const { state, setState } = useSession();
  const [open, setOpen] = useState<"cardio" | "mobility" | null>(null);
  const [adding, setAdding] = useState<"cardio" | "mobility" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const cardio = cardioPool(state.hiddenConditioning);
  const mobility = mobilityPool(state.hiddenConditioning);

  const rows =
    open === "cardio"
      ? cardio.map((c) => ({
          id: c.id,
          name: c.name,
          detail: `${CARDIO_MINUTES} min · ${c.metric.unit}`,
        }))
      : open === "mobility"
        ? mobility.map((m) => ({
            id: m.id,
            name: m.name,
            detail: `${m.moves.length} ${
              m.moves.length === 1 ? "hold" : "holds"
            } · ${Math.round(routineSeconds(m) / 60)} min`,
          }))
        : [];

  const section = (kind: "cardio" | "mobility", label: string, count: number) => (
    <View
      key={kind}
      style={{
        gap: 6,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: open === kind ? colors.surface : "transparent",
        borderWidth: 1,
        borderColor: open === kind ? colors.surface : colors.line,
        padding: 16,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 44 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open === kind }}
          onPress={() => {
            setPendingDelete(null);
            setOpen(open === kind ? null : kind);
          }}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            height: "100%",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{ flex: 1, color: colors.text, fontSize: 19, fontWeight: "700" }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: colors.faint,
              fontSize: 11,
              fontWeight: "800",
              fontVariant: ["tabular-nums"],
            }}
          >
            {count}
          </Text>
          <Text style={{ color: colors.faint, fontSize: 12 }}>
            {open === kind ? "▲" : "▼"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add to ${label}`}
          onPress={() => {
            setOpen(kind);
            setAdding(adding === kind ? null : kind);
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            marginRight: -6,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: adding === kind ? colors.acid : colors.raised,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              color: adding === kind ? colors.ink : colors.text,
              fontSize: 22,
              fontWeight: "600",
              includeFontPadding: false,
              textAlignVertical: "center",
            }}
          >
            {adding === kind ? "×" : "+"}
          </Text>
        </Pressable>
      </View>

      {open === kind && adding === kind ? (
        <AddPanel
          library={hiddenConditioningList(state)
            .filter((row) => row.kind === kind)
            .map((row) => ({ id: row.id, name: row.name }))}
          onTake={(id) => setState((s) => restoreConditioning(s, id))}
          create={
            kind === "cardio" ? (
              <AddCardio
                onAdd={(machine) => {
                  setAdding(null);
                  setState((s) => addCardio(s, machine));
                }}
              />
            ) : (
              <AddMobility
                onAdd={(routine) => {
                  setAdding(null);
                  setState((s) => addMobility(s, routine));
                }}
              />
            )
          }
        />
      ) : null}

      {open === kind
        ? rows.map((row) => {
            const removable = canRemoveConditioning(state, row.id);
            const confirming = pendingDelete === row.id;
            return (
              <View
                key={row.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 48,
                }}
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
                    {row.detail}
                  </Text>
                  <Text
                    style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
                  >
                    {row.name}
                  </Text>
                </View>

                {confirming ? (
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setPendingDelete(null)}
                      style={({ pressed }) => ({
                        justifyContent: "center",
                        minHeight: 44,
                        paddingHorizontal: 12,
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: colors.faint,
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm removing ${row.name}`}
                      onPress={() => {
                        setPendingDelete(null);
                        setState((s) => removeConditioning(s, row.id));
                      }}
                      style={({ pressed }) => ({
                        justifyContent: "center",
                        minHeight: 44,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        backgroundColor: colors.coral,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{ color: colors.ink, fontSize: 13, fontWeight: "800" }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${row.name}`}
                    accessibilityState={{ disabled: !removable }}
                    disabled={!removable}
                    onPress={() => setPendingDelete(row.id)}
                    style={({ pressed }) => ({
                      width: 44,
                      height: 44,
                      marginRight: -10,
                      alignItems: "center",
                      justifyContent: "center",
                      // The last machine or routine cannot go: a block of that
                      // kind would have nothing to offer.
                      opacity: !removable ? 0.2 : pressed ? 0.5 : 1,
                    })}
                  >
                    <Text style={{ color: colors.faint, fontSize: 17 }}>−</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        : null}
    </View>
  );

  return (
    <>
      {section("cardio", "Cardio", cardio.length)}
      {section("mobility", "Mobility", mobility.length)}
    </>
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
              <Text style={{ color: colors.faint, fontSize: 15 }}>−</Text>
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
        backgroundColor: on ? colors.acid : "transparent",
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
        backgroundColor: subtle ? colors.raised : colors.acid,
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
