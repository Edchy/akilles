import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { COLUMN } from "@/components/screen";
import { Text } from "@/components/text";
import { FAMILY, colors, fonts, radii } from "@/constants/theme";
import type { Family } from "@/data/families";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { seeIntro, useSession, wantsIntro } from "@/store/session";

/**
 * How Milo works, in six pages: why first — a little at a time, every visit
 * counts, Milo tells you what to do, light and slow — then how: exercises
 * are building blocks, and workouts take turns.
 *
 * Written so that someone who has never trained, and never used an app like
 * this, understands it the first time: each heading says what it means
 * rather than being a slogan, and no gym word goes unexplained. Each page is
 * one picture and a few sentences with room around them, nothing more.
 *
 * It opens by itself on a phone that has trained nothing yet, and from
 * Plan's ? any time after. Skip is always there; finishing or skipping it
 * once is enough.
 */

const Open = createContext<() => void>(() => {});

/** Open the intro again, from Plan's ?. */
export const useOpenIntro = () => useContext(Open);

/** The intro over everything, the bar included, when it is wanted. */
export function IntroProvider({ children }: { children: ReactNode }) {
  const { state, setState } = useSession();
  const [again, setAgain] = useState(false);
  const first = wantsIntro(state);

  return (
    <Open.Provider value={() => setAgain(true)}>
      {children}
      <Intro
        visible={first || again}
        again={!first}
        onDone={() => {
          setAgain(false);
          setState((s) => seeIntro(s));
        }}
      />
    </Open.Provider>
  );
}

// The page's fixed parts, top to bottom: the row Skip sits in; the words,
// sized for a two-line heading over five lines; the dots and the button.
const SKIP = 44;
const WORDS = 284;
const FOOT = 100;

function Intro({
  visible,
  again,
  onDone,
}: {
  visible: boolean;
  again: boolean;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const column = Math.min(width, COLUMN);
  const inner = column - 44;
  const bottom = Math.max(insets.bottom, 16);
  // The picture gets what the words and buttons leave. On a small phone it
  // is drawn smaller, rather than pushing the words off the page.
  const art = Math.max(200, Math.min(360, height - insets.top - SKIP - WORDS - FOOT - bottom));

  const go = (to: number) => {
    setPage(to);
    pager.current?.scrollTo({ x: to * width, animated: !still });
  };
  // Next time it opens, it opens at the start.
  const close = () => {
    setPage(0);
    onDone();
  };

  return (
    <Modal
      visible={visible}
      animationType={again ? "slide" : "fade"}
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            height: insets.top + SKIP,
            paddingTop: insets.top,
            paddingHorizontal: 16,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {last ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={close}
              hitSlop={8}
              style={({ pressed }) => ({
                minWidth: 44,
                minHeight: 44,
                paddingHorizontal: 6,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 18 }}>
                {again ? "Close" : "Skip"}
              </Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {PAGES.map((p) => (
            <View key={p.title} style={{ width, alignItems: "center" }}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  width: column,
                  height: art,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View style={{ transform: [{ scale: Math.min(1, (art - 16) / p.height) }] }}>
                  {p.art(inner)}
                </View>
              </View>
              <View style={{ width: column, paddingHorizontal: 22, paddingTop: 20, gap: 14 }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: colors.text,
                    fontFamily: fonts.display,
                    fontSize: 40,
                    lineHeight: 44,
                  }}
                >
                  {p.title}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.regular,
                    fontSize: 20,
                    lineHeight: 29,
                  }}
                >
                  {p.body}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            width: column,
            alignSelf: "center",
            paddingHorizontal: 22,
            paddingTop: 10,
            paddingBottom: bottom,
            gap: 23,
          }}
        >
          <Dots page={page} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={last ? undefined : `Next, page ${page + 2} of ${PAGES.length}`}
            onPress={() => (last ? close() : go(page + 1))}
            style={({ pressed }) => ({
              height: 60,
              borderRadius: radii.action,
              borderCurve: "continuous",
              backgroundColor: colors.text,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: colors.white, fontFamily: fonts.medium, fontSize: 21 }}>
              {last ? (again ? "Done" : "Get started") : "Next"}
            </Text>
            {last ? null : <Icon name="forward" size={18} color={colors.white} />}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Where you are: one dash a page, the one you are on longer. */
function Dots({ page }: { page: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}
    >
      {PAGES.map((p, i) => (
        <View
          key={p.title}
          style={{
            width: i === page ? 34 : 22,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: colors.text,
            opacity: i <= page ? 1 : 0.2,
          }}
        />
      ))}
    </View>
  );
}

// ---- the pages ----

type Page = {
  title: string;
  body: string;
  /** The picture, given the width of the column. */
  art: (width: number) => ReactNode;
  /** The picture's own height, so a small phone can draw it smaller. */
  height: number;
};

const TURNS: { family: Family; name: string; note?: string; next?: boolean }[] = [
  { family: "push", name: "Push", note: "last time" },
  { family: "pull", name: "Pull", note: "next", next: true },
  { family: "legs", name: "Legs" },
];

// Three roomy rows, and the line from the last back up to the first.
const TURN_ROW = 64;
const TURN_GAP = 16;
const TURNS_HEIGHT = TURNS.length * TURN_ROW + (TURNS.length - 1) * TURN_GAP;
const FIRST = TURN_ROW / 2;
const LAST = TURNS_HEIGHT - TURN_ROW / 2;

const PAGES: Page[] = [
  {
    title: "A little at a time.",
    body:
      "Long ago, a wrestler named Milo carried a newborn calf every day. The calf grew, and so " +
      "did his strength, until he could carry a grown bull. This app trains you the same way.",
    art: () => <Growing />,
    height: 210,
  },
  {
    title: "Every visit counts.",
    body:
      "Five minutes is a good day. There's no schedule to keep up with. Miss a day, or a week, " +
      "and Milo carries on where you left off.",
    art: (w) => <Week width={w} />,
    height: 152,
  },
  {
    // "what to do" kept together, or it breaks as "…what / to do."
    title: "Milo tells you what\u00a0to\u00a0do.",
    body:
      "Each exercise shows the weight to use. Each circle is one round: lift it that many times, " +
      "rest, then tap the circle. Milo plans next time for you.",
    art: () => <Lift />,
    height: 312,
  },
  {
    title: "Light and slow.",
    body:
      "Leave your ego at the door. Pick a weight you can lower slowly and lift without swinging. " +
      "When you can lift it 12 times, Milo adds a little. Now and then you stay at a weight a " +
      "while longer, to be sure.",
    art: () => <Climb />,
    height: 246,
  },
  {
    title: "Exercises are building blocks.",
    body:
      "A workout is a few exercises put together, and you can make your own. Each exercise " +
      "remembers its weight, so in a new workout it starts where you left it.",
    art: (w) => <Blocks width={w} />,
    height: 298,
  },
  {
    title: "Your workouts take turns.",
    body:
      "They go in order, then start again at the top. There are no set days: whenever you come " +
      "back, the next one is ready. Change any of it under Plan.",
    art: (w) => <Turns width={w} />,
    height: TURNS_HEIGHT,
  },
];

const caps = {
  color: colors.muted,
  fontFamily: fonts.regular,
  fontSize: 14,
  letterSpacing: 1.4,
  textTransform: "uppercase",
} as const;

/** The name, over a calf becoming a bull: five dots, each a little bigger. */
function Growing() {
  return (
    <View style={{ alignItems: "center", gap: 44 }}>
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.display,
          fontSize: 108,
          lineHeight: 116,
          letterSpacing: -1,
        }}
      >
        Milo
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 18 }}>
        {[12, 18, 26, 36, 50].map((d) => (
          <View
            key={d}
            style={{
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: colors.text,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const VISITS: Record<number, string> = { 0: "40 min", 2: "10 min", 5: "25 min" };

/** A week like Progress shows it: three visits, one of them ten minutes. */
function Week({ width }: { width: number }) {
  return (
    <View
      style={{
        width,
        paddingTop: 24,
        paddingHorizontal: 22,
        paddingBottom: 26,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        gap: 20,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={caps}>This week</Text>
        <Text style={[caps, { color: colors.rise }]}>3 visits</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {DAYS.map((d, i) => {
          const done = i in VISITS;
          return (
            <View key={i} style={{ width: 38, alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? colors.rise : "transparent",
                  borderWidth: done ? 0 : 1.5,
                  borderColor: colors.line,
                }}
              >
                <Text
                  style={{
                    color: done ? colors.ink : colors.faint,
                    fontFamily: done ? fonts.medium : fonts.regular,
                    fontSize: 17,
                  }}
                >
                  {d}
                </Text>
              </View>
              {done ? (
                <Text
                  numberOfLines={1}
                  style={{
                    width: 64,
                    textAlign: "center",
                    color: colors.muted,
                    fontFamily: fonts.regular,
                    fontSize: 14,
                  }}
                >
                  {VISITS[i]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** A lift as the workout shows it, with what each part means written in. */
function Lift() {
  const blue = FAMILY.push.field;
  const note = {
    color: colors.white,
    fontFamily: fonts.italic,
    fontSize: 16,
    opacity: 0.85,
  } as const;
  return (
    <View
      style={{
        width: 270,
        paddingTop: 28,
        paddingHorizontal: 24,
        paddingBottom: 32,
        borderRadius: 32,
        borderCurve: "continuous",
        backgroundColor: blue,
        alignItems: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Mark family="push" size={16} color={colors.white} />
        <Text
          style={{
            color: colors.white,
            fontFamily: fonts.medium,
            fontSize: 22,
          }}
        >
          Bench press
        </Text>
      </View>
      <Text style={[note, { marginTop: 26 }]}>Use this weight</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
        <Text
          style={{
            color: colors.white,
            fontFamily: fonts.semibold,
            fontSize: 60,
            lineHeight: 66,
          }}
        >
          22.5
        </Text>
        <Text style={{ color: colors.white, fontFamily: fonts.regular, fontSize: 22 }}>kg</Text>
      </View>
      <Text style={[note, { marginTop: 22 }]}>3 rounds, 8 lifts each</Text>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
        {[true, false, false].map((done, i) => (
          <View
            key={i}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: done ? colors.white : "transparent",
              borderWidth: done ? 0 : 3,
              borderColor: colors.white,
            }}
          >
            <Text
              style={{
                color: done ? blue : colors.white,
                fontFamily: fonts.semibold,
                fontSize: 26,
              }}
            >
              8
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// The real rule, in weights: two steps up, then the same weight again
// (a reload), then the next step. See `RELOAD_AFTER` in lib/progression.ts.
const CLIMB = [
  { kg: "20 kg", h: 60 },
  { kg: "22.5 kg", h: 92 },
  { kg: "25 kg", h: 124 },
  { kg: "25 kg", h: 124, again: true },
  { kg: "27.5 kg", h: 156 },
];

/** How the weight grows: a step at a time, one of them taken twice. */
function Climb() {
  return (
    <View style={{ alignItems: "center", gap: 22 }}>
      <Text style={caps}>How the weight grows</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14 }}>
        {CLIMB.map((c, i) => (
          <View key={i} style={{ width: 54, alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 54,
                height: c.h,
                borderRadius: 8,
                borderCurve: "continuous",
                backgroundColor: c.again ? "transparent" : colors.text,
                borderWidth: c.again ? 2.5 : 0,
                borderColor: colors.text,
              }}
            />
            <View style={{ width: 72, height: 40, alignItems: "center" }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: fonts.regular,
                  fontSize: 16,
                  lineHeight: 20,
                }}
              >
                {c.kg}
              </Text>
              {c.again ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: fonts.italic,
                    fontSize: 16,
                    lineHeight: 20,
                  }}
                >
                  again
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * One exercise, in two workouts: a line down from it to each. The second is
 * one you might make, drawn dashed like Plan's "New workout".
 */
function Blocks({ width }: { width: number }) {
  const card = (width - 18) / 2;
  const line = FAMILY.push.mark;
  const bar = { position: "absolute", width: 2, backgroundColor: line } as const;
  return (
    <View style={{ width }}>
      <View
        style={{
          alignSelf: "center",
          height: 58,
          paddingHorizontal: 26,
          borderRadius: 29,
          backgroundColor: `${FAMILY.push.mark}1F`,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Mark family="push" size={18} />
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.medium,
            fontSize: 22,
          }}
        >
          Bench press
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.regular,
            fontSize: 20,
          }}
        >
          22.5 kg
        </Text>
      </View>
      <View style={{ height: 54 }}>
        <View style={[bar, { left: width / 2 - 1, top: 0, height: 24 }]} />
        <View style={[bar, { left: card / 2 - 1, top: 24, width: width - card + 2, height: 2 }]} />
        <View style={[bar, { left: card / 2 - 1, top: 24, height: 30 }]} />
        <View style={[bar, { left: width - card / 2 - 1, top: 24, height: 30 }]} />
      </View>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Card
          name="Push"
          rows={[
            ["push", "Bench press", true],
            ["push", "Shoulder press"],
            ["push", "Pushdown"],
          ]}
        />
        <Card
          name="Upper body"
          yours
          rows={[
            ["pull", "Lat pulldown"],
            ["push", "Bench press", true],
            ["pull", "Cable row"],
          ]}
        />
      </View>
    </View>
  );
}

function Card({
  name,
  rows,
  yours = false,
}: {
  name: string;
  rows: [Family, string, boolean?][];
  yours?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 14,
        paddingBottom: 22,
        borderRadius: 26,
        borderCurve: "continuous",
        backgroundColor: yours ? "transparent" : colors.surface,
        borderWidth: yours ? 1.5 : 0,
        borderStyle: "dashed",
        borderColor: colors.line,
        gap: 8,
      }}
    >
      <Text
        style={{
          paddingHorizontal: 8,
          paddingBottom: 6,
          color: colors.text,
          fontFamily: fonts.medium,
          fontSize: 22,
          lineHeight: 26,
        }}
      >
        {name}
      </Text>
      {rows.map(([family, label, it]) => (
        <View
          key={label}
          style={{
            height: 32,
            paddingHorizontal: 8,
            borderRadius: 16,
            backgroundColor: it ? `${FAMILY.push.mark}24` : "transparent",
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
          }}
        >
          <Mark family={family} size={12} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: it ? fonts.medium : fonts.regular,
              fontSize: 17,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The workouts in order, with the way back to the top. */
function Turns({ width }: { width: number }) {
  return (
    <View style={{ width, flexDirection: "row" }}>
      <View style={{ flex: 1, gap: TURN_GAP }}>
        {TURNS.map((t) => {
          const c = FAMILY[t.family].mark;
          return (
            <View
              key={t.name}
              style={{
                height: TURN_ROW,
                paddingHorizontal: t.next ? 20 : 22,
                borderRadius: TURN_ROW / 2,
                borderCurve: "continuous",
                backgroundColor: `${c}1A`,
                borderWidth: t.next ? 2 : 0,
                borderColor: c,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Mark family={t.family} size={20} />
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: fonts.medium,
                  fontSize: 23,
                }}
              >
                {t.name}
              </Text>
              {t.note ? (
                <Text
                  style={{
                    color: t.next ? colors.text : colors.muted,
                    fontFamily: t.next ? fonts.mediumItalic : fonts.italic,
                    fontSize: 17,
                  }}
                >
                  {t.note}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <Svg width={56} height={TURNS_HEIGHT} viewBox={`0 0 56 ${TURNS_HEIGHT}`} fill="none">
        <Path
          d={
            `M4 ${LAST} H18 Q38 ${LAST} 38 ${LAST - 20} ` +
            `V${FIRST + 20} Q38 ${FIRST} 18 ${FIRST} H6`
          }
          stroke={colors.muted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={`M14 ${FIRST - 8} L6 ${FIRST} L14 ${FIRST + 8}`}
          stroke={colors.muted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
