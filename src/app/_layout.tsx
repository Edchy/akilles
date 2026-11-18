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
import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_400Regular_Italic,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible-next";
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

import { BarActionsProvider, useBarHidden, useBarSlot } from "@/components/bar-actions";
import { BottomBar } from "@/components/bottom-bar";
import { IntroProvider } from "@/components/intro";
import { TabButtons } from "@/components/tab-bar";
import { TestStrip } from "@/components/test-mode";
import { Button } from "@/components/buttons";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { FROM_MAC } from "@/store/storage";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { SessionContext } from "@/store/session";
import { TestModeContext, useTestMode, type TestModeValue } from "@/store/test-mode";
import { useSaved } from "@/store/use-saved";

function Shell() {
  // A screen can replace the bar's buttons with its own; the bar itself is
  // mounted once here, floating over the screens, and never animates — so
  // screens slide underneath it.
  const reduce = useReduceMotion();
  const slot = useBarSlot();
  const hidden = useBarHidden();
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
              animation: reduce ? "fade" : "default",
              gestureEnabled: !reduce,
            }}
          >
            {/* Main screens are tabs; sideways gestures must stay inside their content.
                The workout editor and New workout are iOS card sheets: pull
                one down to put it away, as in Apple's own apps. The system
                only lets go once the pull is deliberate, and never while a
                list inside is scrolled away from its top. Edits save as they
                happen, so there is nothing to lose. */}
            <Stack.Screen name="index" options={{ gestureEnabled: false, animation: "none" }} />
            <Stack.Screen name="plan" options={{ gestureEnabled: false, animation: "none" }} />
            {/* Presented as the editor is, which it is replaced by: iOS won't
                reliably swap a sheet for a full-screen page. */}
            <Stack.Screen name="new-workout" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
            {/* A full page, not a sheet: a sheet's swipe-down takes any drag that
                moves up or down, and holding an exercise to move it is one. Done
                closes it, and whatever you changed is kept. */}
            <Stack.Screen name="plan-editor" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
            <Stack.Screen name="profile" options={{ gestureEnabled: false, animation: "none" }} />
            {/* A swipe in a workout moves between its cards; from the edge of
                the screen it must not also mean "go back". */}
            <Stack.Screen name="workout" options={{ gestureEnabled: false }} />
          </Stack>
          {hidden ? null : <BottomBar>{slot ?? <TabButtons />}</BottomBar>}
        </View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

export default function RootLayout() {
  const { state, setState, ready, locked, profile, switchTo } = useSaved();
  const testMode = useMemo<TestModeValue>(
    () => ({
      on: profile === "test",
      start: (from) => switchTo("test", from),
      leave: () => switchTo("real"),
      fixed: FROM_MAC,
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
    AtkinsonHyperlegibleNext_400Regular,
    AtkinsonHyperlegibleNext_400Regular_Italic,
    AtkinsonHyperlegibleNext_500Medium,
    AtkinsonHyperlegibleNext_600SemiBold,
    AtkinsonHyperlegibleNext_700Bold,
  });

  // Nothing renders until the saved training is read back, so no screen can
  // act on an empty state and write it over a year of history. The read is a
  // single small file, so this is a frame or two, not a visible spinner.
  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  // A save from a newer version is never written to, and nothing is shown
  // that could be — only what happened and the way on.
  if (locked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Newer testing={profile === "test" && !FROM_MAC} onLeave={() => switchTo("real")} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <TestModeContext.Provider value={testMode}>
        <SessionContext.Provider value={{ state, setState }}>
          <StatusBar style="dark" />
          {/* The intro, when it is wanted, covers everything — the bar too. */}
          <IntroProvider>
            <BarActionsProvider>
              <Shell />
            </BarActionsProvider>
          </IntroProvider>
        </SessionContext.Provider>
      </TestModeContext.Provider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * This version is older than the save on the phone. Said plainly, with what
 * to do, and the reassurance first: nothing has been touched.
 */
function Newer({ testing, onLeave }: { testing: boolean; onLeave: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 32, gap: 18 }}>
      <Text style={{ color: colors.text, fontSize: 30, lineHeight: 36, fontFamily: fonts.medium }}>
        {testing ? "This test is from a newer version." : "Your training is safe."}
      </Text>
      <Text style={{ color: colors.text, fontSize: 19, lineHeight: 26 }}>
        {testing
          ? "This version of Klay is older than the test it found, so it leaves the test alone."
          : "It was saved by a newer version of Klay than this one. Nothing has been changed."}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 24 }}>
        To get the newest version, close Klay completely and open it again.
      </Text>
      {testing ? <Button label="Back to my training" kind="primary" onPress={onLeave} /> : null}
    </View>
  );
}
