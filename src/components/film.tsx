import { useEffect, useId, useState } from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Path } from "react-native-svg";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { filmOf, STILL_SECONDS } from "@/motion/film";
import { draw, type FilmColors } from "@/motion/marks";
import { MOVES } from "@/motion/moves";

/**
 * A movement's short film (see `motion/film.ts`), drawn flat in Milo's marks
 * (see `motion/marks.ts`) and looping for as long as it is on screen. With
 * Reduce Motion it holds one still: the hardest point, from the side.
 */
export function Film({ id, colors, style }: { id: string; colors: FilmColors; style?: ViewStyle }) {
  const still = useReduceMotion();
  const move = MOVES[id];
  const film = filmOf(move.film.views);
  const [seconds, setSeconds] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const clip = `film-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    if (still) return;
    const start = Date.now();
    let frame = requestAnimationFrame(function tick() {
      setSeconds(((Date.now() - start) / 1000) % film.seconds);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [still, film.seconds]);

  const moment = film.momentAt(still ? STILL_SECONDS : seconds);
  const drawing = size ? draw(move, moment, colors, size) : null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width !== size?.width || layout.height !== size?.height) {
          setSize({ width: layout.width, height: layout.height });
        }
      }}
      style={[{ overflow: "hidden", backgroundColor: colors.field }, style]}
    >
      {drawing ? (
        <Svg width="100%" height="100%">
          <Defs>
            <ClipPath id={clip}>
              <Path d={drawing.body} />
            </ClipPath>
          </Defs>
          {drawing.paints.map((p) => (
            <Path
              key={p.key}
              d={p.d}
              fill={p.fill ?? "none"}
              stroke={p.stroke}
              strokeWidth={p.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={p.clipped ? `url(#${clip})` : undefined}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
