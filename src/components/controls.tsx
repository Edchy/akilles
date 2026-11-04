import { Pressable, View } from "react-native";
import { Text } from "@/components/text";

import { Icon, type IconName } from "@/components/icon";
import { colors } from "@/constants/theme";

/*
 * The small controls a settings panel is built from: a labelled row, a pair
 * of round − and + buttons, and the number between them. Shared by a
 * workout's slots and blocks and by the routine editor, so they all look and
 * behave the same.
 */

/** The number between a pair of steppers — or a distance, "1.5 km". */
export function Count({ value }: { value: number | string }) {
  return (
    <Text
      style={{
        minWidth: 36,
        textAlign: "center",
        color: colors.text,
        fontSize: 22,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
      }}
    >
      {value}
    </Text>
  );
}

/** A labelled row of controls in a grouped panel, divided from the next. */
export function Setting({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 68,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>{children}</View>
    </View>
  );
}

/** A round − or + beside a number. */
export function Step({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        // Sits on a surface panel, so one step lighter.
        backgroundColor: colors.raised,
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={18} color={colors.text} weight="semibold" />
    </Pressable>
  );
}
