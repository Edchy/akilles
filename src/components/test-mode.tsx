import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BigButton, SHEET_SWAP_MS, TextButton } from "@/components/sheet";
import { Text } from "@/components/text";
import { colors, radii } from "@/constants/theme";
import { useSession } from "@/store/session";
import { hasSaved } from "@/store/storage";
import { useTestMode, type TestStart } from "@/store/test-mode";

/**
 * Across the top of every screen while test mode is on, under the status
 * bar: what you are looking at, and the way back. Navy, the colour of no
 * family, so it reads as the app talking rather than part of a workout.
 */
export function TestStrip() {
  const { on, leave } = useTestMode();
  const insets = useSafeAreaInsets();
  if (!on) return null;
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.bg }}>
      <View
        accessible
        accessibilityLabel="Test mode. Your real training is safe."
        style={{
          minHeight: 40,
          paddingLeft: 18,
          paddingRight: 6,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.text,
        }}
      >
        <Text style={{ flex: 1, color: colors.ink, fontSize: 15 }} numberOfLines={1}>
          <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "700" }}>Test mode</Text>
          {" · your real training is safe"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave test mode"
          onPress={leave}
          style={({ pressed }) => ({
            minHeight: 40,
            paddingHorizontal: 12,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "700" }}>Leave</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Progress › Test mode. Off: what it is, and three ways in. On: short
 * workouts, starting over, and the way back to your real training.
 *
 * Every way in or out closes this sheet first and switches after it has
 * gone, so the intro — a new phone's first sight — has room to open.
 */
export function TestMode({ onDone }: { onDone: () => void }) {
  const { on, start, leave } = useTestMode();
  const { state, setState } = useSession();
  const [canResume, setCanResume] = useState(false);
  const [startingOver, setStartingOver] = useState(false);

  useEffect(() => {
    if (!on) hasSaved("test").then(setCanResume);
  }, [on]);

  const after = (task: () => Promise<void>) => {
    onDone();
    setTimeout(() => void task(), SHEET_SWAP_MS);
  };
  const begin = (from: TestStart) => after(() => start(from));

  const starts = (
    <View style={{ gap: 10 }}>
      <Choice
        title="Like a new phone"
        detail="The intro, the starting workouts, nothing trained yet."
        onPress={() => begin("fresh")}
      />
      <Choice
        title="A copy of my training"
        detail="Your workouts, weights and history, to try changes on."
        onPress={() => begin("copy")}
      />
    </View>
  );

  if (!on) {
    return (
      <View style={{ gap: 24, paddingTop: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
          Try things out without changing your real training. While test mode is on, a dark strip
          runs across the top of the screen, and nothing you do reaches your real workouts,
          weights or history.
        </Text>
        {canResume ? (
          <Choice
            title="Carry on testing"
            detail="From where you left it last time."
            onPress={() => begin("resume")}
          />
        ) : null}
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.faint, fontSize: 15, fontStyle: "italic" }}>
            {canResume ? "Or start again" : "Start test mode"}
          </Text>
          {starts}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 28, paddingTop: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
        You are in test mode. Your real training is saved and waiting, exactly as you left it.
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          minHeight: 72,
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
            Short workouts
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 20 }}>
            Each workout runs only its first two exercises.
          </Text>
        </View>
        {/* A switch sits at the top of its row unless it is given the height. */}
        <View style={{ alignSelf: "stretch", justifyContent: "center" }}>
          <Switch
            accessibilityLabel="Short workouts"
            value={!!state.shortWorkouts}
            trackColor={{ true: colors.rise }}
            onValueChange={(v) => setState((s) => ({ ...s, shortWorkouts: v }))}
          />
        </View>
      </View>

      {startingOver ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.faint, fontSize: 15, fontStyle: "italic" }}>
            Start over, throwing this test away
          </Text>
          {starts}
          <TextButton label="Keep this test" onPress={() => setStartingOver(false)} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <BigButton label="Leave test mode" onPress={() => after(leave)} />
          <BigButton label="Start over" quiet onPress={() => setStartingOver(true)} />
        </View>
      )}
    </View>
  );
}

/** One way in: what it is, and what you get. */
function Choice({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: 4,
        minHeight: 76,
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 20 }}>{detail}</Text>
    </Pressable>
  );
}
