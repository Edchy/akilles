import { useEffect, useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Text } from "@/components/text";
import { colors } from "@/constants/theme";
import { CLAY, type Breath } from "@/data/clay";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/**
 * A slow breath, the pace to follow: in for three seconds, out for four. A
 * long out-breath is what lets a stretch let go.
 */
const BREATH_MS: Record<Breath, number> = { inhale: 3000, exhale: 4000 };

/** A pair with no set breath (a swing, a circle) flips at an easy, even pace. */
const STEADY_MS = 2500;

/**
 * How long one picture takes to become the other. Much slower than the app's
 * own fades on purpose: it is the body moving through the first part of the breath.
 */
const MOVE_MS = 1400;

/** A moment on the first picture before the first breath. */
const SETTLE_MS = 800;

/** Whether a stretch has the clay figure's pictures. */
export const hasClay = (id: string) => id in CLAY;

/**
 * A stretch in the clay figure's pictures (see `data/clay.ts`). A hold shown in
 * one picture just shows it. A movement in two flips between them by itself,
 * in time with the breath that goes with it, and says which breath — so
 * following the picture is breathing right, with nothing to tap. Still (no
 * flipping, no words) when `still`, and with Reduce Motion it rests on the
 * second picture: the stretch itself.
 */
export function ClayStretch({ id, style, still }: { id: string; style?: ViewStyle; still?: boolean }) {
  const reduce = useReduceMotion();
  const { frames, breath } = CLAY[id];
  const pair = frames.length > 1;
  const moving = pair && !still && !reduce;
  // Which picture the body is moving to, or resting on: 0 the first, 1 the second.
  const [to, setTo] = useState<0 | 1>(pair && !moving ? 1 : 0);
  const [breathing, setBreathing] = useState(false);
  const second = useSharedValue(pair && !moving ? 1 : 0);

  useEffect(() => {
    if (!moving) {
      setBreathing(false);
      setTo(pair ? 1 : 0);
      second.value = pair ? 1 : 0;
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    // One breath: the body moves to the other picture as it is taken, then
    // rests there for the rest of the breath.
    const breathe = (target: 0 | 1) => {
      setTo(target);
      setBreathing(true);
      second.value = withTiming(target, { duration: MOVE_MS, easing: Easing.inOut(Easing.quad) });
      const length = breath === "steady" ? STEADY_MS : BREATH_MS[target === 1 ? breath.to1 : breath.to0];
      timer = setTimeout(() => breathe(target === 1 ? 0 : 1), length);
    };
    setTo(0);
    setBreathing(false);
    second.value = 0;
    // A moment on the first picture before the first breath.
    timer = setTimeout(() => breathe(1), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [moving, pair, breath, second]);

  const secondStyle = useAnimatedStyle(() => ({ opacity: second.value }));
  // The breath being taken now: the one moving the body to the picture it heads for.
  const now = !breathing || breath === "steady" ? null : to === 1 ? breath.to1 : breath.to0;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ overflow: "hidden", backgroundColor: colors.bg }, style]}
    >
      <Image source={frames[0]} resizeMode="contain" style={FILL} />
      {pair ? (
        <Animated.Image source={frames[1]} resizeMode="contain" style={[FILL, secondStyle]} />
      ) : null}
      {moving && now ? (
        <Text
          ui
          style={{
            position: "absolute",
            bottom: 12,
            alignSelf: "center",
            color: colors.muted,
            fontSize: 17,
            fontWeight: "600",
          }}
        >
          {now === "inhale" ? "Breathe in" : "Breathe out"}
        </Text>
      ) : null}
    </View>
  );
}

const FILL = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" } as const;
