import { useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { colors } from "@/constants/theme";

/** How far the row slides to show its button. */
const OPEN = 108;

/**
 * A row you can swipe left to show one action behind it — Remove, Delete.
 * The swipe only shows the button; a tap on it does the deed, so a stray
 * swipe never loses anything. Swipe back, or tap the row, to put it away.
 *
 * Only a sideways drag is taken, so it sits happily inside a scrolling
 * sheet and a DragList: an upward or downward move scrolls, and a held row
 * belongs to the list, which claims the gesture before this ever sees it.
 * The same action is always in the row's own sheet too, for anyone who
 * cannot swipe.
 */
export function Swipe({
  label,
  disabled = false,
  radius,
  onAction,
  children,
}: {
  label: string;
  disabled?: boolean;
  /** The row's corner radius, so the button behind matches it. */
  radius: number;
  onAction: () => void;
  children: ReactNode;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  // The responder outlives renders; read the latest here.
  const latest = useRef({ open, disabled });
  latest.current = { open, disabled };

  const settle = (to: 0 | -1) => {
    setOpen(to !== 0);
    Animated.spring(x, {
      toValue: to * OPEN,
      useNativeDriver: false,
      bounciness: 0,
      speed: 18,
    }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Sideways and on purpose: well past a tap's wobble, and clearly more
      // across than down.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !latest.current.disabled && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const from = latest.current.open ? -OPEN : 0;
        // Free to the open point, then heavier past it.
        const raw = Math.min(0, from + g.dx);
        x.setValue(raw < -OPEN ? -OPEN + (raw + OPEN) / 3 : raw);
      },
      onPanResponderRelease: (_, g) => {
        const from = latest.current.open ? -OPEN : 0;
        const at = from + g.dx;
        settle(g.vx < -0.4 || (g.vx <= 0.4 && at < -OPEN / 2) ? -1 : 0);
      },
      onPanResponderTerminate: () => settle(latest.current.open ? -1 : 0),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View {...responder.panHandlers}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: OPEN - 10,
          opacity: x.interpolate({ inputRange: [-40, 0], outputRange: [1, 0], extrapolate: "clamp" }),
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          onPress={() => {
            settle(0);
            onAction();
          }}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius,
            borderCurve: "continuous",
            backgroundColor: colors.bend,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "600" }}>{label}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ translateX: x }],
          borderRadius: radius,
          borderCurve: "continuous",
          backgroundColor: colors.bg,
        }}
      >
        {children}
        {open ? (
          // While the button shows, a tap on the row puts it away rather than
          // opening what is underneath.
          <Pressable
            accessibilityLabel="Close"
            onPress={() => settle(0)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
