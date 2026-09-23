import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { colors, radii } from "@/constants/theme";
import {
  CARDIO_MINUTES,
  cardioById,
  mobilityById,
  mobilityPool,
  routineSeconds,
} from "@/data/conditioning";
import { byId } from "@/data/exercises";
import { repLabel, setsFor } from "@/data/split";
import { decayLabel, type Decay } from "@/lib/progression";
import { weightLabel } from "@/lib/warmup";
import type { DecayOffer } from "@/store/session";
import {
  CARDIO_SLOTS,
  CONDITIONING_ID,
  MOBILITY_SLOT,
  buildWorkout,
  chosen,
  acceptDecay,
  daysSinceTrained,
  declineDecay,
  decayOffers,
  pendingDecays,
  slotKey,
  upNext,
  useSession,
} from "@/store/session";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

export default function TodayScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const workout = upNext(state);

  // What time WOULD cost, computed fresh each render. Nothing is written
  // until you answer the prompt below.
  const offers = decayOffers(state);
  const idleDays = daysSinceTrained(state);
  // Cuts you already accepted, still waiting to be trained through.
  const adjusted = pendingDecays(state);

  const start = () => {
    setState((s) => buildWorkout(s));
    router.push("/workout");
  };

  /** The block the conditioning slot currently holds, falling back to default. */
  const conditioning = (slot: string, fallback: string) =>
    state.choices[slotKey(CONDITIONING_ID, slot)] ?? fallback;

  const openCardio = cardioById(conditioning(CARDIO_SLOTS.open, "treadmill"))!;
  const closeCardio = cardioById(conditioning(CARDIO_SLOTS.close, "ski_erg"))!;
  const routine = mobilityById(
    conditioning(MOBILITY_SLOT, mobilityPool()[0].id),
  )!;

  // What the session actually runs, in order: cardio, the lifts, cardio,
  // mobility. Same shape as `buildWorkout` produces.
  const rows = [
    {
      key: CARDIO_SLOTS.open,
      name: openCardio.name,
      detail: `${CARDIO_MINUTES} min`,
      conditioning: true,
      floater: false,
    },
    ...workout.exercises.map((entry) => ({
      key: entry.id,
      name: byId(chosen(state, workout.id, entry))!.name,
      detail: `${setsFor(entry)} × ${repLabel(entry.scheme)}`,
      conditioning: false,
      floater: !!entry.floater,
    })),
    {
      key: CARDIO_SLOTS.close,
      name: closeCardio.name,
      detail: `${CARDIO_MINUTES} min`,
      conditioning: true,
      floater: false,
    },
    {
      key: MOBILITY_SLOT,
      name: routine.name,
      detail: `${Math.round(routineSeconds(routine) / 60)} min`,
      conditioning: true,
      floater: false,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 28,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingBottom: 28,
          gap: 26,
        }}
      >
        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: colors.acid,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            Next up
          </Text>
          <Text
            style={{
              color: colors.text,
              fontFamily: serif,
              fontSize: 44,
              lineHeight: 47,
              fontWeight: "700",
              letterSpacing: -1.6,
            }}
          >
            {workout.name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>
            {workout.subtitle}
          </Text>
        </View>

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

        <View style={{ gap: 2 }}>
          {rows.map((row, i) => {
            return (
              <View
                key={`${row.key}-${i}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  paddingVertical: 15,
                }}
              >
                <Text
                  style={{
                    // Wide enough for a two-digit number: the conditioning
                    // blocks push the list past nine rows.
                    width: 20,
                    color: colors.faint,
                    fontSize: 13,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {i + 1}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    // Cardio and mobility bookend the lifting rather than
                    // being part of it, so they sit back a shade.
                    color: row.conditioning ? colors.muted : colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {row.name}
                </Text>
                {/* Marks work you can fold into an earlier exercise's rest. */}
                {row.floater ? (
                  <Text
                    accessibilityLabel="Can be supersetted"
                    style={{
                      color: colors.line,
                      fontSize: 9,
                      fontWeight: "800",
                      letterSpacing: 0.5,
                    }}
                  >
                    S
                  </Text>
                ) : null}

                <Text
                  style={{
                    color: colors.faint,
                    fontSize: 14,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {row.detail}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
        <Column style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={({ pressed }) => ({
            minHeight: 60,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.button,
            borderCurve: "continuous",
            backgroundColor: colors.acid,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: "800" }}>
            Start
          </Text>
        </Pressable>
        <Text
          style={{
            textAlign: "center",
            color: colors.faint,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          Stop whenever you want. The next session picks up where the cycle left off.
        </Text>
        </Column>
      </View>
    </View>
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
