import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { colors, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { decayLabel, type Decay } from "@/lib/progression";
import { weightLabel } from "@/lib/warmup";
import type { DecayOffer } from "@/store/session";
import {
  acceptDecay,
  buildWorkout,
  daysSinceTrained,
  declineDecay,
  decayOffers,
  pendingDecays,
  setNextWorkout,
  skipWorkout,
  upNext,
  useSession,
} from "@/store/session";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

export default function TodayScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const workout = upNext(state);
  // With one workout there is nothing to skip to.
  const canSkip = state.workouts.length > 1;
  // The workout just skipped, so a mis-tap is one tap to undo.
  const [skipped, setSkipped] = useState<{ id: string; name: string } | null>(null);

  // What time WOULD cost, computed fresh each render. Nothing is written
  // until you answer the prompt below.
  const offers = decayOffers(state);
  const idleDays = daysSinceTrained(state);
  // Cuts you already accepted, still waiting to be trained through.
  const adjusted = pendingDecays(state);

  const start = () => {
    setSkipped(null);
    setState((s) => buildWorkout(s));
    router.push("/workout");
  };

  const skip = () => {
    setSkipped({ id: workout.id, name: workout.name });
    setState((s) => skipWorkout(s));
  };

  const count = workout.exercises.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 28,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingBottom: 28,
          gap: 26,
        }}
      >
        {offers.length > 0 ? (
          <DecayPrompt
            offers={offers}
            idleDays={idleDays}
            onAccept={() => setState((s) => acceptDecay(s))}
            onDecline={() => setState((s) => declineDecay(s))}
          />
        ) : adjusted.length > 0 ? (
          <DecayBanner adjusted={adjusted} />
        ) : null}

        {/* One thing on the screen: what you are about to do. The exercises
            are for the workout itself to show, one at a time. */}
        <View style={{ flex: 1, justifyContent: "center", gap: 10 }}>
          <Text
            style={{
              color: colors.acid,
              fontSize: 14,
              fontWeight: "800",
              letterSpacing: 1.6,
              textTransform: "uppercase",
            }}
          >
            Next up
          </Text>
          <Text
            style={{
              color: colors.text,
              fontFamily: serif,
              fontSize: 68,
              lineHeight: 70,
              fontWeight: "700",
              letterSpacing: -2.4,
            }}
          >
            {workout.name || "Untitled"}
          </Text>
          {workout.subtitle ? (
            <Text style={{ color: colors.muted, fontSize: 20, lineHeight: 26 }}>
              {workout.subtitle}
            </Text>
          ) : null}
          <Text style={{ color: colors.faint, fontSize: 15, marginTop: 8 }}>
            {count} {count === 1 ? "exercise" : "exercises"}
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
        <Column style={{ gap: 12 }}>
          {skipped ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Text style={{ color: colors.faint, fontSize: 15 }}>
                Skipped {skipped.name}.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Undo skipping ${skipped.name}`}
                hitSlop={12}
                onPress={() => {
                  setState((s) => setNextWorkout(s, skipped.id));
                  setSkipped(null);
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text style={{ color: colors.acid, fontSize: 15, fontWeight: "800" }}>
                  Undo
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 12 }}>
            {canSkip ? <BigButton label="Skip" onPress={skip} /> : null}
            <BigButton label="Start" primary onPress={start} />
          </View>
        </Column>
      </View>
    </View>
  );
}

/** The two things Today asks: big enough to hit without looking twice. */
function BigButton({
  label,
  primary = false,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        // Start is the answer nearly every time, so it takes twice the room.
        flex: primary ? 2 : 1,
        minHeight: 76,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: primary ? colors.acid : colors.raised,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: primary ? colors.ink : colors.text,
          fontSize: 22,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Says that weights were changed without being asked, before you start.
 *
 * Grouped by what happened rather than listed one lift at a time: "six weeks
 * away, eight lifts backed off 15%" is the fact you need, and a list of every
 * exercise would bury it.
 */
function DecayBanner({
  adjusted,
}: {
  adjusted: { exerciseId: string; decay: Decay }[];
}) {
  // One line per distinct cut. Most sessions have exactly one.
  const groups = new Map<string, { decay: Decay; names: string[] }>();
  for (const { exerciseId, decay } of adjusted) {
    const k = `${decay.kind}:${decay.fraction}:${decay.days ?? 0}`;
    const g = groups.get(k) ?? { decay, names: [] };
    g.names.push(byId(exerciseId)?.name ?? exerciseId);
    groups.set(k, g);
  }

  return (
    <View
      style={{
        gap: 10,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 18,
      }}
    >
      <Text
        style={{
          color: colors.acid,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        Weights adjusted
      </Text>

      {[...groups.values()].map((g, i) => (
        <View key={i} style={{ gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21 }}>
            {decayLabel(g.decay)}
          </Text>
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 18 }}>
            {g.names.length} {g.names.length === 1 ? "exercise" : "exercises"}:{" "}
            {g.names.slice(0, 4).join(", ")}
            {g.names.length > 4 ? ` and ${g.names.length - 4} more` : ""}
          </Text>
        </View>
      ))}

      <Text style={{ color: colors.faint, fontSize: 12, lineHeight: 17 }}>
        Nothing is lost — the weight comes back as you train. Adjust any of it
        with +/− on the exercise.
      </Text>
    </View>
  );
}

/**
 * Asks before touching your weights.
 *
 * The app can tell you have been away, but how much you have actually lost
 * is something only you know — you may have been lifting elsewhere, or ill,
 * or simply fine. So this states the fact, says exactly what it proposes,
 * and waits. Declining is a real answer: the question is not asked again
 * until something changes.
 */
function DecayPrompt({
  offers,
  idleDays,
  onAccept,
  onDecline,
}: {
  offers: DecayOffer[];
  idleDays: number | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  // Every offer in a session is normally the same cut, so lead with it.
  const worst = offers.reduce((a, b) => (b.decay.fraction > a.decay.fraction ? b : a));
  const pct = Math.round(worst.decay.fraction * 100);
  const layoff = worst.decay.kind === "layoff";

  const headline = layoff
    ? `It has been ${describeGap(idleDays ?? worst.decay.days ?? 0)} since your last workout.`
    : "A month without progress on some lifts.";

  // A couple of concrete examples beat a percentage: "80 → 67.5" is the
  // thing you can actually judge.
  const examples = offers.slice(0, 3);

  return (
    <View
      style={{
        gap: 14,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 18,
      }}
    >
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: colors.acid,
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Drop the weights?
        </Text>
        <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>
          {headline} Ease {offers.length === 1 ? "it" : "them"} back {pct}% so you
          can build up again?
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        {examples.map((o) => (
          <View
            key={o.key}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 30 }}
          >
            <Text style={{ flex: 1, color: colors.muted, fontSize: 14 }}>
              {byId(o.exerciseId)?.name ?? o.exerciseId}
            </Text>
            <Text
              style={{
                color: colors.faint,
                fontSize: 14,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              {weightLabel(byId(o.exerciseId)!, o.from)} →{" "}
              {weightLabel(byId(o.exerciseId)!, o.to)}
            </Text>
          </View>
        ))}
        {offers.length > examples.length ? (
          <Text style={{ color: colors.faint, fontSize: 13, paddingTop: 4 }}>
            and {offers.length - examples.length} more
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Choice label="Yes, ease back" fill onPress={onAccept} />
        <Choice label="No, keep them" onPress={onDecline} />
      </View>
    </View>
  );
}

/** "3 weeks", "2 months" — the unit you would use out loud. */
function describeGap(days: number): string {
  if (days >= 60) return `${Math.round(days / 30)} months`;
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  return `${days} days`;
}

function Choice({
  label,
  fill,
  onPress,
}: {
  label: string;
  fill?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: fill ? colors.acid : colors.raised,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: fill ? colors.ink : colors.text,
          fontSize: 14,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
