import { router } from "expo-router";
import { Button } from "@/components/buttons";
import { useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { GrowthOffer } from "@/components/growth-offer";
import { Mark } from "@/components/mark";
import { PlaceLine } from "@/components/place";
import { Column, COLUMN } from "@/components/screen";
import { Sheet, OpenRow } from "@/components/sheet";
import { colors, DUSK, DUSK_INK, DUSK_TODAY, FAMILY, fonts, mix, radii } from "@/constants/theme";
import { DuskGround } from "@/components/dusk";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
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
  itemFamily,
  placeOf,
  sittingOut,
  setNextWorkout,
  upcomingWorkouts,
  upNext,
  useSession,
  workoutFamily,
  workoutMinutes,
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
  // The round from here, today's first: the deck you swipe through. A
  // workout under way is the only card.
  const round = inProgress ? [currentWorkout(state)] : upcomingWorkouts(state, state.workouts.length);
  const [look, setLook] = useState(0);
  const at = round.length ? ((look % round.length) + round.length) % round.length : 0;
  const workout = round[at] ?? upNext(state);
  const [ending, setEnding] = useState(false);

  const idleDays = daysSinceTrained(state);

  const start = () => {
    const id = workout.id;
    setLook(0);
    // Never over the top of one in progress — that would throw its sets away.
    // The deck is the round and the swipe only moves where you are in it:
    // Start does the one on top, and next time the one after it is on top.
    setState((s) => (s.active ? s : buildWorkout(setNextWorkout(s, id))));
    router.push("/workout");
  };

  const end = () => {
    setEnding(false);
    setState((s) => finishWorkout(s));
  };

  const family = workoutFamily(state, workout);
  // The next two in the round after the one on top, under it: the deck's edges.
  const behind = [1, 2]
    .filter((k) => round.length > k)
    .map((k) => round[(at + k) % round.length])
    .reverse();

  // Sideways turns the deck. Left throws the top card off and the one after
  // is already there under it; right brings the one before in from the left,
  // over the top. Every card is the same size, so nothing moves but the card
  // in your hand, and once it lands the deck simply is one further round.
  const { width } = useWindowDimensions();
  const away = width + 60;
  const x = useSharedValue(0);
  const turn = (by: number) => setLook((l) => l + by);
  useLayoutEffect(() => {
    x.value = 0;
  }, [at, x]);
  const swipe = Gesture.Pan()
    .enabled(round.length > 1)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onChange((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      const far = Math.abs(e.translationX) > width * 0.25 || Math.abs(e.velocityX) > 700;
      if (!far) {
        x.value = withSpring(0, { damping: 20, stiffness: 240 });
        return;
      }
      const by = e.translationX < 0 ? 1 : -1;
      x.value = withTiming(-by * away, { duration: 220 }, (done) => {
        if (done) scheduleOnRN(turn, by);
      });
    });
  // The top card goes left with the finger, tilting a little; going right it stays.
  const top = useAnimatedStyle(() => {
    const v = Math.min(0, x.value);
    return { transform: [{ translateX: v }, { rotate: `${(v / Math.max(1, width)) * 8}deg` }] };
  });
  // The one before waits off to the left and follows the finger in.
  const before = useAnimatedStyle(() => {
    const v = Math.max(0, x.value);
    return { transform: [{ translateX: v - away }, { rotate: `${((v - away) / Math.max(1, width)) * 8}deg` }] };
  });

  // Today always points to the next workout, including after training today.
  // Only first-use guidance and returning need a remark.
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
    : null;
  const line = fact ?? remark;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          gap: 20,
        }}
      >
        {/* Away from your usual place: one quiet line, so a changed workout
            has its reason, and the way back. At home base, nothing. */}
        {inProgress || placeOf(state) !== "away" ? null : <PlaceLine />}
        {inProgress ? null : <GrowthOffer />}
        {/* The round as a deck, the one on top the day's: all one size, the
            room the screen has, so turning it moves only the card in your
            hand. The next two show their edges under it, in their colours;
            a long list scrolls inside its card. */}
        <View style={{ flex: 1, marginBottom: 8 * behind.length }}>
          {behind.map((w, k) => {
            const depth = behind.length - k;
            return (
              <View
                key={`edge-${depth}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: -8 * depth,
                  left: 10 * depth,
                  right: 10 * depth,
                  borderRadius: radii.card,
                  borderCurve: "continuous",
                  borderWidth: DUSK_TODAY ? 1 : 1.5,
                  borderColor: DUSK_TODAY ? mix(DUSK[workoutFamily(state, w)].top, "#000000", 0.35) : colors.text,
                  backgroundColor: DUSK_TODAY ? DUSK[workoutFamily(state, w)].top : FAMILY[workoutFamily(state, w)].field,
                }}
              />
            );
          })}
          {/* The one after, whole, under the top: there as soon as it goes. */}
          {round.length > 1 ? (
            <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
              <DayCard state={state} workout={round[(at + 1) % round.length]} />
            </View>
          ) : null}
          <GestureDetector gesture={swipe}>
            <View style={{ flex: 1 }}>
              <Animated.View style={[{ flex: 1 }, top]}>
                <DayCard state={state} workout={workout} inProgress={inProgress} />
              </Animated.View>
              {round.length > 1 ? (
                <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, before]}>
                  <DayCard state={state} workout={round[(at - 1 + round.length) % round.length]} />
                </Animated.View>
              ) : null}
            </View>
          </GestureDetector>
        </View>

        {/* The round, one shape a workout, the one on top full size: where
            you are in it, and a tap to go straight to one. */}
        {round.length > 1 ? (
          <View style={{ marginTop: -6, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
            {round.map((w, i) => (
              <Pressable
                key={`${w.id}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Show ${w.name || "Untitled"}`}
                accessibilityState={{ selected: i === at }}
                hitSlop={6}
                onPress={() => setLook(i)}
                style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: i === at ? 1 : 0.4 }}
              >
                <Mark family={workoutFamily(state, w)} size={i === at ? 20 : 14} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Always a clear gap between the card and the buttons. */}
      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: barSpace + 16 }}>
        <Column style={{ gap: 18 }}>
          {/* Klay's word, kept apart from the day it comments on: under
              the list, just before you start. */}
          {line ? (
            <Text
              style={{
                color: colors.text,
                fontSize: 19,
                lineHeight: 25,
                // Klay's remark in italics; a plain fact in roman.
                fontStyle: fact ? "normal" : "italic",
              }}
            >
              {line}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {inProgress ? <BigButton label="End" onPress={() => setEnding(true)} /> : null}
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

/**
 * One workout as a card of the deck: its head in its colour — the shape, the
 * name, what it trains and how long — and under it, on paper, what is in it,
 * scrolling inside the card when it is long. Fills whatever room it is given,
 * so every card in the deck is the same size.
 */
function DayCard({ state, workout, inProgress = false }: { state: SessionState; workout: ReturnType<typeof upNext>; inProgress?: boolean }) {
  const family = workoutFamily(state, workout);
  const card = cardInk(family);
  const minutes = workoutMinutes(state, workout);
  const rows = inProgress ? [] : workoutPreview(state, workout);
  // Slots with nothing here to do them with, said rather than hidden.
  const missing = inProgress ? [] : sittingOut(state, workout);
  const dusk = DUSK_TODAY ? DUSK[family] : null;
  // Whether the list runs past the card, and whether it has been scrolled to its end.
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [atFoot, setAtFoot] = useState(false);
  const overflows = box > 0 && content > box + 1;
  const body = dusk ? DUSK_CARD : PAPER;
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.card,
        borderCurve: "continuous",
        borderWidth: dusk ? 1 : 1.5,
        borderColor: dusk ? mix(dusk.top, "#000000", 0.35) : colors.text,
        backgroundColor: dusk ? dusk.foot : colors.bg,
        overflow: "hidden",
      }}
    >
      {dusk ? <DuskGround family={family} shape={160} /> : null}
      <View style={{ backgroundColor: dusk ? "transparent" : card.field, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: GAP }}>
          <View style={{ width: MARKS, alignItems: "center" }}>
            <Mark family={family} size={MARKS - 4} color={card.ink} plain={DUSK_TODAY} />
          </View>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={{ flex: 1, color: card.ink, fontFamily: fonts.display, fontSize: 40, lineHeight: 48 }}
          >
            {workout.name || "Untitled"}
          </Text>
        </View>
        <Text style={{ marginLeft: INDENT, color: card.soft, fontSize: 19, fontStyle: "italic" }}>
          {[workout.subtitle, `about ${minutes} min`].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        onLayout={(e) => setBox(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContent(h)}
        onScroll={(e) => setAtFoot(e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height >= e.nativeEvent.contentSize.height - 4)}
        scrollEventThrottle={32}
        // Room under the last row, so it can be scrolled clear of the fade.
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: overflows ? FADE : 14, gap: 12 }}
      >
        {inProgress ? <Progress ink={body} /> : <Preview rows={rows} ink={body} />}
        {missing.length > 0 ? (
          <Text style={{ marginLeft: INDENT, color: dusk ? DUSK_INK.soft : colors.muted, fontSize: 16, lineHeight: 22 }}>
            {missingLine(missing.map((e) => e.slot))}
          </Text>
        ) : null}
      </ScrollView>
      {/* More below: the list fades into the card's foot, rather than being cut by its edge. */}
      {overflows && !atFoot ? <FootFade color={dusk ? dusk.foot : colors.bg} /> : null}
    </View>
  );
}

/** How tall the fade at the foot of a long list is. */
const FADE = 44;

/** A list's foot, fading out into the card's colour. Never takes a touch. */
function FootFade({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: FADE }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="foot-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.85" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#foot-fade)" />
      </Svg>
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

/**
 * What words and shapes are drawn in: on the day's colour, its own ink —
 * white or navy, and a softer one — with every shape in it too; on paper,
 * ink, and each shape in its own colour (`marks`).
 */
type CardInk = { field: string; ink: string; soft: string; marks?: boolean; glow?: boolean };
const cardInk = (family: Family): CardInk => {
  if (DUSK_TODAY) return { field: "transparent", ink: DUSK_INK.ink, soft: DUSK_INK.soft };
  const { field, mark: ink } = FAMILY[family];
  return { field, ink, soft: `${ink}CC` };
};
const PAPER: CardInk = { field: colors.bg, ink: colors.text, soft: colors.muted, marks: true };
/** The list on a dusk card: cream words, each shape in its own family's glow. */
const DUSK_CARD: CardInk = { field: "transparent", ink: DUSK_INK.ink, soft: DUSK_INK.soft, glow: true };

/** A shape in a list: its own colours on paper, its family's glow at dusk, else the card's ink. */
function RowMark({ family, size, ink }: { family: Family; size: number; ink: CardInk }) {
  if (ink.glow) return <Mark family={family} size={size} color={DUSK[family].glow} plain />;
  return <Mark family={family} size={size} color={ink.marks ? undefined : ink.ink} />;
}


/** The left column every shape sits in, and the edge every word starts on. */
const MARKS = 30;
const GAP = 14;
const INDENT = MARKS + GAP;

/** Today's rows: roomy when there is space, never under the tightest that still reads. */
const ROWS = { most: 44, least: 36 } as const;

/** The next workout, with short change labels tucked beneath the figures. */
function Preview({ rows, rowHeight = ROWS.most, ink }: { rows: PreviewRow[]; rowHeight?: number; ink: CardInk }) {
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
              <RowMark family={r.family} size={22} ink={ink} />
            </View>
            <Text style={{ flex: 1, color: ink.ink, fontFamily: fonts.regular, fontSize: 20 }}>
              {r.name}
            </Text>
            {figure ? (
              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text
                  style={{
                    color: strong ? ink.ink : ink.soft,
                    fontFamily: strong ? fonts.medium : fonts.regular,
                    fontSize: 17,
                    lineHeight: 21,
                    fontVariant: ["lining-nums", "tabular-nums"],
                  }}
                >
                  {figure}
                </Text>
                {r.adjustmentLabel ? (
                  <Text style={{ color: ink.soft, fontFamily: fonts.italic, fontSize: 13, lineHeight: 16 }}>
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
function Progress({ ink }: { ink: CardInk }) {
  const { state } = useSession();
  const active = state.active;
  if (!active) return null;
  return (
    <View accessibilityRole="list">
      {active.items.map((it, i) => {
        const done = cardMark(state, i) === "done";
        const color = ink.glow ? DUSK[itemFamily(it)].glow : ink.marks ? FAMILY[itemFamily(it)].mark : ink.ink;
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
            <Text numberOfLines={1} style={{ flex: 1, color: ink.ink, fontFamily: fonts.regular, fontSize: 20 }}>
              {cardName(state, i)}
            </Text>
            {done ? (
              <Text style={{ color: ink.soft, fontFamily: fonts.italic, fontSize: 17 }}>Done</Text>
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
  // Always solid ink: a pale grey day would make it look switched off.
  return (
    <Button
      label={label}
      kind={primary ? "primary" : "secondary"}
      fill={primary ? colors.text : undefined}
      onFill={colors.bg}
      // Start is the answer nearly every time, so it takes twice the room.
      flex={primary ? 2 : 1}
      onPress={onPress}
    />
  );
}
