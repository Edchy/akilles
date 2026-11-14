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
import { useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { TestStrip } from "@/components/test-mode";
import { colors } from "@/constants/theme";
import { SessionContext } from "@/store/session";
import { TestModeContext, useTestMode, type TestModeValue } from "@/store/test-mode";
import { useSaved } from "@/store/use-saved";

function Shell() {
  // In test mode the strip takes the top of the screen, status bar and all,
  // so the screens below are told there is nothing left to keep clear up
  // there. Always wrapped, so turning it on never remounts the screens.
  const { on } = useTestMode();
  const insets = useSafeAreaInsets();
  const below = useMemo(() => (on ? { ...insets, top: 0 } : insets), [on, insets]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TestStrip />
      <SafeAreaInsetsContext.Provider value={below}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "slide_from_right",
            }}
          >
            {/* Leaving is explicit, so a system gesture cannot hide the session. */}
            <Stack.Screen name="workout" options={{ gestureEnabled: false }} />
          </Stack>
        </View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

export default function RootLayout() {
  const { state, setState, ready, profile, switchTo } = useSaved();
  const testMode = useMemo<TestModeValue>(
    () => ({
      on: profile === "test",
      start: (from) => switchTo("test", from),
      leave: () => switchTo("real"),
    }),
    [profile, switchTo],
  );
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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <TestModeContext.Provider value={testMode}>
        <SessionContext.Provider value={{ state, setState }}>
          <StatusBar style="dark" />
          <Shell />
        </SessionContext.Provider>
      </TestModeContext.Provider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
