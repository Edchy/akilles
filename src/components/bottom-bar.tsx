import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column } from "@/components/screen";
import { BAR_TYPE, colors, TAB_BAR_HEIGHT } from "@/constants/theme";

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
  glyph,
  label,
  onPress,
  active,
  disabled,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  /** The current tab, in acid. */
  active?: boolean;
  disabled?: boolean;
}) {
  const tint = active ? colors.acid : disabled ? colors.faint : colors.muted;

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
        gap: 6,
        opacity: disabled ? 0.3 : pressed ? 0.55 : 1,
      })}
    >
      <View style={{ height: BAR_TYPE.icon, justifyContent: "center" }}>
        <Text style={{ color: tint, fontSize: BAR_TYPE.glyph }}>{glyph}</Text>
      </View>
      <Text
        style={{ color: tint, fontSize: BAR_TYPE.label, fontWeight: "800", letterSpacing: 0.3 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
