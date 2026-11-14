import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Backup } from "@/components/backup";
import { useBarSpace } from "@/components/bottom-bar";
import { Icon } from "@/components/icon";
import { useOpenIntro } from "@/components/intro";
import { kitSummary, PlaceSheet, usualName } from "@/components/place";
import { COLUMN } from "@/components/screen";
import { OpenRow, SectionLabel, Sheet } from "@/components/sheet";
import { TestMode } from "@/components/test-mode";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { kitAt, placeOf, useSession } from "@/store/session";

/**
 * Everything you set once and rarely touch, in one place, so the screens you
 * train from stay clear: where you are training, how Milo works, and your
 * data. Reached from the gear on Plan.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const router = useRouter();
  const { state } = useSession();
  const openIntro = useOpenIntro();
  const [sheet, setSheet] = useState<"place" | "backup" | "test" | null>(null);

  const away = placeOf(state) === "away";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: barSpace + 28,
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          marginLeft: -10,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Icon name="back" size={20} color={colors.text} />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontFamily: fonts.display, fontSize: 48, marginBottom: 10 }}
      >
        Settings
      </Text>

      <SectionLabel>Where you are training</SectionLabel>
      <OpenRow
        title={away ? "Somewhere else" : usualName(state.kits?.usual)}
        detail={
          away
            ? kitSummary(kitAt(state, "away"))
            : "Away for a while? Tell Milo what you have there."
        }
        onPress={() => setSheet("place")}
      />

      <View style={{ height: 14 }} />
      <SectionLabel>Help</SectionLabel>
      <OpenRow title="How Milo works" detail="Three short pages" onPress={openIntro} />

      <View style={{ height: 14 }} />
      <SectionLabel>Your training</SectionLabel>
      <OpenRow
        title="Backup & restore"
        detail="Save everything to a file, or put it back"
        onPress={() => setSheet("backup")}
      />
      <OpenRow
        title="Test mode"
        detail="Try things out without touching your training"
        onPress={() => setSheet("test")}
      />

      {sheet === "place" ? <PlaceSheet onClose={() => setSheet(null)} /> : null}
      <Sheet
        visible={sheet === "backup"}
        title="Backup"
        closeLabel="Done"
        onClose={() => setSheet(null)}
      >
        <Backup />
      </Sheet>
      <Sheet
        visible={sheet === "test"}
        title="Test mode"
        closeLabel="Done"
        onClose={() => setSheet(null)}
      >
        <TestMode onDone={() => setSheet(null)} />
      </Sheet>
    </ScrollView>
  );
}
