import { useEffect, useState, type CSSProperties } from "react";
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
import { CARD, INK, LINE, MUTED, PAPER, SCENES, SURFACE, type Scene, type Show } from "./script";

export const FPS = 30;
/** The voice comes in a beat after the picture, and the picture holds a breath after it. */
const LEAD = 0.45;
const TAIL = 0.9;
/** Scenes dissolve into each other over this many frames. */
const BLEND = 12;

const SERIF = "EB Garamond";

/** Where the picture goes, and where the words start under it (1080 × 1920). */
const STAGE = { top: 260, width: 1080, height: 1060 };
const WORDS_TOP = STAGE.top + STAGE.height + 40;

/**
 * A clay picture's white is a hair off the page's, so its edges fade out:
 * the picture melts into the page instead of sitting on it as a box.
 */
const FEATHER = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent, black 12%, black 88%, transparent), linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
} as const;

const voiceOf = (id: string) => (durations.scenes as Record<string, { file: string; seconds: number }>)[id];

// A lift's last three times, then next time: a short day, the same weight
// again with every lift in, and so a little more. As the app's history.
const JOURNAL = [
  { day: "Monday", kg: "20 kg", reps: [8, 8, 8] },
  { day: "Wednesday", kg: "22.5 kg", reps: [8, 8, 7] },
  { day: "Friday", kg: "22.5 kg", reps: [8, 8, 8] },
];
const ROW_AT = (i: number) => 0.6 + i * 0.7;
const NEXT_AT = ROW_AT(JOURNAL.length) + 0.6;
const JOURNAL_DONE = NEXT_AT + 0.8;

/** How long each kind of scene needs to play out what it shows, in seconds. */
const shownFor = (show: Show): number => {
  switch (show.kind) {
    case "clay":
      return Math.max(...show.pictures.map((p) => p.at)) + 1.6;
    case "lift":
      return Math.max(...show.taps.map((t) => t.at)) + 1.4;
    case "journal":
      return JOURNAL_DONE + 1.2;
    case "start":
      return 2.8;
    case "deck":
      return 5.2;
    case "stretch":
      return 4.4;
    case "finish":
      return 4.6;
    case "end":
      return 3.2;
  }
};

/** How long a scene runs: its line, or what it shows, whichever needs longer. */
export const sceneFrames = (id: string) => {
  const scene = SCENES.find((s) => s.id === id)!;
  const said = LEAD + (voiceOf(id)?.seconds ?? 3) + TAIL;
  return Math.ceil(Math.max(said, shownFor(scene.show)) * FPS) + BLEND;
};

/** The whole film: every scene, less the overlaps where one dissolves into the next. */
export const filmFrames = () => SCENES.reduce((sum, s) => sum + sceneFrames(s.id), 0) - BLEND * (SCENES.length - 1);

const sec = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) } as const;

/** The scene's own time, in seconds. */
const useSeconds = () => useCurrentFrame() / FPS;

/** The app's own faces, loaded before the first frame is drawn. */
function useFonts() {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
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
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
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
  const fadeIn = interpolate(frame, [0, BLEND], [0, 1], clamp);
  const voice = voiceOf(scene.id);
  const show = scene.show;
  return (
    <AbsoluteFill style={{ opacity: fadeIn, backgroundColor: PAPER, fontFamily: SERIF }}>
      {voice ? (
        <Sequence from={sec(LEAD)}>
          <Audio src={staticFile(`voice/${voice.file}`)} />
        </Sequence>
      ) : null}
      {show.kind === "end" ? (
        <EndCard line={scene.line} />
      ) : (
        <>
          {/* The picture above, the words below: never over each other. */}
          <div style={{ position: "absolute", left: 0, top: STAGE.top, width: STAGE.width, height: STAGE.height }}>
            <ShowView show={show} frames={frames} />
          </div>
          <Caption text={scene.line} frames={frames} />
        </>
      )}
    </AbsoluteFill>
  );
}

function ShowView({ show, frames }: { show: Show; frames: number }) {
  switch (show.kind) {
    case "clay":
      return <ClayView pictures={show.pictures} frames={frames} />;
    case "start":
      return <StartView />;
    case "lift":
      return <LiftView filled={show.filled} taps={show.taps} />;
    case "journal":
      return <Journal />;
    case "deck":
      return <DeckView />;
    case "stretch":
      return <StretchView />;
    case "finish":
      return <FinishView />;
    case "end":
      return null;
  }
}

// ---- the finger ----

/** Where the finger is at a moment, in the stage's own pixels; `down` while it touches. */
type Key = { t: number; x: number; y: number; down?: boolean };

/**
 * A fingertip, moving through its keys: a soft dark dot with a white rim that
 * sinks a little while it presses, and a ring that spreads as it lands.
 */
function Finger({ keys }: { keys: Key[] }) {
  const t = useSeconds();
  const first = keys[0];
  const last = keys[keys.length - 1];
  const seen = interpolate(t, [first.t - 0.25, first.t, last.t, last.t + 0.3], [0, 1, 1, 0], clamp);
  if (seen <= 0) return null;
  // Between which two keys, and how far along.
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const along = b.t === a.t ? 1 : interpolate(t, [a.t, b.t], [0, 1], ease);
  const x = a.x + (b.x - a.x) * along;
  const y = a.y + (b.y - a.y) * along;
  const down = t >= a.t && t < b.t ? !!a.down : !!(t >= last.t && last.down);
  // The ring, from the last time it touched down.
  const landed = [...keys].reverse().find((k) => k.down && k.t <= t);
  const ring = landed ? interpolate(t - landed.t, [0, 0.45], [0, 1], clamp) : 1;
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
          border: `6px solid ${INK}`,
          opacity: (1 - ring) * 0.45 * seen,
          transform: `scale(${0.6 + ring * 0.9})`,
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 48,
          top: y - 48,
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: "rgba(28, 28, 26, 0.32)",
          border: "5px solid rgba(255, 255, 255, 0.92)",
          boxShadow: "0 8px 20px rgba(28, 28, 26, 0.22)",
          opacity: seen,
          transform: `scale(${down ? 0.88 : 1})`,
          zIndex: 100,
        }}
      />
    </>
  );
}

// ---- the scenes ----

/** The clay fellow, edge to edge on the page's white, leaning in a little as the scene goes on. */
function ClayView({ pictures, frames }: { pictures: { at: number; id: string }[]; frames: number }) {
  const frame = useCurrentFrame();
  const lean = interpolate(frame, [0, frames], [1, 1.07], { ...clamp, easing: Easing.inOut(Easing.sin) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {pictures.map((p, i) => {
        const o = i === 0 ? 1 : interpolate(frame, [sec(p.at), sec(p.at) + 10], [0, 1], clamp);
        return (
          <Img
            key={`${p.id}-${i}`}
            src={staticFile(`clay/${p.id}.jpg`)}
            style={{
              position: "absolute",
              width: 1240,
              height: 1240 * (2 / 3),
              objectFit: "contain",
              opacity: o,
              transform: `scale(${lean})`,
              ...FEATHER,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Something arriving: rises a little and fades in over the scene's first moments. */
function useArrive() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - 2, fps, config: { damping: 200 }, durationInFrames: 18 });
}

const pill = (pressed: boolean): CSSProperties => ({
  height: 132,
  borderRadius: 66,
  backgroundColor: INK,
  color: "white",
  fontSize: 54,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transform: `scale(${pressed ? 0.96 : 1})`,
});

/** Today: the day's workout, and Start tapped. */
function StartView() {
  const t = useSeconds();
  const rise = useArrive();
  const pressed = t > 1.5 && t < 1.75;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: rise, transform: `translateY(${(1 - rise) * 30}px)` }}>
      <div style={{ position: "absolute", left: 140, top: 150, width: 800 }}>
        <div style={{ padding: "48px 56px", borderRadius: 48, backgroundColor: SURFACE }}>
          <div style={{ fontSize: 84, fontWeight: 500, color: INK }}>Push</div>
          {[
            ["Bench press", "22.5 kg"],
            ["Shoulder press", "12 kg"],
            ["Triceps pushdown", "15 kg"],
          ].map(([name, kg]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 46, marginTop: 22 }}>
              <span style={{ color: INK }}>{name}</span>
              <span style={{ color: MUTED }}>{kg}</span>
            </div>
          ))}
        </div>
        <div style={{ ...pill(pressed), marginTop: 48 }}>Start</div>
      </div>
      <Finger
        keys={[
          { t: 1.0, x: 660, y: 910 },
          { t: 1.5, x: 610, y: 840, down: true },
          { t: 1.75, x: 610, y: 840 },
          { t: 2.3, x: 660, y: 910 },
        ]}
      />
    </div>
  );
}

/** Where a lift card's circles sit, in the stage's pixels. */
const LIFT = { left: 200, top: 120, width: 680, height: 760, circle: 140, gap: 36, circlesTop: 560 };
const circleX = (i: number) =>
  LIFT.left + (LIFT.width - 3 * LIFT.circle - 2 * LIFT.gap) / 2 + i * (LIFT.circle + LIFT.gap) + LIFT.circle / 2;
const CIRCLE_Y = LIFT.top + LIFT.circlesTop + LIFT.circle / 2;

/** The lift card as the app shows it; each tap sets a circle, the finger doing the tapping. */
function LiftView({ filled, taps }: { filled: (number | null)[]; taps: { at: number; circle: number; value: number }[] }) {
  const t = useSeconds();
  const rise = useArrive();
  const tapOf = (i: number) => [...taps].reverse().find((tap) => tap.circle === i && tap.at <= t);
  const keys: Key[] = taps.flatMap((tap, k) => {
    // Just below the circle's middle, so the number it changes stays in sight.
    const x = circleX(tap.circle) + 34;
    const y = CIRCLE_Y + 62;
    const prev = taps[k - 1];
    const lead: Key[] = prev && prev.circle === tap.circle ? [] : [{ t: tap.at - 0.4, x: x + 30, y: y + 60 }];
    return [...lead, { t: tap.at, x, y, down: true }, { t: tap.at + 0.22, x, y }];
  });
  const note: CSSProperties = { color: "white", fontStyle: "italic", fontSize: 40, opacity: 0.85 };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: rise, transform: `translateY(${(1 - rise) * 30}px)` }}>
      <div
        style={{
          position: "absolute",
          left: LIFT.left,
          top: LIFT.top,
          width: LIFT.width,
          height: LIFT.height,
          borderRadius: 80,
          backgroundColor: CARD,
          color: "white",
          boxShadow: "0 30px 60px rgba(28, 28, 26, 0.16)",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", top: 64, width: "100%", fontWeight: 500, fontSize: 58 }}>Bench press</div>
        <div style={{ ...note, position: "absolute", top: 180, width: "100%" }}>Use this weight</div>
        <div style={{ position: "absolute", top: 230, width: "100%" }}>
          <span style={{ fontWeight: 500, fontSize: 160, lineHeight: 1.1 }}>22.5</span>
          <span style={{ fontSize: 56, marginLeft: 12 }}>kg</span>
        </div>
        <div style={{ ...note, position: "absolute", top: 470, width: "100%" }}>3 rounds, 8 lifts each</div>
        {filled.map((start, i) => {
          const tap = tapOf(i);
          const v = tap ? tap.value : start;
          const pop = tap ? interpolate(t - tap.at, [0, 0.12, 0.3], [1, 1.12, 1], clamp) : 1;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: circleX(i) - LIFT.left - LIFT.circle / 2,
                top: LIFT.circlesTop,
                width: LIFT.circle,
                height: LIFT.circle,
                borderRadius: LIFT.circle / 2,
                boxSizing: "border-box",
                border: "7px solid white",
                backgroundColor: v === null ? "transparent" : "white",
                color: v === null ? "white" : CARD,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 500,
                fontSize: 64,
                transform: `scale(${pop})`,
              }}
            >
              {v ?? 8}
            </div>
          );
        })}
      </div>
      <Finger keys={keys} />
    </div>
  );
}

/** The journal, a row at a time, and then next time's weight, a little more. */
function Journal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inAt = (t: number) => spring({ frame: frame - sec(t), fps, config: { damping: 200 }, durationInFrames: 14 });
  const next = spring({ frame: frame - sec(NEXT_AT), fps, config: { damping: 13, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 860 }}>
        <div style={{ textAlign: "center", fontSize: 36, letterSpacing: 4, color: MUTED, marginBottom: 24 }}>
          YOUR BENCH PRESS
        </div>
        {JOURNAL.map((j, i) => {
          const a = inAt(ROW_AT(i));
          return (
            <div
              key={j.day}
              style={{
                height: 150,
                display: "flex",
                alignItems: "center",
                gap: 24,
                borderTop: i === 0 ? "none" : `3px solid ${LINE}`,
                opacity: a,
                transform: `translateY(${(1 - a) * 24}px)`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontStyle: "italic", fontSize: 40, color: MUTED }}>{j.day}</div>
                <div style={{ fontWeight: 500, fontSize: 54, color: INK }}>{j.kg}</div>
              </div>
              {j.reps.map((r, k) => (
                <div
                  key={k}
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 43,
                    backgroundColor: INK,
                    color: "white",
                    fontWeight: 500,
                    fontSize: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {r}
                </div>
              ))}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 30,
            height: 150,
            padding: "0 44px",
            borderRadius: 75,
            border: `4px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: Math.min(1, next),
            transform: `scale(${0.9 + 0.1 * next})`,
          }}
        >
          <div style={{ fontStyle: "italic", fontSize: 44, color: INK }}>Next time</div>
          <div style={{ fontWeight: 500, fontSize: 60, color: INK }}>25 kg</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

const DECK_CARDS = [
  { name: "Bench press", kg: "22.5 kg" },
  { name: "Shoulder press", kg: "12 kg" },
  { name: "Triceps pushdown", kg: "15 kg" },
];
const DECK = { left: 160, top: 170, width: 760, height: 600 };

/**
 * The workout's cards as a deck, drawn as the app draws them from one number:
 * which card is on top. The bench is swiped off to the left, the shoulder
 * press comes up; later the bench is swiped back over it.
 */
function DeckView() {
  const t = useSeconds();
  const rise = useArrive();
  const turned = interpolate(t, [1.1, 1.8], [0, 1], ease) - interpolate(t, [3.5, 4.2], [0, 1], ease);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: rise }}>
      {DECK_CARDS.map((c, i) => {
        const place = i - turned;
        let style: CSSProperties;
        if (place < 0) {
          const gone = -place;
          style = {
            transform: `translateX(${-DECK.width * 1.2 * gone}px) rotate(${-9 * gone}deg)`,
            zIndex: 20,
            opacity: 1,
          };
        } else {
          // Solid, so nothing under the top card shows through it; only the last fades out of the deck.
          style = {
            transform: `translateY(${40 * place}px) scale(${1 - 0.06 * place})`,
            zIndex: 10 - i,
            opacity: interpolate(place, [2, 2.6], [1, 0], clamp),
          };
        }
        return (
          <div
            key={c.name}
            style={{
              position: "absolute",
              left: DECK.left,
              top: DECK.top,
              width: DECK.width,
              height: DECK.height,
              borderRadius: 64,
              backgroundColor: CARD,
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              boxShadow: "0 24px 50px rgba(28, 28, 26, 0.18)",
              transformOrigin: "50% 100%",
              ...style,
            }}
          >
            {/* Only the top card's words: those under it are just their edges. */}
            <div style={{ opacity: interpolate(Math.abs(place), [0, 0.6], [1, 0], clamp), textAlign: "center" }}>
              <div style={{ fontSize: 62, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 110, fontWeight: 500 }}>{c.kg}</div>
            </div>
          </div>
        );
      })}
      <Finger
        keys={[
          { t: 0.8, x: 760, y: 520 },
          { t: 1.05, x: 740, y: 500, down: true },
          { t: 1.8, x: 180, y: 520 },
          { t: 2.0, x: 180, y: 520 },
          { t: 3.2, x: 240, y: 520 },
          { t: 3.45, x: 260, y: 500, down: true },
          { t: 4.2, x: 860, y: 520 },
        ]}
      />
    </div>
  );
}

/** A stretch on its card with its clock: thrown off upwards, and the next comes in. */
function StretchView() {
  const t = useSeconds();
  const rise = useArrive();
  const thrown = interpolate(t, [1.4, 2.0], [0, 1], ease);
  const next = interpolate(t, [2.1, 2.6], [0, 1], ease);
  const seconds = Math.max(0, Math.round(t < 2.1 ? 24 - t : 30 - (t - 2.1)));
  const clock = `0:${String(seconds).padStart(2, "0")}`;
  const name = next > 0.5 ? "Child's pose" : "Cat-cow";
  return (
    <div style={{ position: "absolute", inset: 0, opacity: rise }}>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 90,
          width: 800,
          height: 880,
          borderRadius: 64,
          backgroundColor: PAPER,
          border: `3px solid ${LINE}`,
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ marginTop: 56, fontSize: 60, fontWeight: 500, color: INK }}>{name}</div>
        <Img
          src={staticFile("clay/stretch_cat_cow.jpg")}
          style={{
            position: "absolute",
            left: 40,
            top: 200,
            width: 720,
            height: 480,
            objectFit: "contain",
            ...FEATHER,
            opacity: 1 - thrown,
            transform: `translateY(${-520 * thrown}px)`,
          }}
        />
        <Img
          src={staticFile("clay/stretch_childs_pose.jpg")}
          style={{
            position: "absolute",
            left: 40,
            top: 200,
            width: 720,
            height: 480,
            objectFit: "contain",
            ...FEATHER,
            opacity: next,
            transform: `translateY(${60 * (1 - next)}px)`,
          }}
        />
        <div style={{ position: "absolute", bottom: 70, width: "100%", fontSize: 64, color: MUTED }}>{clock}</div>
      </div>
      <Finger
        keys={[
          { t: 1.1, x: 600, y: 700 },
          { t: 1.4, x: 580, y: 660, down: true },
          { t: 2.0, x: 580, y: 180 },
        ]}
      />
    </div>
  );
}

const FINISH_ROWS = ["Cardio", "Bench press", "Shoulder press", "Triceps pushdown", "Stretch"];

/** The workout card at the top, pulled down: every card, each done, and Finish tapped. */
function FinishView() {
  const t = useSeconds();
  const rise = useArrive();
  const open = interpolate(t, [0.9, 1.7], [0, 1], ease);
  const pressed = t > 3.3 && t < 3.55;
  const height = 190 + open * 760;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: rise }}>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 40,
          width: 900,
          height,
          borderRadius: 56,
          backgroundColor: SURFACE,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "40px 52px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 66, fontWeight: 500, color: INK }}>Push</span>
          <span style={{ fontSize: 42, fontStyle: "italic", color: MUTED }}>5 of 5 done</span>
        </div>
        <div style={{ display: "flex", gap: 22, padding: "24px 52px", opacity: 1 - open }}>
          {FINISH_ROWS.map((r) => (
            <div key={r} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: INK }} />
          ))}
        </div>
        <div style={{ position: "absolute", top: 160, left: 52, right: 52, opacity: open }}>
          {FINISH_ROWS.map((r) => (
            <div
              key={r}
              style={{
                height: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `3px solid ${LINE}`,
                fontSize: 48,
                color: INK,
              }}
            >
              <span>{r}</span>
              <span style={{ fontSize: 44 }}>✓</span>
            </div>
          ))}
          <div style={{ ...pill(pressed), marginTop: 50 }}>Finish</div>
        </div>
        {/* The grab bar: it pulls down. */}
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: "50%",
            width: 90,
            height: 10,
            marginLeft: -45,
            borderRadius: 5,
            backgroundColor: LINE,
          }}
        />
      </div>
      <Finger
        keys={[
          { t: 0.6, x: 560, y: 210 },
          { t: 0.9, x: 540, y: 190, down: true },
          { t: 1.7, x: 540, y: 820 },
          { t: 2.0, x: 540, y: 820 },
          { t: 3.0, x: 600, y: 920 },
          { t: 3.3, x: 560, y: 880, down: true },
          { t: 3.55, x: 560, y: 880 },
        ]}
      />
    </div>
  );
}

/** The line, in full, under the picture: read with the sound off. */
function Caption({ text, frames }: { text: string; frames: number }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [sec(LEAD) - 4, sec(LEAD) + 6, frames - BLEND, frames], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: WORDS_TOP,
        left: 90,
        right: 90,
        height: 380,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        textAlign: "center",
        fontWeight: 500,
        fontSize: 66,
        lineHeight: 1.25,
        color: INK,
        opacity: o,
        transform: `translateY(${(1 - o) * 10}px)`,
      }}
    >
      {text}
    </div>
  );
}

/** The close: the fellow says hello, then the name, then the line. */
function EndCard({ line }: { line: string }) {
  const frame = useCurrentFrame();
  const fellow = interpolate(frame, [0, 14], [0, 1], clamp);
  const word = interpolate(frame, [10, 26], [0, 1], clamp);
  const promise = interpolate(frame, [sec(LEAD) + 18, sec(LEAD) + 32], [0, 1], clamp);
  const tagline = line.replace(/^Klay\.\s*/, "");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", backgroundColor: PAPER }}>
      <Img src={staticFile("clay/hello.jpg")} style={{ width: 900, height: 600, objectFit: "contain", opacity: fellow, ...FEATHER }} />
      <div
        style={{
          fontWeight: 500,
          fontSize: 230,
          lineHeight: 1,
          color: INK,
          opacity: word,
          transform: `translateY(${(1 - word) * 16}px)`,
          marginTop: 30,
        }}
      >
        Klay
      </div>
      <div style={{ marginTop: 40, fontStyle: "italic", fontSize: 76, color: INK, opacity: promise }}>{tagline}</div>
    </AbsoluteFill>
  );
}
