import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  interpolate,
  Extrapolation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { Text } from "@/components/text";
import { spring } from "@/constants/motion";
import { colors } from "@/constants/theme";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/use-reduce-motion";

export type SwipeAction = { label: string; onPress: () => void; disabled?: boolean; destructive?: boolean };

// Opening another row puts the previous row away, including across lists.
let closeOpenRow: (() => void) | undefined;

/** Native/UI-thread tracking: dragging never waits for a React render. Swipes
 * only reveal actions; removal always needs a deliberate tap. */
export function Swipe({ label, disabled = false, radius, onAction, actions, children }: {
  label?: string;
  disabled?: boolean;
  radius: number;
  onAction?: () => void;
  actions?: SwipeAction[];
  children: ReactNode;
}) {
  const buttons = actions ?? (label && onAction ? [{ label, onPress: onAction, destructive: true }] : []);
  const width = buttons.length > 1 ? buttons.length * 96 : 108;
  const row = useRef<SwipeableMethods>(null);
  const [open, setOpen] = useState(false);
  const reduce = useReduceMotion();
  const close = useCallback(() => { row.current?.close(); setOpen(false); }, []);
  const claim = () => {
    if (closeOpenRow !== close) closeOpenRow?.();
    closeOpenRow = close;
  };
  useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);
  useEffect(() => () => {
    if (closeOpenRow === close) closeOpenRow = undefined;
  }, [close]);

  return (
    <ReanimatedSwipeable
      ref={row}
      enabled={!disabled && buttons.length > 0}
      friction={1}
      rightThreshold={width * 0.35}
      dragOffsetFromLeftEdge={open ? 10 : 10000}
      dragOffsetFromRightEdge={10}
      overshootLeft={false}
      overshootRight
      overshootFriction={8}
      enableTrackpadTwoFingerGesture
      animationOptions={{ ...spring.snappy, overshootClamping: true }}
      containerStyle={{ overflow: "visible" }}
      onSwipeableOpenStartDrag={claim}
      onSwipeableWillOpen={() => { claim(); setOpen(true); }}
      onSwipeableWillClose={() => setOpen(false)}
      onSwipeableClose={() => { if (closeOpenRow === close) closeOpenRow = undefined; }}
      renderRightActions={(progress, translation) => (
        <ActionTray progress={progress} translation={translation} width={width} reduce={reduce}>
          {buttons.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: !!action.disabled }}
              accessibilityElementsHidden={!open}
              importantForAccessibility={open ? "auto" : "no-hide-descendants"}
              disabled={!open || disabled || action.disabled}
              onPress={() => { if (action.destructive) haptic.warn(); close(); action.onPress(); }}
              style={({ pressed }) => ({
                flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center",
                borderRadius: buttons.length > 1 ? Math.min(radius, 18) : radius,
                borderCurve: "continuous",
                backgroundColor: action.destructive ? colors.danger : colors.raised,
                opacity: action.disabled ? 0.35 : pressed ? 0.8 : 1,
              })}
            >
              <Text ui style={{ color: action.destructive ? colors.white : colors.text, fontSize: 16, fontWeight: "600" }}>{action.label}</Text>
            </Pressable>
          ))}
        </ActionTray>
      )}
    >
      <View style={{ borderRadius: radius, borderCurve: "continuous", backgroundColor: colors.bg }}>
        {children}
        {open ? <Pressable accessibilityRole="button" accessibilityLabel="Close actions" onPress={close}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} /> : null}
      </View>
    </ReanimatedSwipeable>
  );
}

/**
 * The actions behind a row. They grow out of the right edge exactly as far
 * as the row has moved — no fade, no slide of their own — and stretch with
 * it past the end, so the row and its buttons read as one thing under the
 * finger. A tick when letting go would leave it open.
 */
function ActionTray({ progress, translation, width, reduce, children }: {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  width: number;
  reduce: boolean;
  children: ReactNode;
}) {
  useAnimatedReaction(
    () => progress.value > 0.5,
    (open, was) => {
      if (was !== null && open !== was && open) runOnJS(haptic.tick)();
    },
  );
  const grow = useAnimatedStyle(() => ({
    width: Math.max(0, -translation.value),
  }));
  const labels = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: reduce ? 1 : interpolate(progress.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }));
  // The tray's own width stays fixed: the row measures it to know where open is.
  return (
    <View style={{ width }}>
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, right: 0, paddingLeft: 10, flexDirection: "row", gap: 8 }, grow]}>
        <Animated.View style={[{ flex: 1, flexDirection: "row", gap: 8 }, labels]}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}
