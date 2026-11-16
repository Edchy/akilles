import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
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

import durations from "../public/voice/durations.json";
import { LEGS, NAVY, PULL, PUSH, SCENES, type Carry, type Scene, type Touch } from "./script";

export const FPS = 30;
/** The voice comes in a beat after the picture, and the picture holds a breath after it. */
const LEAD = 0.35;
const TAIL = 0.9;
/** Scenes dissolve into each other over this many frames. */
const BLEND = 10;

const SCREEN = { width: 1206, height: 2622 };
const PHONE_HEIGHT = 1300;
const SCALE = PHONE_HEIGHT / SCREEN.height;
const PHONE_WIDTH = SCREEN.width * SCALE;
const BEZEL = 16;

const BG = "#F6F7F9";
const SANS = "Atkinson Hyperlegible Next";
const SERIF = "EB Garamond";

const voiceOf = (id: string) => (durations.scenes as Record<string, { file: string; seconds: number }>)[id];

/** How long a scene runs: its line, or its last still, whichever needs longer. */
export const sceneFrames = (id: string) => {
  const scene = SCENES.find((s) => s.id === id)!;
  const said = LEAD + (voiceOf(id)?.seconds ?? 3) + TAIL;
  const shown = Math.max(0, ...scene.shots.map((s) => s.at)) + 1.6;
  return Math.ceil(Math.max(said, shown) * FPS) + BLEND;
};

const sec = (s: number) => Math.round(s * FPS);

/** Humbell's own two faces, loaded before the first frame is drawn. */
function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      new FontFace(SANS, `url(${staticFile("fonts/AtkinsonHyperlegibleNext_400Regular.ttf")})`, { weight: "400" }),
      new FontFace(SANS, `url(${staticFile("fonts/AtkinsonHyperlegibleNext_600SemiBold.ttf")})`, { weight: "600" }),
      new FontFace(SANS, `url(${staticFile("fonts/AtkinsonHyperlegibleNext_700Bold.ttf")})`, { weight: "700" }),
      new FontFace(SERIF, `url(${staticFile("fonts/EBGaramond_400Regular.ttf")})`, { weight: "400" }),
      new FontFace(SERIF, `url(${staticFile("fonts/EBGaramond_400Regular_Italic.ttf")})`, { weight: "400", style: "italic" }),
      new FontFace(SERIF, `url(${staticFile("fonts/EBGaramond_500Medium.ttf")})`, { weight: "500" }),
    ];
    Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    });
  }, [handle]);
}

export const Onboarding = () => {
  useFonts();
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {SCENES.map((scene) => {
        const frames = sceneFrames(scene.id);
        const start = from;
        from += frames - BLEND;
        return (
          <Sequence key={scene.id} from={start} durationInFrames={frames} name={scene.id}>
            <SceneView scene={scene} frames={frames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

function SceneView({ scene, frames }: { scene: Scene; frames: number }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, BLEND], [0, 1], { extrapolateRight: "clamp" });
  const voice = voiceOf(scene.id);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {voice ? (
        <Sequence from={sec(LEAD)}>
          <Audio src={staticFile(`voice/${voice.file}`)} />
        </Sequence>
      ) : null}
      {scene.end ? <EndCard scene={scene} /> : <PhoneScene scene={scene} frames={frames} />}
    </AbsoluteFill>
  );
}

function PhoneScene({ scene, frames }: { scene: Scene; frames: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const zoom = scene.zoom;
  const z = zoom
    ? interpolate(frame, [sec(zoom.at), sec(zoom.at + 1.4)], [1, zoom.scale], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      })
    : 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: `${scene.tint}14` }} />
      <Title text={scene.title} />
      <div
        style={{
          position: "absolute",
          left: (1080 - PHONE_WIDTH) / 2 - BEZEL,
          top: 230 + (1 - rise) * 40,
          width: PHONE_WIDTH + BEZEL * 2,
          height: PHONE_HEIGHT + BEZEL * 2,
          borderRadius: 96,
          backgroundColor: "#0B1626",
          padding: BEZEL,
          boxShadow: "0 40px 80px rgba(19, 50, 91, 0.18), 0 8px 20px rgba(19, 50, 91, 0.10)",
        }}
      >
        <div style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, borderRadius: 82, overflow: "hidden", position: "relative", backgroundColor: "white" }}>
          <div
            style={{
              width: SCREEN.width,
              height: SCREEN.height,
              transform: `scale(${SCALE})`,
              transformOrigin: "0 0",
              position: "absolute",
            }}
          >
            <div
              style={{
                width: SCREEN.width,
                height: SCREEN.height,
                transform: `scale(${z})`,
                transformOrigin: zoom ? `${zoom.x}px ${zoom.y}px` : "50% 50%",
                position: "relative",
              }}
            >
              <Screens scene={scene} />
              {(scene.carries ?? []).map((c, i) => (
                <CarryView key={i} carry={c} shot={shotAt(scene, c.at)} />
              ))}
              {(scene.touches ?? []).map((t, i) => (
                <TouchView key={i} touch={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <Caption text={scene.line} frames={frames} />
    </AbsoluteFill>
  );
}

/** The still on screen at a time. */
const shotAt = (scene: Scene, t: number) => [...scene.shots].reverse().find((s) => s.at <= t)?.shot ?? scene.shots[0].shot;

function Screens({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  return (
    <>
      {scene.shots.map((s, i) => {
        const o = i === 0 ? 1 : interpolate(frame, [sec(s.at), sec(s.at) + 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <Img
            key={`${s.shot}-${i}`}
            src={staticFile(`shots/${s.shot}.png`)}
            style={{ position: "absolute", inset: 0, width: SCREEN.width, height: SCREEN.height, opacity: o }}
          />
        );
      })}
    </>
  );
}

/** A finger: a soft dot that lands, and a ring that spreads from it. */
function TouchView({ touch }: { touch: Touch }) {
  const frame = useCurrentFrame();
  const t0 = sec(touch.at);
  const f = frame - t0;
  if (f < -4) return null;
  const hold = touch.kind === "tap" ? 0 : sec(touch.for ?? 0.7);
  const moving = touch.kind === "drag" ? sec(touch.for ?? 0.9) : 0;
  const end = hold + moving + 8;
  if (f > end + 10) return null;
  const land = interpolate(f, [-4, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = interpolate(f, [end, end + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const along =
    touch.kind === "drag"
      ? interpolate(f, [hold, hold + moving], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) })
      : 0;
  const x = touch.kind === "drag" ? touch.x + (touch.toX - touch.x) * along : touch.x;
  const y = touch.kind === "drag" ? touch.y + (touch.toY - touch.y) * along : touch.y;
  // A tap rings once; a hold rings until it has been held long enough.
  const ring = interpolate(f, [0, touch.kind === "tap" ? 14 : hold], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 70,
          top: y - 70,
          width: 140,
          height: 140,
          borderRadius: 70,
          border: `8px solid ${NAVY}`,
          opacity: (1 - ring) * 0.5 * lift,
          transform: `scale(${0.6 + ring * 1.2})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 52,
          top: y - 52,
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: "rgba(19, 50, 91, 0.32)",
          border: "4px solid rgba(255, 255, 255, 0.9)",
          boxShadow: "0 6px 18px rgba(19, 50, 91, 0.25)",
          opacity: land * lift,
          transform: `scale(${0.7 + land * 0.3})`,
        }}
      />
    </>
  );
}

/** A held row, lifted off the screen and carried to its new place. */
function CarryView({ carry, shot }: { carry: Carry; shot: string }) {
  const frame = useCurrentFrame();
  const f = frame - sec(carry.at);
  const length = sec(carry.for);
  if (f < 0 || f > length + 6) return null;
  const up = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const along = interpolate(f, [8, length - 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const gone = interpolate(f, [length, length + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const height = carry.bottom - carry.top;
  return (
    <>
      {/* Where it was: a quiet gap while it is carried. */}
      <div style={{ position: "absolute", left: 0, top: carry.top, width: SCREEN.width, height, backgroundColor: "white", opacity: up * gone }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: carry.top + carry.by * along,
          width: SCREEN.width,
          height,
          overflow: "hidden",
          opacity: gone,
          transform: `scale(${1 + 0.035 * up})`,
          filter: `drop-shadow(0 ${24 * up}px ${40 * up}px rgba(19, 50, 91, ${0.28 * up}))`,
        }}
      >
        <Img src={staticFile(`shots/${shot}.png`)} style={{ position: "absolute", left: 0, top: -carry.top, width: SCREEN.width, height: SCREEN.height }} />
      </div>
    </>
  );
}

function Title({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: 92,
        width: "100%",
        textAlign: "center",
        fontFamily: SERIF,
        fontWeight: 500,
        fontSize: 76,
        color: NAVY,
        opacity: o,
        transform: `translateY(${(1 - o) * 12}px)`,
      }}
    >
      {text}
    </div>
  );
}

/** The line, in full, under the phone: read with the sound off. */
function Caption({ text, frames }: { text: string; frames: number }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [sec(LEAD) - 4, sec(LEAD) + 6, frames - BLEND, frames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 1600,
        left: 80,
        right: 80,
        height: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 48,
        lineHeight: 1.3,
        color: NAVY,
        opacity: o,
      }}
    >
      {text}
    </div>
  );
}

/** The close: the three day shapes come in, then the name and the promise. */
function EndCard({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (i: number) => spring({ frame: frame - 6 - i * 6, fps, config: { damping: 12, stiffness: 140 } });
  const word = interpolate(frame, [26, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = interpolate(frame, [sec(LEAD) + 10, sec(LEAD) + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const size = 150;
  return (
    <AbsoluteFill style={{ backgroundColor: "white", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", gap: 44, marginBottom: 70 }}>
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${pop(0)})` }}>
          <polygon points="2,22 12,3 22,22" fill={PUSH} />
        </svg>
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${pop(1)})` }}>
          <polygon points="2,2 22,2 12,21" fill={PULL} />
        </svg>
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${pop(2)})` }}>
          <rect x="3" y="3" width="18" height="18" fill={LEGS} />
        </svg>
      </div>
      <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 190, color: NAVY, opacity: word, lineHeight: 1 }}>Humbell</div>
      <div
        style={{
          marginTop: 56,
          maxWidth: 820,
          textAlign: "center",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 60,
          lineHeight: 1.25,
          color: NAVY,
          opacity: line,
        }}
      >
        {scene.line}
      </div>
    </AbsoluteFill>
  );
}
