import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import film from "../public/voice/film.json";
import {
  CREAM,
  CREAM_SOFT,
  DUSK,
  INK,
  MUTED,
  PAPER,
  SCENES,
  TAP_CIRCLE,
  TAP_START,
  type ClayShot,
  type Cue,
  type Scene,
  type Shot,
} from "./script";

export const FPS = 30;
const W = 1080;

/** Before a line, the picture is already up this long; after it, it holds a breath. */
const LEAD = 0.5;
const TAIL = 0.6;
/** After the last line, the K holds this long. */
const HOLD = 1.8;
/** Scenes dissolve into each other over this many frames. */
const BLEND = 8;

/** The picture fills the frame above the words; the words sit low, under it. */
const STAGE_H = 1600;
const WORDS_TOP = 1640;
/** A clay picture is 3:2, drawn this wide (wider than the frame: he fills it). */
const PIC_W = 1720;
const PIC_H = PIC_W * (2 / 3);

const SERIF = "EB Garamond";
const SANS = "Atkinson Hyperlegible Next";

type Line = { start: number; end: number; words: { word: string; start: number; end: number }[] };
const lineOf = (id: string) => (film.lines as Record<string, Line>)[id];

// ---- the timeline: built from the voice's own timings ----

type Timed = { scene: Scene; line: Line; start: number; lead: number; length: number };

const TIMELINE: Timed[] = (() => {
  let at = 0;
  return SCENES.map((scene, i) => {
    const line = lineOf(scene.id);
    const lead = scene.lead ?? LEAD;
    const last = i === SCENES.length - 1;
    const length = lead + (line.end - line.start) + (last ? HOLD : TAIL);
    const timed = { scene, line, start: at, lead, length };
    at += length - BLEND / FPS;
    return timed;
  });
})();

export const filmFrames = () => {
  const last = TIMELINE[TIMELINE.length - 1];
  return Math.ceil((last.start + last.length) * FPS);
};

const sec = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = { ...clamp, easing: Easing.inOut(Easing.cubic) } as const;

/** A cue, as seconds into its scene. */
const cueAt = (t: Timed, cue: Cue | undefined): number => {
  if (cue === undefined) return 0;
  if (typeof cue === "number") return t.lead + cue;
  const want = cue.word.toLowerCase();
  const w = t.line.words.find((x) => x.word.toLowerCase() === want);
  if (!w) throw new Error(`No "${cue.word}" in "${t.scene.line}"`);
  return t.lead + (w.start - t.line.start) + (cue.plus ?? 0);
};

/** The scene's own time, in seconds. */
const useSeconds = () => useCurrentFrame() / FPS;

/** The app's own faces, loaded before the first frame is drawn. */
function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const face = (family: string, file: string, weight: string, style = "normal") =>
      new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, { weight, style });
    const faces = [
      face(SERIF, "EBGaramond_400Regular.ttf", "400"),
      face(SERIF, "EBGaramond_400Regular_Italic.ttf", "400", "italic"),
      face(SERIF, "EBGaramond_500Medium.ttf", "500"),
      face(SANS, "AtkinsonHyperlegibleNext_400Regular.ttf", "400"),
      face(SANS, "AtkinsonHyperlegibleNext_600SemiBold.ttf", "600"),
    ];
    Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    });
  }, [handle]);
}

// ---- the film ----

export const Onboarding = () => {
  useFonts();
  const total = filmFrames();
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {TIMELINE.map((t) => (
        <Sequence key={t.scene.id} from={sec(t.start)} durationInFrames={sec(t.length)} name={t.scene.id}>
          <SceneView t={t} />
        </Sequence>
      ))}
      <Score total={total} />
    </AbsoluteFill>
  );
};

function SceneView({ t }: { t: Timed }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, BLEND], [0, 1], clamp);
  const s = frame / FPS;
  const shots = t.scene.shots;
  // Which shot is up: the last one whose cue has come.
  const starts = shots.map((shot) => cueAt(t, shot.from));
  let k = 0;
  while (k < shots.length - 1 && s >= starts[k + 1]) k++;
  return (
    <AbsoluteFill style={{ opacity: fadeIn, backgroundColor: PAPER }}>
      <Sequence from={sec(t.lead)} name="voice">
        <Audio
          src={staticFile("voice/film.mp3")}
          startFrom={Math.max(0, sec(t.line.start - 0.04))}
          endAt={sec(t.line.end + 0.12)}
        />
      </Sequence>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: STAGE_H, overflow: "hidden" }}>
        {shots.map((shot, i) => {
          const from = starts[i];
          const until = i < shots.length - 1 ? starts[i + 1] : t.length;
          // An app screen grows out of what's under it, so the one before stays up beneath it.
          const opening = shots[i + 1] && shots[i + 1].kind !== "clay" && shots[i + 1].kind !== "logo";
          const shown = i === k || (opening && i === k - 1 && s < starts[k] + 0.6);
          if (!shown) return null;
          return (
            <Sequence key={i} from={sec(from)} name={shot.kind === "clay" ? shot.id : shot.kind} layout="none">
              <ShotView shot={shot} t={t} span={until - from} offset={from} />
            </Sequence>
          );
        })}
      </div>
      {t.scene.shots[0].kind === "logo" ? null : <Caption t={t} />}
    </AbsoluteFill>
  );
}

function ShotView({ shot, t, span, offset }: { shot: Shot; t: Timed; span: number; offset: number }) {
  switch (shot.kind) {
    case "clay":
      return <ClayView shot={shot} t={t} span={span} offset={offset} />;
    case "today":
      return <Screen opens><Today tap={cueAt(t, TAP_START) - offset} /></Screen>;
    case "lift":
      return (
        <Screen opens={t.scene.id === "start"}>
          <Lift tap={t.scene.id === "slowly" ? cueAt(t, TAP_CIRCLE) - offset : undefined} />
        </Screen>
      );
    case "logo":
      return <LogoView t={t} />;
  }
}

// ---- clay ----

/** A tiny shake every other frame, as a stop-motion set never quite holds still. */
const boil = (frame: number) => {
  const step = Math.floor(frame / 2);
  const r = (n: number) => {
    const x = Math.sin(step * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  };
  return { x: r(1) * 2.4, y: r(2) * 2.4, rot: r(3) * 0.25 };
};

/** The clay fellow on the page: his poses flip like stop-motion while the camera drifts in. */
function ClayView({ shot, t, span, offset }: { shot: ClayShot; t: Timed; span: number; offset: number }) {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  // Pose cues are in the scene's time; this shot's time starts at `offset`.
  const poses = shot.poses.map((p) => ({ n: p.n, at: Math.max(0, cueAt(t, p.at) - offset) }));
  let p = 0;
  while (p < poses.length - 1 && s >= poses[p + 1].at) p++;
  let pose = poses[p].n;
  let prev: number | undefined;
  let mix = 1;
  if (shot.cycle && p === poses.length - 1) {
    // After the last cue, flip between this pose and its partner.
    const flips = Math.floor((s - poses[p].at) / shot.cycle);
    if (flips % 2 === 1) pose = pose ^ 1;
  } else if (shot.melt && p > 0) {
    prev = poses[p - 1].n;
    mix = interpolate(s - poses[p].at, [0, shot.melt], [0, 1], smooth);
  }
  const [z0, z1] = shot.zoom ?? [1, 1.06];
  const zoom = interpolate(s, [0, span], [z0, z1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const [fx, fy] = shot.focus ?? [0.5, 0.5];
  const b = boil(frame);
  const run = shot.travel ? shot.travel * (s - span / 2) : 0;
  const hop = shot.hop && shot.cycle ? -Math.abs(Math.sin((Math.PI * s) / shot.cycle)) * 22 : 0;
  const picture = (n: number, opacity: number) => (
    <Img
      key={n}
      src={staticFile(`clay/${shot.id}-${n}.jpg`)}
      style={{ position: "absolute", left: 0, top: 0, width: PIC_W, height: PIC_H, opacity }}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: shot.dusk ? "#F6EDE4" : PAPER }}>
      <div
        style={{
          position: "absolute",
          left: (W - PIC_W) / 2,
          top: (STAGE_H - PIC_H) / 2 - 40,
          width: PIC_W,
          height: PIC_H,
          transformOrigin: `${fx * 100}% ${fy * 100}%`,
          transform: `translate(${b.x + run}px, ${b.y + hop}px) rotate(${b.rot}deg) scale(${zoom})`,
          ...(shot.dusk ? { filter: "sepia(0.18) saturate(1.1) brightness(0.98)" } : {}),
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
          WebkitMaskComposite: "source-in",
        }}
      >
        {prev !== undefined && mix < 1 ? picture(prev, 1) : null}
        {picture(pose, prev !== undefined ? mix : 1)}
      </div>
      {shot.dusk ? (
        // The light on the way home: warm low down, a little violet up top.
        <AbsoluteFill
          style={{
            background: "linear-gradient(to bottom, rgba(150, 120, 190, 0.16), rgba(255, 190, 140, 0.0) 45%, rgba(255, 170, 110, 0.2))",
            mixBlendMode: "multiply",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}

// ---- the app ----

/** The phone's screen, big: 860 wide, as the app is 393 points (×2.19). */
const SCREEN = { left: 110, top: 130, width: 860, height: 1420, radius: 76 };
const PT = 2.19;

/** The app, full size: it grows out of the phone in his hands. */
function Screen({ opens, children }: { opens?: boolean; children: ReactNode }) {
  const frame = useCurrentFrame();
  const g = opens ? interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 1;
  // From the phone (about where it is in the picture, zoomed) to the screen.
  const from = { x: 540, y: 700, w: 90, h: 150 };
  const w = from.w + (SCREEN.width - from.w) * g;
  const h = from.h + (SCREEN.height - from.h) * g;
  const x = from.x + (SCREEN.left + SCREEN.width / 2 - from.x) * g - w / 2;
  const y = from.y + (SCREEN.top + SCREEN.height / 2 - from.y) * g - h / 2;
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: PAPER, opacity: g }} />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: 18 + (SCREEN.radius - 18) * g,
          backgroundColor: PAPER,
          border: `3px solid ${INK}`,
          boxShadow: "0 40px 80px rgba(28, 28, 26, 0.16)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SCREEN.width,
            height: SCREEN.height,
            transformOrigin: "0 0",
            transform: `scale(${w / SCREEN.width}, ${h / SCREEN.height})`,
            opacity: interpolate(g, [0.5, 1], [0, 1], clamp),
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

/** A dusk card: the family's colour running down to near-black, its shape glowing faintly off the top right. */
function DuskCard({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: 12 * PT,
        overflow: "hidden",
        background: `linear-gradient(160deg, ${DUSK.top} 0%, ${DUSK.foot} 75%)`,
        color: CREAM,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -120,
          top: 70,
          width: 360,
          height: 360,
          borderRadius: 180,
          backgroundColor: DUSK.glow,
          opacity: 0.24,
          boxShadow: `0 0 60px ${DUSK.glow}`,
        }}
      />
      {children}
    </div>
  );
}

/** The fingertip the app's hints use (components/hint.tsx), three times the size; placed by its tip. */
function Finger({ tap, x, y }: { tap: number; x: number; y: number }) {
  const s = useSeconds();
  const seen = interpolate(s, [tap - 0.6, tap - 0.3, tap + 0.45, tap + 0.75], [0, 1, 1, 0], clamp);
  if (seen <= 0) return null;
  const come = interpolate(s, [tap - 0.6, tap], [1, 0], smooth);
  const press = s >= tap && s < tap + 0.18;
  const go = interpolate(s, [tap + 0.3, tap + 0.75], [0, 1], smooth);
  const dx = 70 * come + 50 * go;
  const dy = 130 * come + 90 * go + (press ? 6 : 0);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 39 + dx,
        top: y - 9 + dy,
        width: 78,
        height: 192,
        opacity: seen,
        transform: `rotate(-14deg) scale(${press ? 0.95 : 1})`,
        transformOrigin: "39px 9px",
        filter: "drop-shadow(0 18px 18px rgba(0,0,0,0.28))",
        zIndex: 50,
      }}
    >
      <svg width={78} height={192} viewBox="0 0 26 64">
        <rect x={1} y={1} width={24} height={62} rx={12} fill={CREAM} stroke={INK} strokeWidth={2} />
        <path
          d="M6.5 14 a6.5 6.5 0 0 1 13 0 v5 a2.5 2.5 0 0 1 -2.5 2.5 h-8 a2.5 2.5 0 0 1 -2.5 -2.5 z"
          fill={PAPER}
          stroke={INK}
          strokeWidth={1.2}
          opacity={0.8}
        />
        <path d="M8 38 h10 M8 50 h10" stroke={INK} strokeWidth={1.3} strokeLinecap="round" opacity={0.45} />
      </svg>
    </div>
  );
}

const START = { left: 50, top: 1040, width: 760, height: 140 };

/** Today: the next workout as a dusk card, and Start under it, tapped. */
function Today({ tap }: { tap: number }) {
  const s = useSeconds();
  const pressed = s >= tap && s < tap + 0.2;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 50, top: 110, fontFamily: SERIF, fontStyle: "italic", fontSize: 50, color: MUTED }}>
        Today
      </div>
      <DuskCard style={{ left: 50, top: 210, width: 760, height: 780 }}>
        <div style={{ position: "absolute", left: 56, top: 56, fontFamily: SANS, fontSize: 34, color: CREAM_SOFT }}>Next up</div>
        <div style={{ position: "absolute", left: 52, top: 104, fontFamily: SERIF, fontWeight: 500, fontSize: 132 }}>Legs</div>
        <div style={{ position: "absolute", left: 56, right: 56, top: 330 }}>
          {[
            ["Goblet squat", "8 kg"],
            ["Lunge", "body"],
            ["Leg press", "30 kg"],
            ["Stretch", "5 min"],
          ].map(([name, what]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", fontFamily: SERIF, fontSize: 50, marginBottom: 34 }}>
              <span>{name}</span>
              <span style={{ color: CREAM_SOFT }}>{what}</span>
            </div>
          ))}
        </div>
      </DuskCard>
      <div
        style={{
          position: "absolute",
          ...START,
          borderRadius: 10 * PT,
          backgroundColor: DUSK.top,
          color: CREAM,
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pressed ? 0.97 : 1})`,
          opacity: pressed ? 0.85 : 1,
        }}
      >
        Start
      </div>
      <Finger tap={tap} x={START.left + START.width / 2 + 60} y={START.top + START.height / 2 + 10} />
    </AbsoluteFill>
  );
}

const CIRCLE = 180;
const CIRCLES_TOP = 760;
const circleLeft = (i: number) => 50 + (760 - 3 * CIRCLE - 2 * 50) / 2 + i * (CIRCLE + 50);

/** A lift's card: the weight, and three sets; a tapped set fills like a glass with the family's glow. */
function Lift({ tap }: { tap?: number }) {
  const s = useSeconds();
  const fill = tap === undefined ? 0 : interpolate(s, [tap + 0.05, tap + 0.75], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pop = tap === undefined ? 1 : interpolate(s, [tap, tap + 0.12, tap + 0.4], [1, 0.93, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 50, top: 110, fontFamily: SANS, fontSize: 34, color: MUTED }}>1 of 4</div>
      <DuskCard style={{ left: 50, top: 180, width: 760, height: 1180 }}>
        <div style={{ position: "absolute", top: 90, width: "100%", textAlign: "center", fontFamily: SERIF, fontWeight: 500, fontSize: 84 }}>
          Goblet squat
        </div>
        <div style={{ position: "absolute", top: 250, width: "100%", textAlign: "center", fontFamily: SERIF, color: CREAM }}>
          <span style={{ fontWeight: 500, fontSize: 230, lineHeight: 1 }}>8</span>
          <span style={{ fontSize: 70, marginLeft: 14 }}>kg</span>
        </div>
        <div style={{ position: "absolute", top: 540, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 40, color: CREAM_SOFT }}>
          3 rounds · 8 lifts each
        </div>
        {[0, 1, 2].map((i) => {
          const f = i === 0 ? fill : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: circleLeft(i) - 50,
                top: CIRCLES_TOP,
                width: CIRCLE,
                height: CIRCLE,
                borderRadius: CIRCLE / 2,
                border: `4px solid ${CREAM}55`,
                boxSizing: "border-box",
                overflow: "hidden",
                transform: `scale(${i === 0 ? pop : 1})`,
              }}
            >
              {/* The stamp, filling from the bottom like a glass. */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: `${f * 100}%`,
                  backgroundColor: DUSK.glow,
                  opacity: 0.9,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: 76,
                  color: f > 0.5 ? DUSK.foot : CREAM_SOFT,
                }}
              >
                8
              </div>
            </div>
          );
        })}
      </DuskCard>
      {tap !== undefined ? <Finger tap={tap} x={circleLeft(0) + CIRCLE / 2 + 20} y={180 + CIRCLES_TOP + CIRCLE / 2 + 30} /> : null}
    </AbsoluteFill>
  );
}

// ---- the close ----

const LOGO_SECONDS = 4.04;

/** The ball of black clay shaped into the K; the name as it's said, then the line. */
function LogoView({ t }: { t: Timed }) {
  const frame = useCurrentFrame();
  const name = cueAt(t, { word: "Klay" });
  const line = cueAt(t, { word: "Get" });
  const word = interpolate(frame, [sec(name) - 2, sec(name) + 12], [0, 1], smooth);
  const promise = interpolate(frame, [sec(line) - 2, sec(line) + 12], [0, 1], smooth);
  const last = sec(LOGO_SECONDS) - 2;
  // The walk home fades to paper first; then the ball is there.
  const ball = interpolate(frame, [BLEND, BLEND + 8], [0, 1], clamp);
  const k = (
    <OffthreadVideo
      src={staticFile("logo/klay-k.mp4")}
      volume={0.7}
      style={{ width: 900, height: 900, opacity: ball }}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, alignItems: "center" }}>
      <div style={{ marginTop: 300, width: 900, height: 900 }}>
        {frame < last ? k : <Freeze frame={last}>{k}</Freeze>}
      </div>
      <div
        style={{
          marginTop: -40,
          fontFamily: SERIF,
          fontWeight: 500,
          fontSize: 168,
          letterSpacing: -2,
          lineHeight: 1,
          color: INK,
          opacity: word,
          transform: `translateY(${(1 - word) * 14}px)`,
        }}
      >
        Klay
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 66,
          color: MUTED,
          opacity: promise,
          transform: `translateY(${(1 - promise) * 10}px)`,
        }}
      >
        Get in shape.
      </div>
    </AbsoluteFill>
  );
}

// ---- words and sound ----

/** The line, under the picture: read with the sound off. */
function Caption({ t }: { t: Timed }) {
  const frame = useCurrentFrame();
  const inAt = sec(t.lead) - 4;
  const outAt = sec(t.length) - BLEND;
  const o = interpolate(frame, [inAt, inAt + 8, outAt, outAt + BLEND], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: WORDS_TOP,
        left: 100,
        right: 100,
        textAlign: "center",
        fontFamily: SERIF,
        fontSize: 56,
        lineHeight: 1.25,
        color: INK,
        opacity: o,
      }}
    >
      {t.scene.line}
    </div>
  );
}

const timedOf = (id: string) => TIMELINE.find((t) => t.scene.id === id)!;
/** A cue in a scene, as seconds into the film. */
const filmAt = (id: string, cue?: Cue) => {
  const t = timedOf(id);
  return t.start + cueAt(t, cue);
};

/** One sound at a moment of the film. */
function Sfx({ at, src, volume = 1, seconds }: { at: number; src: string; volume?: number; seconds?: number }) {
  return (
    <Sequence from={sec(at)} durationInFrames={seconds ? sec(seconds) : undefined} name={src}>
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
}

/** The music under it all, and the sounds of each place. */
function Score({ total }: { total: number }) {
  const gymFrom = filmAt("gym");
  const gymTo = filmAt("start", { word: "Tap" });
  const home = timedOf("home");
  return (
    <>
      <Audio
        src={staticFile("sound/music.mp3")}
        volume={(f) => interpolate(f, [0, 30, total - 60, total], [0, 0.2, 0.2, 0], clamp)}
      />
      <Sfx at={filmAt("remember", { word: "Hang" })} src="sound/giggle.mp3" volume={0.35} />
      <Sfx at={filmAt("best", { word: "best" })} src="sound/giggle.mp3" volume={0.3} />
      <Sfx at={filmAt("soft", { word: "Whatever" })} src="sound/sofa.mp3" volume={0.5} />
      <Sequence from={sec(gymFrom)} durationInFrames={sec(gymTo - gymFrom + 0.6)} name="gym room">
        <Audio
          src={staticFile("sound/gym.mp3")}
          volume={(f) => interpolate(f, [0, 15, sec(gymTo - gymFrom), sec(gymTo - gymFrom + 0.6)], [0, 0.3, 0.3, 0], clamp)}
        />
      </Sequence>
      <Sfx at={filmAt("start", TAP_START)} src="sound/tap.mp3" volume={0.6} />
      <Sfx at={filmAt("slowly", TAP_CIRCLE)} src="sound/tap.mp3" volume={0.6} />
      <Sfx at={filmAt("slowly", TAP_CIRCLE) + 0.35} src="sound/chime.wav" volume={0.7} />
      <Sequence from={sec(home.start)} durationInFrames={sec(home.length)} name="walk home">
        <Audio src={staticFile("sound/steps.mp3")} volume={(f) => interpolate(f, [0, 12, sec(home.length) - 12, sec(home.length)], [0, 0.25, 0.25, 0], clamp)} />
        <Audio src={staticFile("sound/evening.mp3")} volume={(f) => interpolate(f, [0, 12, sec(home.length) - 12, sec(home.length)], [0, 0.35, 0.35, 0], clamp)} />
      </Sequence>
    </>
  );
}
