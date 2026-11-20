import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { SHAPING } from "./logo-film";
import { INK, PAPER } from "./script";

export const LOGO_FPS = 30;
const SERIF = "EB Garamond";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sec = (s: number) => Math.round(s * LOGO_FPS);

/** When the K is done, the voice starts a beat later, and the film holds after it. */
const SHAPED = SHAPING.reduce((t, f) => t + f.hold, 0);
const VOICE_AT = SHAPED + 0.5;
export const logoFrames = (voice: number) => sec(VOICE_AT + voice + 1.2);

/**
 * Stop-motion: each frame of the shaping cuts hard to the next, with the
 * faintest wobble, as a hand-moved set does. The last, the K, settles with
 * a small squash and stays.
 */
export function LogoFilm({ voice }: { voice: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      new FontFace(SERIF, `url(${staticFile("fonts/EBGaramond_400Regular_Italic.ttf")})`, { weight: "400", style: "italic" }),
    ];
    Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    });
  }, [handle]);

  let at = 0;
  const starts = SHAPING.map((f) => {
    const s = at;
    at += f.hold;
    return sec(s);
  });
  const shown = Math.max(0, starts.filter((s) => s <= frame).length - 1);
  const last = shown === SHAPING.length - 1;
  // A hand-moved set never sits quite still between frames.
  const jitter = last ? 0 : ((shown * 37) % 7) - 3;
  const settle = last ? spring({ frame: frame - starts[shown], fps, config: { damping: 9, stiffness: 140, mass: 0.7 } }) : 1;
  const squash = last ? 1 + (1 - settle) * 0.06 : 1;
  const line = interpolate(frame, [sec(VOICE_AT + 0.45), sec(VOICE_AT + 0.95)], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, alignItems: "center", justifyContent: "center" }}>
      <Img
        src={staticFile(SHAPING[shown].file)}
        style={{
          width: 720,
          height: 720,
          objectFit: "contain",
          transform: `translate(${jitter}px, ${-jitter / 2}px) scale(${2 - squash}, ${squash})`,
          transformOrigin: "50% 90%",
        }}
      />
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 92,
          color: INK,
          marginTop: 10,
          opacity: line,
          transform: `translateY(${(1 - line) * 14}px)`,
        }}
      >
        Get in shape.
      </div>
      <Sequence from={sec(VOICE_AT)}>
        <Audio src={staticFile("voice/logo.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
}
