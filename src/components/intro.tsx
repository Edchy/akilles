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
import { Onboarding } from "@/components/onboarding";
import { seeIntro, useSession, wantsIntro, wantsOnboarding, workoutFamily } from "@/store/session";

/**
 * How Humbell works, in three pages: Humbell tells you what to do, light and slow,
 * and your workouts take turns — the last drawn with your own workouts.
 *
 * Written so that someone who has never trained, and never used an app like
 * this, understands it the first time: each heading says what it means
 * rather than being a slogan, and no gym word goes unexplained. Each page is
 * one picture and a few sentences with room around them, nothing more.
 *
 * A new phone meets these pages at the end of the onboarding, as part of the
 * same flow (see `onboarding.tsx`). This modal shows them again from
 * Settings, and opens by itself only on a phone that trained before the
 * onboarding existed and never saw them. Skip is always there.
 */

const Open = createContext<() => void>(() => {});

/** Open the intro again, from Plan's ?. */
export const useOpenIntro = () => useContext(Open);

/** The intro over everything, the bar included, when it is wanted. */
export function IntroProvider({ children }: { children: ReactNode }) {
  const { state, setState } = useSession();
  const [again, setAgain] = useState(false);
  // The plan's questions come first; the intro follows them.
  const asking = wantsOnboarding(state);
  const first = wantsIntro(state) && !asking;
  const turns = state.workouts.map((w) => ({ name: w.name, family: workoutFamily(state, w) }));

  return (
    <Open.Provider value={() => setAgain(true)}>
      {children}
      <Onboarding />
      <Intro
        visible={first || again}
        again={!first}
        turns={turns}
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
  turns,
  onDone,
}: {
  visible: boolean;
  again: boolean;
  turns: Turn[];
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === HOW.length - 1;

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
          {HOW.map((p) => (
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
                <View
                  style={{
                    transform: [{ scale: Math.min(1, (art - 16) / p.height(turns.length)) }],
                  }}
                >
                  {p.art(inner, turns)}
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
            accessibilityLabel={last ? undefined : `Next, page ${page + 2} of ${HOW.length}`}
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
      {HOW.map((p, i) => (
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

/** A workout as the last page draws it. */
export type Turn = { name: string; family: Family };

export type HowPage = {
  title: string;
  body: string;
  /** The picture, given the width of the column and your workouts. */
  art: (width: number, turns: Turn[]) => ReactNode;
  /** The picture's own height, so a small phone can draw it smaller. */
  height: (turns: number) => number;
};

/** At most this many workouts drawn; a longer plan shows its first few. */
const MOST_TURNS = 4;
const TURN_ROW = 64;
const TURN_GAP = 16;
const turnsHeight = (n: number) => {
  const rows = Math.max(1, Math.min(n, MOST_TURNS));
  return rows * TURN_ROW + (rows - 1) * TURN_GAP;
};

/** How Humbell works: shared by the onboarding and by Settings. */
export const HOW: HowPage[] = [
  {
    // "what to do" kept together, or it breaks as "…what / to do."
    title: "Humbell tells you what\u00a0to\u00a0do.",
    body:
      "Each exercise shows the weight to use. Each circle is one round: lift it that many times, " +
      "rest, then tap the circle. Humbell plans next time for you.",
    art: () => <Lift />,
    height: () => 312,
  },
  {
    title: "Light and slow.",
    body:
      "Pick a weight you can lower slowly and lift without swinging. When you can lift it 12 " +
      "times, Humbell adds a little. Now and then you stay at a weight a while longer, to be sure.",
    art: () => <Climb />,
    height: () => 246,
  },
  {
    title: "Come every day.",
    body:
      "Each workout is short, and trains different muscles from the last, so the rest get a rest. " +
      "They take turns: miss a day, or a week, and Humbell carries on where you left off. " +
      "Away from the gym? Keep a second loop, like Bodyweight, and switch to it in Plan.",
    art: (w, turns) => <Turns width={w} turns={turns} />,
    height: (n) => turnsHeight(n) + AWAY_LOOP,
  },
];

const caps = {
  color: colors.muted,
  fontFamily: fonts.regular,
  fontSize: 14,
  letterSpacing: 1.4,
  textTransform: "uppercase",
} as const;

/** A lift as the workout shows it, with what each part means written in. */
export function Lift() {
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
export function Climb() {
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

/** Room under the loop for the second one, set apart. */
const AWAY_LOOP = 64;

/**
 * Your loop, and under it a second one, dashed and quieter: the Bodyweight
 * loop for away, there to switch to — the idea seen before it is read.
 */
function Turns({ width, turns }: { width: number; turns: Turn[] }) {
  return (
    <View style={{ width, gap: 16 }}>
      <TurnsList width={width} turns={turns} />
      <View
        style={{
          height: AWAY_LOOP - 16,
          marginRight: 56,
          paddingHorizontal: 20,
          borderRadius: (AWAY_LOOP - 16) / 2,
          borderCurve: "continuous",
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: colors.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Mark family="full" size={16} color={colors.muted} />
        <Text numberOfLines={1} style={{ flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 19 }}>
          Bodyweight
        </Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.italic, fontSize: 16 }}>another loop</Text>
      </View>
    </View>
  );
}

/** The workouts in order, with the way back to the top; the first is next. */
function TurnsList({ width, turns }: { width: number; turns: Turn[] }) {
  const shown = turns.slice(0, MOST_TURNS);
  const height = turnsHeight(shown.length);
  const first = TURN_ROW / 2;
  const last = height - TURN_ROW / 2;
  return (
    <View style={{ width, flexDirection: "row" }}>
      <View style={{ flex: 1, gap: TURN_GAP }}>
        {shown.map((t, i) => {
          const c = FAMILY[t.family].mark;
          const next = i === 0;
          return (
            <View
              key={`${t.name}-${i}`}
              style={{
                height: TURN_ROW,
                paddingHorizontal: next ? 20 : 22,
                borderRadius: TURN_ROW / 2,
                borderCurve: "continuous",
                backgroundColor: `${c}1A`,
                borderWidth: next ? 2 : 0,
                borderColor: c,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Mark family={t.family} size={20} />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: fonts.medium,
                  fontSize: 23,
                }}
              >
                {t.name}
              </Text>
              {next ? (
                <Text
                  style={{ color: colors.text, fontFamily: fonts.mediumItalic, fontSize: 17 }}
                >
                  first
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {shown.length > 1 ? (
        <Svg width={56} height={height} viewBox={`0 0 56 ${height}`} fill="none">
          <Path
            d={`M4 ${last} H18 Q38 ${last} 38 ${last - 20} V${first + 20} Q38 ${first} 18 ${first} H6`}
            stroke={colors.muted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={`M14 ${first - 8} L6 ${first} L14 ${first + 8}`}
            stroke={colors.muted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
