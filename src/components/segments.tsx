import { Pressable, View } from "react-native";
import { Text } from "@/components/text";

import { colors } from "@/constants/theme";

/**
 * Two or three views of one tab, as a pill switch — Plan's Workouts and
 * Exercises, History's Sessions and Lifts. Quiet on purpose: the chosen one
 * is a white pill lifted off the grey, not a colour — colour means family.
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
              minHeight: 42,
              borderRadius: 999,
              backgroundColor: active ? colors.bg : "transparent",
              boxShadow: active ? "0 1px 3px rgba(19, 50, 91, 0.12)" : undefined,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: active ? colors.text : colors.muted,
                fontSize: 15,
                fontWeight: active ? "600" : "400",
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
