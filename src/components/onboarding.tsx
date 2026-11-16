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

import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustration";
import { HOW, type Turn } from "@/components/intro";
import { Mark } from "@/components/mark";
import { Option } from "@/components/place";
import { COLUMN } from "@/components/screen";
import { SectionLabel, TextButton } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import { familyOfLifts, kindOf } from "@/data/kinds";
import type { Workout } from "@/data/split";
import { BODYWEIGHT_RANGE, type Experience, type Lifter, type Sex } from "@/lib/start-weight";
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
 *   Welcome to Humbell.               a film of Humbell's marks, and a hello
 *   Have you lifted weights?       new, a bit, or for a while
 *   Your first weights             weight and sex, said or skipped
 *   How Humbell works                 three short pages, the last with your
 *                                  workouts in the order they come
 *
 * Humbell is opinionated so nobody has to set anything up: everyone starts on
 * Push, Pull, Legs at a gym, small — three lifts a day, every day — and the
 * plan grows as you keep coming (see `data/growth.ts`). Changing it is Plan's
 * job: a workout of another kind, or a loop of its own for away. The only
 * questions are for the first weights: how much you have lifted, and — said
 * to be used for nothing else, kept on the phone, and skippable — weight
 * and sex. No question about days a week: the loop doesn't care.
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

type Step = "welcome" | "lifted" | "body" | 0 | 1 | 2;

/** The steps the progress line counts. */
const ALONG: Step[] = ["lifted", "body", 0, 1, 2];

const EXPERIENCE_LABEL: Record<Experience, string> = {
  new: "No, I'm new to this",
  some: "A bit",
  lots: "Yes, for a while",
};

const SEX_LABEL: Record<Sex, string> = { woman: "Woman", man: "Man" };

/** A typed body weight, or undefined when it isn't one Humbell will take. */
const readWeight = (text: string): number | undefined => {
  const kg = Number(text.replace(",", "."));
  return Number.isFinite(kg) && kg >= BODYWEIGHT_RANGE.min && kg <= BODYWEIGHT_RANGE.max
    ? Math.round(kg)
    : undefined;
};
const placeOnLine = (step: Step): number => ALONG.indexOf(step);

const tap = () => Haptics.selectionAsync().catch(() => {});

function Steps({ onDone }: { onDone: (answers: Answers) => void }) {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const [trail, setTrail] = useState<Step[]>(["welcome"]);
  const [forward, setForward] = useState(true);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [weightText, setWeightText] = useState("");
  const [sex, setSex] = useState<Sex | undefined>(undefined);
  // Said, or skipped: skipping leaves weight and sex out, whatever was typed.
  const [skippedBody, setSkippedBody] = useState(false);

  const step = trail[trail.length - 1];
  const go = (next: Step) => {
    setForward(true);
    setTrail((t) => [...t, next]);
  };
  const back = () => {
    setForward(false);
    setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
  };
  const lifter: Lifter = {
    experience: experience ?? "some",
    ...(skippedBody ? {} : { bodyweight: readWeight(weightText), sex }),
  };
  // The plan itself is not a question: Push, Pull, Legs at a gym.
  const answers: Answers = { home: null, time: "long", easy: [], lifter };
  const plan = makePlan(state, answers);
  const finish = () => onDone(answers);

  const page = (() => {
    switch (step) {
      case "welcome":
        return (
          <Page
            art={<Welcome />}
            title="Welcome to Humbell."
            body="Come every day. Each workout is short, and the next one is always ready. Two quick questions and you're ready to lift."
            action={{ label: "Let's go", onPress: () => go("lifted") }}
          />
        );
      case "lifted":
        return (
          <Page
            title="Have you lifted weights before?"
            body="So your first weights suit you. New to it? Humbell starts you light."
          >
            {(Object.keys(EXPERIENCE_LABEL) as Experience[]).map((e) => (
              <Option
                key={e}
                label={EXPERIENCE_LABEL[e]}
                on={experience === e}
                onPress={() => {
                  tap();
                  setExperience(e);
                  go("body");
                }}
              />
            ))}
          </Page>
        );
      case "body": {
        const typed = weightText.trim().length > 0;
        const unreadable = typed && readWeight(weightText) === undefined;
        return (
          <Page
            title="Help Humbell pick your weights."
            body="Your weight and sex help pick a good starting weight for every new exercise: today, and whenever you add one later. Used for nothing else, and kept on your phone."
            action={{
              label: "Next",
              onPress: () => {
                setSkippedBody(false);
                go(0);
              },
            }}
            after={
              <TextButton
                label="Skip"
                onPress={() => {
                  setSkippedBody(true);
                  go(0);
                }}
              />
            }
          >
            <SectionLabel>Your weight</SectionLabel>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 60,
                paddingHorizontal: 18,
                borderRadius: 18,
                borderCurve: "continuous",
                backgroundColor: colors.surface,
              }}
            >
              <TextInput
                accessibilityLabel="Your weight in kilograms"
                value={weightText}
                onChangeText={setWeightText}
                keyboardType="decimal-pad"
                returnKeyType="done"
                maxLength={5}
                style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 24, paddingVertical: 12 }}
              />
              <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 20 }}>kg</Text>
            </View>
            {unreadable ? (
              <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 17 }}>
                A weight between {BODYWEIGHT_RANGE.min} and {BODYWEIGHT_RANGE.max} kg.
              </Text>
            ) : null}
            <View style={{ height: 8 }} />
            <SectionLabel>Sex</SectionLabel>
            {(Object.keys(SEX_LABEL) as Sex[]).map((x) => (
              <Option
                key={x}
                label={SEX_LABEL[x]}
                on={sex === x}
                onPress={() => {
                  tap();
                  setSex((now) => (now === x ? undefined : x));
                }}
              />
            ))}
            <Text style={{ marginTop: 12, color: colors.muted, fontFamily: fonts.regular, fontSize: 17, lineHeight: 24 }}>
              Rather not say? Skip. Humbell starts you light and finds your weights as you go.
            </Text>
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
 * Humbell's marks at work: a film that changes every few seconds, one kind of
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
          <Illustration id={WELCOME_FILMS[at]} film style={{ width: side, height: side }} />
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

/** A workout's family, by the same rule as Plan and Today: see `familyOfLifts`. */
const familyOfWorkout = (workout: Workout): Family => {
  const exercises = workout.exercises.map((e) => byId(e.options[0])).filter((e) => e !== undefined);
  return familyOfLifts(kindOf(workout), exercises.map((ex) => familyOf(ex))) ?? "push";
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
