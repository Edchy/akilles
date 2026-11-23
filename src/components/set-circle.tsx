import { useEffect, useId, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Path, Pattern } from "react-native-svg";

import { easeOut, spring } from "@/constants/motion";
import { grain } from "@/constants/grain";
import { CLAY_LOOK } from "@/constants/theme";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/**
 * One set's circle: a soft cream bump of clay, and once the set is done, a
 * stamp of the card's deeper clay inside it, filled like a glass to the
 * share of the reps you did.
 *
 * A tap is felt the instant the finger lands — the circle dims, on the UI
 * thread, before any of the app's own work — and counts when it lifts. Logging
 * a set brings the stamp down with a ring of colour squeezing out; counting
 * down drains it a step and bobs the number. Every tap starts from wherever
 * the last one had got to, so tapping fast never queues, stutters or loses a
 * tap: each one lands.
 */
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A clay set: lit from above, a little shadow in its foot, sitting on the card. */
const CLAY_SET = "inset 0 3px 0 rgba(255, 255, 255, 0.9), inset 0 -6px 10px rgba(80, 40, 10, 0.18), 0 5px 0 -1px rgba(80, 40, 10, 0.28)";

export function SetCircle({
  size,
  filled,
  zero = false,
  short,
  level = 1,
  wash,
  ink,
  ringWidth = 3,
  seed = 0,
  label,
  hint,
  onTap,
  onReset,
  fillsOnTap = true,
  children,
}: {
  size: number;
  /** Logged. */
  filled: boolean;
  /** Logged as 0, a set not done: no wash, just the 0. */
  zero?: boolean;
  /** Logged under the target: an outline instead of a filled circle. */
  short: boolean;
  /**
   * How full a logged set is, the reps over the target: 1 on target, 0.9 for
   * 9 of 10. The letterpress stamp fills to this level, like a glass.
   */
  level?: number;
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
  /**
   * Whether a tap fills it — the wash thrown at once, before the set is in.
   * False for a hold's empty circle, where a tap starts its clock instead.
   */
  fillsOnTap?: boolean;
  /** The number, or a running clock, drawn on top. */
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  // The ring of colour squeezed out when the stamp lands (1 = just landed).
  const splash = useSharedValue(0);
  const press = useSharedValue(1);
  const bump = useSharedValue(0);
  // Whether it is logged, as the UI thread knows it: a second tap can land
  // before the app has drawn the first, and must still know it counts down.
  const on = useSharedValue(filled);
  // The stamp: how full it is, like a glass — 9 of 10 reps is nine-tenths.
  const stamped = filled && !zero ? Math.min(1, Math.max(0, level)) : 0;
  const lv = useSharedValue(stamped);
  const thump = useSharedValue(1);
  // 0 while the stamp is up off the paper, 1 once it is down.
  const down = useSharedValue(stamped > 0 ? 1 : 0);
  // Set by a tap here, which has already brought the stamp down itself.
  const landed = useSharedValue(false);
  useEffect(() => {
    if (reduce) {
      lv.value = stamped;
      down.value = stamped > 0 ? 1 : 0;
      return;
    }
    // Counting down drains it smoothly; back to nothing, the stamp lifts off.
    lv.value = withSpring(stamped, { damping: 22, stiffness: 260, mass: 0.8 });
    if (stamped === 0) {
      down.value = withTiming(0, { duration: 180, easing: easeOut });
    } else if (landed.value) {
      landed.value = false;
    } else if (down.value < 1) {
      // Logged from elsewhere (a reset, a new exercise): set it straight down.
      down.value = withTiming(1, { duration: 140, easing: easeOut });
    }
  }, [stamped, reduce, lv, down]);

  // Anything that changes the set besides a tap here — a reset, a new
  // exercise — is what a tap here counts from next.
  useEffect(() => {
    on.value = filled;
  }, [filled, on]);

  const throwWash = (wasFilled: boolean) => {
    "worklet";
    if (reduce) return;
    // Set down: it fills at once, from the thumb, before the app has drawn
    // anything, and the ink squeezes out in a ring that spreads and fades.
    if (!wasFilled) {
      cancelAnimation(lv);
      landed.value = true;
      lv.value = 1;
      down.value = 0;
      down.value = withTiming(1, { duration: 130, easing: easeOut });
      thump.value = withSequence(
        withTiming(1, { duration: 110 }),
        withTiming(0.93, { duration: 50, easing: easeOut }),
        withSpring(1, { damping: 10, stiffness: 420, mass: 0.6 }),
      );
      splash.value = withSequence(withTiming(0, { duration: 110 }), withTiming(1, { duration: 0 }), withTiming(0, { duration: 560, easing: easeOut }));
    } else {
      // A step down: a light tap back, the number bobs, the level drains.
      thump.value = withSequence(withTiming(0.95, { duration: 50 }), withSpring(1, { damping: 12, stiffness: 420, mass: 0.6 }));
      bump.value = -6;
      bump.value = withSpring(0, { damping: 11, stiffness: 380, mass: 0.6 });
    }
  };

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(380)
      .onBegin(() => {
        if (!reduce) press.value = withTiming(0.9, { duration: 70, easing: easeOut });
      })
      .onEnd((_e, success) => {
        if (!success) return;
        if (!fillsOnTap) {
          runOnJS(onTap)();
          return;
        }
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
  }, [reduce, onTap, onReset, fillsOnTap]);

  // A press dims the circle, and a logged set dips it, rather than sinking it
  // by scale: iOS draws a scaled view as a stretched picture of itself, so the
  // number and the circle's edge went rough until it settled.
  const body = useAnimatedStyle(() => ({
    opacity: Math.max(0.55, Math.min(1, 1 - (1 - press.value) * 3.5 - (1 - thump.value) * 3.5)),
  }));
  // The stamp comes down and settles: faded in at its own size, never
  // drawn larger than it is, so its edge stays clean the whole way.
  const stampDisc = useAnimatedStyle(() => ({ opacity: Math.min(1, down.value * 2.2) }));
  // Its waterline: level, and drawn as a shape, cut to the circle below. (It
  // once leaned a few degrees on a bouncy spring, and rocked for a second
  // with a rough edge after every tap.)
  const water = useAnimatedProps(() => {
    const level = Math.max(0, lv.value);
    if (level <= 0.001) return { d: "M0,0Z" };
    const y = level >= 0.999 ? -2 : size * (1 - level);
    return { d: `M-2,${y} L${size + 2},${y} L${size + 2},${size + 2} L-2,${size + 2} Z` };
  });
  const squeeze = useAnimatedStyle(() => ({
    opacity: splash.value * 0.7,
    transform: [{ scale: 1 + (1 - splash.value) * 0.42 }],
  }));
  // Each circle's own names for its cut and its grain.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const number = useAnimatedStyle(() => ({ transform: [{ translateY: bump.value }] }));
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
        {/* A soft cream bump of clay, lit from above, and the stamp that
            fills it to the share of the reps you did. */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: size, height: size }}>
          <View style={{ position: "absolute", inset: 0, borderRadius: size / 2, backgroundColor: CLAY_LOOK.well, boxShadow: CLAY_SET }} />
          <Animated.View
            style={[{ position: "absolute", inset: 0, borderRadius: size / 2, borderWidth: 2, borderColor: wash }, squeeze]}
          />
          <Animated.View style={[{ position: "absolute", inset: 0 }, stampDisc]}>
            <Svg width={size} height={size}>
              <Defs>
                <ClipPath id={`cut${id}`}>
                  <Circle cx={size / 2} cy={size / 2} r={size / 2} />
                </ClipPath>
                <Pattern id={`grain${id}`} patternUnits="userSpaceOnUse" width={size} height={size}>
                  <SvgImage href={grain()} width={size} height={size} preserveAspectRatio="xMidYMid slice" />
                </Pattern>
              </Defs>
              <G clipPath={`url(#cut${id})`}>
                <AnimatedPath animatedProps={water} fill={wash} />
                <AnimatedPath animatedProps={water} fill={`url(#grain${id})`} opacity={0.55} />
              </G>
            </Svg>
          </Animated.View>
        </View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size, alignItems: "center", justifyContent: "center" }, number]}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
