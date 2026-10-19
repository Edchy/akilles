import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { Icon } from "@/components/icon";
import { Column, COLUMN } from "@/components/screen";
import { Sheet, OpenRow } from "@/components/sheet";
import { colors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import type { Workout } from "@/data/split";
import { TODAY_LINES, fillLine, pickLine, type TodayMood } from "@/data/voice";
import { decayLabel, type Decay } from "@/lib/progression";
import { weightLabel } from "@/lib/warmup";
import type { DecayOffer, SessionState } from "@/store/session";
import {
  acceptDecay,
  buildWorkout,
  currentWorkout,
  daysSinceTrained,
  declineDecay,
  decayOffers,
  didTrain,
  exerciseCount,
  finishWorkout,
  pendingDecays,
  postponeWorkout,
  skipWorkout,
  trainedToday,
  upNext,
  useSession,
  workoutPreview,
} from "@/store/session";


export default function TodayScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  // A workout you stepped out of is still yours to finish: it stays on Today
  // until you continue it or end it — or open the app on a later day, which
  // closes it out (see `storage.ts`).
  const inProgress = !!state.active;
  const workout = inProgress ? currentWorkout(state) : upNext(state);
  // With one workout there is nothing to skip to.
  const canSkip = !inProgress && state.workouts.length > 1;
  // The workout just skipped, so a mis-tap is one tap to undo.
  const [pickingSkip, setPickingSkip] = useState(false);
  const [ending, setEnding] = useState(false);
  const [skipped, setSkipped] = useState<{
    id: string;
    name: string;
    postponed: boolean;
    before: Pick<SessionState, "nextWorkout" | "workoutQueue">;
  } | null>(null);

  // What time WOULD cost, computed fresh each render. Nothing is written
  // until you answer the prompt below.
  const offers = decayOffers(state);
  const idleDays = daysSinceTrained(state);
  // Cuts you already accepted, still waiting to be trained through.
  const adjusted = pendingDecays(state);

  const start = () => {
    setSkipped(null);
    // Never over the top of one in progress — that would throw its sets away.
    setState((s) => (s.active ? s : buildWorkout(s)));
    router.push("/workout");
  };

  const end = () => {
    setEnding(false);
    setState((s) => finishWorkout(s));
  };

  const skip = (postponed: boolean) => {
    setPickingSkip(false);
    setSkipped({
      id: workout.id,
      name: workout.name,
      postponed,
      before: { nextWorkout: state.nextWorkout, workoutQueue: state.workoutQueue },
    });
    setState((s) => postponed ? postponeWorkout(s) : skipWorkout(s));
  };

  // The exercise list, opened by tapping the summary. Closed again whenever
  // the workout on screen changes.
  const [showList, setShowList] = useState(false);
  useEffect(() => setShowList(false), [workout.id]);

  // Akilles' remark for today. Seeded by the day and the workout, so it holds
  // still while you look at it and changes tomorrow or when the workout does.
  const mood: TodayMood = skipped
    ? "skipped"
    : idleDays === null
      ? "first"
      : idleDays >= 7
        ? "back"
        : trainedToday(state)
          ? "again"
          : "regular";
  const remark = fillLine(
    pickLine(TODAY_LINES[mood], `${new Date().toDateString()}:${workout.id}:${skipped?.id ?? ""}`),
    { days: idleDays ?? undefined, name: skipped?.name },
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 56,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingBottom: 28,
          gap: 28,
        }}
      >
        {inProgress ? null : offers.length > 0 ? (
          <DecayPrompt
            offers={offers}
            idleDays={idleDays}
            onAccept={() => setState((s) => acceptDecay(s))}
            onDecline={() => setState((s) => declineDecay(s))}
          />
        ) : adjusted.length > 0 ? (
          <DecayBanner adjusted={adjusted} />
        ) : null}

        {/* What you are about to do, at the top where the eye lands. The
            exercises are one tap away for a look before you commit. */}
        <View>
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.display,
              textTransform: "uppercase",
              fontSize: 77,
              lineHeight: 76,
              letterSpacing: 0.3,
            }}
          >
            {workout.name || "Untitled"}
          </Text>
          {workout.subtitle ? (
            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                lineHeight: 30,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {workout.subtitle}
            </Text>
          ) : null}
        </View>

        <Preview workout={workout} open={showList} onToggle={() => setShowList((v) => !v)} />
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 16 }}>
        <Column style={{ gap: 14 }}>
          {/* Akilles has a word, out of the way of the workout itself. After a
              skip, the remark names it and carries the Undo. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
            <Text style={{ flex: 1, color: colors.muted, fontSize: 16, lineHeight: 22, fontWeight: "600" }}>
              {inProgress
                ? `In progress: ${exerciseCount(state, "done")} of ${exerciseCount(state, "total")} done.`
                : skipped?.postponed
                  ? `${skipped.name} is next after ${workout.name}.`
                  : remark}
            </Text>
            {skipped ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Undo skipping ${skipped.name}`}
                hitSlop={12}
                onPress={() => {
                  setState((s) => ({ ...s, ...skipped.before }));
                  setSkipped(null);
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text style={{ color: colors.rise, fontSize: 16, fontWeight: "800" }}>Undo</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {inProgress ? <BigButton label="End" onPress={() => setEnding(true)} /> : null}
            {canSkip ? <BigButton label="Skip" onPress={() => setPickingSkip(true)} /> : null}
            <BigButton label={inProgress ? "Continue" : "Start"} primary onPress={start} />
          </View>
        </Column>
      </View>
      <Sheet visible={pickingSkip} title={workout.name} onClose={() => setPickingSkip(false)}>
        <View style={{ paddingTop: 12, gap: 12 }}>
          <OpenRow
            title="Do this next time"
            detail={`Do ${upNext(skipWorkout(state)).name} now, then ${workout.name}.`}
            onPress={() => skip(true)}
          />
          <OpenRow
            title="Skip this round"
            detail="Move on. This workout returns when the cycle repeats."
            onPress={() => skip(false)}
          />
        </View>
      </Sheet>
      <Sheet visible={ending} title={workout.name} onClose={() => setEnding(false)}>
        <View style={{ paddingTop: 12, gap: 12 }}>
          <OpenRow
            title="End workout"
            detail={
              didTrain(state.active)
                ? "What you logged counts. The rest is marked skipped and the cycle moves on."
                : `Nothing logged yet, so ${workout.name} stays next.`
            }
            onPress={end}
          />
        </View>
      </Sheet>
    </View>
  );
}

/**
 * The workout at a glance: how many blocks, tap for the list — cardio, every
 * lift with the sets, reps and weight you would get today, cardio, mobility,
 * in the order you will do them.
 */
function Preview({
  workout,
  open,
  onToggle,
}: {
  workout: Workout;
  open: boolean;
  onToggle: () => void;
}) {
  const { state } = useSession();
  const rows = workoutPreview(state, workout);
  const n = rows.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${n} exercises. ${open ? "Hide" : "Show"} the list.`}
      onPress={onToggle}
      style={({ pressed }) => ({
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 16,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: "700" }}>
          {n} {n === 1 ? "exercise" : "exercises"}
        </Text>
        <Icon name={open ? "collapse" : "expand"} size={15} color={colors.muted} weight="semibold" />
      </View>

      {open ? (
        <View style={{ marginTop: 10 }}>
          {rows.map((r, i) => (
            <View
              key={r.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 54,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              <Text
                style={{
                  width: 18,
                  color: colors.faint,
                  fontSize: 13,
                  fontWeight: "800",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {i + 1}
              </Text>
              <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>
                {r.name}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 14,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {r.amount}
                </Text>
                {r.weight ? (
                  <Text style={{ color: colors.faint, fontSize: 13, fontVariant: ["tabular-nums"] }}>
                    {r.weight}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
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
        backgroundColor: primary ? colors.cloud : colors.raised,
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
          color: colors.rise,
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
            color: colors.rise,
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
        backgroundColor: fill ? colors.cloud : colors.raised,
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
