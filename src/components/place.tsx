import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { Icon } from "@/components/icon";
import { BigButton, SectionLabel, Sheet } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { parseWeight } from "@/components/weight-field";
import { colors, radii } from "@/constants/theme";
import type { Gear, Kit, Load } from "@/data/kit";
import { kitAt, placeOf, setPlace, useSession, type Place } from "@/store/session";

/**
 * Where you are training, as one quiet line on Today, and the sheet behind
 * it. Most days it just says "At the gym". Away for a week, you set it once:
 * somewhere else, and what is there — and it stays until you change it.
 *
 * Nothing else moves. The plan and the loop are the same; Milo fills each
 * slot with what the place has.
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

/** The usual place, as it reads: a gym unless you train at home. */
export const usualName = (kit: Kit | undefined): string =>
  !kit || kit.gear.includes("machine") ? "At the gym" : "At home";

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
      case "kettlebell":
        return [
          weights?.length === 1
            ? `a ${weights[0]} kg kettlebell`
            : weights?.length
              ? `${kg(weights)} kettlebells`
              : "kettlebells",
        ];
      case "pullup_bar":
        return ["a pull-up bar"];
      case "bench":
        return ["a bench"];
      default:
        return [];
    }
  });
  return parts.length ? listed(parts) : "bodyweight only";
};

/** The line on Today: where you are, and the way to change it. */
export function PlaceLine() {
  const { state } = useSession();
  const [open, setOpen] = useState(false);
  const away = placeOf(state) === "away";
  const where = away ? "Somewhere else" : usualName(state.kits?.usual);
  const detail = away ? kitSummary(kitAt(state, "away")) : null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${where}${detail ? `, ${detail}` : ""}. Change where you are training`}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          minHeight: 44,
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: away ? colors.rise : colors.muted,
            fontSize: 17,
            fontWeight: away ? "600" : "400",
          }}
        >
          {where}
          {detail ? <Text style={{ fontWeight: "400" }}> · {detail}</Text> : null}
        </Text>
        <Text style={{ color: colors.rise, fontSize: 17, fontWeight: "600" }}>Change</Text>
      </Pressable>
      {open ? <PlaceSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Pick the place, and for somewhere else, what is there. */
export function PlaceSheet({ onClose }: { onClose: () => void }) {
  const { state, setState } = useSession();
  const [place, setPlaceDraft] = useState<Place>(placeOf(state));
  const [kit, setKit] = useState<Kit>(kitAt(state, "away"));

  const done = () => {
    setState((s) => setPlace(s, place, place === "away" ? kit : undefined));
    onClose();
  };

  return (
    <Sheet visible title="Where are you training?" onClose={onClose}>
      <View style={{ paddingTop: 12, gap: 12 }}>
        <Option
          label={usualName(state.kits?.usual)}
          on={place === "usual"}
          onPress={() => setPlaceDraft("usual")}
        />
        <Option
          label="Somewhere else"
          on={place === "away"}
          onPress={() => setPlaceDraft("away")}
        />
      </View>

      {place === "away" ? (
        <View style={{ paddingTop: 32, gap: 12 }}>
          <SectionLabel>What do you have there?</SectionLabel>
          <KitPicker kit={kit} onChange={setKit} />
        </View>
      ) : null}

      <View style={{ paddingTop: 32 }}>
        <BigButton label="Done" onPress={done} />
      </View>
    </Sheet>
  );
}

/**
 * Tick what a place has. Dumbbells and kettlebells open a row of weights:
 * "Any weight" until you tick the ones that are there. Shared with
 * onboarding, which asks the same question about home.
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
    onChange({ ...kit, weights: { ...kit.weights, [load]: list } });

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
            />
          ) : null}
        </View>
      ))}
      <Option
        label="Nothing, just me"
        icon={<GearIcon gear="none" />}
        on={kit.gear.length === 0}
        onPress={() => onChange({ gear: [] })}
      />
    </View>
  );
}

/** "Any weight", or just the ones that are there. */
function WeightChips({
  load,
  chosen,
  onChange,
}: {
  load: Load;
  chosen: number[];
  onChange: (list: number[]) => void;
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
    <View style={{ gap: 10, paddingLeft: 16 }}>
      <Text style={{ color: colors.faint, fontSize: 15 }}>
        {load === "kettlebell" ? "Which kettlebells?" : "Which dumbbells?"}
      </Text>
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

/** A weight to tick. */
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: 64,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: on ? colors.cloud : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: on ? colors.ink : colors.text,
          fontSize: 16,
          fontWeight: on ? "600" : "400",
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * The gear, drawn the way Milo's marks draw it in the films: flat ink shapes
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
    <Svg width={32} height={32} viewBox="0 0 32 32" accessibilityElementsHidden>
      {shape}
    </Svg>
  );
}
