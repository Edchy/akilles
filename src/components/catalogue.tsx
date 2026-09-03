import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors, radii } from "@/constants/theme";
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
  addExercise,
  canRemove,
  catalogue,
  removeExercise,
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
        Everything available, by muscle. A slot's swap list offers whatever is
        here for its movement type.
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
    </View>
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
