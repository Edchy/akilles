import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { Text } from "@/components/text";
import { duration, PRESS_SCALE, spring } from "@/constants/motion";
import { colors, PAPER, radii } from "@/constants/theme";

/**
 * A watercolour blot for the main button, drawn on a 100 × 100 box that
 * stretches to the button: lumpy, never a rounded rectangle, a little
 * different for each label so two buttons are never stamped from one mould.
 */
function blotPath(seed: number): string {
  const n = 14;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.06 * Math.sin(3 * a + seed) + 0.04 * Math.cos(5 * a + seed * 1.7);
    return [50 + Math.cos(a) * 52 * r, 50 + Math.sin(a) * 58 * r];
  });
  let d = `M${((pts[0][0] + pts[1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[1][1]) / 2).toFixed(1)}`;
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return `${d}Z`;
}
const seedOf = (label: string) => [...label].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 50;

/**
 * Every button in the app, by what it does — so the same kind of action
 * always looks the same, wherever it is.
 *
 * Button, for doing something:
 * - primary — the one main thing on a screen. One per screen. On paper, an
 *   ink outline over a watercolour blot in the day's colour.
 * - secondary — another thing you might do: the quiet grey slab (Skip).
 * - remove — taking something away: a red outline. Where it can't be
 *   undone in a tap, it asks first, and the second tap is a danger button.
 * - danger — the second tap, that does it: filled red.
 *
 * LinkButton, for small text actions in a list or under a button:
 * - add — "+ Add exercise", "New routine": blue, with a plus.
 * - back — "‹ All areas": blue, with a caret.
 * - link — "Rename", "Undo": blue.
 * - quiet — "Keep it", "Cancel": grey, centred, the way out.
 *
 * Chip, for choosing among a few: a filter, an answer, an amount.
 *
 * All in the interface face (see `Text ui`), sentence case, no capitals.
 */

export type ButtonKind = "primary" | "secondary" | "remove" | "danger";

const LOOK: Record<ButtonKind, { bg: string; border: string; text: string }> = {
  primary: { bg: colors.text, border: colors.text, text: colors.white },
  secondary: { bg: colors.surface, border: colors.surface, text: colors.text },
  remove: { bg: colors.bg, border: colors.danger, text: colors.danger },
  danger: { bg: colors.danger, border: colors.danger, text: colors.white },
};

export function Button({
  label,
  kind = "secondary",
  icon,
  fill,
  onFill = colors.white,
  disabled,
  on,
  flex,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  kind?: ButtonKind;
  icon?: IconName;
  /** A primary in a family's colour — Start on Next up — instead of navy. */
  fill?: string;
  /** The words' colour on that fill. */
  onFill?: string;
  disabled?: boolean;
  /** Open, for a button that shows something below it (Swap, Remove): drawn filled. */
  on?: boolean;
  /** Share a row with another button: Start takes twice the room of Skip. */
  flex?: number;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const reduce = useReduceMotion();
  // On paper the main button is an ink outline over a watercolour blot in
  // the day's colour. A press spreads the blot a little and deepens it, under
  // the thumb, and lets it settle back.
  const inked = PAPER && kind === "primary" && !on && !disabled;
  const scale = useSharedValue(1);
  const spread = useSharedValue(0);
  const feedback = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const blot = useAnimatedStyle(() => ({
    opacity: 0.34 + 0.2 * spread.value,
    transform: [{ scale: 1 + 0.1 * spread.value }, { rotate: `${-3 * spread.value}deg` }],
  }));
  const press = () => {
    if (reduce) return;
    scale.value = withTiming(PRESS_SCALE + (inked ? 0.01 : 0), { duration: duration.press });
    if (inked) spread.value = withTiming(1, { duration: 180 });
  };
  const release = () => {
    scale.value = withSpring(1, spring.bouncy);
    spread.value = withSpring(0, spring.gentle);
  };
  const look = on ? LOOK[kind === "remove" ? "danger" : "primary"] : LOOK[kind];
  const bg = inked ? "transparent" : kind === "primary" && fill ? fill : look.bg;
  const text = inked ? colors.text : kind === "primary" && fill ? onFill : look.text;
  return (
    <Animated.View style={[{ flex }, feedback]}>
    {inked ? (
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -5, bottom: -5, left: -8, right: -8 }, blot]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Path d={blotPath(seedOf(label))} fill={fill ?? colors.wash} />
        </Svg>
      </Animated.View>
    ) : null}
    <Animated.View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, expanded: on }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press}
      onPressOut={release}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 60,
        paddingHorizontal: 18,
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: inked ? colors.text : kind === "primary" && fill ? fill : look.border,
        opacity: disabled ? 0.35 : pressed && !inked ? 0.75 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={18} color={text} /> : null}
      <Text ui style={{ color: text, fontSize: 17, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
    </Animated.View>
    </Animated.View>
  );
}

export type LinkKind = "add" | "back" | "link" | "quiet";

export function LinkButton({
  label,
  kind = "link",
  disabled,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  kind?: LinkKind;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const quiet = kind === "quiet";
  const tint = quiet ? colors.muted : colors.rise;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        alignSelf: quiet ? "center" : "flex-start",
        gap: 8,
        minHeight: 48,
        paddingHorizontal: quiet ? 20 : 0,
        opacity: disabled ? 0.35 : pressed ? 0.55 : 1,
      })}
    >
      {kind === "add" ? <Icon name="plus" size={15} color={tint} /> : null}
      {kind === "back" ? <Icon name="previous" size={15} color={tint} /> : null}
      <Text ui style={{ color: tint, fontSize: quiet ? 16 : 17, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
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
        paddingHorizontal: 16,
        borderRadius: radii.button,
        backgroundColor: on ? colors.text : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text ui style={{ color: on ? colors.white : colors.text, fontSize: 16, fontWeight: on ? "600" : "400" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Chips in a row that wraps. */
export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
