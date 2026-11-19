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
import { ClayPicture, HELLO, IntroFilm, MainButton } from "@/components/intro";
import { Option } from "@/components/place";
import { COLUMN } from "@/components/screen";
import { SectionLabel } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, fonts, radii } from "@/constants/theme";
import { BODYWEIGHT_RANGE, type Experience, type Lifter, type PushUps, type Sex } from "@/lib/start-weight";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import {
  applyPlan,
  seeIntro,
  useSession,
  wantsOnboarding,
  type Answers,
} from "@/store/session";

/**
 * The first launch, as one flow from hello to the first workout:
 *
 *   Welcome to Klay.               the clay fellow says hello, and what Klay is for
 *   Have you lifted weights?       new, a bit, or for a while
 *   Help Klay pick your weights    weight and sex — or rather not say
 *   Push-ups                       how many in a row, or not sure
 *   The film                       why, and how a workout goes (see
 *                                  `intro.tsx`), then Start lifting
 *
 * Klay is opinionated so nobody has to set anything up: everyone starts on
 * Push, Pull, Legs at a gym, small — three lifts a day, every day — and the
 * plan grows as you keep coming (see `data/growth.ts`). Changing it is Plan's
 * job: a workout of another kind, or a loop of its own for away. The only
 * questions are for the first weights: how much you have lifted, your
 * weight, your sex and your push-ups — each one you can decline, and said to
 * be used for nothing else and kept on the phone. No question about days a
 * week: the loop doesn't care.
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

type Step = "welcome" | "lifted" | "body" | "pushups" | "film";

/** The steps the progress line counts. */
const ALONG: Step[] = ["lifted", "body", "pushups", "film"];
const EXPERIENCE_LABEL: Record<Experience, string> = {
  new: "No, I'm new to this",
  some: "A bit",
  lots: "Yes, for a while",
};

/** "Unsaid" is a fine answer, said with a smile. */
const SEX_LABEL: Record<Sex | "unsaid", string> = {
  man: "Male",
  woman: "Female",
  unsaid: "None of your business",
};

const PUSH_UPS_LABEL: Record<PushUps | "unsure", string> = {
  none: "None yet",
  few: "1 to 10",
  some: "11 to 25",
  many: "More than 25",
  unsure: "Not sure",
};

/** A typed body weight, or undefined when it isn't one Klay will take. */
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
  // Each answered, or declined: "I'd rather not say", "None of your business", "Not sure".
  const [weightUnsaid, setWeightUnsaid] = useState(false);
  // Out of range is said once you have finished typing — not at the "8" of 80.
  const [weightTyped, setWeightTyped] = useState(false);
  const [sex, setSex] = useState<Sex | "unsaid" | undefined>(undefined);
  const [pushUps, setPushUps] = useState<PushUps | "unsure" | undefined>(undefined);

  const step = trail[trail.length - 1];
  const go = (next: Step) => {
    setForward(true);
    setTrail((t) => [...t, next]);
  };
  const back = () => {
    setForward(false);
    setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
  };
  const bodyweight = weightUnsaid ? undefined : readWeight(weightText);
  const lifter: Lifter = {
    experience: experience ?? "some",
    ...(bodyweight !== undefined ? { bodyweight } : {}),
    ...(sex && sex !== "unsaid" ? { sex } : {}),
    ...(pushUps && pushUps !== "unsure" ? { pushUps } : {}),
  };
  // The plan itself is not a question: Push, Pull, Legs at a gym.
  const answers: Answers = { home: null, time: "long", easy: [], lifter };
  const finish = () => onDone(answers);

  const page = (() => {
    switch (step) {
      case "welcome":
        return (
          <Page
            art={<Welcome />}
            title="Welcome to Klay."
            body="Klay tells you what to do at the gym, writes down what you did, and helps you do a little better each time. A few quick questions, and you're ready."
            action={{ label: "Let's go", onPress: () => go("lifted") }}
          />
        );
      case "lifted":
        return (
          <Page
            title="Have you lifted weights before?"
            body="So your first weights suit you. New to it? Klay starts you light."
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
        const unreadable = weightTyped && !weightUnsaid && typed && readWeight(weightText) === undefined;
        // Both answered — a number or rather not, and one of the three.
        const answered = (weightUnsaid || readWeight(weightText) !== undefined) && sex !== undefined;
        return (
          <Page
            title="Help Klay pick your weights."
            body="Your weight and sex help pick a good starting weight for every new exercise. Used for nothing else, and kept on your phone."
            action={{ label: "Next", disabled: !answered, onPress: () => go("pushups") }}
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
                opacity: weightUnsaid ? 0.4 : 1,
              }}
            >
              <TextInput
                accessibilityLabel="Your weight in kilograms"
                value={weightText}
                onChangeText={(text) => {
                  setWeightText(text);
                  setWeightUnsaid(false);
                  setWeightTyped(false);
                }}
                onEndEditing={() => setWeightTyped(true)}
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
            <Option
              label="I'd rather not say"
              on={weightUnsaid}
              onPress={() => {
                tap();
                setWeightUnsaid((now) => !now);
                setWeightText("");
              }}
            />
            <View style={{ height: 8 }} />
            <SectionLabel>Sex</SectionLabel>
            {(Object.keys(SEX_LABEL) as (Sex | "unsaid")[]).map((x) => (
              <Option
                key={x}
                label={SEX_LABEL[x]}
                on={sex === x}
                onPress={() => {
                  tap();
                  setSex(x);
                }}
              />
            ))}
          </Page>
        );
      }
      case "pushups":
        return (
          <Page
            title="How many push-ups can you do in a row?"
            body="Proper ones, chest close to the floor. It tells Klay how strong your upper body is, so your first presses suit you."
          >
            {(Object.keys(PUSH_UPS_LABEL) as (PushUps | "unsure")[]).map((x) => (
              <Option
                key={x}
                label={PUSH_UPS_LABEL[x]}
                on={pushUps === x}
                onPress={() => {
                  tap();
                  setPushUps(x);
                  go("film");
                }}
              />
            ))}
          </Page>
        );
      case "film":
        // The film, then the way in: why, and how a workout goes (see `intro.tsx`).
        return (
          <View style={{ flex: 1 }}>
            <IntroFilm />
            <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
              <MainButton label="Start lifting" onPress={finish} />
            </View>
          </View>
        );
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
            {step === "film" ? (
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

/** The clay fellow saying hello: the same figure as the stretches, before a word about lifting. */
function Welcome() {
  const { width, height } = useWindowDimensions();
  const side = Math.min(Math.min(width, COLUMN) - 44, height * 0.5, 420);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: "center", paddingTop: 8, paddingBottom: 16 }}
    >
      <ClayPicture source={HELLO} width={side} />
    </View>
  );
}

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
  /** The way on. `disabled` until the page's question is answered. */
  action?: { label: string; onPress: () => void; disabled?: boolean };
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
            accessibilityState={{ disabled: !!action.disabled }}
            disabled={action.disabled}
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
              opacity: action.disabled ? 0.3 : pressed ? 0.85 : 1,
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
