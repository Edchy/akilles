import { useState, type ReactNode } from "react";
import { Chip } from "@/components/buttons";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { Icon } from "@/components/icon";
import { SectionLabel } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { parseWeight } from "@/components/weight-field";
import { colors } from "@/constants/theme";
import type { Gear, Kit, Load } from "@/data/kit";
import { DECORATIVE } from "@/lib/decorative";

/**
 * What a plan is trained with: a full gym, some equipment — a pair of
 * dumbbells at home, two kettlebells — or just your bodyweight. Asked when a
 * plan is added, changed in Settings; Klay fills each slot with what is
 * there, and the Library shows only what can be done with it.
 */

/** What can be ticked for somewhere else, in the order people think of it. */
const THINGS: { gear: Gear; label: string }[] = [
  { gear: "dumbbells", label: "Dumbbells" },
  { gear: "kettlebell", label: "Kettlebells" },
  { gear: "pullup_bar", label: "A pull-up bar" },
  { gear: "bench", label: "A bench" },
];

/** The weights offered to tick, by what carries them. */
const WEIGHTS: Record<Load, number[]> = {
  dumbbells: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30],
  kettlebell: [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32],
};

/** "and"-joined: "dumbbells, a bench and a pull-up bar". */
const listed = (parts: string[]): string =>
  parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

const kg = (list: number[]) => `${listed(list.map(String))} kg`;

/** What a place has, in a few words: "bodyweight only", "a 10 kg kettlebell". */
export const kitSummary = (kit: Kit): string => {
  const parts = kit.gear.flatMap((g) => {
    const weights = g === "dumbbells" || g === "kettlebell" ? kit.weights?.[g] : undefined;
    switch (g) {
      case "dumbbells":
        return [weights?.length ? `${kg(weights)} dumbbells` : "dumbbells"];
      case "kettlebell": {
        const pairs = weights?.length ? (kit.pairs ?? []) : [];
        const bells = weights?.length === 1
          ? pairs.length ? `two ${weights[0]} kg kettlebells` : `a ${weights[0]} kg kettlebell`
          : weights?.length
            ? `${kg(weights)} kettlebells`
            : "kettlebells";
        const two = weights && weights.length > 1 && pairs.length ? ` (two of the ${kg(pairs)})` : "";
        return [bells + two];
      }
      case "pullup_bar":
        return ["a pull-up bar"];
      case "bench":
        return ["a bench"];
      default:
        return [];
    }
  });
  return parts.length ? listed(parts) : "just your bodyweight";
};

/** What a plan is trained with, in a few words: "Full gym", "Dumbbells and a bench". */
export const kitName = (kit: Kit | undefined): string => {
  if (!kit || kit.gear.includes("machine")) return "Full gym";
  if (kit.gear.length === 0) return "Just bodyweight";
  const summary = kitSummary(kit);
  return summary.charAt(0).toUpperCase() + summary.slice(1);
};

/**
 * What a plan is trained with: a full gym, some equipment — and then which —
 * or just your bodyweight. Undefined is the gym; no gear at all, bodyweight.
 * "Some equipment" with nothing ticked yet is saved as bodyweight.
 */
export function KitChooser({ kit, onChange }: { kit: Kit | undefined; onChange: (kit: Kit | undefined) => void }) {
  const [some, setSome] = useState(!!kit && kit.gear.length > 0);
  const mode = !kit ? "gym" : some ? "some" : "body";
  return (
    <View style={{ gap: 12 }}>
      <Option label="Full gym" on={mode === "gym"} onPress={() => { setSome(false); onChange(undefined); }} />
      <Option label="Some equipment" on={mode === "some"} onPress={() => { setSome(true); onChange(kit ?? { gear: [] }); }} />
      <Option label="Just bodyweight" on={mode === "body"} onPress={() => { setSome(false); onChange({ gear: [] }); }} />
      {mode === "some" && kit ? (
        <View style={{ paddingTop: 20, gap: 12 }}>
          <SectionLabel>What do you have?</SectionLabel>
          <KitPicker kit={kit} onChange={onChange} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Tick what you have. Dumbbells and kettlebells open a row of weights:
 * "Any weight" until you tick the ones that are there.
 */
export function KitPicker({ kit, onChange }: { kit: Kit; onChange: (kit: Kit) => void }) {
  const has = (g: Gear) => kit.gear.includes(g);
  const toggle = (g: Gear) => {
    const gear = has(g) ? kit.gear.filter((x) => x !== g) : [...kit.gear, g];
    const weights = { ...kit.weights };
    if (!gear.includes(g) && (g === "dumbbells" || g === "kettlebell")) delete weights[g];
    onChange({ gear, weights });
  };
  const setWeights = (load: Load, list: number[]) =>
    onChange({
      ...kit,
      weights: { ...kit.weights, [load]: list },
      // A bell no longer ticked can't be one of a pair.
      ...(load === "kettlebell" ? { pairs: (kit.pairs ?? []).filter((w) => list.includes(w)) } : {}),
    });

  return (
    <View style={{ gap: 12 }}>
      {THINGS.map(({ gear, label }) => (
        <View key={gear} style={{ gap: 12 }}>
          <Option
            label={label}
            icon={<GearIcon gear={gear} />}
            on={has(gear)}
            check
            onPress={() => toggle(gear)}
          />
          {(gear === "dumbbells" || gear === "kettlebell") && has(gear) ? (
            <WeightChips
              load={gear}
              chosen={kit.weights?.[gear] ?? []}
              onChange={(list) => setWeights(gear, list)}
              pairs={gear === "kettlebell" ? (kit.pairs ?? []) : undefined}
              onPairs={gear === "kettlebell" ? (pairs) => onChange({ ...kit, pairs }) : undefined}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** "Any weight", or just the ones that are there. Also asked on its own when Kettlebell Flow is picked. */
export function WeightChips({
  load,
  chosen,
  onChange,
  bare,
  pairs,
  onPairs,
}: {
  load: Load;
  chosen: number[];
  onChange: (list: number[]) => void;
  /** Asked on its own: no question over the chips and no indent, the screen asks it. */
  bare?: boolean;
  /** Kettlebells: the ticked weights you have two of, asked once some are ticked. */
  pairs?: number[];
  onPairs?: (pairs: number[]) => void;
}) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const typed = parseWeight(text);
  const toggle = (w: number) =>
    onChange(
      chosen.includes(w) ? chosen.filter((x) => x !== w) : [...chosen, w].sort((a, b) => a - b),
    );
  const add = () => {
    if (typed === null || typed <= 0) return;
    if (!chosen.includes(typed)) onChange([...chosen, typed].sort((a, b) => a - b));
    setText("");
    setTyping(false);
  };
  // The usual weights, and any you typed that aren't among them.
  const shown = [...new Set([...WEIGHTS[load], ...chosen])].sort((a, b) => a - b);
  return (
    <View style={{ gap: 10, paddingLeft: bare ? 0 : 16 }}>
      {bare ? null : (
        <Text style={{ color: colors.faint, fontSize: 15 }}>
          {load === "kettlebell" ? "Which kettlebells?" : "Which pairs of dumbbells?"}
        </Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip label="Any weight" on={chosen.length === 0} onPress={() => onChange([])} />
        {shown.map((w) => (
          <Chip key={w} label={`${w} kg`} on={chosen.includes(w)} onPress={() => toggle(w)} />
        ))}
        {typing ? null : <Chip label="Another weight" on={false} onPress={() => setTyping(true)} />}
      </View>
      {typing ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            keyboardType="decimal-pad"
            placeholder="18"
            placeholderTextColor={colors.dim}
            accessibilityLabel={`Another ${load === "kettlebell" ? "kettlebell" : "dumbbell"} weight, in kg`}
            selectionColor={colors.text}
            style={{
              flex: 1,
              minHeight: 52,
              paddingHorizontal: 16,
              borderRadius: 16,
              backgroundColor: colors.surface,
              color: colors.text,
              fontSize: 20,
            }}
          />
          <Text style={{ color: colors.muted, fontSize: 17 }}>kg</Text>
          <Chip label="Add" on={typed !== null && typed > 0} onPress={add} />
        </View>
      ) : null}
      {/* "16 kg" alone can't say one bell or two, and a bell in each hand
          needs two: asked once there are bells to ask about. */}
      {pairs && onPairs && chosen.length > 0 ? (
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Text style={{ color: bare ? colors.text : colors.faint, fontSize: bare ? 18 : 15 }}>
            Do you have two of any of them?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chosen.map((w) => (
              <Chip
                key={w}
                label={`Two × ${w} kg`}
                on={pairs.includes(w)}
                onPress={() => onPairs(pairs.includes(w) ? pairs.filter((x) => x !== w) : [...pairs, w].sort((a, b) => a - b))}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** One answer: a full-width row, with a tick or a dot when it is the one. */
export function Option({
  label,
  icon,
  on,
  check,
  onPress,
}: {
  label: string;
  /** A small picture of the thing, before its name. */
  icon?: ReactNode;
  on: boolean;
  /** Several can be on at once: a tick rather than a dot. */
  check?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={check ? "checkbox" : "radio"}
      accessibilityState={check ? { checked: on } : { selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 60,
        paddingHorizontal: 18,
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: on ? colors.riseWash : colors.surface,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icon}
      <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: on ? "600" : "400" }}>
        {label}
      </Text>
      <View
        style={{
          width: 26,
          height: 26,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: check ? 8 : 999,
          borderWidth: on ? 0 : 2,
          borderColor: colors.line,
          backgroundColor: on ? colors.cloud : "transparent",
        }}
      >
        {on ? <Icon name="check" size={14} color={colors.ink} /> : null}
      </View>
    </Pressable>
  );
}


/**
 * The gear, drawn the way Klay's marks draw it in the films: flat ink shapes
 * with rounded ends. A dumbbell's two heads, a kettlebell's bell and handle, a
 * bar between two brackets, a bench's pad on its legs — and for nothing, the
 * figure itself.
 */
export function GearIcon({ gear }: { gear: Gear | "none" | "home" }) {
  const ink = colors.text;
  const shape = (() => {
    switch (gear) {
      case "dumbbells":
        return (
          <>
            <Rect x={9} y={14.5} width={14} height={3} rx={1.5} fill={ink} />
            <Rect x={4} y={9} width={6} height={14} rx={3} fill={ink} />
            <Rect x={22} y={9} width={6} height={14} rx={3} fill={ink} />
          </>
        );
      case "kettlebell":
        return (
          <>
            <Path
              d="M11 14 V10 a5 5 0 0 1 10 0 V14"
              stroke={ink}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx={16} cy={20} r={8} fill={ink} />
          </>
        );
      case "pullup_bar":
        return (
          <>
            <Rect x={3} y={10} width={26} height={3} rx={1.5} fill={ink} />
            <Rect x={4} y={7} width={4} height={9} rx={2} fill={ink} />
            <Rect x={24} y={7} width={4} height={9} rx={2} fill={ink} />
          </>
        );
      case "bench":
        return (
          <>
            <Rect x={3} y={11} width={26} height={5} rx={2.5} fill={ink} />
            <Rect x={7} y={16} width={3} height={9} rx={1.5} fill={ink} />
            <Rect x={22} y={16} width={3} height={9} rx={1.5} fill={ink} />
          </>
        );
      case "gym":
        return (
          <>
            <Rect x={2} y={14.5} width={28} height={3} rx={1.5} fill={ink} />
            <Rect x={6} y={7} width={4} height={18} rx={2} fill={ink} />
            <Rect x={10.5} y={9.5} width={3} height={13} rx={1.5} fill={ink} />
            <Rect x={22} y={7} width={4} height={18} rx={2} fill={ink} />
            <Rect x={18.5} y={9.5} width={3} height={13} rx={1.5} fill={ink} />
          </>
        );
      case "home":
        return (
          <>
            <Path
              d="M4 15 L16 5 L28 15 V27 H4 Z"
              fill={ink}
              stroke={ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <Rect x={13} y={18} width={6} height={9} rx={1} fill={colors.bg} />
          </>
        );
      case "none":
        return (
          <>
            <Circle cx={16} cy={7.5} r={4.5} fill={ink} />
            <Path
              d="M9 14 H23 L16 28 Z"
              fill={ink}
              stroke={ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </>
        );
      default:
        return null;
    }
  })();
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" {...DECORATIVE}>
      {shape}
    </Svg>
  );
}
