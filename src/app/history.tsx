import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLUMN } from "@/components/screen";
import { colors } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { ladderFor, type Scheme } from "@/data/split";
import { weightLabel } from "@/lib/warmup";
import { useSession } from "@/store/session";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

export default function HistoryScreen() {
  const { state } = useSession();
  const insets = useSafeAreaInsets();

  // One row per exercise+scheme we've actually trained.
  const rows = Object.entries(state.history)
    .filter(([, st]) => st.lastPerformed || st.skippedLast)
    .map(([k, st]) => {
      const [, scheme] = k.split(":");
      return { key: k, scheme, state: st, exercise: byId(st.exerciseId)! };
    })
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 28,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: 28,
        gap: 22,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: serif,
          fontSize: 40,
          fontWeight: "700",
          letterSpacing: -1.5,
        }}
      >
        History
      </Text>

      {rows.length === 0 ? (
        <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 22 }}>
          Nothing logged yet. Finish an exercise and its weights show up here.
        </Text>
      ) : (
        <View style={{ gap: 2 }}>
          {rows.map(({ key, scheme, state: st, exercise }, i) => {
            const last = st.lastPerformed;
            const ladder = ladderFor(scheme as Scheme);
            const target = ladder[Math.min(st.rung, ladder.length - 1)];
            return (
              <View
                key={key}
                style={{
                  gap: 5,
                  borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  paddingVertical: 15,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text
                    style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}
                  >
                    {exercise.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.faint,
                      fontSize: 11,
                      fontWeight: "800",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    {scheme}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text
                    style={{
                      color: colors.acid,
                      fontSize: 15,
                      fontWeight: "800",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {weightLabel(exercise, st.weight)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    next {target} reps
                  </Text>
                  <Text
                    style={{
                      marginLeft: "auto",
                      color: st.skippedLast ? colors.coral : colors.faint,
                      fontSize: 13,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {st.skippedLast
                      ? "skipped"
                      : `last ${last!.reps.join(" ")}${
                          last!.feedback === "up"
                            ? "  👍"
                            : last!.feedback === "down"
                              ? "  👎"
                              : ""
                        }`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
