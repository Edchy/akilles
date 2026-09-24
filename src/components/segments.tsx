import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";

/**
 * Two or three views of one tab, as a pill switch — Plan's Workouts and
 * Exercises, History's Sessions and Lifts.
 */
export function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        borderRadius: 999,
        backgroundColor: colors.surface,
        padding: 4,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              borderRadius: 999,
              backgroundColor: active ? colors.cloud : "transparent",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                color: active ? colors.ink : colors.muted,
                fontSize: 14,
                fontWeight: "800",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
