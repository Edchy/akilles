import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_500Medium_Italic,
  EBGaramond_600SemiBold,
  EBGaramond_600SemiBold_Italic,
  EBGaramond_700Bold,
  useFonts,
} from "@expo-google-fonts/eb-garamond";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BarActionsProvider, useBarSlot } from "@/components/bar-actions";
import { BottomBar } from "@/components/bottom-bar";
import { IntroProvider } from "@/components/intro";
import { TabButtons } from "@/components/tab-bar";
import { colors } from "@/constants/theme";
import { SessionContext } from "@/store/session";
import { useSaved } from "@/store/use-saved";

function Shell() {
  // A screen can replace the bar's buttons with its own; the bar itself is
  // mounted once here, floating over the screens, and never animates — so
  // screens slide underneath it.
  const slot = useBarSlot();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      />
      <BottomBar>{slot ?? <TabButtons />}</BottomBar>
    </View>
  );
}

export default function RootLayout() {
  const { state, setState, ready } = useSaved();
  // The face ships inside the bundle, so this is as quick as the read below.
  // A font that fails to load falls back to the system face rather than
  // holding the app on a blank screen.
  const [fontsLoaded, fontError] = useFonts({
    EBGaramond_400Regular,
    EBGaramond_400Regular_Italic,
    EBGaramond_500Medium,
    EBGaramond_500Medium_Italic,
    EBGaramond_600SemiBold,
    EBGaramond_600SemiBold_Italic,
    EBGaramond_700Bold,
  });

  // Nothing renders until the saved training is read back, so no screen can
  // act on an empty state and write it over a year of history. The read is a
  // single small file, so this is a frame or two, not a visible spinner.
  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <SessionContext.Provider value={{ state, setState }}>
        <StatusBar style="dark" />
        {/* The intro, when it is wanted, covers everything — the bar too. */}
        <IntroProvider>
          <BarActionsProvider>
            <Shell />
          </BarActionsProvider>
        </IntroProvider>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}
