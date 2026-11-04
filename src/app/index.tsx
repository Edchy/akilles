import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { Mark } from "@/components/mark";
import { Column, COLUMN } from "@/components/screen";
import { Sheet, OpenRow } from "@/components/sheet";
import { colors, FAMILY, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import type { Family } from "@/data/families";
import type { Workout } from "@/data/split";
import { TODAY_LINES, fillLine, newsLine, pickLine, type TodayMood } from "@/data/voice";
import { decayLabel, type Decay } from "@/lib/progression";
import { weightLabel } from "@/lib/warmup";
import type { DecayOffer, PreviewRow, SessionState } from "@/store/session";
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
  upcomingWorkouts,
  useSession,
  workoutFamily,
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
    before: Pick<SessionState, "nextWorkout" | "workoutQueue" | "postponed">;
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
      before: {
        nextWorkout: state.nextWorkout,
        workoutQueue: state.workoutQueue,
        postponed: state.postponed,
      },
    });
    setState((s) => postponed ? postponeWorkout(s) : skipWorkout(s));
  };

  const rows = workoutPreview(state, workout);
  const family = workoutFamily(state, workout);

  // Akilles says something only when there is something to say: a day that
  // is not ordinary, or what changed since you last did these lifts. An
  // ordinary day with nothing new has no line at all. Seeded by the day and
  // the workout, so it holds still while you look at it.
  const seed = `${new Date().toDateString()}:${workout.id}:${skipped?.id ?? ""}`;
  const mood: TodayMood | null = skipped
    ? "skipped"
    : idleDays === null
      ? "first"
      : idleDays >= 7
        ? "back"
        : trainedToday(state)
          ? "again"
          : null;
  const remark = mood
    ? fillLine(pickLine(TODAY_LINES[mood], seed), {
        days: idleDays ?? undefined,
        name: skipped?.name,
      })
    : newsLine(
        {
          up: rows.flatMap((r) =>
            r.change === "up" && r.weight ? [{ name: r.name, weight: r.weight }] : [],
          ),
          fresh: rows.filter((r) => r.change === "new"),
          reload: rows.flatMap((r) =>
            r.change === "reload" && r.weight ? [{ name: r.name, weight: r.weight }] : [],
          ),
          down: rows.flatMap((r) =>
            r.change === "down" && r.weight ? [{ name: r.name, weight: r.weight }] : [],
          ),
        },
        seed,
      );
  // Where you are, or what comes next — said plainly.
  const fact = inProgress
    ? `In progress: ${exerciseCount(state, "done")} of ${exerciseCount(state, "total")} done.`
    : skipped?.postponed
      ? waitingLine(state, workout.name, skipped.name)
      : null;
  const line = fact ?? remark;
  // What each Skip answer would leave you with. "Do it next time" comes back
  // unchanged when everything else is already waiting, and then is not offered.
  const putOff = postponeWorkout(state);
  const dropped = skipWorkout(state);
  // Each answer lists the workouts it leads to — three, or as many as it
  // takes to reach where the two part ways, which with others already
  // waiting can be a few further on.
  const span = (() => {
    const most = state.workouts.length + 1;
    const a = upcomingWorkouts(putOff, most);
    const b = upcomingWorkouts(dropped, most);
    return Math.max(3, a.findIndex((w, i) => w.id !== b[i]?.id) + 1);
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 32,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingBottom: 20,
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

        {/* The day, in one card washed with its colour: the shape beside the
            name, the subtitle on the same left edge as the list, and the
            list itself — what you are about to do, held together, with
            Akilles' word and the buttons outside it below. */}
        <View
          style={{
            backgroundColor: `${FAMILY[family].field}1A`,
            borderRadius: radii.card,
            borderCurve: "continuous",
            paddingHorizontal: 18,
            paddingTop: 20,
            paddingBottom: 14,
            gap: 20,
          }}
        >
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: GAP }}>
              <View style={{ width: MARKS, alignItems: "center" }}>
                <Mark family={family} size={MARKS} />
              </View>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: fonts.display,
                  fontSize: 44,
                  lineHeight: 52,
                }}
              >
                {workout.name || "Untitled"}
              </Text>
            </View>
            <View style={{ marginLeft: INDENT, alignItems: "flex-start" }}>
              {workout.subtitle ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 19,
                    fontStyle: "italic",
                  }}
                >
                  {workout.subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <Preview rows={rows} />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 16 }}>
        <Column style={{ gap: 18 }}>
          {/* Akilles' word, kept apart from the day it comments on: under
              the list, just before you start. After a skip it carries the
              Undo. */}
          {line ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 19,
                  lineHeight: 25,
                  // Akilles' remark in italics; a plain fact in roman.
                  fontStyle: fact ? "normal" : "italic",
                }}
              >
                {line}
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
                  <Text style={{ color: colors.rise, fontSize: 17, fontWeight: "600" }}>Undo</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {inProgress ? <BigButton label="End" onPress={() => setEnding(true)} /> : null}
            {canSkip ? <BigButton label="Skip" onPress={() => setPickingSkip(true)} /> : null}
            <BigButton label={inProgress ? "Continue" : "Start"} primary={family} onPress={start} />
          </View>
        </Column>
      </View>
      <Sheet
        visible={pickingSkip}
        title={`Skip ${workout.name}`}
        onClose={() => setPickingSkip(false)}
      >
        {/* Each answer shows the workouts it leads to, today's first, so the
            difference is seen rather than explained. */}
        <View style={{ paddingTop: 12, gap: 12 }}>
          {putOff !== state ? (
            <OpenRow
              title="Do it next time"
              detail={order(putOff, span)}
              onPress={() => skip(true)}
            />
          ) : null}
          <OpenRow title="Skip it" detail={order(dropped, span)} onPress={() => skip(false)} />
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

/** Workout names in a sentence: "Push A", "Push A and Pull A", "Push A, Pull A and Legs". */
function names(state: SessionState, ids: string[] | undefined): string {
  const list = (ids ?? []).flatMap((id) => {
    const w = state.workouts.find((w) => w.id === id);
    return w ? [w.name] : [];
  });
  return list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

/** What a choice leads to: "Pull A today → Push A → Legs". */
function order(state: SessionState, count: number): string {
  const [today, ...then] = upcomingWorkouts(state, count).map((w) => w.name);
  return [`${today} today`, ...then].join(" → ");
}

/** After "Do it next time": what is waiting, and what it waits behind. */
function waitingLine(state: SessionState, today: string, fallback: string): string {
  const waiting = names(state, state.postponed) || fallback;
  const many = (state.postponed?.length ?? 1) > 1;
  return `${waiting} ${many ? "are" : "is"} next after ${today}.`;
}

/** The left column every shape sits in, and the edge every word starts on. */
const MARKS = 30;
const GAP = 14;
const INDENT = MARKS + GAP;

/**
 * The session in order — cardio, the lifts, cardio, the stretch — like a
 * timetable: each behind its family's shape, with one figure on the right.
 * A lift shows the weight it is set to (a weight that went up in full ink, so
 * the news above has somewhere to point); cardio and the stretch say how
 * much. A lift you have never done shows nothing until it has a weight of
 * its own, and one with no weight to carry shows its sets.
 */
function Preview({ rows }: { rows: PreviewRow[] }) {
  return (
    <View accessibilityRole="list">
      {rows.map((r) => {
        const timed = r.family === "cardio" || r.family === "mobility";
        const figure = timed ? r.amount : r.guess ? undefined : (r.weight ?? r.amount);
        return (
          <View
            key={r.id}
            accessible
            accessibilityLabel={figure ? `${r.name}, ${figure}` : r.name}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: GAP,
              minHeight: 38,
            }}
          >
            <View style={{ width: MARKS, alignItems: "center" }}>
              <Mark family={r.family} size={22} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: 20,
              }}
            >
              {r.name}
            </Text>
            {figure ? (
              <Text
                style={{
                  color: r.change === "up" ? colors.text : colors.muted,
                  fontFamily: r.change === "up" ? fonts.medium : fonts.regular,
                  fontSize: 17,
                  fontVariant: ["lining-nums", "tabular-nums"],
                }}
              >
                {figure}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The two things Today asks: big enough to hit without looking twice. Start
 * is drawn in the day's colour — the field it opens onto — with that field's
 * own words, white or navy.
 */
function BigButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  /** The day's family, on the one button that moves you on. */
  primary?: Family;
  onPress: () => void;
}) {
  const fill = primary ? FAMILY[primary] : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        // Start is the answer nearly every time, so it takes twice the room.
        flex: primary ? 2 : 1,
        minHeight: 60,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.action,
        borderCurve: "continuous",
        backgroundColor: fill ? fill.field : colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: fill?.dark ? colors.white : colors.text,
          fontSize: 19,
          fontWeight: primary ? "500" : "400",
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
          fontSize: 15,
          fontStyle: "italic",
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
  const headline = `It has been ${describeGap(idleDays ?? worst.decay.days ?? 0)} since your last workout.`;

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
            fontSize: 15,
            fontStyle: "italic",
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 30,
            }}
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
