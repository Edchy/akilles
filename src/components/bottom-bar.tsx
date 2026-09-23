import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Column } from "@/components/screen";
import { ACTION_TYPE, BAR_TYPE, colors, TAB_BAR_HEIGHT } from "@/constants/theme";

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

export function BarButton({
  icon,
  label,
  onPress,
  active,
  disabled,
  action,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** A workout-bar action rather than a tab: drawn at the larger size. */
  action?: boolean;
  /** The current tab, in rising blue. */
  active?: boolean;
  disabled?: boolean;
}) {
  const tint = active ? colors.rise : disabled ? colors.faint : colors.muted;
  const size = action ? ACTION_TYPE : BAR_TYPE;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: TAB_BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        opacity: disabled ? 0.3 : pressed ? 0.55 : 1,
      })}
    >
      {/* A drop of rising blue over the current tab. Always laid out, just
          clear when inactive, so switching tabs moves nothing. */}
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          marginBottom: 2,
          backgroundColor: active ? colors.rise : "transparent",
        }}
      />
      <View style={{ height: size.icon, justifyContent: "center" }}>
        <Icon name={icon} size={size.glyph} color={tint} weight={action ? "regular" : "medium"} />
      </View>
      <Text
        style={{ color: tint, fontSize: BAR_TYPE.label, fontWeight: "800", letterSpacing: 0.3 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
