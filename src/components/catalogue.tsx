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
  GROUP_LABEL,
  GROUP_ORDER,
  PATTERN_LABEL,
  PATTERN_ORDER,
  groupForPattern,
  groupsOf,
  type Group,
  type Pattern,
} from "@/data/exercises";
import {
  addCardio,
  addExercise,
  addMobility,
  canRemove,
  canRemoveConditioning,
  catalogue,
  hiddenConditioningList,
  hiddenExercises,
  removeConditioning,
  removeExercise,
  restoreConditioning,
  restoreExercise,
  useSession,
} from "@/store/session";


/** Dumbbell movements are loaded per hand — worth saying in a list of names. */
const perHandNote = (exercise: { perHand?: boolean }) =>
  exercise.perHand ? "  ×2" : "";

/**
 * The catalogue of every movement, grouped by muscle. Rendered inside the
 * Plan tab's "Exercises" segment — see `plan.tsx` for the host.
 */
export function Catalogue() {
  const { state, setState } = useSession();
  const [adding, setAdding] = useState<Group | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // One category open at a time — the full list is far too long to scroll.
  const [open, setOpen] = useState<Group | null>(null);

  // Grouped by muscle, so an overhead press sits under Shoulders where you
  // would look for it. An exercise spanning two groups is listed under both.
  const byGroup = useMemo(() => {
    const map = new Map<Group, ReturnType<typeof catalogue>>();
    for (const e of catalogue(state)) {
      for (const g of groupsOf(e)) map.set(g, [...(map.get(g) ?? []), e]);
    }
    return map;
  }, [state]);

  return (
    <View style={{ gap: 22 }}>
      <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
        Everything available: lifts by muscle, then the cardio machines and
        mobility routines. A slot's swap list offers whatever is here for it.
      </Text>

      {GROUP_ORDER.map((group) => {
        const list = byGroup.get(group) ?? [];
        return (
          <View
            key={group}
            style={{
              gap: 6,
              borderRadius: radii.card,
              borderCurve: "continuous",
              backgroundColor: open === group ? colors.surface : "transparent",
              // The border stays at 1px either way — dropping it when open
              // shifted everything inside by a pixel.
              borderWidth: 1,
              borderColor: open === group ? colors.surface : colors.line,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                // Fixed so the row cannot change height when the card opens.
                height: 44,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open === group }}
                onPress={() => {
                  setPendingDelete(null);
                  setOpen(open === group ? null : group);
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
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 19,
                    fontWeight: "700",
                  }}
                >
                  {GROUP_LABEL[group]}
                </Text>
                <Text
                  style={{
                    color: colors.faint,
                    fontSize: 11,
                    fontWeight: "800",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {list.length}
                </Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>
                  {open === group ? "▲" : "▼"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add an exercise to ${GROUP_LABEL[group]}`}
                onPress={() => {
                  setOpen(group);
                  setAdding(adding === group ? null : group);
                }}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  marginRight: -6,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  // A filled circle, so adding an exercise reads as an action
                  // rather than a stray glyph next to the count.
                  backgroundColor: adding === group ? colors.acid : colors.raised,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: adding === group ? colors.ink : colors.text,
                    fontSize: 22,
                    fontWeight: "600",
                    // No lineHeight: it boxes the glyph, and "+" and "×" have
                    // different baselines, so neither ends up centred.
                    includeFontPadding: false,
                    textAlignVertical: "center",
                  }}
                >
                  {adding === group ? "×" : "+"}
                </Text>
              </Pressable>
            </View>

            {open === group && adding === group ? (
              <AddExercise
                group={group}
                onAdd={(exercise) => {
                  setAdding(null);
                  setState((s) => addExercise(s, exercise));
                }}
              />
            ) : null}

            {open === group ? list.map((exercise) => {
              const removable = canRemove(state, exercise.id);
              const confirming = pendingDelete === exercise.id;
              return (
                <View
                  key={exercise.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 48,
                  }}
                >
                  <View style={{ flex: 1, gap: 1 }}>
                    {/* The finer movement type sits above the name, matching
                        the slot label in a module. */}
                    <Text
                      style={{
                        color: colors.faint,
                        fontSize: 10,
                        fontWeight: "800",
                        letterSpacing: 0.9,
                        textTransform: "uppercase",
                      }}
                    >
                      {exercise.patterns.map((p) => PATTERN_LABEL[p]).join(" · ")}
                    </Text>
                    <Text
                      style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
                    >
                      {exercise.name}
                      {perHandNote(exercise)}
                    </Text>
                  </View>

                  {confirming ? (
                    // Two taps to remove: this one is the confirmation.
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
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
                          style={{ color: colors.faint, fontSize: 13, fontWeight: "700" }}
                        >
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm removing ${exercise.name}`}
                        onPress={() => {
                          setPendingDelete(null);
                          setState((s) => removeExercise(s, exercise.id));
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
                      accessibilityLabel={`Remove ${exercise.name}`}
                      accessibilityState={{ disabled: !removable }}
                      disabled={!removable}
                      onPress={() => setPendingDelete(exercise.id)}
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        marginRight: -10,
                        alignItems: "center",
                        justifyContent: "center",
                        // The last exercise of a type cannot go: a slot of that
                        // type would have nothing to prescribe.
                        opacity: !removable ? 0.2 : pressed ? 0.5 : 1,
                      })}
                    >
                      <Text style={{ color: colors.faint, fontSize: 17 }}>−</Text>
                    </Pressable>
                  )}
                </View>
              );
            }) : null}

            {open === group && list.length === 0 ? (
              <Text
                style={{ color: colors.faint, fontSize: 13, paddingVertical: 12 }}
              >
                Nothing here. A slot needing this falls back to its default.
              </Text>
            ) : null}
          </View>
        );
      })}

      {/* Cardio and mobility are pools in the same sense the muscle groups
          are — add to them, remove from them — but they hang off no muscle,
          so they sit below rather than being filed under one. */}
      <Conditioning />

      {/* Anything you have removed. Built-ins are hidden rather than deleted
          and keep their training history, so putting one back picks up
          exactly where it left off. */}
      <Removed />
    </View>
  );
}

/**
 * The undo for removal.
 *
 * Only appears once something has been removed — an empty section explaining
 * a thing that has not happened is just noise on the screen.
 */
function Removed() {
  const { state, setState } = useSession();
  const [open, setOpen] = useState(false);

  const rows = [
    ...hiddenExercises(state).map((e) => ({
      id: e.id,
      name: e.name,
      detail: e.patterns.map((p) => PATTERN_LABEL[p]).join(" · "),
      restore: restoreExercise,
    })),
    ...hiddenConditioningList(state).map((c) => ({
      id: c.id,
      name: c.name,
      detail: c.kind === "cardio" ? "Cardio" : "Mobility",
      restore: restoreConditioning,
    })),
  ];

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
        <Text
          style={{ flex: 1, color: colors.muted, fontSize: 19, fontWeight: "700" }}
        >
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
            Kept, not deleted. Put one back and its training history comes with
            it.
          </Text>

          {rows.map((row) => (
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
                  style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}
                >
                  {row.name}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Put ${row.name} back`}
                onPress={() => setState((s) => row.restore(s, row.id))}
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
                <Text
                  style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}
                >
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

/** The cardio and mobility pools, edited exactly like the muscle groups. */
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

/** Name it, pick how the weight moves, and it joins this type's list. */
function AddExercise({
  group,
  onAdd,
}: {
  group: Group;
  onAdd: (exercise: {
    id: string;
    name: string;
    patterns: Pattern[];
    increment: number;
    bodyweight?: boolean;
    perHand?: boolean;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState(0);
  // Which movement types it counts as. A group holds several — Shoulders has
  // both vertical press and side/rear delt work — so this has to be asked.
  const inGroup = PATTERN_ORDER.filter((p) => groupForPattern(p) === group);
  const [types, setTypes] = useState<Pattern[]>([inGroup[0]]);

  const OPTIONS: { label: string; value: number; perHand?: boolean }[] = [
    { label: "Barbell 2.5", value: 2.5 },
    { label: "Dumbbell 2.5 ×2", value: 2.5, perHand: true },
    { label: "Machine 5", value: 5 },
    { label: "Bodyweight", value: 0 },
  ];

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (types.length === 0) return;
    const option = OPTIONS[kind];
    onAdd({
      // Prefixed so a custom exercise can never collide with a built-in id.
      id: `custom_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      name: trimmed,
      patterns: types,
      increment: option.value,
      bodyweight: option.value === 0,
      perHand: option.perHand,
    });
    setName("");
    setTypes([inGroup[0]]);
  };

  // Dumbbell is per-hand: the weight stored is one dumbbell, shown "20 kg ×2".

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
        placeholder="Exercise name"
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {OPTIONS.map((o, i) => {
          const active = kind === i;
          return (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setKind(i)}
              style={({ pressed }) => ({
                justifyContent: "center",
                minHeight: 44,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: active ? 0 : 1,
                borderColor: colors.line,
                backgroundColor: active ? colors.acid : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: active ? colors.ink : colors.muted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: colors.faint,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 0.9,
            textTransform: "uppercase",
          }}
        >
          Movement type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {PATTERN_ORDER.map((p) => {
            const on = types.includes(p);
            return (
              <Pressable
                key={p}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() =>
                  setTypes((v) => (on ? v.filter((x) => x !== p) : [...v, p]))
                }
                style={({ pressed }) => ({
                  justifyContent: "center",
                  minHeight: 40,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: on ? 0 : 1,
                  borderColor: colors.line,
                  backgroundColor: on ? colors.acid : "transparent",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: on ? colors.ink : colors.faint,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {PATTERN_LABEL[p]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!name.trim() || types.length === 0}
        onPress={submit}
        style={({ pressed }) => ({
          alignItems: "center",
          justifyContent: "center",
          minHeight: 50,
          borderRadius: radii.button,
          borderCurve: "continuous",
          backgroundColor: colors.acid,
          opacity: !name.trim() || types.length === 0 ? 0.35 : pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>
          Add
        </Text>
      </Pressable>
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
