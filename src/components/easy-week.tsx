import { View } from "react-native";

import { Button, LinkButton } from "@/components/buttons";
import { Text } from "@/components/text";
import { colors, radii } from "@/constants/theme";
import {
  declineEasyWeek,
  easyWeek,
  easyWeekOffer,
  endEasyWeek,
  startEasyWeek,
  useSession,
} from "@/store/session";

/**
 * The easy week on Today: offered after about three months of steady
 * training, and while it runs, which day of it this is and the way out.
 * See `easyWeekOffer` in the store.
 */
export function EasyWeek() {
  const { state, setState } = useSession();
  if (state.active) return null;
  const week = easyWeek(state);

  if (week) {
    return (
      <Card>
        <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
          <Text style={{ fontWeight: "700" }}>Easy week, day {week.day} of 7.</Text> Lighter weights and a set fewer,
          and nothing you lift this week moves your numbers. Rest days and walks count too.
        </Text>
        <LinkButton kind="quiet" label="Back to full weights now" onPress={() => setState((s) => endEasyWeek(s))} />
      </Card>
    );
  }

  if (!easyWeekOffer(state)) return null;
  return (
    <Card>
      <Text style={{ color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: "700" }}>
        Three months of hard work.
      </Text>
      <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
        Time for an easy week? The same workouts at about 60% of your weights, a set fewer. Your body catches up,
        and the week after, every lift is where you left it.
      </Text>
      <Button kind="secondary" label="Yes, an easy week" onPress={() => setState((s) => startEasyWeek(s))} />
      <LinkButton kind="quiet" label="Not now" onPress={() => setState((s) => declineEasyWeek(s))} />
    </Card>
  );
}

/** Whether the easy week has something to say on Today, so growth waits its turn. */
export const easyWeekShowing = (state: Parameters<typeof easyWeekOffer>[0]): boolean =>
  !!easyWeek(state) || easyWeekOffer(state);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ gap: 14, padding: 20, borderRadius: radii.card, borderCurve: "continuous", backgroundColor: colors.surface }}>
      {children}
    </View>
  );
}
