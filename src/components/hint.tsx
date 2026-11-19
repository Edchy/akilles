import { useEffect, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path, Rect } from "react-native-svg";

import { Text } from "@/components/text";
import { colors } from "@/constants/theme";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/**
 * Hints that show rather than tell. A gesture or a tap is shown by a finger
 * doing it on the real thing — it lands, presses (a soft white touch under
 * the tip), moves with a faint trail, lifts and fades — with two or three
 * words beside it, and the thing itself moves a little with it, so you see
 * what the gesture does. It plays a few times and goes; any touch sends it
 * away sooner. What needs words is a `Callout`: paper, never black, pointing
 * at what it means, with no "Got it" to press.
 */

/** One play of a hint, start to finish. */
const PLAY_MS = 3200;
/** How many times it plays before it goes by itself. */
const PLAYS = 3;

/** The fingertip drawing, and where its tip is in it. */
const TIP = { width: 26, height: 64, x: 13, y: 3 } as const;

/** A finger, leaning in, drawn simply: a nail and two creases. Placed by its tip. */
function Fingertip() {
  return (
    <View
      style={{
        width: TIP.width,
        height: TIP.height,
        transform: [{ rotate: "-14deg" }],
        transformOrigin: [TIP.x, TIP.y, 0],
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <Svg width={TIP.width} height={TIP.height} viewBox="0 0 26 64">
        <Rect x={1} y={1} width={24} height={62} rx={12} fill="#F3E9D6" stroke="#1C1C1A" strokeWidth={2} />
        <Path
          d="M6.5 14 a6.5 6.5 0 0 1 13 0 v5 a2.5 2.5 0 0 1 -2.5 2.5 h-8 a2.5 2.5 0 0 1 -2.5 -2.5 z"
          fill="#FCFCFA"
          stroke="#1C1C1A"
          strokeWidth={1.2}
          opacity={0.8}
        />
        <Path d="M8 38 h10 M8 50 h10" stroke="#1C1C1A" strokeWidth={1.3} strokeLinecap="round" opacity={0.45} />
      </Svg>
    </View>
  );
}

/** A worklet ease: slow off, slow in. */
const ease = (t: number) => {
  "worklet";
  return t * t * (3 - 2 * t);
};

type Point = { x: number; y: number };

/**
 * A finger showing a gesture, over everything and never in the way: a drag
 * from `from` to `to`, or with no `to`, two taps on `from`. `drive` is told
 * how far through the motion the finger is (0 to 1), so the real thing can
 * move a little with it; it is set back to 0 when the hint goes.
 */
export function GestureHint({
  from,
  to,
  label,
  labelAt,
  drive,
  onPlayed,
}: {
  from: Point;
  to?: Point;
  label: string;
  /** Where the label's middle sits. */
  labelAt: Point;
  drive?: SharedValue<number>;
  /** It has played out by itself. */
  onPlayed?: () => void;
}) {
  const still = useReduceMotion();
  const p = useSharedValue(still ? 0.5 : 0);
  const tap = !to;
  const end = to ?? from;
  const dx = end.x - from.x;
  const dy = end.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  useEffect(() => {
    if (still) {
      const timer = setTimeout(() => onPlayed?.(), 5000);
      return () => clearTimeout(timer);
    }
    p.value = withRepeat(withTiming(1, { duration: PLAY_MS, easing: Easing.linear }), PLAYS, false, (finished) => {
      if (finished && onPlayed) scheduleOnRN(onPlayed);
    });
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  // How far along the drag the finger is.
  const moved = (v: number) => {
    "worklet";
    return tap ? 0 : ease(interpolate(v, [0.2, 0.6], [0, 1], "clamp"));
  };

  useAnimatedReaction(
    () => (tap ? 0 : moved(p.value) * interpolate(p.value, [0.6, 0.74, 0.84], [1, 1, 0], "clamp")),
    (k) => {
      if (drive) drive.value = k;
    },
  );
  useEffect(() => () => {
    if (drive) drive.value = 0;
  }, [drive]);

  const finger = useAnimatedStyle(() => {
    const m = moved(p.value);
    const press = tap
      ? interpolate(p.value, [0.2, 0.24, 0.3, 0.38, 0.42, 0.48], [1, 0.9, 1, 1, 0.9, 1], "clamp")
      : interpolate(p.value, [0.12, 0.2, 0.6, 0.7], [1.1, 1, 1, 1.08], "clamp");
    return {
      opacity: interpolate(p.value, [0, 0.12, 0.72, 0.84], [0, 1, 1, 0], "clamp"),
      transform: [{ translateX: dx * m }, { translateY: dy * m + interpolate(p.value, [0, 0.12], [10, 0], "clamp") }, { scale: press }],
    };
  });
  const touch = useAnimatedStyle(() => ({
    opacity: tap
      ? interpolate(p.value, [0.22, 0.25, 0.3, 0.4, 0.43, 0.48], [0, 1, 0, 0, 1, 0], "clamp")
      : interpolate(p.value, [0.18, 0.22, 0.6, 0.68], [0, 1, 1, 0], "clamp"),
  }));
  const ring = useAnimatedStyle(() => {
    const r = interpolate(p.value, [0.24, 0.36, 0.42, 0.54], [0, 1, 0, 1], "clamp");
    return { opacity: tap ? (1 - r) * (p.value > 0.24 && p.value < 0.56 ? 0.9 : 0) : 0, transform: [{ scale: 0.6 + r * 1.1 }] };
  });
  const trail = useAnimatedStyle(() => ({
    opacity: tap ? 0 : interpolate(p.value, [0.22, 0.6, 0.76], [0, 1, 0], "clamp"),
    width: length * moved(p.value),
  }));
  const word = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.24, 0.34, 0.78, 0.9], [0, 1, 1, 0], "clamp"),
  }));

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 60 }}>
      {/* The trail, from where the finger landed toward where it is. */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: from.x,
            top: from.y - 3,
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(255, 255, 255, 0.45)",
            transform: [{ rotate: `${angle}rad` }],
            transformOrigin: [0, 3, 0],
          },
          trail,
        ]}
      />
      {/* A tap's ripple. */}
      <Animated.View
        style={[
          { position: "absolute", left: from.x - 17, top: from.y - 17, width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.75)" },
          ring,
        ]}
      />
      <Animated.View style={[{ position: "absolute", left: from.x - TIP.x, top: from.y - TIP.y }, finger]}>
        <Animated.View
          style={[
            { position: "absolute", left: TIP.x - 13, top: TIP.y - 13, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255, 255, 255, 0.55)" },
            touch,
          ]}
        />
        <Fingertip />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: labelAt.y - 15, alignItems: "center" }, word]}>
        <View
          style={{
            paddingHorizontal: 12,
            height: 30,
            justifyContent: "center",
            borderRadius: 15,
            backgroundColor: colors.bg,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            transform: [{ translateX: labelAt.x }],
          }}
        >
          <Text ui style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * A few words on paper, pointing at what they are about: down from above it,
 * or up from below. `onClose` puts a small × on it; without one, the caller
 * closes it (a touch anywhere, or using the thing). `foot` is room for a
 * Next and the steps of a tip told one point at a time.
 */
export function Callout({
  children,
  point = "down",
  pointAt = 0.5,
  onClose,
  foot,
  style,
}: {
  children: ReactNode;
  point?: "down" | "up" | "none";
  /** How far across the pointer sits, 0 to 1. */
  pointAt?: number;
  onClose?: () => void;
  foot?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} accessibilityRole="alert" style={style}>
      <View
        style={{
          backgroundColor: colors.bg,
          borderRadius: 14,
          borderCurve: "continuous",
          paddingLeft: 16,
          paddingRight: onClose ? 44 : 16,
          paddingVertical: 13,
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        {point !== "none" ? (
          <View
            style={{
              position: "absolute",
              left: `${pointAt * 100}%`,
              marginLeft: -7,
              [point === "down" ? "bottom" : "top"]: -6,
              width: 14,
              height: 14,
              borderRadius: 2,
              backgroundColor: colors.bg,
              transform: [{ rotate: "45deg" }],
            }}
          />
        ) : null}
        <Text ui style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>
          {children}
        </Text>
        {foot}
        {onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({
              position: "absolute",
              right: 6,
              top: 6,
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text ui style={{ color: colors.muted, fontSize: 22, lineHeight: 24 }}>
              ×
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Steps under a callout told one point at a time: a dot for each, and Next or Done. */
export function CalloutSteps({ at, count, onNext }: { at: number; count: number; onNext: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginRight: -28 }}>
      <View style={{ flexDirection: "row", gap: 5 }} accessibilityLabel={`${at + 1} of ${count}`}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === at ? colors.text : colors.line }} />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onNext} hitSlop={10} style={({ pressed }) => ({ paddingVertical: 4, paddingHorizontal: 4, opacity: pressed ? 0.5 : 1 })}>
        <Text ui style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {at < count - 1 ? "Next" : "Done"}
        </Text>
      </Pressable>
    </View>
  );
}
