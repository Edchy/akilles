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

import { MORPH_STEPS, SHAPING } from "./logo-film";
import { INK, PAPER } from "./script";

export const LOGO_FPS = 30;
const SERIF = "EB Garamond";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sec = (s: number) => Math.round(s * LOGO_FPS);

/** When the K is done, the voice starts a beat later, and the film holds after it. */
const SHAPED = SHAPING.reduce((t, f) => t + f.hold + f.morph, 0);
const VOICE_AT = SHAPED + 0.5;
export const logoFrames = (voice: number) => sec(VOICE_AT + voice + 1.2);

/** Slow at both ends, quick in the middle, so the in-between is brief. */
const melt = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (6 * x - 15) + 10);
};

/**
 * The clay flows from shape to shape, through the in-between shapes that
 * art/morph.py works out, under a soft press, a hand pushing it down and out,
 * while the camera eases in. The K
 * lands with a small squash and stays.
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

  const t = frame / fps;
  // Which shape is melting into which, and how far along.
  let at = 0;
  let from = SHAPING.length - 1;
  let p = 0;
  for (let i = 0; i < SHAPING.length - 1; i++) {
    const start = at + SHAPING[i].hold;
    const end = start + SHAPING[i].morph;
    if (t < end) {
      from = i;
      p = t < start ? 0 : (t - start) / SHAPING[i].morph;
      break;
    }
    at = end;
  }
  const done = from === SHAPING.length - 1;
  const e = melt(p);
  const press = Math.sin(Math.PI * p);
  const settle = spring({ frame: frame - sec(SHAPED), fps, config: { damping: 12, stiffness: 120, mass: 0.8 } });
  const land = done ? Math.sin(Math.PI * settle) * 0.035 * (1 - settle * 0.6) : 0;
  const squashY = 1 - press * 0.03 - land;
  const squashX = 1 + press * 0.025 + land * 0.8;
  const push = interpolate(t, [0, SHAPED + 0.6], [0.93, 1], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 });
  // The shape at this moment: a stage, or one of the in-betweens between two.
  const step = Math.round(e * (MORPH_STEPS + 1));
  const file = done
    ? SHAPING[from].file
    : step === 0
      ? SHAPING[from].file
      : step > MORPH_STEPS
        ? SHAPING[from + 1].file
        : `logo/morph/${from}-${String(step - 1).padStart(2, "0")}.png`;

  const line = interpolate(frame, [sec(VOICE_AT + 0.45), sec(VOICE_AT + 0.95)], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 720,
          height: 720,
          transform: `scale(${push * squashX}, ${push * squashY})`,
          transformOrigin: "50% 88%",
        }}
      >
        <Img src={staticFile(file)} style={{ width: 720, height: 720, objectFit: "contain" }} />
      </div>
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
