import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";

import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustration";
import { HOW, type Turn } from "@/components/intro";
import { Mark } from "@/components/mark";
import { GearIcon, KitPicker, Option } from "@/components/place";
import { COLUMN } from "@/components/screen";
import { SectionLabel, TextButton } from "@/components/sheet";
import { Text } from "@/components/text";
import { colors, FAMILY, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import type { Kit } from "@/data/kit";
import type { Workout } from "@/data/split";
import {
  EASY_LABEL,
  SHAPE_FOR,
  SHAPE_LABEL,
  TIME_LABEL,
  type Easy,
  type Shape,
  type Time,
} from "@/data/templates";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import {
  applyPlan,
  makePlan,
  seeIntro,
  useSession,
  wantsOnboarding,
  type Answers,
} from "@/store/session";

/**
 * The first launch, as one flow from hello to the first workout:
 *
 *   Welcome to Milo.               a film of Milo's marks, and a hello
 *   Where do you train?            a gym, or home — and what home has
 *   How long do you usually have?  which shape of plan, and how many lifts
 *   Here's your plan.              Start with this, or Make it mine
 *   How Milo works                 three short pages, the last with your
 *                                  own workouts in the order they come
 *
 * Milo's pick needs those two facts whatever happens: a gym plan is useless
 * in a living room and an hour-long one is useless in thirty minutes. No
 * question about days a week: the loop doesn't care.
 *
 * One look all the way through — a line of progress at the top, each page
 * sliding in from the side it comes from — so it reads as one thing, not a
 * set-up followed by a tour. Only on a phone that has never trained.
 */
export function Onboarding() {
  const { state, setState } = useSession();
  if (!wantsOnboarding(state)) return null;
  return <Steps onDone={(answers) => setState((s) => seeIntro(applyPlan(s, answers)))} />;
}

type Step = "welcome" | "where" | "home" | "time" | "plan" | "mine" | 0 | 1 | 2;

/** The steps the progress line counts; a detour counts as the step it leaves from. */
const ALONG: Step[] = ["where", "time", "plan", 0, 1, 2];
const placeOnLine = (step: Step): number =>
  ALONG.indexOf(step === "home" ? "where" : step === "mine" ? "plan" : step);

const tap = () => Haptics.selectionAsync().catch(() => {});

function Steps({ onDone }: { onDone: (answers: Answers) => void }) {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const [trail, setTrail] = useState<Step[]>(["welcome"]);
  const [forward, setForward] = useState(true);
  const [where, setWhere] = useState<"gym" | "home" | null>(null);
  const [home, setHome] = useState<Kit | null>(null);
  const [kit, setKit] = useState<Kit>({ gear: ["dumbbells"] });
  const [time, setTime] = useState<Time>("long");
  const [easy, setEasy] = useState<Easy[]>([]);
  const [shape, setShape] = useState<Shape | undefined>(undefined);

  const step = trail[trail.length - 1];
  const go = (next: Step) => {
    setForward(true);
    setTrail((t) => [...t, next]);
  };
  const back = () => {
    setForward(false);
    setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
  };
  const answers: Answers = { home, time, easy, shape };
  const plan = makePlan(state, answers);
  const finish = () => onDone(answers);

  const page = (() => {
    switch (step) {
      case "welcome":
        return (
          <Page
            art={<Welcome />}
            title="Welcome to Milo."
            body="Get stronger a little at a time, with a plan made for you. Two quick questions and you're ready to lift."
            action={{ label: "Let's go", onPress: () => go("where") }}
          />
        );
      case "where":
        return (
          <Page title="Where do you train?" body="Milo picks exercises you can do there.">
            <Option
              label="At a gym"
              icon={<GearIcon gear="gym" />}
              on={where === "gym"}
              onPress={() => {
                tap();
                setWhere("gym");
                setHome(null);
                go("time");
              }}
            />
            <Option
              label="At home"
              icon={<GearIcon gear="home" />}
              on={where === "home"}
              onPress={() => {
                tap();
                setWhere("home");
                go("home");
              }}
            />
          </Page>
        );
      case "home":
        return (
          <Page
            title="What do you have at home?"
            body="Tick everything you have. Nothing at all is fine too: your body is enough."
            action={{
              label: "Next",
              onPress: () => {
                setHome(kit);
                go("time");
              },
            }}
          >
            <KitPicker
              kit={kit}
              onChange={(next) => {
                tap();
                setKit(next);
              }}
            />
          </Page>
        );
      case "time":
        return (
          <Page
            title="How long do you usually have?"
            body="For the whole visit, warm-up and stretching included."
          >
            {(Object.keys(TIME_LABEL) as Time[]).map((t) => (
              <Option
                key={t}
                label={TIME_LABEL[t]}
                icon={<Clock minutes={MINUTES[t]} />}
                on={false}
                onPress={() => {
                  tap();
                  setTime(t);
                  setShape(undefined);
                  go("plan");
                }}
              />
            ))}
          </Page>
        );
      case "plan":
        return (
          <Page
            title="Here's your plan."
            body={
              plan.length === 1
                ? "One workout. Do it whenever you come."
                : `${plan.length} workouts that take turns. Do whichever is next, whenever you come.`
            }
            action={{ label: "Start with this", onPress: () => go(0) }}
            after={<TextButton label="Make it mine" onPress={() => go("mine")} />}
          >
            {plan.map((w, i) => (
              <Rise key={w.id} delay={120 + i * 90}>
                <PlanCard workout={w} />
              </Rise>
            ))}
          </Page>
        );
      case "mine": {
        const pick = SHAPE_FOR[time];
        return (
          <Page
            title="Make it yours."
            body="Change anything here, then look at your plan again."
            action={{ label: "Show my plan", onPress: back }}
          >
            <SectionLabel>Go easy on</SectionLabel>
            <Text style={{ color: colors.muted, fontSize: 17, lineHeight: 24 }}>
              Milo leaves out the exercises that load these the most. Milo isn't a doctor: if
              something hurts, stop and ask one.
            </Text>
            {(Object.keys(EASY_LABEL) as Easy[]).map((e) => (
              <Option
                key={e}
                check
                label={EASY_LABEL[e]}
                on={easy.includes(e)}
                onPress={() => {
                  tap();
                  setEasy((list) =>
                    list.includes(e) ? list.filter((x) => x !== e) : [...list, e],
                  );
                }}
              />
            ))}
            <View style={{ height: 20 }} />
            <SectionLabel>Shape of plan</SectionLabel>
            {(Object.keys(SHAPE_LABEL) as Shape[]).map((sh) => (
              <Option
                key={sh}
                label={sh === pick ? `${SHAPE_LABEL[sh]} (Milo's pick)` : SHAPE_LABEL[sh]}
                on={(shape ?? pick) === sh}
                onPress={() => {
                  tap();
                  setShape(sh === pick ? undefined : sh);
                }}
              />
            ))}
          </Page>
        );
      }
      default: {
        const how = HOW[step];
        const last = step === HOW.length - 1;
        const turns: Turn[] = plan.map((w) => ({ name: w.name, family: familyOfWorkout(w) }));
        return (
          <Page
            art={<HowArt page={step} turns={turns} />}
            title={how.title}
            body={how.body}
            action={{
              label: last ? "Start lifting" : "Next",
              onPress: () => (last ? finish() : go((step + 1) as Step)),
            }}
          />
        );
      }
    }
  })();

  const along = placeOnLine(step);

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View
          style={{
            height: 44,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <View style={{ width: 44 }}>
            {trail.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={back}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Icon name="back" size={20} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            {along >= 0 ? <Progress at={along + 1} of={ALONG.length} /> : null}
          </View>
          <View style={{ width: 44, alignItems: "flex-end" }}>
            {typeof step === "number" ? (
              <Pressable
                accessibilityRole="button"
                onPress={finish}
                hitSlop={8}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 18 }}>
                  Skip
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Enter key={trail.length + String(step)} forward={forward}>
          {page}
        </Enter>
        <View style={{ height: Math.max(insets.bottom, 16) }} />
      </View>
    </Modal>
  );
}

// ---- motion ----

/** Each page slides in from the side it comes from, and fades up. */
function Enter({ forward, children }: { forward: boolean; children: ReactNode }) {
  const still = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: still ? 160 : 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, still]);
  const shift = still ? 0 : forward ? 28 : -28;
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: t,
        transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [shift, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Something that rises into place a moment after its page: the plan's cards, one by one. */
function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  const still = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 360,
      delay: still ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, delay, still]);
  return (
    <Animated.View
      style={{
        opacity: t,
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [still ? 0 : 16, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** How far along: a line that fills, step by step. */
function Progress({ at, of }: { at: number; of: number }) {
  const fill = useRef(new Animated.Value(at / of)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: at / of,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fill, at, of]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${at} of ${of}`}
      style={{
        width: "100%",
        maxWidth: 220,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.text,
          width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

// ---- pictures ----

/** The films the welcome takes turns through: legs, push, pull. */
const WELCOME_FILMS = ["goblet_squat", "push_up", "db_row"];
const FILM_MS = 3200;

/**
 * Milo's marks at work: a film that changes every few seconds, one kind of
 * lift after another, cross-fading — what the app is about, before a word
 * about it.
 */
function Welcome() {
  const { width, height } = useWindowDimensions();
  const still = useReduceMotion();
  const [at, setAt] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setAt((i) => (i + 1) % WELCOME_FILMS.length);
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      });
    }, FILM_MS);
    return () => clearInterval(timer);
  }, [fade, still]);
  const side = Math.min(Math.min(width, COLUMN) - 44, height * 0.36, 340);
  return (
    <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 16 }}>
      <View
        style={{
          width: side,
          height: side,
          borderRadius: radii.card + 8,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        <Animated.View style={{ flex: 1, opacity: fade }}>
          <Illustration id={WELCOME_FILMS[at]} style={{ width: side, height: side }} />
        </Animated.View>
      </View>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 18 }}>
        {WELCOME_FILMS.map((id, i) => (
          <View key={id} style={{ opacity: i === at ? 1 : 0.3 }}>
            <Mark family={familyOf(byId(id)!)} size={16} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** A how-it-works picture, drawn smaller on a small phone. */
function HowArt({ page, turns }: { page: number; turns: Turn[] }) {
  const { width, height } = useWindowDimensions();
  const how = HOW[page];
  const column = Math.min(width, COLUMN) - 44;
  const room = Math.max(180, height * 0.4);
  const own = how.height(turns.length);
  const scale = Math.min(1, room / own);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: own * scale + 24, alignItems: "center", justifyContent: "center" }}
    >
      <View style={{ transform: [{ scale }] }}>{how.art(column, turns)}</View>
    </View>
  );
}

const MINUTES: Record<Time, number> = { short: 30, medium: 45, long: 60 };

/** A clock face with the time it takes filled in. */
function Clock({ minutes }: { minutes: number }) {
  const ink = colors.text;
  const r = 12;
  const turn = Math.min(minutes, 59.99) / 60;
  const a = turn * 2 * Math.PI;
  const x = 16 + r * Math.sin(a);
  const y = 16 - r * Math.cos(a);
  const wedge =
    minutes >= 60
      ? null
      : `M16 16 L16 ${16 - r} A${r} ${r} 0 ${turn > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
  return (
    <Svg32>
      <SvgCircle cx={16} cy={16} r={14} stroke={ink} strokeWidth={2.5} fill="none" />
      {wedge ? <SvgPath d={wedge} fill={ink} /> : <SvgCircle cx={16} cy={16} r={r} fill={ink} />}
    </Svg32>
  );
}

// ---- the plan ----

/** A workout as the plan shows it: its name, what it trains, and what you will do. */
function PlanCard({ workout }: { workout: Workout }) {
  const exercises = workout.exercises.map((e) => byId(e.options[0])!).filter(Boolean);
  const family = familyOfWorkout(workout);
  return (
    <View
      style={{
        backgroundColor: `${FAMILY[family].field}1A`,
        borderRadius: radii.card,
        borderCurve: "continuous",
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 12,
      }}
    >
      <View>
        <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 }}>
          {workout.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 17, fontStyle: "italic" }}>
          {workout.subtitle}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {exercises.map((ex) => (
          <View key={ex.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 24, alignItems: "center" }}>
              <Mark family={familyOf(ex)} size={18} />
            </View>
            <Text style={{ flex: 1, color: colors.text, fontSize: 18 }}>{ex.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The family most of a workout's lifts belong to. */
const familyOfWorkout = (workout: Workout): Family => {
  const exercises = workout.exercises.map((e) => byId(e.options[0])).filter((e) => e !== undefined);
  return mostCommon(exercises.map((ex) => familyOf(ex))) ?? "push";
};

const mostCommon = <T,>(list: T[]): T | undefined => {
  const count = new Map<T, number>();
  for (const x of list) count.set(x, (count.get(x) ?? 0) + 1);
  let best: T | undefined;
  for (const [x, n] of count) if (best === undefined || n > (count.get(best) ?? 0)) best = x;
  return best;
};

// ---- the page ----

/**
 * One step: a picture if it has one, a heading that says what it means, a
 * line under it, room around them; the button stays put at the bottom.
 */
function Page({
  art,
  title,
  body,
  action,
  after,
  children,
}: {
  art?: ReactNode;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  after?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingHorizontal: 22,
          paddingTop: art ? 8 : 24,
          paddingBottom: 24,
          gap: 12,
        }}
      >
        {art}
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 44 }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.regular,
            fontSize: 20,
            lineHeight: 29,
            marginBottom: 20,
          }}
        >
          {body}
        </Text>
        {children}
      </ScrollView>
      {action ? (
        <View
          style={{
            width: "100%",
            maxWidth: COLUMN,
            alignSelf: "center",
            paddingHorizontal: 22,
            paddingTop: 10,
            gap: 4,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
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
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text style={{ color: colors.white, fontFamily: fonts.medium, fontSize: 21 }}>
              {action.label}
            </Text>
            <Icon name="forward" size={18} color={colors.white} />
          </Pressable>
          {after}
        </View>
      ) : null}
    </>
  );
}

const Svg32 = ({ children }: { children: ReactNode }) => (
  <Svg width={32} height={32} viewBox="0 0 32 32" accessibilityElementsHidden>
    {children}
  </Svg>
);
