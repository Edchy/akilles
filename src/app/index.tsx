import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { colors, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { LADDERS, setsFor, workoutAt } from "@/data/split";
import { buildWorkout, chosen, useSession } from "@/store/session";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

export default function TodayScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const workout = workoutAt(state.cycleIndex);

  const start = () => {
    setState((s) => buildWorkout(s));
    router.push("/workout");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 28,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingBottom: 28,
          gap: 26,
        }}
      >
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: colors.acid,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            Next up
          </Text>
          <Text
            style={{
              color: colors.text,
              fontFamily: serif,
              fontSize: 44,
              lineHeight: 47,
              fontWeight: "700",
              letterSpacing: -1.6,
            }}
          >
            {workout.name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>
            {workout.subtitle}
          </Text>
        </View>

        <View style={{ gap: 2 }}>
          {workout.exercises.map((entry, i) => {
            const ex = byId(chosen(state, workout.id, entry))!;
            return (
              <View
                key={`${entry.slot}-${i}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderBottomWidth: i === workout.exercises.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  paddingVertical: 15,
                }}
              >
                <Text
                  style={{
                    width: 16,
                    color: colors.faint,
                    fontSize: 13,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {i + 1}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {ex.name}
                </Text>
                {/* Marks work you can fold into an earlier exercise's rest. */}
                {entry.floater ? (
                  <Text
                    accessibilityLabel="Can be supersetted"
                    style={{
                      color: colors.line,
                      fontSize: 9,
                      fontWeight: "800",
                      letterSpacing: 0.5,
                    }}
                  >
                    S
                  </Text>
                ) : null}

                <Text
                  style={{
                    color: colors.faint,
                    fontSize: 14,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {setsFor(entry)} × {LADDERS[entry.scheme][0]}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
        <Column style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={({ pressed }) => ({
            minHeight: 60,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.button,
            borderCurve: "continuous",
            backgroundColor: colors.acid,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
            Start
          </Text>
        </Pressable>
        <Text
          style={{
            textAlign: "center",
            color: colors.faint,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          Stop whenever you want. The next session picks up where the cycle left off.
        </Text>
        </Column>
      </View>
    </View>
  );
}
