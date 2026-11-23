import { useEffect, useState } from "react";
import { StyleSheet, View, type TextProps, type TextStyle } from "react-native";

import { Text } from "@/components/text";

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
  const fit = natural && room > 0 ? Math.max(least, Math.min(1, room / natural.width)) : 1;
  // Rounded down to the half point the text component draws at, so the
  // drawn line is never a hair wider than the room.
  const drawn = fit < 1 ? Math.floor(size * fit * 2) / 2 : size;
  const scale = drawn / size;
  const leading = Math.max(flat.lineHeight ?? 0, natural?.height ?? 0);

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
        style={[style, { fontSize: drawn }, leading ? { lineHeight: Math.ceil(leading * scale) } : null]}
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

/**
 * A name that is never cut short — an exercise, where "DB shoulder…" could be
 * any of three. One line, coming down in size to fit, no smaller than
 * `least`; past that it takes a second line at that size, never a "…".
 *
 * It measures itself: drawn as it is, it reads back how many lines it took,
 * and if more than one, comes down by the share that would make it one. No
 * hidden copy, nothing about its box to get wrong. Where lines can't be read
 * back (the web), it simply wraps.
 */
export function WholeText({
  least = 0.75,
  ui,
  style,
  children,
  ...rest
}: Omit<TextProps, "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale" | "onTextLayout"> & {
  ui?: boolean;
  /** The smallest it may be drawn on one line, as a share of its written size. */
  least?: number;
}) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const size = flat.fontSize ?? 14;
  const [fit, setFit] = useState(1);
  // The width it has to fill, read off its own box.
  const [room, setRoom] = useState(0);
  // On two lines at its smallest: split at the space nearest the middle.
  const [balanced, setBalanced] = useState(false);
  // A new name, or a new size: measured again from full size.
  const name = typeof children === "string" ? children : "";
  useEffect(() => {
    setFit(1);
    setBalanced(false);
  }, [name, size]);
  return (
    <Text
      {...rest}
      ui={ui}
      name
      onLayout={(e) => setRoom(e.nativeEvent.layout.width)}
      style={[
        style,
        { fontSize: Math.floor(size * fit * 2) / 2 },
        typeof flat.lineHeight === "number" ? { lineHeight: Math.ceil(flat.lineHeight * fit) } : null,
      ]}
      onTextLayout={(e) => {
        const lines = e.nativeEvent.lines;
        if (lines.length < 2) return;
        if (fit <= least) {
          // As small as it goes, and still two lines: even them out, rather
          // than leave "DB" alone above "Romanian deadlift".
          if (lines.length === 2 && name && !balanced) setBalanced(true);
          return;
        }
        // All its lines laid end to end are the name; its box is the room.
        const whole = lines.reduce((sum, l) => sum + l.width, 0);
        const width = room || Math.max(...lines.map((l) => l.width));
        const next = Math.max(least, fit * (width / whole) * 0.97);
        if (next < fit - 0.01) setFit(next);
      }}
    >
      {balanced ? halves(name) : children}
    </Text>
  );
}

/** A name on two lines of about the same length: broken at the space nearest its middle. */
function halves(name: string): string {
  const middle = name.length / 2;
  let at = -1;
  for (let i = 0; i < name.length; i++) {
    if (name[i] === " " && (at < 0 || Math.abs(i - middle) < Math.abs(at - middle))) at = i;
  }
  return at < 0 ? name : `${name.slice(0, at)}\n${name.slice(at + 1)}`;
}

