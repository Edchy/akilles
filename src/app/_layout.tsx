import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BarActionsProvider, useBarSlot } from "@/components/bar-actions";
import { BottomBar } from "@/components/bottom-bar";
import { TabButtons } from "@/components/tab-bar";
import { colors } from "@/constants/theme";
import { SessionContext, initialState, type SessionState } from "@/store/session";

function Shell() {
  // A screen can replace the bar's buttons with its own; the bar itself is
  // mounted once here and never animates, so screens slide underneath it.
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
  const [state, setState] = useState<SessionState>(initialState);

  return (
    <SafeAreaProvider>
      <SessionContext.Provider value={{ state, setState }}>
        <StatusBar style="light" />
        <BarActionsProvider>
          <Shell />
        </BarActionsProvider>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}
