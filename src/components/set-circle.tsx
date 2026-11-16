import { useEffect, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { easeOut, spring } from "@/constants/motion";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/**
 * One set's circle: an ink ring, and a watercolour wash inside it once the
 * set is done.
 *
 * A tap is felt the instant the finger lands — the circle sinks, on the UI
 * thread, before any of the app's own work — and counts when it lifts. Logging
 * a set throws the wash out past the ring, its layers spreading at their own
 * pace, and lets it run back in to settle; counting down sends a smaller
 * ripple and drops the number a step. Every tap starts from wherever the last
 * one had got to, so tapping fast never queues, stutters or loses a tap: each
 * one lands, and the colour just keeps moving.
 */
export function SetCircle({
  size,
  filled,
  zero = false,
  short,
  wash,
  ink,
  ringWidth = 3,
  seed = 0,
  label,
  hint,
  onTap,
  onReset,
  children,
}: {
  size: number;
  /** Logged. */
  filled: boolean;
  /** Logged as 0, a set not done: no wash, and crossed out. */
  zero?: boolean;
  /** Logged under the target: a paler wash. */
  short: boolean;
  /** The wash's colour. */
  wash: string;
  /** The ring's colour. */
  ink: string;
  ringWidth?: number;
  /** Which circle: each one's ring and wash are drawn a little differently. */
  seed?: number;
  label: string;
  hint: string;
  onTap: () => void;
  /** Hold: a set not done, 0, in one go. */
  onReset: () => void;
  /** The number, or a running clock, drawn on top. */
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  // How much wash is in the circle (1 = full, settled) and how hard it is
  // still moving from the last tap (1 = just thrown, 0 = still).
  // Only a set that was done gets colour.
  const washed = filled && !zero;
  const fill = useSharedValue(washed ? 1 : 0);
  const cross = useSharedValue(zero ? 1 : 0);
  const splash = useSharedValue(0);
  const press = useSharedValue(1);
  const bump = useSharedValue(0);
  // Whether it is logged, as the UI thread knows it: a second tap can land
  // before the app has drawn the first, and must still know it counts down.
  const on = useSharedValue(filled);

  // Anything that changes the set besides a tap here — a reset, a new
  // exercise — still settles the wash to match.
  useEffect(() => {
    on.value = filled;
    if (!washed) fill.value = reduce ? 0 : withSpring(0, spring.snappy);
    else if (fill.value < 0.05) fill.value = reduce ? 1 : withSpring(1, spring.bouncy);
  }, [filled, washed, reduce, fill, on]);
  // The X lands with a little weight, and lifts off quickly.
  useEffect(() => {
    cross.value = reduce ? (zero ? 1 : 0) : zero ? withSpring(1, spring.bouncy) : withTiming(0, { duration: 120 });
  }, [zero, reduce, cross]);

  const throwWash = (wasFilled: boolean) => {
    "worklet";
    if (reduce) return;
    if (!wasFilled) {
      // Out past the ring, then back in to rest.
      cancelAnimation(fill);
      fill.value = withSequence(
        withTiming(1.38, { duration: 150, easing: easeOut }),
        withSpring(1, spring.bouncy),
      );
      splash.value = 1;
      splash.value = withTiming(0, { duration: 720, easing: easeOut });
    } else {
      // A step down: a smaller ripple, and the wash breathes in and out.
      fill.value = withSequence(withTiming(0.9, { duration: 70 }), withSpring(1, spring.bouncy));
      splash.value = Math.max(splash.value, 0.55);
      splash.value = withTiming(0, { duration: 520, easing: easeOut });
      bump.value = -7;
      bump.value = withSpring(0, spring.bouncy);
    }
  };

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(380)
      .onBegin(() => {
        if (!reduce) press.value = withTiming(0.9, { duration: 60 });
      })
      .onEnd((_e, success) => {
        if (!success) return;
        const was = on.value;
        on.value = true;
        throwWash(was);
        runOnJS(was ? haptic.tick : haptic.drop)();
        runOnJS(onTap)();
      })
      .onFinalize(() => {
        press.value = withSpring(1, spring.bouncy);
      });
    const hold = Gesture.LongPress()
      .minDuration(420)
      .onStart(() => {
        on.value = true;
        runOnJS(haptic.warn)();
        runOnJS(onReset)();
      })
      .onFinalize(() => {
        press.value = withSpring(1, spring.bouncy);
      });
    return Gesture.Exclusive(hold, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, onTap, onReset]);

  const art = useMemo(() => drawCircle(size, seed), [size, seed]);
  const pad = art.pad;

  const body = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  // The layers move apart while the wash is thrown, then come back together.
  const layer = (k: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      opacity: Math.min(1, fill.value * 3),
      transform: [
        { scale: Math.max(0, fill.value + splash.value * 0.1 * k) },
        { rotate: `${splash.value * (k - 1) * 14}deg` },
      ],
    }));
  const layers = [layer(0), layer(1), layer(2)];
  // A faint ring of colour that runs outward and fades.
  const spray = useAnimatedStyle(() => ({
    opacity: splash.value * 0.5,
    transform: [{ scale: 1 + (1 - splash.value) * 0.55 }],
  }));
  const number = useAnimatedStyle(() => ({ transform: [{ translateY: bump.value }] }));
  const crossed = useAnimatedStyle(() => ({
    opacity: cross.value,
    transform: [{ scale: 1.25 - 0.25 * cross.value }, { rotate: `${(1 - cross.value) * -8}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityActions={[{ name: "activate" }, { name: "longpress" }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === "longpress" ? onReset() : onTap())}
        style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, body]}
      >
        {/* The wash spills past the ring, so it is drawn on a larger canvas. */}
        <View pointerEvents="none" style={{ position: "absolute", left: -pad, top: -pad, width: size + pad * 2, height: size + pad * 2 }}>
          <Animated.View style={[{ position: "absolute", inset: 0 }, spray]}>
            <Svg width={size + pad * 2} height={size + pad * 2}>
              <Path d={art.spray} fill="none" stroke={wash} strokeOpacity={0.55} strokeWidth={2} />
            </Svg>
          </Animated.View>
          <View style={{ position: "absolute", inset: 0, opacity: short ? 0.5 : 1 }}>
            {art.blobs.map((d, k) => (
              <Animated.View key={k} style={[{ position: "absolute", inset: 0 }, layers[k]]}>
                <Svg width={size + pad * 2} height={size + pad * 2}>
                  <Path d={d} fill={wash} fillOpacity={k === 0 ? 0.42 : 0.24} stroke={wash} strokeOpacity={0.45} strokeWidth={1.4} />
                </Svg>
              </Animated.View>
            ))}
          </View>
          <Svg width={size + pad * 2} height={size + pad * 2} style={{ position: "absolute" }}>
            <Path d={art.ring} fill="none" stroke={ink} strokeWidth={ringWidth} strokeLinecap="round" />
          </Svg>
        </View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size, alignItems: "center", justifyContent: "center" }, number]}>{children}</Animated.View>
        {/* A set not done: a big hand-drawn X over the 0. */}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, crossed]}>
          <Svg width={size} height={size}>
            <Path d={art.cross} fill="none" stroke={ink} strokeWidth={Math.max(2.5, size * 0.045)} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** A closed, smooth, slightly irregular loop: hand-drawn, never a perfect circle. */
function loop(cx: number, cy: number, r: number, wobble: (a: number) => number, points = 36): string {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 + wobble(a));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  let d = `M${((pts[0][0] + pts[1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[1][1]) / 2).toFixed(1)}`;
  for (let i = 1; i <= points; i++) {
    const p = pts[i % points];
    const q = pts[(i + 1) % points];
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return `${d}Z`;
}

/** The ring, three wash layers and the spray, for one circle. */
function drawCircle(size: number, seed: number) {
  const pad = Math.round(size * 0.35);
  const c = size / 2 + pad;
  const r = size / 2 - 2;
  const s = seed * 1.7 + 0.4;
  return {
    pad,
    ring: loop(c, c, r, (a) => 0.018 * Math.sin(3 * a + s) + 0.01 * Math.cos(5 * a + s * 2)),
    blobs: [0, 1, 2].map((k) =>
      loop(c, c, r * (0.98 - k * 0.04), (a) => 0.07 * Math.sin(4 * a + s + k * 2.1) + 0.045 * Math.cos(7 * a + s * 1.3 + k), 28),
    ),
    spray: loop(c, c, r * 1.02, (a) => 0.05 * Math.sin(5 * a + s * 3), 28),
    // Two strokes, each with a slight bow, corner to corner inside the ring.
    cross: (() => {
      const a = size * 0.24;
      const b = size * 0.76;
      const bow = size * 0.04 * (seed % 2 ? 1 : -1);
      const m = size / 2;
      return `M${a},${a + 2} Q${m + bow},${m - bow} ${b},${b} M${b - 1},${a} Q${m - bow},${m - bow} ${a + 1},${b - 1}`;
    })(),
  };
}
