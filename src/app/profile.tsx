import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarSpace } from "@/components/bottom-bar";
import { GoalProgress } from "@/components/goal-progress";
import { Results } from "@/components/results";
import { COLUMN } from "@/components/screen";
import { OpenRow } from "@/components/sheet";
import { Text } from "@/components/text";
import { TrainingWeek } from "@/components/training-week";
import { colors, fonts } from "@/constants/theme";
import { GOALS_ON } from "@/data/goals";
import { useSession } from "@/store/session";

/**
 * You: your week, what the work has bought you, and one tap to every session
 * and every lift. Settings at the foot. Shown once each, nothing twice.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const { state } = useSession();
  const latest = state.log.at(-1);
  const when = latest
    ? new Date(latest.startedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: 22, paddingBottom: barSpace + 28, width: "100%", maxWidth: COLUMN, alignSelf: "center", gap: 32 }}>
      <TrainingWeek state={state} />
      {GOALS_ON ? <GoalProgress /> : null}
      <View style={{ gap: 16 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 34 }}>Your results</Text>
        <Results state={state} />
      </View>
      <View style={{ gap: 12 }}>
        <OpenRow
          large
          title="Sessions"
          detail={latest ? `Last: ${latest.name}, ${when}` : "Your finished workouts will appear here"}
          onPress={() => router.push({ pathname: "/history", params: { view: "sessions" } })}
        />
        <OpenRow
          large
          title="Lifts"
          detail="Every lift, its weight now and how it got there"
          onPress={() => router.push({ pathname: "/history", params: { view: "lifts" } })}
        />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 24 }}>
        <OpenRow large title="Settings" detail="Your plans, help and backups" onPress={() => router.push("/settings")} />
      </View>
    </ScrollView>
  );
}
