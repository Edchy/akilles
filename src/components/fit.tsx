import { useState, type ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";

/**
 * How far a card's content may shrink to fit before it scrolls instead:
 * three-quarters of its size still reads at arm's length.
 */
const LEAST = 0.75;

/**
 * A card's content, always whole. A card never grows and never scrolls, so
 * when what it holds is taller than its room — a long question, a note, an
 * extra line under the name — the content is drawn a little smaller, just
 * enough to fit, rather than cut off at the bottom. Its own layout is left
 * alone (a card's tight layout still comes first; this is the last resort),
 * so measuring never feeds back into what is measured. Only past `LEAST`,
 * which should never happen, does it scroll rather than shrink further.
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
  const scale = scrolls ? 1 : ratio;
  return (
    <ScrollView
      scrollEnabled={scrolls}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={scrolls}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      onLayout={(e) => setBox(e.nativeEvent.layout.height)}
      onContentSizeChange={(_, height) => setContent(height)}
      contentContainerStyle={[
        { flexGrow: 1 },
        contentContainerStyle,
        // Shrunk about its middle, then lifted so its top stays at the top.
        scale < 1 ? { transform: [{ translateY: (-content * (1 - scale)) / 2 }, { scale }] } : null,
      ]}
    >
      {children}
    </ScrollView>
  );
}
