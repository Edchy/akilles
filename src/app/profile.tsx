import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarSpace } from "@/components/bottom-bar";
import { COLUMN } from "@/components/screen";
import { OpenRow } from "@/components/sheet";
import { Text } from "@/components/text";
import { TrainingWeek } from "@/components/training-week";
import { colors, fonts } from "@/constants/theme";
import { useSession } from "@/store/session";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const { state } = useSession();
  const latest = state.log.at(-1);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: 22, paddingBottom: barSpace + 28, width: "100%", maxWidth: COLUMN, alignSelf: "center", gap: 32 }}>
      <TrainingWeek state={state} />
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 26 }}>Last workout</Text>
        {latest ? (
          <OpenRow
            large
            title={latest.name}
            detail={new Date(latest.startedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            onPress={() => router.push({ pathname: "/history", params: { view: "sessions" } })}
          />
        ) : (
          <Text style={{ color: colors.muted, fontSize: 19, lineHeight: 26 }}>Your finished workouts will appear here.</Text>
        )}
      </View>
      <OpenRow large title="Progress & history" detail="Your results, sessions and exercises" onPress={() => router.push("/history")} />
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 24 }}>
        <OpenRow large title="Settings" detail="Training location, help and backups" onPress={() => router.push("/settings")} />
      </View>
    </ScrollView>
  );
}
