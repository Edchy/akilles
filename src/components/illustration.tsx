import { useEffect, useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { Text } from "@/components/text";

import { Film } from "@/components/film";
import { Icon } from "@/components/icon";
import { colors, FAMILY } from "@/constants/theme";
import { CARDIO, STRETCHES } from "@/data/conditioning";
import { byId } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import { PHOTOS } from "@/data/photos";
import { mix } from "@/motion/marks";
import { MOVES } from "@/motion/moves";

/** How long each frame of a lift shows before flipping to the other. */
const FRAME_MS = 1100;

/**
 * The picture of a movement — a lift, a machine or a stretch — by its id.
 *
 * A film where Milo has one (see `motion/`): the movement drawn flat in
 * Milo's marks, a rep from the side and a rep from the front — except as a
 * thumbnail, where the photo stays. Otherwise a photo (see
 * `data/photos.ts`); a lift's start and finish frames flip back and forth so
 * the movement reads like a short loop. Both frames are mounted and only
 * their opacity changes, so the flip never waits on an image to load.
 * Anything without a photo shows a quiet placeholder.
 * Every screen asks for its picture here, so changing the art — photos,
 * films — is a change to this file, `data/photos.ts` and `motion/` alone.
 */
export function Illustration({
  id,
  style,
  compact,
}: {
  id: string;
  style?: ViewStyle;
  /** A thumbnail in a list: the placeholder is just a small icon, no words. */
  compact?: boolean;
}) {
  const frames = PHOTOS[id];
  const count = frames?.length ?? 0;
  const [frame, setFrame] = useState(0);

  const film = !compact && MOVES[id] !== undefined;

  useEffect(() => {
    setFrame(0);
    if (film || count < 2) return;
    const flip = setInterval(() => setFrame((f) => (f + 1) % count), FRAME_MS);
    return () => clearInterval(flip);
  }, [id, count, film]);

  if (film) {
    return <Film key={id} id={id} colors={filmColors(familyOfPicture(id))} style={style} />;
  }

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
      <Icon name="stretch" size={compact ? 20 : 56} color={colors.line} />
      {compact ? null : (
        <Text
          style={{
            color: colors.faint,
            fontSize: 15,
            fontStyle: "italic",
          }}
        >
          Illustration to come
        </Text>
      )}
    </View>
  );
}

/** A picture's family: a lift's own, a cardio machine's, or a stretch's. */
function familyOfPicture(id: string): Family {
  const lift = byId(id);
  if (lift) return familyOf(lift);
  if (CARDIO.some((c) => c.id === id)) return "cardio";
  if (STRETCHES.some((s) => s.id === id)) return "mobility";
  return "push";
}

/**
 * How much of the ink the tint carries: enough to read as the far side of the
 * body, back far enough that the near side leads.
 */
const TINT = 0.42;

/** A film's field, the field's one ink, and the ink's tint over the field. */
function filmColors(family: Family) {
  const { field, dark } = FAMILY[family];
  const ink = dark ? colors.white : colors.text;
  return { field, ink, tint: mix(ink, field, TINT) };
}
