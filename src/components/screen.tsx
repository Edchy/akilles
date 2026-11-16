import type { PropsWithChildren } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

/**
 * Content column. Full-bleed on a phone; on a wider screen it stops growing
 * and centres, so controls like the weight steppers stay near what they
 * control instead of being flung to the window edges.
 */
export const COLUMN = 460;

export function Column({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <View style={[{ width: "100%", maxWidth: COLUMN, alignSelf: "center" }, style]}>
      {children}
    </View>
  );
}

/** Full-screen editor routes measure safe areas in their own native presentation. */
export function SafeScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
