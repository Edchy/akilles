import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Backup } from "@/components/backup";
import { useBarSpace } from "@/components/bottom-bar";
import { Icon } from "@/components/icon";
import { useOpenIntro } from "@/components/intro";
import { kitSummary, PlaceSheet, usualName } from "@/components/place";
import { COLUMN } from "@/components/screen";
import { BigButton, OpenRow, SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { TestMode } from "@/components/test-mode";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { PLAN_ABOUT, PLAN_IDS, PLAN_NAME, type PlanId } from "@/data/plans";
import { forgetBody, kitAt, placeOf, planOf, switchPlan, useSession } from "@/store/session";

/**
 * Everything you set once and rarely touch, in one place, so the screens you
 * train from stay clear: where you are training, how Klay works, and your
 * data. Reached from the gear on Plan.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const router = useRouter();
  const { state, setState } = useSession();
  const openIntro = useOpenIntro();
  const [sheet, setSheet] = useState<"place" | "plan" | "backup" | "test" | "body" | null>(null);
  // The plan tapped in the plan sheet, waiting for a yes.
  const [picked, setPicked] = useState<PlanId | null>(null);
  const plan = planOf(state);
  const closePlan = () => {
    setSheet(null);
    setPicked(null);
  };

  const away = placeOf(state) === "away";
  // Said at the start, for first weights only: shown so it can be taken back.
  const body = state.lifter && (state.lifter.bodyweight !== undefined || state.lifter.sex !== undefined);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: barSpace + 28,
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          marginLeft: -10,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Icon name="back" size={20} color={colors.text} />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontFamily: fonts.display, fontSize: 48, marginBottom: 10 }}
      >
        Settings
      </Text>

      <SectionLabel>Where you are training</SectionLabel>
      <OpenRow
        title={away ? "Somewhere else" : usualName(state.kits?.usual)}
        detail={
          away
            ? kitSummary(kitAt(state, "away"))
            : "Away for a while? Tell Klay what you have there."
        }
        onPress={() => setSheet("place")}
      />

      <View style={{ height: 14 }} />
      <SectionLabel>Your plan</SectionLabel>
      <OpenRow
        title={plan ? PLAN_NAME[plan] : "Your own workouts"}
        detail="Change to another plan"
        onPress={() => setSheet("plan")}
      />

      <View style={{ height: 14 }} />
      <SectionLabel>Help</SectionLabel>
      <OpenRow title="Why Klay, and how it works" detail="A one-minute film" onPress={openIntro} />

      <View style={{ height: 14 }} />
      <SectionLabel>Your training</SectionLabel>
      <OpenRow
        title="Backup & restore"
        detail="Save everything to a file, or put it back"
        onPress={() => setSheet("backup")}
      />
      <OpenRow
        title="Test mode"
        detail="Try things out without touching your training"
        onPress={() => setSheet("test")}
      />
      {body ? (
        <OpenRow
          title="Your weight and sex"
          detail="Used only to guess first weights"
          onPress={() => setSheet("body")}
        />
      ) : null}

      {sheet === "place" ? <PlaceSheet onClose={() => setSheet(null)} /> : null}
      <Sheet visible={sheet === "plan"} title="Your plan" closeLabel="Done" onClose={closePlan}>
        {picked ? (
          <View style={{ gap: 20, paddingTop: 8 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 28 }}>
              {PLAN_NAME[picked]}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 27 }}>
              Its workouts take over from yours. Yours are paused, not deleted: they wait in
              Plan, and you can come back to them. Your weights and your history stay as they are.
            </Text>
            <BigButton
              label="Use this plan"
              onPress={() => {
                setState((s) => switchPlan(s, picked));
                closePlan();
              }}
            />
            <TextButton label="Cancel" onPress={() => setPicked(null)} />
          </View>
        ) : (
          <View style={{ gap: 12, paddingTop: 8 }}>
            {PLAN_IDS.map((id) => (
              <OpenRow
                key={id}
                title={PLAN_NAME[id]}
                detail={PLAN_ABOUT[id]}
                tag={id === plan ? "In use" : undefined}
                onPress={() => (id === plan || state.active ? undefined : setPicked(id))}
              />
            ))}
            {state.active ? (
              <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
                Finish today&apos;s workout first, then you can change plan.
              </Text>
            ) : null}
          </View>
        )}
      </Sheet>
      <Sheet
        visible={sheet === "backup"}
        title="Backup"
        closeLabel="Done"
        onClose={() => setSheet(null)}
      >
        <Backup />
      </Sheet>
      <Sheet
        visible={sheet === "test"}
        title="Test mode"
        closeLabel="Done"
        onClose={() => setSheet(null)}
      >
        <TestMode onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet
        visible={sheet === "body"}
        title="Your weight and sex"
        closeLabel="Done"
        onClose={() => setSheet(null)}
      >
        <View style={{ gap: 20, paddingTop: 8 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 27 }}>
            {[
              state.lifter?.bodyweight !== undefined ? `${state.lifter.bodyweight} kg` : null,
              state.lifter?.sex ? (state.lifter.sex === "woman" ? "Woman" : "Man") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 27 }}>
            Klay uses these only to guess the weight for an exercise you have never done. They stay
            on your phone. Once you have trained, your own weights matter more.
          </Text>
          <BigButton
            label="Forget them"
            danger
            onPress={() => {
              setState((s) => forgetBody(s));
              setSheet(null);
            }}
          />
        </View>
      </Sheet>
    </ScrollView>
  );
}
