import { View, type ViewStyle } from "react-native";
import { Text } from "@/components/text";

import { useCardActive } from "@/components/card-context";
import { ClayStretch, hasClay } from "@/components/clay";
import { Drawing } from "@/components/drawing";
import { Film } from "@/components/film";
import { Icon } from "@/components/icon";
import { colors, FAMILY } from "@/constants/theme";
import { ART } from "@/data/art";
import { CARDIO, STRETCHES } from "@/data/conditioning";
import { byId } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import { mix } from "@/motion/marks";
import { MOVES, RESHOOT } from "@/motion/moves";

/**
 * The movements shown in Klay's own drawings (see `components/drawing.tsx`):
 * each drawn against Klay's figure sheet and looked over, frame by frame.
 * The rest of `ART` is drawn but not yet passed.
 */
const DRAWN: ReadonlySet<string> = new Set(["goblet_squat"]);

/** Whether there is a picture: the clay figure, a drawing, or a film that reads. */
export const hasIllustration = (id: string): boolean =>
  hasClay(id) || DRAWN.has(id) || (id in MOVES && !RESHOOT.has(id));

/**
 * The picture of a movement — a lift, a machine or a stretch — by its id.
 *
 * A stretch with the clay figure's pictures (see `components/clay.tsx`) shows
 * those, before anything below.
 *
 * Klay's own drawing where one has passed (`DRAWN`): the figure moving at the pace
 * of a rep, the part that works in the accent. Otherwise a film where there
 * is one that reads (see `motion/`; not one waiting to be reshot, `RESHOOT`):
 * the movement drawn flat in Klay's marks. Given `plays`, a film loops that
 * many times and then holds its still, so a picture on screen through a whole
 * hold or set isn't drawing all the while. Anything else shows a quiet
 * placeholder. Every screen asks for its picture here, so changing the art is
 * a change to this file, `components/clay.tsx` and `motion/` alone.
 */
export function Illustration({
  id,
  style,
  compact,
  plays,
  film: filmed,
}: {
  id: string;
  style?: ViewStyle;
  /** Always the film, where there is one: pictures shown in turn are one kind. */
  film?: boolean;
  /** A thumbnail in a list: the placeholder is just a small icon, no words. */
  compact?: boolean;
  /** How many times a film loops before it rests on its still; by default, as long as it shows. */
  plays?: number;
}) {
  const active = useCardActive();
  const always = !!filmed && id in MOVES;
  const drawn = !always && DRAWN.has(id) && id in ART;
  const film = always || (!drawn && id in MOVES && !RESHOOT.has(id));

  // A stretch in the clay figure's pictures, breathing by itself; still as a thumbnail or at rest.
  if (hasClay(id)) {
    return <ClayStretch key={id} id={id} style={style} still={compact || !active || plays === 0} />;
  }

  if (drawn) {
    const family = familyOfPicture(id);
    // The part that works is in the family's colour, so it stands out of the black figure.
    const accent = FAMILY[family].field;
    return (
      <Drawing
        key={id}
        id={id}
        colors={{ ...filmColors(family), accent }}
        style={style}
        plays={compact || !active ? 0 : plays}
      />
    );
  }

  if (film) {
    const colors = filmColors(familyOfPicture(id));
    return <Film key={id} id={id} colors={colors} style={style} plays={compact || !active ? 0 : plays} />;
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

/**
 * A film's field, its one ink, and the ink's tint over the field: the app's
 * own page and ink, the same for every family, so a picture reads as part of
 * the page — the family's colour stays on the card and the mark round it.
 * (Before 17 November 2026 the field was the family's colour.)
 */
function filmColors(_family: Family) {
  const field = colors.bg;
  const ink = colors.text;
  return { field, ink, tint: mix(ink, field, TINT) };
}
