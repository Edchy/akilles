import * as Haptics from "expo-haptics";
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Text } from "@/components/text";
import { fieldColors, fonts } from "@/constants/theme";
import type { Family } from "@/data/families";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/** How far a card must be pulled aside, in points, before letting go sends it. */
const THROW = 110;
/** Or a flick this fast, in points a second, over at least `FLICK_OVER`. */
const FLICK = 700;
const FLICK_OVER = 36;
/** How a card let go early comes back: quick, with a little give. */
const BACK = { damping: 18, stiffness: 220, mass: 1 };
/** The card behind, waiting: this much smaller, until the top one leaves. */
const WAITING = 0.93;
/** How round the corners are once a card is lifted off the deck. */
const CORNER = 34;

/**
 * The lift on screen as the top card of a deck. Pull it aside and it lifts
 * off: it tilts, its corners round, and the lift behind shows under it. A tag
 * on the card says where it is going — later, to the back of the deck — and
 * past half way, or with a flick, it goes: `onAway`. Let go sooner and it
 * springs back. So a taken bench is one thumb, and you see what happened.
 *
 * At rest the card is the whole screen, exactly as the lift was laid out;
 * nothing moves until the thumb does. Up and down still scroll the lift, and
 * a tap is still a tap: the card only takes hold once the thumb has gone
 * sideways. When the exercise on the card changes (`face`) — a swap — the
 * card turns over to it.
 */
export function DeckCard({
  face,
  enabled,
  behind,
  onAway,
  children,
}: {
  /** The exercise on the card. Changing it turns the card over. */
  face: string;
  /** Whether this card can go to the back: there is a lift behind it. */
  enabled: boolean;
  /** The lift that comes up when this one goes. */
  behind: { family: Family; name: string } | null;
  onAway: () => void;
  children: ReactNode;
}) {
  const still = useReduceMotion();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /** How far aside the card is, in points. */
  const x = useSharedValue(0);
  /** Coming up from behind: from the waiting size to full. */
  const rise = useSharedValue(still ? 1 : WAITING);
  /** Turning over, in degrees: edge on at 90, face on at 0. */
  const turn = useSharedValue(0);

  useEffect(() => {
    rise.value = withSpring(1, BACK);
  }, [rise]);

  // A swap: the card comes round from edge on, showing its other side.
  const shown = useRef(face);
  useEffect(() => {
    if (shown.current === face) return;
    shown.current = face;
    if (still) return;
    turn.value = 90;
    turn.value = withTiming(0, { duration: 280 });
  }, [face, still, turn]);

  const gone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAway();
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    // Sideways takes the card; up and down is left to the lift's own scrolling.
    .activeOffsetX([-14, 14])
    .failOffsetY([-14, 14])
    .onChange((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      const far = Math.abs(x.value) > THROW;
      const flicked =
        Math.abs(e.velocityX) > FLICK && Math.abs(x.value) > FLICK_OVER && e.velocityX * x.value > 0;
      if (!far && !flicked) {
        x.value = withSpring(0, { ...BACK, velocity: e.velocityX });
        return;
      }
      if (still) {
        x.value = 0;
        scheduleOnRN(gone);
        return;
      }
      x.value = withTiming(Math.sign(x.value) * width * 1.25, { duration: 220 }, (finished) => {
        if (finished) scheduleOnRN(gone);
      });
    });

  const card = useAnimatedStyle(() => {
    const lifted = interpolate(Math.abs(x.value), [0, 90], [0, 1], Extrapolation.CLAMP);
    return {
      borderRadius: CORNER * Math.max(lifted, turn.value > 0 ? 1 : 0),
      transform: [
        { perspective: 1200 },
        { translateX: x.value },
        { rotateZ: `${x.value / 24}deg` },
        { rotateY: `${turn.value}deg` },
        { scale: rise.value * (1 - 0.05 * lifted) },
      ],
    };
  });

  const tag = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.value), [24, 94], [0, 1], Extrapolation.CLAMP),
  }));

  const under = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(Math.abs(x.value), [0, width], [WAITING, 1], Extrapolation.CLAMP) },
    ],
  }));

  const next = behind ? fieldColors(behind.family) : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1626" }}>
      {behind && next ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 32,
              borderRadius: CORNER,
              borderCurve: "continuous",
              backgroundColor: next.bg,
            },
            under,
          ]}
        >
          <Text style={{ color: next.text, fontFamily: fonts.italic, fontSize: 19 }}>Next</Text>
          <Text
            style={{
              textAlign: "center",
              color: next.text,
              fontFamily: fonts.medium,
              fontSize: 34,
              lineHeight: 38,
            }}
          >
            {behind.name}
          </Text>
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1, overflow: "hidden", borderCurve: "continuous" }, card]}>
          {children}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: insets.top + 54,
                left: 0,
                right: 0,
                alignItems: "center",
              },
              tag,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                paddingVertical: 9,
                paddingHorizontal: 18,
                borderRadius: 22,
                backgroundColor: "#0C1626",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: 21 }}>
                Later
              </Text>
              <Text style={{ color: "#FFFFFF", fontFamily: fonts.italic, fontSize: 19 }}>
                to the back of the deck
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
