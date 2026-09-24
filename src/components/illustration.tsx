import { useEffect, useState } from "react";
import { Image, Text, View, type ViewStyle } from "react-native";

import { Icon } from "@/components/icon";
import { colors } from "@/constants/theme";
import { PHOTOS } from "@/data/photos";

/** How long each frame of a lift shows before flipping to the other. */
const FRAME_MS = 1100;

/**
 * The picture of a movement — a lift, a machine or a stretch — by its id.
 *
 * A photo where one exists (see `data/photos.ts`); a lift's start and finish
 * frames flip back and forth so the movement reads like a short loop. Both
 * frames are mounted and only their opacity changes, so the flip never waits
 * on an image to load. Anything without a photo shows a quiet placeholder.
 * Every screen asks for its picture here, so changing the art — photos,
 * illustrations — is a change to this file and `data/photos.ts` alone.
 */
export function Illustration({ id, style }: { id: string; style?: ViewStyle }) {
  const frames = PHOTOS[id];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (!frames || frames.length < 2) return;
    const flip = setInterval(() => setFrame((f) => (f + 1) % frames.length), FRAME_MS);
    return () => clearInterval(flip);
  }, [frames]);

  if (frames) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ overflow: "hidden", backgroundColor: colors.raised }, style]}
      >
        {frames.map((source, i) => (
          <Image
            key={i}
            source={source}
            resizeMode="cover"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: i === frame ? 1 : 0,
            }}
          />
        ))}
      </View>
    );
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
