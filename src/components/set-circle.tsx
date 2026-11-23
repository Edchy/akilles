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
import Svg, { Circle, ClipPath, Defs, G, Path } from "react-native-svg";

import { easeOut } from "@/constants/motion";
import { CLAY_LOOK } from "@/constants/theme";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/**
 * One set's circle: a soft cream bump of clay on its ledge, and once the set
 * is done, solid with the card's deeper clay — whatever its reps: the number
 * says how many.
 *
 * The finger landing sinks it onto its ledge at once, on the UI thread,
 * before any of the app's own work. Lifting logs the set: a firm haptic, the
 * colour rising from the bottom in a blink, and a ring of it squeezing out.
 * Each tap after counts a rep down — a light tick, and the number rolls (see
 * `Roll` in the workout). Past 0 it is not logged again. Everything moves or
 * fades; nothing is scaled but the ring's border, so edges and figures stay
 * sharp.
 */
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A clay set: lit from above, a little shadow in its foot. */
const CLAY_SET = "inset 0 3px 0 rgba(255, 255, 255, 0.9), inset 0 -6px 10px rgba(80, 40, 10, 0.18)";
/** A set not done: pressed into the card, not standing on it. */
const HOLLOW = "inset 0 4px 9px rgba(80, 40, 10, 0.32)";
/** How far it stands off the card, on its ledge — and how far a press takes it down. */
export const LEDGE = 4;
/** A set logged: how long the colour takes to rise and fill it. Quick: it is there as the finger lifts. */
const FILL_MS = 140;
/** Let go: back up off the ledge, with a small bounce. */
const UP = { damping: 13, stiffness: 520, mass: 0.6 };

export function SetCircle({
  size,
  filled,
  zero = false,
  short,
  level = 1,
  wash,
  card,
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
  /** What a done set fills with: the deep clay on target, a paler one short of it. */
  wash: string;
  /** The card's own colour: a set not done (0) is a hollow pressed into it. */
  card: string;
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
  // 1 while the finger is down: the circle sinks onto its ledge.
  const press = useSharedValue(0);
  // The ring of colour squeezed out when a set lands (1 = just landed).
  const splash = useSharedValue(0);
  // How much of the circle the colour fills: 0 empty, 1 done. A done set
  // is solid whatever its reps — the number says how many.
  const done = filled && !zero ? 1 : 0;
  const lv = useSharedValue(done);
  // Whether it is logged, as the UI thread knows it: a second tap can land
  // before the app has drawn the first, and must still know it counts down.
  const on = useSharedValue(filled);
  // Set by a tap here, which has already filled it.
  const landed = useSharedValue(false);

  useEffect(() => {
    if (landed.value) {
      landed.value = false;
      if (done === 1) return;
    }
    // A reset, a new exercise, or tapped down past 0: straight to it.
    lv.value = reduce ? done : withTiming(done, { duration: FILL_MS, easing: easeOut });
  }, [done, reduce, lv, landed]);

  // Anything that changes the set besides a tap here — a reset, a new
  // exercise — is what a tap here counts from next.
  useEffect(() => {
    on.value = filled;
  }, [filled, on]);

  const land = (wasFilled: boolean) => {
    "worklet";
    if (wasFilled || reduce) return;
    // Logged: the colour rises from the bottom at once — before the app has
    // drawn anything — and a ring of it squeezes out round the circle.
    cancelAnimation(lv);
    landed.value = true;
    lv.value = withTiming(1, { duration: FILL_MS, easing: easeOut });
    splash.value = withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 480, easing: easeOut }));
  };

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(380)
      .onBegin(() => {
        press.value = reduce ? 1 : withTiming(1, { duration: 60, easing: easeOut });
      })
      .onEnd((_e, success) => {
        if (!success) return;
        if (!fillsOnTap) {
          runOnJS(onTap)();
          return;
        }
        const was = on.value;
        on.value = true;
        land(was);
        runOnJS(was ? haptic.tick : haptic.set)();
        runOnJS(onTap)();
      })
      .onFinalize(() => {
        press.value = reduce ? 0 : withSpring(0, UP);
      });
    const hold = Gesture.LongPress()
      .minDuration(420)
      .onStart(() => {
        on.value = true;
        runOnJS(haptic.warn)();
        runOnJS(onReset)();
      })
      .onFinalize(() => {
        press.value = reduce ? 0 : withSpring(0, UP);
      });
    return Gesture.Exclusive(hold, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, onTap, onReset, fillsOnTap, size]);

  // Pressed, the circle goes down onto the ledge under it, like a key —
  // moved, never scaled: iOS draws a scaled view as a stretched picture of
  // itself, so the number and the edge went rough until it settled.
  const cap = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * LEDGE }] }));
  // The colour, rising from the bottom: drawn as a shape and cut to the
  // circle, so its edge is sharp the whole way.
  const water = useAnimatedProps(() => {
    const level = Math.max(0, lv.value);
    if (level <= 0.002) return { d: "M0,0Z" };
    const top = level >= 0.998 ? -2 : size * (1 - level);
    return { d: `M-2,${top} L${size + 2},${top} L${size + 2},${size + 2} L-2,${size + 2} Z` };
  });
  const squeeze = useAnimatedStyle(() => ({
    opacity: splash.value * 0.7,
    // A ring, only its border drawn, which stays sharp moving out.
    transform: [{ scale: 1 + (1 - splash.value) * 0.36 }],
  }));
  // Each circle's own name for its cut.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityActions={[{ name: "activate" }, { name: "longpress" }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === "longpress" ? onReset() : onTap())}
        style={{ width: size, height: size }}
      >
        {/* The ledge it sits on: the clay's own shadow, which a press goes down onto. */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: LEDGE, width: size, height: size, borderRadius: size / 2, backgroundColor: "rgba(80, 40, 10, 0.26)", opacity: zero ? 0 : 1 }}
        />
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, cap]}>
          {/* A soft cream bump of clay, lit from above: not yet done. Done,
              its own clay is the set's colour too, so no cream shows round
              the colour's edge. Not done (0): a hollow pressed into the card. */}
          <View
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: size / 2,
              backgroundColor: zero ? card : filled ? wash : CLAY_LOOK.well,
              boxShadow: zero ? HOLLOW : CLAY_SET,
            }}
          />
          <Animated.View
            style={[{ position: "absolute", inset: 0, borderRadius: size / 2, borderWidth: 2, borderColor: wash }, squeeze]}
          />
          {/* Done: the card's deeper clay, solid. */}
          <Svg width={size} height={size} style={{ position: "absolute" }}>
            <Defs>
              <ClipPath id={`cut${id}`}>
                <Circle cx={size / 2} cy={size / 2} r={size / 2} />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#cut${id})`}>
              <AnimatedPath animatedProps={water} fill={wash} />
            </G>
          </Svg>
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
