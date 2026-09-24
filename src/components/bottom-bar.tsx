import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Column } from "@/components/screen";
import { ACTION_TYPE, BAR_TYPE, colors, fonts, radii, TAB_BAR_HEIGHT } from "@/constants/theme";

/**
 * The bar chrome. Mounted once for the life of the app so it never animates
 * with the screens — only its buttons change as you navigate, which is what
 * stops the content above appearing to slide when a route changes.
 */
export function BottomBar({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom,
      }}
    >
      <Column style={{ flexDirection: "row" }}>{children}</Column>
    </View>
  );
}

/** The bar's labels: the display face, in capitals, like the names above. */
export const barLabel = {
  fontFamily: fonts.voice,
  fontSize: BAR_TYPE.label,
  letterSpacing: 1.2,
  textTransform: "uppercase",
} as const;

/** One of the three tabs. The current one sits in a pill of rising blue. */
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
  const tint = active ? colors.rise : colors.muted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: TAB_BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: pressed && !active ? 0.55 : 1,
      })}
    >
      {/* Always laid out, just clear when inactive, so switching tabs moves nothing. */}
      <View
        style={{
          width: BAR_TYPE.pillWidth,
          height: BAR_TYPE.pillHeight,
          borderRadius: radii.button,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? colors.riseWash : "transparent",
        }}
      >
        <Icon name={icon} size={BAR_TYPE.glyph} color={tint} weight="semibold" />
      </View>
      <Text style={[barLabel, { color: active ? colors.rise : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * A workout action: a disc with the glyph in it, label below. Back, Leave and
 * Skip all share this shape — Leave's disc is drawn by `HoldButton` to match.
 */
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
      style={{
        flex: 1,
        height: TAB_BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {({ pressed }) => (
        <>
          <View
            style={{
              width: ACTION_TYPE.circle,
              height: ACTION_TYPE.circle,
              borderRadius: radii.button,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? colors.line : colors.raised,
            }}
          >
            <Icon name={icon} size={ACTION_TYPE.glyph} color={colors.text} weight="semibold" />
          </View>
          <Text style={[barLabel, { color: colors.muted }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
