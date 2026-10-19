import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { COLUMN } from "@/components/screen";
import { BAR, colors, fonts, radii } from "@/constants/theme";

/** Checked once: the phone either draws Liquid Glass or it doesn't. */
const GLASS = isLiquidGlassAvailable();

/** How far the capsule floats above the bottom edge of the screen. */
function useBarBottom() {
  const insets = useSafeAreaInsets();
  // Tucked into the home-indicator area, as the system tab bar is; phones
  // without one get a margin instead.
  return Math.max(insets.bottom - 8, BAR.margin);
}

/**
 * The room a screen leaves at its foot so its last line or its buttons sit
 * clear of the floating bar. Scrolling content still passes under the glass.
 */
export function useBarSpace() {
  return useBarBottom() + BAR.height + 8;
}

/**
 * The bar chrome: a capsule of Liquid Glass floating over the screen. Mounted
 * once for the life of the app so it never animates with the screens — only
 * its buttons change as you navigate. Where the phone can't draw glass (older
 * iOS, the web preview) it is a solid capsule of the same shape.
 */
export function BottomBar({ children }: PropsWithChildren) {
  const bottom = useBarBottom();

  const capsule: ViewStyle = {
    width: "100%",
    maxWidth: COLUMN,
    height: BAR.height,
    borderRadius: radii.button,
    padding: BAR.padding,
    flexDirection: "row",
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: BAR.margin,
        right: BAR.margin,
        bottom,
        alignItems: "center",
      }}
    >
      {GLASS ? (
        <GlassView glassEffectStyle="regular" colorScheme="light" style={capsule}>
          {children}
        </GlassView>
      ) : (
        <View
          style={[
            capsule,
            { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

/** The bar's labels: the display face, in capitals, like the names above. */
export const barLabel = {
  fontFamily: fonts.voice,
  fontSize: BAR.label,
  letterSpacing: 1.2,
  textTransform: "uppercase",
} as const;

/**
 * One slot of the capsule: a glyph over its label, inside a rounded lozenge
 * that lights up for the current tab or under a pressing thumb. Every button
 * in the bar — tab or workout action — is one of these, so the bar keeps one
 * shape whatever it carries.
 */
export function Slot({
  icon,
  label,
  tint,
  fill,
  children,
}: {
  icon: IconName;
  label: string;
  tint: string;
  fill?: string;
  /** Drawn behind the glyph, inside the lozenge. */
  children?: ReactNode;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.button,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        overflow: "hidden",
        backgroundColor: fill ?? "transparent",
      }}
    >
      {children}
      <Icon name={icon} size={BAR.glyph} color={tint} weight="semibold" />
      <Text style={[barLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}

/** Pressed feedback for a slot: a wash of the red. */
export const PRESSED = colors.riseWash;

/** One of the three tabs. The current one sits in a lozenge of rising blue. */
export function TabButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <Slot
          icon={icon}
          label={label}
          tint={active ? colors.rise : colors.muted}
          fill={active ? colors.riseWash : pressed ? PRESSED : undefined}
        />
      )}
    </Pressable>
  );
}

/** A workout action — Back, Leave or Skip. */
export function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ flex: 1, opacity: disabled ? 0.3 : 1 }}
    >
      {({ pressed }) => (
        <Slot icon={icon} label={label} tint={colors.text} fill={pressed ? PRESSED : undefined} />
      )}
    </Pressable>
  );
}
