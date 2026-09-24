import { Text, View, type ViewStyle } from "react-native";

import { Icon } from "@/components/icon";
import { colors } from "@/constants/theme";

/**
 * The picture of a movement — a lift, a machine or a stretch — by its id.
 *
 * A placeholder for now: the illustrations are still to be made, in a
 * direction not yet chosen. Every screen that will show one already asks for
 * it here, so dropping the images in later is a change to this file alone.
 */
export function Illustration({ id, style }: { id: string; style?: ViewStyle }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // The id is kept on the view so a placeholder can be matched to its
      // eventual image while the set is being made.
      testID={`illustration-${id}`}
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
      <Icon name="stretch" size={56} color={colors.line} weight="regular" />
      <Text
        style={{
          color: colors.faint,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Illustration to come
      </Text>
    </View>
  );
}
