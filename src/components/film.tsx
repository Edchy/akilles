import { useEffect, useId, useMemo, useState } from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Path } from "react-native-svg";

import { useReduceMotion } from "@/lib/use-reduce-motion";
import { filmOf } from "@/motion/film";
import { draw, type FilmColors } from "@/motion/marks";
import { MOVES } from "@/motion/moves";

/**
 * A movement's short film (see `motion/film.ts`), drawn flat in Humbell's marks
 * (see `motion/marks.ts`), looping for as long as it is on screen — or, given
 * `plays`, that many times before it rests on its still. With Reduce Motion
 * it holds the still from the start: the hardest point, from the side.
 */
export function Film({
  id,
  colors,
  style,
  plays,
}: {
  id: string;
  colors: FilmColors;
  style?: ViewStyle;
  plays?: number;
}) {
  const still = useReduceMotion();
  const move = MOVES[id];
  const film = useMemo(() => filmOf(move.film), [move]);
  const [seconds, setSeconds] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number }>();
  const clip = `film-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    if (still) return;
    const start = Date.now();
    const end = plays === undefined ? Infinity : film.restsAt(plays);
    let frame = requestAnimationFrame(function tick() {
      const at = (Date.now() - start) / 1000;
      // At rest nothing is drawn again until the film is shown afresh.
      setSeconds(Math.min(at, end) % film.seconds);
      if (at < end) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [still, film, plays]);

  const moment = film.momentAt(still ? film.still : seconds);
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
            {drawing.clips.map((d, i) => (
              <ClipPath key={i} id={`${clip}-${i}`}>
                <Path d={d} />
              </ClipPath>
            ))}
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
              clipPath={p.clip === undefined ? undefined : `url(#${clip}-${p.clip})`}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
