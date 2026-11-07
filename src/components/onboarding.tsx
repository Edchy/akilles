import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Mark } from "@/components/mark";
import { KitPicker, Option } from "@/components/place";
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
import { applyPlan, makePlan, useSession, wantsOnboarding, type Answers } from "@/store/session";

/**
 * The first launch: two quick questions, then the plan.
 *
 *   Where do you train?           a gym, or home — and what home has
 *   How long do you usually have? which shape of plan, and how many lifts
 *   Here's your plan.             Start with this, or Make it mine
 *
 * Milo's pick needs those two facts whatever happens: a gym plan is useless
 * in a living room and an hour-long one is useless in thirty minutes. Anyone
 * who wants to be handed a plan is lifting after two taps; anyone who wants
 * to change it does so while looking at a real one.
 *
 * No question about days a week. The loop doesn't care: you do the next
 * workout whenever you come.
 *
 * Only on a phone that has never trained. The intro follows it.
 */
export function Onboarding() {
  const { state, setState } = useSession();
  if (!wantsOnboarding(state)) return null;
  return <Steps onDone={(answers) => setState((s) => applyPlan(s, answers))} />;
}

type Step = "welcome" | "where" | "home" | "time" | "plan" | "mine";

function Steps({ onDone }: { onDone: (answers: Answers) => void }) {
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const [trail, setTrail] = useState<Step[]>(["welcome"]);
  const [home, setHome] = useState<Kit | null>(null);
  const [kit, setKit] = useState<Kit>({ gear: ["dumbbells"] });
  const [time, setTime] = useState<Time>("long");
  const [easy, setEasy] = useState<Easy[]>([]);
  const [shape, setShape] = useState<Shape | undefined>(undefined);

  const step = trail[trail.length - 1];
  const go = (next: Step) => setTrail((t) => [...t, next]);
  const back = () => setTrail((t) => (t.length > 1 ? t.slice(0, -1) : t));
  const answers: Answers = { home, time, easy, shape };

  const page = (() => {
    switch (step) {
      case "welcome":
        return (
          <Page
            title="Let's build your plan."
            body="Two quick questions, and Milo does the rest."
            action={{ label: "Let's go", onPress: () => go("where") }}
          />
        );
      case "where":
        return (
          <Page title="Where do you train?" body="Milo picks exercises you can do there.">
            <Option
              label="At a gym"
              on={false}
              onPress={() => {
                setHome(null);
                go("time");
              }}
            />
            <Option label="At home" on={false} onPress={() => go("home")} />
          </Page>
        );
      case "home":
        return (
          <Page
            title="What do you have at home?"
            body="Tick everything you have. Nothing at all is fine too."
            action={{
              label: "Next",
              onPress: () => {
                setHome(kit);
                go("time");
              },
            }}
          >
            <KitPicker kit={kit} onChange={setKit} />
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
                on={false}
                onPress={() => {
                  setTime(t);
                  setShape(undefined);
                  go("plan");
                }}
              />
            ))}
          </Page>
        );
      case "plan": {
        const plan = makePlan(state, answers);
        return (
          <Page
            title="Here's your plan."
            body={
              plan.length === 1
                ? "One workout. Do it whenever you come."
                : `${plan.length} workouts that take turns. Do whichever is next, whenever you come.`
            }
            action={{ label: "Start with this", onPress: () => onDone(answers) }}
            after={<TextButton label="Make it mine" onPress={() => go("mine")} />}
          >
            {plan.map((w) => (
              <PlanCard key={w.id} workout={w} />
            ))}
          </Page>
        );
      }
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
                onPress={() =>
                  setEasy((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]))
                }
              />
            ))}
            <View style={{ height: 20 }} />
            <SectionLabel>Shape of plan</SectionLabel>
            {(Object.keys(SHAPE_LABEL) as Shape[]).map((sh) => (
              <Option
                key={sh}
                label={sh === pick ? `${SHAPE_LABEL[sh]} (Milo's pick)` : SHAPE_LABEL[sh]}
                on={(shape ?? pick) === sh}
                onPress={() => setShape(sh === pick ? undefined : sh)}
              />
            ))}
          </Page>
        );
      }
    }
  })();

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ height: 44, paddingHorizontal: 12, justifyContent: "center" }}>
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
        {page}
        <View style={{ height: Math.max(insets.bottom, 16) }} />
      </View>
    </Modal>
  );
}

/** One question or answer: a heading that says what it means, a line under it, room around both. */
function Page({
  title,
  body,
  action,
  after,
  children,
}: {
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
          paddingTop: 24,
          paddingBottom: 24,
          gap: 12,
        }}
      >
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
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: colors.white, fontFamily: fonts.medium, fontSize: 21 }}>
              {action.label}
            </Text>
          </Pressable>
          {after}
        </View>
      ) : null}
    </>
  );
}

/** A workout as the plan shows it: its name, what it trains, and what you will do. */
function PlanCard({ workout }: { workout: Workout }) {
  const exercises = workout.exercises.map((e) => byId(e.options[0])!).filter(Boolean);
  const family: Family = mostCommon(exercises.map((ex) => familyOf(ex))) ?? "push";
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

const mostCommon = <T,>(list: T[]): T | undefined => {
  const count = new Map<T, number>();
  for (const x of list) count.set(x, (count.get(x) ?? 0) + 1);
  let best: T | undefined;
  for (const [x, n] of count) if (best === undefined || n > (count.get(best) ?? 0)) best = x;
  return best;
};
