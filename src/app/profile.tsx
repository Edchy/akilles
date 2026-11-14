import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBarSpace } from "@/components/bottom-bar";
import { COLUMN } from "@/components/screen";
import { OpenRow } from "@/components/sheet";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: 22, paddingBottom: barSpace + 28, width: "100%", maxWidth: COLUMN, alignSelf: "center", gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 48, marginBottom: 12 }}>Profile</Text>
      <OpenRow title="Progress & history" detail="Your results, sessions and exercises" onPress={() => router.push("/history")} />
      <OpenRow title="Settings" detail="Training location, help and backups" onPress={() => router.push("/settings")} />
    </ScrollView>
  );
}
