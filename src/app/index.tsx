import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backup } from "@/components/backup";
import { COLUMN } from "@/components/screen";
import { BigButton, Sheet } from "@/components/sheet";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { startCoreWorkout } from "@/store/core";
import { cardName, currentWorkout, skipWorkout, upNext, useSession } from "@/store/session";

export default function TodayScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const [backup, setBackup] = useState(false);
  const workout = state.active ? currentWorkout(state) : upNext(state);
  const preview = state.active ? state : startCoreWorkout(state);
  const items = preview.active?.items ?? [];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 20, paddingHorizontal: 24, width: "100%", maxWidth: COLUMN, alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 26 }}>Milo</Text>
        <Pressable accessibilityRole="button" onPress={() => setBackup(true)} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 16 }}>Saved training</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, justifyContent: "center", paddingVertical: 48, gap: 24 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 48, lineHeight: 54 }}>{state.active ? "Pick up where you left off." : "Your next workout."}</Text>
        <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 30 }}>{workout.name}</Text>
        <View style={{ gap: 14 }}>
          {items.map((item, i) => <Text key={`${item.slot}-${i}`} style={{ color: colors.text, fontSize: 21 }}>{cardName(preview, i)}</Text>)}
        </View>
        {items.length === 0 ? <Text style={{ color: colors.muted, fontSize: 19 }}>This workout has no strength exercises.</Text> : null}
      </View>
      <BigButton label={state.active ? "Continue workout" : items.length ? "Start workout" : "Try the next workout"} disabled={!state.active && !items.length && state.workouts.length < 2} onPress={() => { if (!state.active && !items.length) setState(skipWorkout); else { setState(startCoreWorkout); router.push("/workout"); } }} />
      <Sheet visible={backup} title="Saved training" closeLabel="Done" onClose={() => setBackup(false)}>
        <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27, marginVertical: 16 }}>Your training is saved on this phone. Save a copy or restore a backup here.</Text>
        <Backup />
      </Sheet>
    </ScrollView>
  );
}
