import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors, fonts, radii } from "@/constants/theme";
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
import type { SessionState } from "@/store/session";

/** "12,400" — by hand, so it reads the same whatever the phone's locale support. */
const thousands = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * What the training has bought you: one big number, three tiles, then the
 * lifts that went up, the records you set and the cardio you got better at.
 * Only good news — the rest is one tap away in Sessions and Lifts.
 */
export function Results({ state }: { state: SessionState }) {
  const { log } = state;

  if (log.length === 0) {
    return (
      <View style={{ gap: 10, paddingVertical: 12 }}>
        <Text style={[display, { fontSize: 34, lineHeight: 36 }]}>Your results start here.</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Finish a workout and this fills in: how much you have lifted, how much
          stronger you are, and every record you set on the way.
        </Text>
      </View>
    );
  }

  const kg = totalLifted(log);
  const month = monthSessions(log);
  const streak = weekStreak(log);
  const hits = hitRate(log);
  const gains = strengthGains(state).slice(0, 5);
  const prs = records(log).slice(0, 5);
  const cardio = cardioGains(log);

  const monthDelta = month.now - month.before;
  const hitDelta =
    hits.now !== null && hits.before !== null ? Math.round((hits.now - hits.before) * 100) : null;

  return (
    <View style={{ gap: 30 }}>
      {/* The one number the screen leads with. */}
      <View style={{ gap: 4 }}>
        <Text style={[caps, { color: colors.muted }]}>Lifted in total</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={[display, { fontSize: 72, lineHeight: 74 }]}>{thousands(kg)}</Text>
          <Text style={[display, { fontSize: 28 }]}>kg</Text>
        </View>
        <Text style={{ color: colors.bend, fontFamily: fonts.voice, fontSize: 22 }}>
          {liftedLike(kg)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Tile
          value={String(month.now)}
          label={month.now === 1 ? "Session this month" : "Sessions this month"}
          delta={month.before > 0 && monthDelta > 0 ? `+${monthDelta} on last month` : null}
        />
        <Tile
          value={String(streak)}
          label={streak === 1 ? "Week in a row" : "Weeks in a row"}
          delta={null}
        />
        <Tile
          value={hits.now === null ? "–" : `${Math.round(hits.now * 100)}%`}
          label="Lifts on target"
          delta={hitDelta !== null && hitDelta > 0 ? `+${hitDelta} pts on last 30 days` : null}
        />
      </View>

      {gains.length > 0 ? (
        <Section title="Getting stronger">
          {gains.map((g, i) => (
            <Line key={g.exerciseId} first={i === 0} name={g.name} value={g.label} note={g.since} />
          ))}
        </Section>
      ) : null}

      {prs.length > 0 ? (
        <Section title="Records">
          {prs.map((r, i) => (
            <Line
              key={`${r.exerciseId}:${r.at}`}
              first={i === 0}
              name={r.name}
              value={r.weight}
              note={r.date}
            />
          ))}
        </Section>
      ) : null}

      {cardio.length > 0 ? (
        <Section title="Faster, further">
          {cardio.map((c, i) => (
            <Line key={c.key} first={i === 0} name={c.name} value={c.label} note={c.since} />
          ))}
        </Section>
      ) : null}

      {log.length < 3 ? (
        <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
          Early days. Every session you finish adds to this — strength gained and
          records show up once there is something to compare against.
        </Text>
      ) : null}
    </View>
  );
}

function Tile({ value, label, delta }: { value: string; label: string; delta: string | null }) {
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        borderRadius: radii.card - 8,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 14,
      }}
    >
      <Text style={[display, { fontSize: 36, lineHeight: 38 }]}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 16 }}>
        {label}
      </Text>
      {/* Always laid out, so a tile with a delta is no taller than its neighbours. */}
      <Text
        numberOfLines={2}
        style={{ minHeight: 28, color: colors.rise, fontSize: 11, fontWeight: "800", lineHeight: 14 }}
      >
        {delta ?? ""}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[caps, { color: colors.muted, marginBottom: 4 }]}>{title}</Text>
      {children}
    </View>
  );
}

function Line({
  name,
  value,
  note,
  first,
}: {
  name: string;
  value: string;
  note: string;
  first: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: 10,
        paddingVertical: 13,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" }}>{name}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: colors.rise, fontFamily: fonts.displayBold, fontSize: 20 }}>
          {value}
        </Text>
        <Text style={{ color: colors.faint, fontSize: 12 }}>{note}</Text>
      </View>
    </View>
  );
}

const display = {
  color: colors.text,
  fontFamily: fonts.display,
  textTransform: "uppercase",
  letterSpacing: 0.3,
} as const;

const caps = {
  fontSize: 11,
  fontWeight: "800",
  letterSpacing: 1,
  textTransform: "uppercase",
} as const;
