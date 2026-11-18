import { useEffect } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { seeTip, seenTip, useSession, type SessionState } from "@/store/session";

/**
 * First-time tips: one plain line, shown the first time what it explains
 * comes up, then never again. They teach what the intro leaves out — swap,
 * the list of every card, warm-ups, a short set and the Library — at
 * the moment it matters, instead of all at once before the first workout.
 *
 * In a workout a tip floats over the top of the screen, so nothing under the
 * thumb moves, and goes by itself after a while; in the Library it sits in
 * the page, in place of a line that would otherwise stay there for good. A
 * screen that already says it in its own words gets no tip.
 * Either way it counts as seen once it has shown.
 */
export const TIPS = {
  swipe: "Swipe left for the next card, and right to go back.",
  menu: "Tap the exercise's name to swap it for today, see how it's done, or write a note.",
  short: "Fewer than the number? That's fine. Next time you'll try the same again.",
  warmup: "Your first lift starts with a warm-up: a few lighter rounds. Tap “Warm up first” to see them.",
  overview: "Pull this card down to see all of today's cards, and to finish.",
  plan:
    "Your workouts take turns, top to bottom. Tap one to change it: only that workout changes. Hold and drag to move it. Swipe left to pause or delete.",
  library:
    "Every exercise is here. Change one here, and it changes in every workout that uses it.",
} as const;

export type TipId = keyof typeof TIPS;

/** How long a floating tip stays before it goes by itself. */
const FLOAT_MS = 9000;

/** The first tip of these not seen yet, if any. */
export const firstUnseen = (state: SessionState, ids: (TipId | false | undefined)[]): TipId | undefined =>
  ids.find((id): id is TipId => !!id && !seenTip(state, id));

/**
 * A tip over the top of the workout: laid exactly over the workout card, its
 * edges and corners, so it reads as that card speaking. There and gone,
 * never pushing anything.
 */
export function FloatingTip({
  id,
  frame,
}: {
  id: TipId | undefined;
  /** The workout card's place: its sides, its height and its corners. */
  frame: { side: number; height: number; corner: number };
}) {
  const { setState } = useSession();
  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => setState((s) => seeTip(s, id)), FLOAT_MS);
    return () => clearTimeout(timer);
  }, [id, setState]);
  if (!id) return null;
  return (
    <Animated.View
      key={id}
      entering={FadeIn.duration(240)}
      exiting={FadeOut.duration(160)}
      style={{ position: "absolute", top: 0, left: frame.side, right: frame.side, zIndex: 50 }}
    >
      <TipBody
        id={id}
        onDone={() => setState((s) => seeTip(s, id))}
        dark
        style={{ minHeight: frame.height, borderRadius: frame.corner }}
      />
    </Animated.View>
  );
}

/** A tip in the page, above what it explains; once seen, it stays away. */
export function InlineTip({ id, style }: { id: TipId; style?: ViewStyle }) {
  const { state, setState } = useSession();
  if (seenTip(state, id)) return null;
  return (
    <View style={style}>
      <TipBody id={id} onDone={() => setState((s) => seeTip(s, id))} />
    </View>
  );
}

function TipBody({ id, onDone, dark, style }: { id: TipId; onDone: () => void; dark?: boolean; style?: ViewStyle }) {
  const ink = dark ? colors.white : colors.text;
  return (
    <View
      accessibilityRole="alert"
      style={[{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingLeft: 20,
        paddingRight: 8,
        paddingVertical: 10,
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: dark ? colors.text : colors.surface,
        shadowColor: "#000",
        shadowOpacity: dark ? 0.18 : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      }, style]}
    >
      <Text style={{ flex: 1, color: ink, fontFamily: fonts.regular, fontSize: 18, lineHeight: 24, paddingVertical: 6 }}>
        {TIPS[id]}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        hitSlop={6}
        style={({ pressed }) => ({
          minWidth: 64,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Text style={{ color: ink, fontFamily: fonts.medium, fontSize: 18 }}>Got it</Text>
      </Pressable>
    </View>
  );
}
