import { View, type ViewStyle } from "react-native";
import { Text } from "@/components/text";

import { useCardActive } from "@/components/card-context";
import { ClayStretch, hasClay } from "@/components/clay";
import { Icon } from "@/components/icon";
import { colors } from "@/constants/theme";

/** Whether there is a picture: the clay figure's. */
export const hasIllustration = (id: string): boolean => hasClay(id);

/**
 * The picture of a movement — a lift, a machine or a stretch — by its id: the
 * clay figure's pictures (see `components/clay.tsx`), a stretch with its
 * breath, a lift at lifting pace. Still as a thumbnail, on a card that isn't
 * the one in front, or with `plays` 0. Anything without one (an exercise you
 * added yourself) shows a quiet placeholder.
 *
 * Every screen asks for its picture here, so changing the art is a change to
 * this file and `components/clay.tsx` alone. (The flat stick-figure films of
 * `src/motion/` were retired on 23 November 2026, once every movement had clay.)
 */
export function Illustration({
  id,
  style,
  compact,
  plays,
}: {
  id: string;
  style?: ViewStyle;
  /** A thumbnail in a list: still, and the placeholder is just a small icon, no words. */
  compact?: boolean;
  /** 0 keeps the picture still; otherwise it moves as long as it shows. */
  plays?: number;
}) {
  const active = useCardActive();

  if (hasClay(id)) {
    return <ClayStretch key={id} id={id} style={style} still={compact || !active || plays === 0} />;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          backgroundColor: colors.raised,
        },
        style,
      ]}
    >
      <Icon name="stretch" size={compact ? 20 : 56} color={colors.line} />
      {compact ? null : (
        <Text
          style={{
            color: colors.faint,
            fontSize: 15,
            fontStyle: "italic",
          }}
        >
          No picture
        </Text>
      )}
    </View>
  );
}
