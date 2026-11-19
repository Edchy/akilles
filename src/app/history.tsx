import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { useBarSpace } from "@/components/bottom-bar";
import { COLUMN } from "@/components/screen";
import { Segments } from "@/components/segments";
import { FAMILY, colors, fonts, radii } from "@/constants/theme";
import { cardioById, courseLabel, distanceLabel, timeLabel } from "@/data/conditioning";
import { byId, GROUP_LABEL, GROUP_ORDER, groupOf, type Exercise } from "@/data/exercises";
import type { Scheme } from "@/data/split";
import { ladderOf, schemeOf, type ExerciseState } from "@/lib/progression";
import { weightLabel } from "@/lib/warmup";
import {
  useSession,
  type CardioRecord,
  type LogEntry,
  type SessionLog,
  type SessionState,
} from "@/store/session";

type Segment = "sessions" | "lifts";

/**
 * History, reached from Profile: what you have done, two ways round.
 * Sessions is the diary: each workout as it happened, newest first. Lifts is
 * the scoreboard: where every exercise stands now, and how it got there.
 * The week and the results are on Profile itself.
 */
export default function HistoryScreen() {
  const { state } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const [segment, setSegment] = useState<Segment>(params.view === "lifts" ? "lifts" : "sessions");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 28,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: barSpace + 28,
        gap: 22,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Profile"
        onPress={() => router.back()}
        style={({ pressed }) => ({ width: 44, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
      >
        <Icon name="back" size={20} color={colors.text} />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontFamily: fonts.display,
          fontSize: 48,
        }}
      >
        History
      </Text>

      <Segments
        options={[
          { value: "sessions", label: "Sessions" },
          { value: "lifts", label: "Lifts" },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === "sessions" ? (
        <Sessions log={state.log} />
      ) : (
        <Lifts state={state} />
      )}

    </ScrollView>
  );
}

// ---- dates ----

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Today", "Yesterday", else "Tue 24 Sep" — with the year once it isn't this one. */
const dayLabel = (t: number, now = Date.now()) => {
  const days = Math.round((startOfDay(now) - startOfDay(t)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(t);
  const year = d.getFullYear() === new Date(now).getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}${year}`;
};

/** "24 Sep" — for the short columns in a lift's past. */
const shortDate = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
};

// ---- sessions ----

function Sessions({ log }: { log: SessionLog[] }) {
  // Newest open by default: it is the one you came to check.
  const [open, setOpen] = useState<number | null>(log.at(-1)?.finishedAt ?? null);

  if (log.length === 0) {
    return <Empty>Finish a workout and it lands here, set by set.</Empty>;
  }

  return (
    <View style={{ gap: 10 }}>
      {[...log].reverse().map((s) => (
        <SessionCard
          key={s.finishedAt}
          session={s}
          open={open === s.finishedAt}
          onToggle={() => setOpen((o) => (o === s.finishedAt ? null : s.finishedAt))}
        />
      ))}
    </View>
  );
}

type LiftEntry = Extract<LogEntry, { kind: "lift" }>;
type CardioEntry = Extract<LogEntry, { kind: "cardio" }>;
type GoalEntry = Extract<LogEntry, { kind: "goal" }>;

function SessionCard({
  session,
  open,
  onToggle,
}: {
  session: SessionLog;
  open: boolean;
  onToggle: () => void;
}) {
  const scored = session.entries.filter(
    (e): e is LiftEntry => e.kind === "lift" && e.outcome !== null,
  );
  const hits = scored.filter((e) => e.outcome === "hit").length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={({ pressed }) => ({
        gap: 12,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 18,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: fonts.display,
            fontSize: 28,
          }}
        >
          {session.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
          {dayLabel(session.startedAt)}
        </Text>
      </View>

      {scored.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {scored.map((e, i) => (
            <Dot key={i} outcome={e.outcome} />
          ))}
          <Text style={{ marginLeft: 6, color: colors.faint, fontSize: 13, fontWeight: "600" }}>
            {hits} of {scored.length} hit
          </Text>
        </View>
      ) : null}

      {open ? (
        <View style={{ gap: 2, marginTop: 2 }}>
          {session.entries.map((e, i) =>
            e.kind === "lift" ? (
              <LiftLine key={i} entry={e} first={i === 0} />
            ) : e.kind === "goal" ? (
              <GoalLine key={i} entry={e} first={i === 0} />
            ) : (
              <CardioLine key={i} entry={e} first={i === 0} />
            ),
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

/** One lift's outcome in a session's summary row. */
function Dot({ outcome }: { outcome: LiftEntry["outcome"] }) {
  const filled = outcome === "hit" || outcome === "miss" || outcome === "drop";
  return (
    <View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: !filled ? "transparent" : outcome === "hit" ? colors.rise : colors.bend,
        borderWidth: filled ? 0 : 1.5,
        borderColor: colors.line,
      }}
    />
  );
}

function LiftLine({ entry, first }: { entry: LiftEntry; first: boolean }) {
  const exercise = byId(entry.exerciseId);
  if (!exercise) return null;
  const hasWeight = !exercise.unloaded;

  return (
    <View
      style={{
        gap: 8,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" }}>
          {exercise.name}
        </Text>
        {hasWeight ? (
          <Text
            style={{
              color: colors.rise,
              fontSize: 15,
              fontWeight: "800",
              fontVariant: ["tabular-nums"],
            }}
          >
            {weightLabel(exercise, entry.weight)}
          </Text>
        ) : null}
      </View>
      {entry.outcome === "skipped" ? (
        <Text style={{ color: colors.faint, fontSize: 13, fontWeight: "600" }}>Skipped</Text>
      ) : (
        <Reps reps={entry.reps} target={entry.target} />
      )}
    </View>
  );
}

/**
 * The circles as you left them: red where the set made its target,
 * near-black where it fell short, hollow where it was never done.
 */
function Reps({
  reps,
  target,
  size = 30,
}: {
  reps: (number | null)[];
  target?: number;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {reps.map((r, i) => {
        const hit = r !== null && (target === undefined || r >= target);
        return (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: r === null ? "transparent" : hit ? colors.rise : colors.bend,
              borderWidth: r === null ? 1.5 : 0,
              borderColor: colors.line,
            }}
          >
            {r !== null ? (
              <Text
                style={{
                  color: colors.ink,
                  fontFamily: fonts.displayBold,
                  fontSize: size * 0.5,
                }}
              >
                {r}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function CardioLine({ entry, first }: { entry: CardioEntry; first: boolean }) {
  const machine = cardioById(entry.exerciseId);
  if (!machine) return null;
  const over =
    entry.course !== undefined ? courseLabel(machine, entry.course) : `${entry.minutes} min`;
  const score =
    entry.course !== undefined ? timeLabel(entry.score) : distanceLabel(machine, entry.score);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: 10,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" }}>
        {machine.name} <Text style={{ color: colors.faint, fontWeight: "500" }}>{over}</Text>
      </Text>
      {entry.best ? <Text style={[caps, { color: colors.rise }]}>Best</Text> : null}
      <Text
        style={{ color: colors.rise, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }}
      >
        {score}
      </Text>
    </View>
  );
}

/**
 * A goal's step as it went: the drill, the goal it is for, and the circles —
 * or the minutes, for practice. The session that owned the step says so.
 */
function GoalLine({ entry, first }: { entry: GoalEntry; first: boolean }) {
  return (
    <View
      style={{
        gap: 8,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" }}>
          {entry.step}{" "}
          <Text style={{ color: colors.faint, fontWeight: "500", fontStyle: "italic" }}>
            {entry.goal}
          </Text>
        </Text>
        {entry.outcome === "owned" ? (
          <Text style={[caps, { color: FAMILY.goal.mark }]}>Owned</Text>
        ) : null}
      </View>
      {entry.measure === "practice" ? (
        <Text style={{ color: colors.muted, fontSize: 15 }}>
          {Math.max(1, Math.round((entry.reps[0] ?? 0) / 60))} min practice
        </Text>
      ) : (
        <Reps reps={entry.reps} target={entry.target} />
      )}
    </View>
  );
}

// ---- lifts ----

type LiftRow = { key: string; scheme: Scheme; st: ExerciseState; exercise: Exercise };

/**
 * Every exercise you have trained, by muscle group, at the weight it stands
 * at now. Tap one for its past sessions from the log.
 */
function Lifts({ state }: { state: SessionState }) {
  const [open, setOpen] = useState<string | null>(null);

  // One row a lift. Done on more than one range — volume on one plan, 6 to
  // 10 on another — it shows the range it was trained on last; the weight
  // is the lift's either way.
  const latest = new Map<string, LiftRow>();
  for (const [k, st] of Object.entries(state.history)) {
    const exercise = byId(st.exerciseId);
    // An exercise removed from the catalogue since has nothing to show.
    if (!exercise || !(st.lastPerformed || st.skippedLast)) continue;
    const had = latest.get(st.exerciseId);
    if (had && (had.st.lastTrainedAt ?? 0) >= (st.lastTrainedAt ?? 0)) continue;
    latest.set(st.exerciseId, { key: st.exerciseId, scheme: k.split(":")[1] as Scheme, st, exercise });
  }
  const rows = [...latest.values()];
  const cardio = Object.entries(state.conditioning).flatMap(([k, rec]) => {
    const machine = cardioById(rec.cardioId);
    return machine ? [{ key: k, rec, machine }] : [];
  });

  if (rows.length === 0 && cardio.length === 0) {
    return <Empty>Nothing lifted yet. Finish an exercise and its weight shows up here.</Empty>;
  }

  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    rows: rows
      .filter((r) => groupOf(r.exercise) === g)
      .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name)),
  })).filter((g) => g.rows.length > 0);

  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  return (
    <View style={{ gap: 26 }}>
      {groups.map(({ group, rows }) => (
        <View key={group} style={{ gap: 2 }}>
          <Text style={[caps, { color: colors.muted, marginBottom: 4 }]}>
            {GROUP_LABEL[group]}
          </Text>
          {rows.map((r, i) => (
            <LiftRowView
              key={r.key}
              row={r}
              log={state.log}
              first={i === 0}
              open={open === r.key}
              onToggle={() => toggle(r.key)}
            />
          ))}
        </View>
      ))}

      {cardio.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={[caps, { color: colors.muted, marginBottom: 4 }]}>Cardio</Text>
          {cardio.map(({ key, rec, machine }, i) => (
            <CardioRow key={key} rec={rec} name={machine.name} machine={machine} first={i === 0} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LiftRowView({
  row,
  log,
  first,
  open,
  onToggle,
}: {
  row: LiftRow;
  log: SessionLog[];
  first: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { st, exercise, scheme } = row;
  const ladder = ladderOf(exercise, scheme);
  const target = ladder[Math.min(st.rung, ladder.length - 1)];

  // This lift's past, newest first, from the log: every session of it, on
  // any range and in any plan.
  const past = log
    .flatMap((s) =>
      s.entries
        .filter((e): e is LiftEntry => e.kind === "lift" && e.exerciseId === exercise.id)
        .map((e) => ({ at: s.startedAt, e })),
    )
    .reverse();
  // The weight is the lift's, whatever the range: up or down from the first time.
  const oldest = past.at(-1);
  const since =
    oldest && oldest.e.weight !== st.weight
      ? `${st.weight > oldest.e.weight ? "Up" : "Down"} from ${weightLabel(exercise, oldest.e.weight)} on ${shortDate(oldest.at)}`
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={({ pressed }) => ({
        gap: 6,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>
          {exercise.name}
        </Text>
        <Text
          style={{
            color: colors.rise,
            fontFamily: fonts.displayBold,
            fontSize: 22,
            fontVariant: ["tabular-nums"],
          }}
        >
          {weightLabel(exercise, st.weight)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[caps, { color: colors.faint }]}>{schemeOf(exercise, scheme)}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>next {target} {exercise.timed ? "s" : "reps"}</Text>
        <Text
          style={{
            marginLeft: "auto",
            color: st.skippedLast ? colors.bend : colors.faint,
            fontSize: 13,
            fontWeight: st.skippedLast ? "700" : "400",
            fontVariant: ["tabular-nums"],
          }}
        >
          {st.skippedLast ? "skipped last time" : `last ${st.lastPerformed!.reps.join(" ")}`}
        </Text>
      </View>

      {open ? (
        <View style={{ gap: 12, marginTop: 10 }}>
          {since ? (
            <Text style={{ color: colors.rise, fontSize: 14, fontWeight: "700" }}>{since}</Text>
          ) : null}
          {past.length === 0 ? (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              Sessions from now on show here.
            </Text>
          ) : (
            past.slice(0, 8).map(({ at, e }, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ width: 52, color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                  {shortDate(at)}
                </Text>
                <Text
                  style={{
                    minWidth: 84,
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {weightLabel(exercise, e.weight)}
                </Text>
                {e.outcome === "skipped" ? (
                  <Text style={{ color: colors.faint, fontSize: 13, fontWeight: "600" }}>
                    Skipped
                  </Text>
                ) : (
                  <Reps reps={e.reps} target={e.target} size={24} />
                )}
              </View>
            ))
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

function CardioRow({
  rec,
  name,
  machine,
  first,
}: {
  rec: CardioRecord;
  name: string;
  machine: NonNullable<ReturnType<typeof cardioById>>;
  first: boolean;
}) {
  const timed = rec.course !== undefined;
  const over = timed ? courseLabel(machine, rec.course!) : `${rec.minutes} min`;
  const label = (n: number) => (timed ? timeLabel(n) : distanceLabel(machine, n));

  return (
    <View
      style={{
        gap: 6,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>
          {name} <Text style={{ color: colors.faint, fontWeight: "500" }}>{over}</Text>
        </Text>
        <Text
          style={{
            color: colors.rise,
            fontFamily: fonts.displayBold,
            fontSize: 22,
            fontVariant: ["tabular-nums"],
          }}
        >
          {label(rec.best)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[caps, { color: colors.faint }]}>Best</Text>
        <Text style={{ marginLeft: "auto", color: colors.faint, fontSize: 13 }}>
          last {label(rec.last)} · {rec.sessions} {rec.sessions === 1 ? "go" : "goes"}
        </Text>
      </View>
    </View>
  );
}

// ---- bits ----

const caps = {
  fontSize: 15,
  fontStyle: "italic",
} as const;

function Empty({ children }: { children: string }) {
  return <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 22 }}>{children}</Text>;
}
