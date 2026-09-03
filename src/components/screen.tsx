import type { PropsWithChildren } from "react";
import { View, type ViewStyle } from "react-native";

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
