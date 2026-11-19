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
 * How long one picture takes to become the other: a blink, like a stop-motion
 * frame. A long crossfade shows two bodies at once, half see-through, and
 * made people dizzy (18 November 2026); a cut, then stillness, does not.
 */
const CUT_MS = 90;

/** A moment on the first picture before the first breath. */
const SETTLE_MS = 800;

/** A lift's pace: how long each end of the rep holds before the cut to the other. */
const REP_END_MS = 1600;

/** Whether a stretch or a lift has the clay figure's pictures. */
export const hasClay = (id: string) => id in CLAY;

/**
 * A stretch in the clay figure's pictures (see `data/clay.ts`). A hold shown in
 * one picture just shows it. A movement in two flips between them by itself,
 * in time with the breath that goes with it, and says which breath — so
 * following the picture is breathing right, with nothing to tap. Still (no
 * flipping, no words) when `still`, and with Reduce Motion it rests on the
 * second picture: the stretch itself.
 *
 * A lift (`effort` set) cuts between its two pictures at an even pace instead,
 * with no words; still, it rests on the first picture, where the lift starts.
 */
export function ClayStretch({
  id,
  style,
  still,
  fill,
  words = true,
  onBreath,
}: {
  id: string;
  style?: ViewStyle;
  still?: boolean;
  /** Fill the box, trimming the picture's empty white sides, so the figure is bigger. */
  fill?: boolean;
  /** Say the breath under the picture (default); off where the screen says it itself. */
  words?: boolean;
  /** The breath being taken now, as it changes: for a screen that says it itself. */
  onBreath?: (breath: Breath | null) => void;
}) {
  const reduce = useReduceMotion();
  const { frames, breath, effort } = CLAY[id];
  const pair = frames.length > 1;
  const moving = pair && !still && !reduce;
  // Which picture the body is moving to, or resting on: 0 the first, 1 the second.
  // At rest a stretch shows the stretch itself (its second picture); a lift, where it starts.
  const rest: 0 | 1 = pair && !effort ? 1 : 0;
  const [to, setTo] = useState<0 | 1>(moving ? 0 : rest);
  const [breathing, setBreathing] = useState(false);
  const second = useSharedValue(moving ? 0 : rest);

  useEffect(() => {
    if (!moving) {
      setBreathing(false);
      setTo(rest);
      second.value = rest;
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    // One breath: the body cuts to the other picture as it is taken, then
    // rests there for the rest of the breath. A lift cuts from one end of the
    // rep to the other at an even pace.
    const breathe = (target: 0 | 1) => {
      setTo(target);
      setBreathing(true);
      second.value = withTiming(target, { duration: CUT_MS, easing: Easing.linear });
      const length = effort
        ? REP_END_MS
        : breath === "steady"
          ? STEADY_MS
          : BREATH_MS[target === 1 ? breath.to1 : breath.to0];
      timer = setTimeout(() => breathe(target === 1 ? 0 : 1), length);
    };
    setTo(0);
    setBreathing(false);
    second.value = 0;
    // A moment on the first picture before the first breath.
    timer = setTimeout(() => breathe(1), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [moving, pair, rest, breath, effort, second]);

  const secondStyle = useAnimatedStyle(() => ({ opacity: second.value }));
  // The breath being taken now: the one moving the body to the picture it heads for.
  const now = !moving || !breathing || breath === "steady" ? null : to === 1 ? breath.to1 : breath.to0;
  useEffect(() => {
    onBreath?.(now);
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ overflow: "hidden", backgroundColor: colors.bg }, style]}
    >
      <Image source={frames[0]} resizeMode={fill ? "cover" : "contain"} style={FILL} />
      {pair ? (
        <Animated.Image source={frames[1]} resizeMode={fill ? "cover" : "contain"} style={[FILL, secondStyle]} />
      ) : null}
      {words && now ? (
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
