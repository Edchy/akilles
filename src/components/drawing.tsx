import { useEffect, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ART, ART_BOX, ART_FLOOR } from "@/data/art";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import type { FilmColors } from "@/motion/marks";

/**
 * The pace of a rep, in seconds, as Milo teaches it: stand ready, lower
 * slowly, pause at the hardest point, come up. The picture keeps this time,
 * so watching it is learning the pace — owning the weight on the way down.
 */
const TEMPO = { ready: 0.8, lower: 2.4, pause: 0.8, lift: 1.2 };

export type DrawingColors = FilmColors & {
  /** The part of the body that works: the one thing on the figure not in the ink. */
  accent: string;
};

/**
 * Milo's own picture of a movement (see `data/art.ts`): Milo drawn from the
 * start of the rep to its hardest point, one frame cutting to the next at
 * the pace of a rep (see `TEMPO`), with the part of the body that works in
 * the accent. A cut, never a blend: two poses blended are two ghosts, and
 * hard to look at. It loops for as long as it is on screen — or, given
 * `plays`, that many times before it rests on the hardest point. With Reduce
 * Motion, or with one frame (a stretch is a hold), it holds still.
 */
export function Drawing({
  id,
  colors,
  style,
  plays,
}: {
  id: string;
  colors: DrawingColors;
  style?: ViewStyle;
  plays?: number;
}) {
  const still = useReduceMotion();
  const frames = ART[id];
  const last = frames.length - 1;
  const [at, setAt] = useState(last);

  useEffect(() => {
    if (still || plays === 0 || last === 0) {
      setAt(last);
      return;
    }
    // One rep, frame by frame: each shows for its share of the way down or
    // up, the first and the last also through the wait at either end.
    const share = (seconds: number, frame: number) =>
      seconds / last / (frame === 0 || frame === last ? 2 : 1);
    const rep: { frame: number; seconds: number }[] = [];
    for (let f = 0; f < last; f++) {
      rep.push({ frame: f, seconds: (f === 0 ? TEMPO.ready : 0) + share(TEMPO.lower, f) });
    }
    rep.push({ frame: last, seconds: share(TEMPO.lower, last) + TEMPO.pause + share(TEMPO.lift, last) });
    for (let f = last - 1; f >= 0; f--) rep.push({ frame: f, seconds: share(TEMPO.lift, f) });

    let timer: ReturnType<typeof setTimeout>;
    let step = 0;
    let reps = 0;
    const show = () => {
      const { frame, seconds } = rep[step];
      setAt(frame);
      // Played out: it rests on the hardest point.
      if (reps === plays && frame === last) return;
      timer = setTimeout(() => {
        step = (step + 1) % rep.length;
        if (step === 0) reps++;
        show();
      }, seconds * 1000);
    };
    show();
    return () => clearTimeout(timer);
  }, [still, plays, last]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ overflow: "hidden", backgroundColor: colors.field }, style]}
    >
      {frames.map((frame, i) => (
        // Every frame stays mounted, so a cut never waits on a frame to draw.
        <View key={i} style={[StyleSheet.absoluteFill, { opacity: i === at ? 1 : 0 }]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${ART_BOX.width} ${ART_BOX.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* The floor, edge to edge whatever the picture's shape. */}
            <Path
              d={`M${-4 * ART_BOX.width},${ART_FLOOR.y}H${5 * ART_BOX.width}`}
              stroke={colors.tint}
              strokeWidth={ART_FLOOR.thickness}
            />
            <Path d={frame.tint} fill={colors.tint} />
            <Path d={frame.ink} fill={colors.ink} />
            {frame.accent ? <Path d={frame.accent} fill={colors.accent} /> : null}
          </Svg>
        </View>
      ))}
    </View>
  );
}
