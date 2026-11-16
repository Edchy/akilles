import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button, LinkButton } from "@/components/buttons";
import { Text } from "@/components/text";
import { colors, radii } from "@/constants/theme";
import type { Track } from "@/data/growth";
import {
  acceptGrowth,
  declineGrowth,
  growthOffer,
  useSession,
  type GrowthChange,
  type SessionState,
} from "@/store/session";

const CHOICE: Record<Track, { label: string; detail: string }> = {
  lift: { label: "One more exercise", detail: "each day" },
  cardio: { label: "More cardio", detail: "5 easy minutes to finish" },
  stretch: { label: "A longer stretch", detail: "the Yoga flow to finish" },
};

/** "Cable crossover in Push, Face pull in Pull and Leg curl in Legs." */
const where = (changes: GrowthChange[], track: Track): string => {
  const parts = track === "lift"
    ? changes.map((c) => `${c.what} in ${c.workout}`)
    : [`${changes.map((c) => c.workout).join(", ").replace(/, ([^,]*)$/, " and $1")}`];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
};

/**
 * Three weeks of showing up earns a bit more, offered here on Today — once,
 * with exactly what each choice changes, and nothing changed without a yes.
 * After a yes it says what went where, with Undo, and the way to Plan.
 */
export function GrowthOffer() {
  const { state, setState } = useSession();
  const [done, setDone] = useState<{ text: string; before: SessionState; after: SessionState } | null>(null);
  const offer = state.active ? null : growthOffer(state);

  if (done && state === done.after) {
    return (
      <Card>
        <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>{done.text}</Text>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <LinkButton kind="link" label="See it in Plan" onPress={() => { setDone(null); router.navigate("/plan"); }} />
          <LinkButton kind="link" label="Undo" onPress={() => { setState((s) => (s === done.after ? done.before : s)); setDone(null); }} />
        </View>
      </Card>
    );
  }
  if (!offer) return null;

  return (
    <Card>
      <Text style={{ color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: "700" }}>
        Three weeks of showing up.
      </Text>
      <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
        Ready for a bit more? Pick one, or keep things as they are.
      </Text>
      <View style={{ gap: 10 }}>
        {offer.map((choice) => (
          <View key={choice.track} style={{ gap: 4 }}>
            <Button
              kind="secondary"
              label={`${CHOICE[choice.track].label}, ${CHOICE[choice.track].detail}`}
              onPress={() => {
                const after = acceptGrowth(state, choice.track);
                const added = choice.track === "lift" ? "Added" : choice.track === "cardio" ? "Cardio to finish added to" : "Yoga flow added to";
                setDone({ text: `${added} ${where(choice.changes, choice.track)}.`, before: state, after });
                setState(after);
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21, paddingHorizontal: 8 }}>
              {choice.track === "lift" ? `Adds ${where(choice.changes, "lift")}.` : `In ${where(choice.changes, choice.track)}.`}
            </Text>
          </View>
        ))}
      </View>
      <LinkButton kind="quiet" label="Not now" onPress={() => setState((s) => declineGrowth(s))} />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ gap: 14, padding: 20, borderRadius: radii.card, borderCurve: "continuous", backgroundColor: colors.surface }}>
      {children}
    </View>
  );
}
