import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { ClaySheen } from "@/components/card-clay";
import { GoalProgress } from "@/components/goal-progress";
import { Icon, type IconName } from "@/components/icon";
import { Mark } from "@/components/mark";
import { COLUMN } from "@/components/screen";
import { Text } from "@/components/text";
import { CLAY_LOOK, colors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { familyOf, type Family } from "@/data/families";
import { GOALS_ON } from "@/data/goals";
import {
  cardioGains,
  hitRate,
  liftedLike,
  monthSessions,
  records,
  strengthGains,
  totalLifted,
  weekStreak,
} from "@/lib/insights";
import { useSession, type SessionState } from "@/store/session";

/** How many of each kind of good news: the best few, the rest is in Lifts. */
const SHOWN = 3;

/**
 * You, read top to bottom in one pass: your week, what the work adds up to,
 * the two ways into your past, then the lifts that went up. Every block is
 * a card of clay, as on Plan and Next up; Settings sits in the title row.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const { state } = useSession();
  const { log } = state;
  const latest = log.at(-1);
  const liftCount = new Set(log.flatMap((s) => s.entries.flatMap((e) => (e.kind === "lift" ? [e.exerciseId] : [])))).size;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 22,
        paddingBottom: barSpace + 28,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        gap: 16,
      }}
    >
      {/* No title: the tab bar already says Profile. Settings is the last card. */}
      <Week state={state} />

      {log.length > 0 ? <Totals state={state} /> : null}

      {/* One way into History; its own switch picks workouts or lifts. */}
      <Door
        title="History"
        detail={
          latest
            ? `Last workout ${shortDay(latest.startedAt)}${liftCount > 0 ? ` · ${liftCount} ${liftCount === 1 ? "lift" : "lifts"} tracked` : ""}`
            : "Every workout and every weight, once you've trained"
        }
        onPress={() => router.push("/history")}
      />

      {GOALS_ON ? <GoalProgress /> : null}

      {log.length === 0 ? (
        <Card title="Your results">
          <Text style={{ color: colors.text, fontSize: 17, lineHeight: 25 }}>
            Finish a workout and this fills in: how much you have lifted, how much stronger you are,
            and every record you set.
          </Text>
        </Card>
      ) : (
        <News state={state} />
      )}

      <Door
        title="Settings"
        icon="settings"
        detail="Your plans, help and backups"
        onPress={() => router.push("/settings")}
      />
    </ScrollView>
  );
}

// ---- the week ----

const dayStart = (time: number) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** "Thu 19 Nov". */
const shortDay = (time: number) =>
  new Date(time).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Monday to Sunday, the days you trained filled in. Calendar days keep daylight-saving weeks whole. */
function Week({ state }: { state: SessionState }) {
  const today = dayStart(Date.now());
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const trained = new Set([
    ...state.log.map((session) => dayStart(session.startedAt)),
    ...Object.values(state.history).flatMap((entry) => (entry.lastTrainedAt ? [dayStart(entry.lastTrainedAt)] : [])),
  ]);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return date.getTime();
  });
  const count = days.filter((day) => trained.has(day)).length;
  const streak = weekStreak(state.log);

  return (
    <Card
      title="This week"
      aside={count === 0 ? "No days yet" : `${count} ${count === 1 ? "day" : "days"}`}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
        {days.map((day, index) => {
          const done = trained.has(day);
          const isToday = day === today;
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={`${new Date(day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", today" : ""}, ${done ? "trained" : day > today ? "still to come" : "no workout"}`}
              style={{ flex: 1, alignItems: "center", gap: 8 }}
            >
              <Text ui style={{ color: colors.muted, fontSize: 13, fontWeight: isToday ? "700" : "400" }}>
                {["M", "T", "W", "T", "F", "S", "S"][index]}
              </Text>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? colors.text : colors.bg,
                  borderWidth: isToday ? 2 : 0,
                  borderColor: colors.text,
                  boxShadow: done ? undefined : CLAY_LOOK.dent,
                }}
              >
                {done ? (
                  <Icon name="check" size={16} color={colors.ink} />
                ) : (
                  <Text ui style={{ color: colors.text, fontSize: 14, fontWeight: isToday ? "700" : "400", fontVariant: ["tabular-nums"] }}>
                    {new Date(day).getDate()}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      {streak > 1 ? (
        <Text ui style={{ color: colors.muted, fontSize: 15 }}>
          {`${streak} weeks in a row. Keep it going.`}
        </Text>
      ) : null}
    </Card>
  );
}

// ---- what it adds up to ----

/** "12,400" — by hand, so it reads the same whatever the phone's locale support. */
const thousands = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** The one big number, on a card of ink, and two plain ones under it. */
function Totals({ state }: { state: SessionState }) {
  const kg = totalLifted(state.log);
  const month = monthSessions(state.log);
  const hits = hitRate(state.log);
  const monthDelta = month.now - month.before;
  const hitDelta = hits.now !== null && hits.before !== null ? Math.round((hits.now - hits.before) * 100) : null;

  return (
    <View
      style={{
        gap: 2,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 22,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.text,
        boxShadow: CLAY_LOOK.puff,
        overflow: "hidden",
      }}
    >
      <ClaySheen id="profile-total" reach="40%" />
      <Text ui style={{ color: colors.ink, opacity: 0.8, fontSize: 15 }}>Lifted in total</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 68, lineHeight: 72 }}>{thousands(kg)}</Text>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28 }}>kg</Text>
      </View>
      <Text style={{ color: colors.ink, fontFamily: fonts.voice, fontSize: 18 }}>{liftedLike(kg)}</Text>
      <View style={{ height: 1, backgroundColor: colors.ink, opacity: 0.2, marginTop: 18, marginBottom: 14 }} />
      <View style={{ flexDirection: "row", gap: 16 }}>
        <Stat
          value={String(month.now)}
          label={month.now === 1 ? "Workout this month" : "Workouts this month"}
          delta={month.before > 0 && monthDelta > 0 ? `${monthDelta} more than last month` : null}
        />
        <Stat
          value={hits.now === null ? "–" : `${Math.round(hits.now * 100)}%`}
          label="Lifts on target"
          delta={hitDelta !== null && hitDelta > 0 ? `Up ${hitDelta} on last month` : null}
        />
      </View>
    </View>
  );
}

function Stat({ value, label, delta }: { value: string; label: string; delta: string | null }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 40, lineHeight: 44 }}>{value}</Text>
      <Text ui style={{ color: colors.ink, fontSize: 15, fontWeight: "700", lineHeight: 20 }}>{label}</Text>
      {delta ? <Text ui style={{ color: colors.ink, opacity: 0.8, fontSize: 14, lineHeight: 19 }}>{delta}</Text> : null}
    </View>
  );
}

// ---- the ways in ----

/** A door to another screen, History or Settings: a lump of cream clay that gives when pressed. */
function Door({ title, detail, icon, onPress }: { title: string; detail: string; icon?: IconName; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 96,
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: pressed ? colors.raised : CLAY_LOOK.well,
        boxShadow: pressed ? CLAY_LOOK.dent : CLAY_LOOK.bump,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {icon ? <Icon name={icon} size={24} color={colors.text} /> : null}
        <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 34 }}>{title}</Text>
        <Icon name="open" size={15} color={colors.text} />
      </View>
      <Text ui style={{ color: colors.muted, fontSize: 15, lineHeight: 20 }}>{detail}</Text>
    </Pressable>
  );
}

// ---- the good news ----

/** The lifts that went up, the records, the cardio: the best few of each, nothing else. */
function News({ state }: { state: SessionState }) {
  const gains = strengthGains(state).slice(0, SHOWN);
  const prs = records(state.log).slice(0, SHOWN);
  const cardio = cardioGains(state.log).slice(0, SHOWN);

  if (gains.length + prs.length + cardio.length === 0) {
    return (
      <Card title="Your results">
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 25 }}>
          Early days. Once you add weight to a lift, it shows up here.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {gains.length > 0 ? (
        <Card title="Getting stronger">
          <Lines items={gains.map((g) => ({ key: g.exerciseId, family: familyOf(byId(g.exerciseId)), name: g.name, value: g.label, note: g.since }))} />
        </Card>
      ) : null}
      {prs.length > 0 ? (
        <Card title="Records">
          <Lines items={prs.map((r) => ({ key: `${r.exerciseId}:${r.at}`, family: familyOf(byId(r.exerciseId)), name: r.name, value: r.weight, note: r.date }))} />
        </Card>
      ) : null}
      {cardio.length > 0 ? (
        <Card title="Faster, further">
          <Lines items={cardio.map((c) => ({ key: c.key, family: "cardio" as Family, name: c.name, value: c.label, note: c.since }))} />
        </Card>
      ) : null}
    </>
  );
}

/** A heading and what goes under it, on a card of cream clay. */
function Card({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <View
      style={{
        gap: 16,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 20,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: CLAY_LOOK.well,
        boxShadow: CLAY_LOOK.bump,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 34 }}>
          {title}
        </Text>
        {aside ? <Text ui style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{aside}</Text> : null}
      </View>
      {children}
    </View>
  );
}

type Item = { key: string; family: Family; name: string; value: string; note: string };

/** Each lift with its family's shape, as in a workout, and what it gained. */
function Lines({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map((item, i) => {
        // "per hand" goes under the weight, so the lift's name keeps its line.
        const perHand = item.value.endsWith(" per hand");
        const value = perHand ? item.value.slice(0, -" per hand".length) : item.value;
        const note = perHand ? `per hand, ${item.note}` : item.note;
        return (
        <View
          key={item.key}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.line,
          }}
        >
          <View style={{ width: 18, alignItems: "center" }}>
            <Mark family={item.family} size={16} />
          </View>
          <Text style={{ flex: 1, color: colors.text, fontSize: 17, lineHeight: 23 }}>{item.name}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: colors.text, fontFamily: fonts.displayBold, fontSize: 18 }}>{value}</Text>
            <Text ui style={{ color: colors.muted, fontSize: 13 }}>{note}</Text>
          </View>
        </View>
        );
      })}
    </View>
  );
}
