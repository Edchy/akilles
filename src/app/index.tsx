import { router } from "expo-router";
import { Button } from "@/components/buttons";
import { useState } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { GrowthOffer } from "@/components/growth-offer";
import { Mark } from "@/components/mark";
import { PlaceLine } from "@/components/place";
import { Column, COLUMN } from "@/components/screen";
import { Sheet, OpenRow } from "@/components/sheet";
import { colors, FAMILY, fonts, radii } from "@/constants/theme";
import type { Family } from "@/data/families";
import { TODAY_LINES, fillLine, pickLine, type TodayMood } from "@/data/voice";
import type { PreviewRow, SessionState } from "@/store/session";
import {
  buildWorkout,
  cardMark,
  cardName,
  currentWorkout,
  daysSinceTrained,
  didTrain,
  finishWorkout,
  hasLoops,
  itemFamily,
  loopInUse,
  loopName,
  placeOf,
  sittingOut,
  skipWorkout,
  upNext,
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
  const [ending, setEnding] = useState(false);
  // The workout just skipped, so a mis-tap is one tap to undo.
  const [skipped, setSkipped] = useState<{
    name: string;
    before: Pick<SessionState, "nextWorkout" | "workoutQueue" | "postponed">;
  } | null>(null);

  const idleDays = daysSinceTrained(state);

  // The day's card fits the room before it ever scrolls: its rows close up,
  // from roomy down to a tightest that still reads, and the words stay their
  // size. Measured, then nudged: a row or two of difference settles in a
  // render. Past the tightest it scrolls, with a fade at the foot.
  const [room, setRoom] = useState(0);
  const [content, setContent] = useState(0);
  const [rowHeight, setRowHeight] = useState<number>(ROWS.most);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

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

  const skip = () => {
    if (!canSkip) return;
    setSkipped({
      name: workout.name,
      before: {
        nextWorkout: state.nextWorkout,
        workoutQueue: state.workoutQueue,
        postponed: state.postponed,
      },
    });
    setState((s) => skipWorkout(s));
  };

  const rows = workoutPreview(state, workout);
  const fitRows = (contentHeight: number, roomHeight: number) => {
    if (!roomHeight || !contentHeight || inProgress || rows.length === 0) return;
    const slack = roomHeight - contentHeight;
    // Leave a point or two either way, so it never flickers between sizes.
    if (Math.abs(slack) < 2) return;
    const next = Math.round(Math.min(ROWS.most, Math.max(ROWS.least, rowHeight + slack / rows.length)));
    if (next !== rowHeight) setRowHeight(next);
  };
  const overflows = content > room + 1;
  const family = workoutFamily(state, workout);
  // Slots with nothing here to do them with, said rather than hidden.
  const missing = inProgress ? [] : sittingOut(state, workout);

  // Today always points to the next workout, including after training today.
  // Only first-use guidance, returning, and skip feedback need a remark.
  // Seeded by the day and workout so it holds still while you look at it.
  const seed = `${new Date().toDateString()}:${workout.id}`;
  const mood: TodayMood | null = idleDays === null
    ? "first"
    : idleDays >= 7
      ? "back"
      : null;
  const remark = mood
    ? fillLine(pickLine(TODAY_LINES[mood], seed), {
        days: idleDays ?? undefined,
      })
    : null;
  // Where you are, or what comes next — said plainly.
  const fact = inProgress
    ? // Counted as the workout card counts: a card is done or it is not.
      `In progress: ${state.active!.items.filter((_, i) => cardMark(state, i) === "done").length} of ${state.active!.items.length} done.`
    : skipped
      ? `Skipped ${skipped.name}.`
      : null;
  const line = fact ?? remark;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          paddingBottom: 20,
          gap: 28,
        }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setRoom(h);
          fitRows(content, h);
        }}
        onContentSizeChange={(_, h) => {
          setContent(h);
          fitRows(h, room);
        }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          const end = contentOffset.y + layoutMeasurement.height >= contentSize.height - 4;
          if (end !== scrolledToEnd) setScrolledToEnd(end);
        }}
      >
        {/* Away from your usual place: one quiet line, so a changed workout
            has its reason, and the way back. At home base, nothing. */}
        {inProgress || placeOf(state) !== "away" ? null : (
          <View style={{ marginBottom: -16 }}>
            <PlaceLine />
          </View>
        )}
        {inProgress ? null : <GrowthOffer />}
        {/* The day, in one card washed with its colour: the shape beside the
            name, the subtitle on the same left edge as the list, and the
            list itself — what you are about to do, held together, with
            Humbell's word and the buttons outside it below. */}
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
              {hasLoops(state) ? (
                <Text style={{ color: colors.muted, fontSize: 16 }}>
                  From your {loopName(state, loopInUse(state))} loop
                </Text>
              ) : null}
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

          {inProgress ? <Progress /> : <Preview rows={rows} rowHeight={rowHeight} />}
          {missing.length > 0 ? (
            <Text style={{ marginLeft: INDENT, color: colors.muted, fontSize: 16, lineHeight: 22 }}>
              {missingLine(missing.map((e) => e.slot))}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      {/* More below: the card fades into the gap rather than being cut. */}
      {overflows && !scrolledToEnd ? (
        <View pointerEvents="none" style={{ height: 32, marginTop: -32 }}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="todayFoot" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
                <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#todayFoot)" />
          </Svg>
        </View>
      ) : null}

      {/* Always a clear gap between the card and the buttons. */}
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: barSpace + 16 }}>
        <Column style={{ gap: 18 }}>
          {/* Humbell's word, kept apart from the day it comments on: under
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
                  // Humbell's remark in italics; a plain fact in roman.
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
            {canSkip ? <BigButton label="Skip" onPress={skip} /> : null}
            <BigButton label={inProgress ? "Continue" : "Start"} primary={family} onPress={start} />
          </View>
        </Column>
      </View>
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

/** "No chest fly or vertical press today. Nothing here to do them with." */
function missingLine(slots: string[]): string {
  const list = slots.map((s) => s.toLowerCase());
  const named =
    list.length < 2 ? list[0] : `${list.slice(0, -1).join(", ")} or ${list.at(-1)}`;
  return `No ${named} today. No suitable equipment or lighter weight here for ${list.length === 1 ? "it" : "them"}.`;
}

/** The left column every shape sits in, and the edge every word starts on. */
const MARKS = 30;
const GAP = 14;
const INDENT = MARKS + GAP;

/** Today's rows: roomy when there is space, never under the tightest that still reads. */
const ROWS = { most: 44, least: 36 } as const;

/** The next workout, with short change labels tucked beneath the figures. */
function Preview({ rows, rowHeight = ROWS.most }: { rows: PreviewRow[]; rowHeight?: number }) {
  return (
    <View accessibilityRole="list" style={{ gap: rowHeight >= ROWS.most ? 4 : 2 }}>
      {rows.map((r) => {
        const timed = r.family === "cardio" || r.family === "mobility" || r.family === "goal";
        const strong = !!r.adjustmentLabel || r.family === "goal";
        const figure = timed ? r.amount : r.guess ? undefined : (r.weight ?? r.amount);
        return (
          <View
            key={r.id}
            accessible
            accessibilityLabel={[r.name, figure, r.adjustment].filter(Boolean).join(". ")}
            style={{ flexDirection: "row", alignItems: "center", gap: GAP, minHeight: rowHeight }}
          >
            <View style={{ width: MARKS, alignItems: "center" }}>
              <Mark family={r.family} size={22} />
            </View>
            <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 20 }}>
              {r.name}
            </Text>
            {figure ? (
              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text
                  style={{
                    color: strong ? colors.text : colors.muted,
                    fontFamily: strong ? fonts.medium : fonts.regular,
                    fontSize: 17,
                    lineHeight: 21,
                    fontVariant: ["lining-nums", "tabular-nums"],
                  }}
                >
                  {figure}
                </Text>
                {r.adjustmentLabel ? (
                  <Text style={{ color: colors.muted, fontFamily: fonts.italic, fontSize: 13, lineHeight: 16 }}>
                    {r.adjustmentLabel}
                  </Text>
                ) : null}
              </View>
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
/**
 * The workout you left part way: its cards as they stand — a filled circle
 * and "Done" for what is done, an empty one for what is not — the same
 * marks as the workout card in the session.
 */
function Progress() {
  const { state } = useSession();
  const active = state.active;
  if (!active) return null;
  return (
    <View accessibilityRole="list">
      {active.items.map((it, i) => {
        const done = cardMark(state, i) === "done";
        const color = FAMILY[itemFamily(it)].mark;
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={`${cardName(state, i)}, ${done ? "done" : "not done"}`}
            style={{ flexDirection: "row", alignItems: "center", gap: GAP, minHeight: 38 }}
          >
            <View style={{ width: MARKS, alignItems: "center" }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: color,
                  backgroundColor: done ? color : "transparent",
                }}
              />
            </View>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 20 }}>
              {cardName(state, i)}
            </Text>
            {done ? (
              <Text style={{ color: colors.muted, fontFamily: fonts.italic, fontSize: 17 }}>Done</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

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
    <Button
      label={label}
      kind={fill ? "primary" : "secondary"}
      fill={fill?.field}
      onFill={fill?.dark ? colors.white : colors.text}
      // Start is the answer nearly every time, so it takes twice the room.
      flex={primary ? 2 : 1}
      onPress={onPress}
    />
  );
}
