import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { Icon } from "@/components/icon";
import { COLUMN } from "@/components/screen";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";

/**
 * What Klay believes, in plain words: the philosophy in PRODUCT.md, said to
 * someone who has never set foot in a gym. Reached from Settings › About Klay.
 * Short paragraphs, nothing to tap, nothing a first-timer needs to know
 * the words for.
 */
const IDEAS: { title: string; body: string }[] = [
  {
    title: "Move every day",
    body: "Aim to train every day, the way you eat and sleep every day. That doesn't mean thirty workouts a month. Life gets in the way: a cold, a late night, a trip. Those days become your rest days on their own. If they don't, take one a week anyway: go for a walk in nature and let your body recover. And a training day can be small: twenty minutes on the rower and a stretch still counts.",
  },
  {
    title: "Own the weight",
    body: "A rep counts when you own it: lowered slowly, held for a moment where it is hardest, and lifted without a swing. Light and controlled beats heavy and sloppy. Making a light weight feel heavy is the skill.",
  },
  {
    title: "Klay decides, you train",
    body: "Open the app and you know what to do. The exercise, the weight and the reps are worked out for you, and next time's numbers come from how today went. There is no plan to write and no logbook to fill in.",
  },
  {
    title: "Climb, then climb again",
    body: "When a lift goes up a step, Klay often takes you back down the reps to climb to the top again at the new weight, slower and steadier. Your progress decides when that happens, never the calendar.",
  },
  {
    title: "Start small, grow by showing up",
    body: "Everyone starts with a short workout: three exercises, a little cardio and a stretch. Keep coming back and Klay offers a bit more. Nothing changes until you say yes.",
  },
  {
    title: "Movements for life",
    body: "Squat, lift from the floor, push, pull, step and carry: the movements you use every day. Those come first. Exercises for single muscles are there when you want them, but they are the seasoning, not the meal.",
  },
  {
    title: "Rest is part of training",
    body: "Between sets, rest long enough to do the next one as well as the last: about two and a half minutes after the day's first lift, a minute and a half after most, a minute for small muscles. Klay keeps the time and plays a sound when you're ready. And every three months or so, Klay offers an easy week: the same workouts, lighter, so your body can catch up.",
  },
  {
    title: "No guilt",
    body: "Miss a day and nothing is owed: Klay simply picks up with the next workout. A busy machine costs nothing either. Do something else and come back to it.",
  },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const router = useRouter();
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
        gap: 28,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Settings"
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
      {/* The motto: everything below serves one of its two lines. */}
      <View style={{ gap: 14, padding: 20, borderRadius: 20, borderCurve: "continuous", backgroundColor: colors.surface }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 }}>Extreme consistency.</Text>
          <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 }}>
            Obsessive quality of execution.
          </Text>
        </View>
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 28 }}>
          Two things change your body: showing up again and again, and doing every rep as well as you can.
          Everything in Klay serves one or the other. Workouts are small enough to do every day, and each rep is
          slow and clean enough to own. Not a perfect week, but a good rep, today, and again tomorrow.
        </Text>
      </View>
      {IDEAS.map((idea) => (
        <View key={idea.title} style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 28 }}>
            {idea.title}
          </Text>
          <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 28 }}>
            {idea.body}
          </Text>
        </View>
      ))}
      <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 22, lineHeight: 30 }}>
        Leave the ego at the door. Lighter today is how you get stronger for good.
      </Text>
    </ScrollView>
  );
}
