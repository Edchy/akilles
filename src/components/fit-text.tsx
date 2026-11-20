import { useState } from "react";
import { StyleSheet, View, type TextProps, type TextStyle } from "react-native";

import { drawnScale, Text } from "@/components/text";

/**
 * One line of text that comes down in size to fit its room, the same on
 * every platform — React Native's own `adjustsFontSizeToFit` does nothing on
 * the web and, on iOS, can shrink a line far past its floor.
 *
 * Two measurements, neither depending on the size being chosen, so nothing
 * feeds back: an unseen copy gives the text's natural width and height at
 * full size, and the room is this box's own width — it asks for the natural
 * width and is held to what its parent allows. The size is room ÷ natural,
 * never below `least` (past that a very long line ends in "…").
 *
 * Its line is never shorter than the face's own ascent plus descent, so
 * tails like g and p are never cut off, and it shrinks with the text.
 */
export function FitText({
  least = 0.75,
  ui,
  style,
  children,
  ...rest
}: Omit<TextProps, "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale"> & {
  ui?: boolean;
  /** The smallest it may be drawn, as a share of its written size. */
  least?: number;
}) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [room, setRoom] = useState(0);

  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const size = flat.fontSize ?? 14;
  // Measurements come back as drawn; sizes go in as written.
  const k = drawnScale(style, ui);
  const fit = natural && room > 0 ? Math.max(least, Math.min(1, room / natural.width)) : 1;
  // Rounded down to the half point the text component draws at, so the
  // drawn line is never a hair wider than the room.
  const drawn = fit < 1 ? Math.floor(size * k * fit * 2) / 2 : size * k;
  const scale = drawn / (size * k);
  const leading = Math.max((flat.lineHeight ?? 0) * k, natural?.height ?? 0);

  const ghost = { ...flat };
  delete ghost.lineHeight;

  return (
    <View style={{ flexShrink: 1, maxWidth: "100%" }} onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      {/* Asks for the natural width, so the room is measured at full size. */}
      {natural ? <View style={{ width: natural.width, height: 0 }} /> : null}
      <Text
        {...rest}
        ui={ui}
        numberOfLines={1}
        style={[style, { fontSize: drawn / k }, leading ? { lineHeight: Math.ceil(leading * scale) / k } : null]}
      >
        {children}
      </Text>
      {/* The unseen copy: in a row of no width it takes its full one-line width. */}
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, flexDirection: "row", alignItems: "flex-start", overflow: "hidden", opacity: 0 }}
      >
        <Text
          ui={ui}
          style={[ghost, { flexShrink: 0 }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setNatural((was) => (was && was.width === width && was.height === height ? was : { width, height }));
          }}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}
