import { useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { easeOut } from "@/constants/motion";

/**
 * How far a card's content may shrink to fit before it scrolls instead:
 * three-quarters of its size still reads at arm's length.
 */
const LEAST = 0.75;
/** How long the content takes to come to a new size: a glide, never a jump. */
const GLIDE = 220;
/**
 * How long it waits before growing back. A card's content can be short for a
 * frame while one line gives way to another — the tip to the result, when the
 * last set goes in — and growing at once would pump it up and straight back.
 */
const SETTLE = 250;
/**
 * And before shrinking: a beat, while the card itself takes up its tighter
 * layout (see `LAYOUT.tight` in the workout), which may make shrinking
 * unnecessary after all.
 */
const BEAT = 120;

/**
 * A card's content, always whole. A card never grows and never scrolls, so
 * when what it holds is taller than its room — a long question, a note, an
 * extra line under the name — the content is drawn a little smaller, just
 * enough to fit, rather than cut off at the bottom. Its own layout is left
 * alone (a card's tight layout still comes first; this is the last resort),
 * so measuring never feeds back into what is measured. Only past `LEAST`,
 * which should never happen, does it scroll rather than shrink further.
 *
 * A new size is glided to, not jumped to: shrinking starts at once, growing
 * after a moment's wait, so a line changing never makes the card blink.
 */
export function Fit({
  children,
  contentContainerStyle,
  keyboardShouldPersistTaps,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
}) {
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const over = box > 0 && content > box + 1;
  const ratio = over ? box / content : 1;
  const scrolls = ratio < LEAST;
  const target = scrolls ? 1 : ratio;
  // The size it is drawn at, and the content's height it was worked out for.
  const scale = useSharedValue(target);
  const tall = useSharedValue(content);
  // The size it is on its way to. A new aim replaces the last one, so a
  // shrink still waiting its beat is called off if it is no longer needed.
  const aim = useRef<number | null>(null);
  useEffect(() => {
    if (box <= 0 || content <= 0) return;
    tall.value = content;
    if (aim.current === null) {
      // The card's first look: straight at its size, nothing to glide from.
      aim.current = target;
      scale.value = target;
      return;
    }
    if (Math.abs(target - aim.current) < 0.002) return;
    aim.current = target;
    const glide = withTiming(target, { duration: GLIDE, easing: easeOut });
    scale.value = withDelay(target < scale.value ? BEAT : SETTLE, glide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, box, content]);
  // Shrunk about its middle, then lifted so its top stays at the top.
  const shrunk = useAnimatedStyle(() => ({
    transform: [{ translateY: (-tall.value * (1 - scale.value)) / 2 }, { scale: scale.value }],
  }));
  return (
    <ScrollView
      scrollEnabled={scrolls}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={scrolls}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      onLayout={(e) => setBox(e.nativeEvent.layout.height)}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <Animated.View
        style={[{ flexGrow: 1 }, contentContainerStyle, scrolls ? null : shrunk]}
        onLayout={(e) => setContent(e.nativeEvent.layout.height)}
      >
        {children}
      </Animated.View>
    </ScrollView>
  );
}
