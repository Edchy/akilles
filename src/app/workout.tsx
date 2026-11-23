import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SetCircle } from "@/components/set-circle";
import {
  Children,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type TextInput as NativeTextInput,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  cancelAnimation,
  FadeIn,
  Easing as Ease,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Text, TextInput } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { CardioKeyboardArea } from "@/components/cardio-keyboard";
import { CardioClock } from "@/components/cardio-clock";
import { CardioResult } from "@/components/cardio-result";
import { CardioChoices } from "@/components/cardio-target";
import { Column, COLUMN } from "@/components/screen";
import { useHideBar } from "@/components/bar-actions";
import { useBarSpace } from "@/components/bottom-bar";
import { ClayField, Field, useColors } from "@/components/field";
import { REST_CLOCK_HEIGHT, RestClock } from "@/components/rest-clock";
import { AnyExerciseRow, SwapBrowser } from "@/components/add-exercise";
import { Icon, type IconName } from "@/components/icon";
import { Mark } from "@/components/mark";
import { NoteLine, NoteSheet } from "@/components/note";
import { GuideButton, GuideSheet } from "@/components/guide";
import { CardActiveContext, useCardActive, CardContext, useOnCard } from "@/components/card-context";
import { Illustration } from "@/components/illustration";
import { FloatingTip, HINT_LABELS, firstUnseen, isHint, playedHint, type HintId } from "@/components/tips";
import { GestureHint } from "@/components/hint";
import { ClayStretch, hasClay } from "@/components/clay";
import { GoalSheet, Pips, hasTutorial, openTutorial } from "@/components/goals";
import { BigButton, Sheet, TextButton } from "@/components/sheet";
import { CLAY_CARD, CLAY_LOOK, CLAY_TONE, colors, colors as paper, FAMILY, fieldColors, fonts, mix, radii } from "@/constants/theme";
import { GearIcon, gearOf, type Pictured } from "@/components/gear-icon";
import { fullName } from "@/lib/exercise-name";
import { ClayGround } from "@/components/clay-ground";
import { Fit } from "@/components/fit";
import { FitText, WholeText } from "@/components/fit-text";
import { grain } from "@/constants/grain";
import { byId, inSentence, type Exercise } from "@/data/exercises";
import { ownCue } from "@/data/guides";
import { familyOf, type Family } from "@/data/families";
import {
  FINISHED_LINES,
  GOAL_LINES,
  OUTCOME_LINES,
  pickLine,
  type FinishedMood,
} from "@/data/voice";
import {
  CARDIO_MINUTES,
  EFFORT,
  onTheClock,
  pictureOf,
  timeLabel,
  type MobilityMove,
  type MobilityRoutine,
} from "@/data/conditioning";
import { nextStepLine, ruleLine, type Goal, type GoalStep } from "@/data/goals";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { chime, cue } from "@/lib/chime";
import { weightLabel, type WarmupSet } from "@/lib/warmup";
import type { Feel } from "@/lib/start-weight";
import {
  allSetsLogged,
  cardioRecord,
  completeCardio,
  completeExercise,
  completeGoal,
  conditioningPool,
  currentCardio,
  currentRoutine,
  currentPool,
  currentPrescription,
  currentTaken,
  currentWarmup,
  currentWorkout,
  workoutFamily,
  exerciseCount,
  editWeight,
  finishWorkout,
  goalStepOf,
  goalVerdict,
  isCardio,
  isComplete,
  isConditioning,
  isGoal,
  isLift,
  itemFamily,
  isMobility,
  logGoalSet,
  nextAfterSession,
  nextTime,
  asksFeel,
  willAskFeel,
  setFeel,
  sessionNoteFor as noteFor,
  sessionTally,
  nudgeWeight,
  partnerPrescription,
  removeSuperset,
  skipGoalSet,
  REST,
  restSeconds,
  swapAnywhere,
  atGym,
  skipSet,
  scoreOf,
  cardioDone,
  cancelHold,
  heldFor,
  holdOn,
  startHold,
  stopHold,
  finishClock,
  pauseClock,
  startClock,
  setGot,
  setScore,
  swapConditioning,
  swapForSession,
  tapGoalSet,
  tapSet,
  nextItemName,
  resolveRoutineStep,
  atCard,
  cardMark,
  finishRoutine,
  cardName,
  goToCard,
  seeTip,
  SessionContext,
  useSession,
  type CardMark,
  type Item,
  type SessionState,
  cardioEnd,
  goToStep,
  stepHere,
} from "@/store/session";
import type { Chain, Placement } from "@/data/chains";


/**
 * A chain's first time: one plain question — two at most — and you are on
 * your step. Asked at the bar, where the answer is easy to find out, never
 * guessed at in onboarding. Answers are big, one under another.
 */
function PlaceOnChain({ chain, family, onPlace }: { chain: Chain; family: Family; onPlace: (step: number) => void }) {
  const colors = useColors();
  const [ask, setAsk] = useState<Placement>(chain.place);
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 22, paddingVertical: 24 }}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <Mark family={family} size={26} color={colors.text} />
        <Text accessibilityRole="header" style={{ textAlign: "center", color: colors.text, fontFamily: fonts.medium, fontSize: 34, lineHeight: 40 }}>
          {chain.name}
        </Text>
        <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>
          First time. Let's find where you start.
        </Text>
      </View>
      <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 24, lineHeight: 31 }}>
        {ask.question}
      </Text>
      <View style={{ gap: 10 }}>
        {ask.answers.map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="button"
            onPress={() => (a.then ? setAsk(a.then) : a.step !== undefined ? onPlace(a.step) : undefined)}
            style={({ pressed }) => ({
              minHeight: 60,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.action,
              borderCurve: "continuous",
              borderWidth: 1.5,
              borderColor: colors.text,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 22 }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ textAlign: "center", color: colors.text, opacity: 0.8, fontFamily: fonts.italic, fontSize: 17 }}>
        Not sure? Pick the lower one. Harder is one tap away.
      </Text>
    </View>
  );
}

/**
 * Under a step's name: which chain, and where on it — a tap shows every
 * step — then Easier and Harder, to move any day. Once the step is owned,
 * Harder fills in: the next step is offered, never forced.
 */
function StepLine({ chain, at, owned, onAll, onStep }: {
  chain: Chain;
  at: number;
  owned: boolean;
  onAll: () => void;
  onStep: (at: number) => void;
}) {
  const colors = useColors();
  const last = chain.steps.length - 1;
  const offer = owned && at < last;
  const pill = (label: string, to: number, strong = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${byId(chain.steps[to].exerciseId)?.name ?? ""}`}
      onPress={() => onStep(to)}
      hitSlop={6}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.text,
        backgroundColor: strong ? colors.text : pressed ? colors.surface : "transparent",
      })}
    >
      <Text style={{ color: strong ? colors.bg : colors.text, fontFamily: fonts.medium, fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginTop: 6, alignItems: "center", gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityHint="Shows every step." onPress={onAll} hitSlop={8}>
        <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 18 }}>
          {offer ? "You own this step. " : ""}
          {chain.name}, step {at + 1} of {chain.steps.length}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {at > 0 ? pill("‹ Easier", at - 1) : null}
        {at < last ? pill(offer ? "Try harder ›" : "Harder ›", at + 1, offer) : null}
      </View>
    </View>
  );
}

/** Every step of a chain, yours marked, each with why it comes where it does. */
function StepsSheet({ visible, chain, at, onClose, onStep }: {
  visible: boolean;
  chain: Chain;
  at: number;
  onClose: () => void;
  onStep: (at: number) => void;
}) {
  return (
    <Sheet visible={visible} title={`${chain.name}, step by step`} closeLabel="Done" onClose={onClose}>
      <View style={{ gap: 10, paddingTop: 8 }}>
        {chain.steps.map((st, i) => {
          const ex = byId(st.exerciseId);
          const here = i === at;
          return (
            <Pressable
              key={st.exerciseId}
              accessibilityRole="button"
              accessibilityState={{ selected: here }}
              onPress={() => onStep(i)}
              style={({ pressed }) => ({
                flexDirection: "row",
                gap: 14,
                padding: 14,
                borderRadius: radii.card,
                borderCurve: "continuous",
                borderWidth: 1.5,
                borderColor: here ? paper.text : paper.line,
                backgroundColor: pressed ? paper.surface : paper.bg,
              })}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: here ? paper.text : paper.surface }}>
                <Text style={{ color: here ? paper.bg : paper.text, fontFamily: fonts.medium, fontSize: 17 }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: paper.text, fontFamily: fonts.medium, fontSize: 20 }}>
                  {ex?.name}
                  {here ? <Text style={{ fontFamily: fonts.italic, color: paper.muted }}>{"  "}you are here</Text> : null}
                </Text>
                <Text style={{ color: paper.muted, fontFamily: fonts.regular, fontSize: 16, lineHeight: 21 }}>{st.why}</Text>
                {ex?.cue ? <Text style={{ color: paper.text, fontFamily: fonts.italic, fontSize: 16, lineHeight: 21 }}>{ex.cue}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/**
 * The lift screen's rhythm, top to bottom: the name, the weight, the circles
 * and a line on last time — the gaps between them, and each block's height.
 * Everything else about the lift (how-to, swap, a note, a superset) waits
 * behind the ⋯ beside the name, so these four have the screen to themselves.
 *
 * Mid-workout you tap without really looking, so nothing may move under the
 * thumb: each block is sized for its largest case — a two-line remark, a
 * five-figure weight — and smaller content sits inside that space rather than
 * shrinking it. A superset folds a second lift in, so the same blocks are
 * drawn tighter to fit both above the bar.
 */
/**
 * The unit under the weight rather than after it, so the figures stand alone
 * in the middle of the card (18 November 2026, to try). `UNIT_ROOM` is the
 * height it adds under the number. `false` puts it back on the baseline.
 */
const UNIT_BELOW = true;
const UNIT_ROOM = 40;

/**
 * The room under the circles on a lift that asks how it felt: the question,
 * its answers, and next time's weight under them once answered — kept from
 * the start, so nothing moves as they come.
 */
const FEEL_ROOM = 26 + 10 + 44 + 10 + 24;

/**
 * Space a roomy card gives back between its parts — at most `most` points
 * in all, the rest staying round the lift as a whole — and each gap's share.
 */
const SPREAD = { most: 120, weight: 0.3, sets: 0.3, clock: 0.15, under: 0.25 } as const;

/**
 * How far a crowded lift card may close its gaps and draw its weight smaller,
 * at its real size, before `Fit` has to do anything. The set circles never
 * give way: the same count is the same size on every card.
 */
const SQUEEZE_LEAST = 0.55;

const LAYOUT = {
  solo: { name: 36, weight: 52, number: 96, sets: 48, under: 84, underGap: 28 },
  // On its own, with more under the circles — the feel question and its
  // answers — or on a phone too short for the roomy one.
  tight: { name: 20, weight: 26, number: 84, sets: 28, under: 84, underGap: 14 },
  paired: { name: 18, weight: 22, number: 64, sets: 22, under: 58, underGap: 10 },
} as const;

/**
 * Set circles: a lift on its own; the main lift once a partner is folded in,
 * a little smaller so both fit above the bar on a phone; and the partner,
 * smaller again so the main lift stays primary.
 */
/**
 * The workout card's list: each row's height plus the gap under it. As many
 * rows as there are close up from the most to the least to fit; the least is
 * still a full thumb's width (44 points and over).
 */
const ROW = { most: 60, least: 52, gap: 4 } as const;
/** Room under the last row, so it never sits on the fade or the button. */
const LIST_FOOT = 12;
/** The way out under the list: a 16-point gap, the 60-point button, 30 under it. */
const LEAVE_AREA = 106;

const CIRCLES = {
  solo: { full: 104, gap: 14, font: 56 },
  main: { full: 86, gap: 12, font: 46 },
  partner: { full: 52, gap: 12, font: 28 },
} as const;

/**
 * The deck: the margin either side of a card, how far each card under the
 * top one shows below it, how much smaller each is, and how round the
 * corners are. A swipe turns the deck by one card over `travel` of the
 * deck's width; let go past `away` of the way, or flicked faster than
 * `flick` points a second, and it goes — sooner, and it comes back.
 */
const DECK = { side: 14, peek: 10, shrink: 0.045, corner: 14, travel: 0.8, away: 0.28, flick: 600, shade: 0.07 };
/** How the deck comes to rest on a card: quick, and without a wobble. */
const SETTLE = { damping: 26, stiffness: 260, mass: 1 };

/**
 * A workout, as a deck of cards: the cardio, the warm-up, each lift, the
 * stretch — one card each, in order — and after the last of them, the end.
 * It looks like a deck: the top card, and the edges of the next two under it.
 *
 * Swipe the top card off to the left and the next one is on top. Swipe to
 * the right and the last one comes back. Any card, done or not — so a taken
 * bench is passed and come back to. The deck has two ends, the first card
 * and the end card, and goes no further either way. Above the deck, its
 * header: one mark for each card, filled as it is done (see `CardDot`) — tap
 * it for all the cards at once.
 *
 * Everything done here is for this session only; the plan is changed in Plan.
 * The bottom bar is put away while the deck is up, so a card has the screen.
 */
export default function WorkoutScreen() {
  const { state } = useSession();
  useHideBar();
  if (!state.active) return <Finished hasSession={false} />;
  return <Deck />;
}

function Deck() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const still = useReduceMotion();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener("keyboardWillShow", () => setKeyboardOpen(true)),
      Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true)),
      Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  const active = state.active!;
  const cards = active.items.length + 1;
  const top = Math.min(active.cursor, cards - 1);
  // The screen under the status bar, measured: both cards are laid out in it by hand.
  const [stage, setStage] = useState({ width: 0, height: 0 });
  // The workout card's height while it is small: its header, measured.
  const [shut, setShut] = useState(0);
  const deckTop = shut + MENU.gap;
  const room = { width: stage.width, height: Math.max(0, stage.height - deckTop) };
  // The deck runs down close to the home bar, never onto it, so the cards
  // have the screen's height.
  const foot = Math.max(insets.bottom - 16, 10);
  const cardHeight = Math.max(0, room.height - foot - 2 * DECK.peek);
  /** How far the workout card grows, and the deck goes down, when they swap. */
  const shift = Math.max(0, stage.height - MENU.strip - deckTop);

  /**
   * Where the deck is: which card is on top, as a number that moves — 3.4 is
   * card 3 two fifths of the way off. Every card is drawn from this alone
   * (see `DeckCard`), on the same thread as the thumb, so the thumb, the
   * settle and a card's Done button all turn the one deck and nothing can
   * fall out of step.
   */
  const turned = useSharedValue(top);
  /** The card the deck is on, or on its way to. */
  const aim = useSharedValue(top);
  /** Where the deck was when the thumb came down. */
  const from = useSharedValue(top);

  // The session moved some other way — a card's Done, the workout card's
  // list: the deck turns to it.
  useEffect(() => {
    if (Math.round(aim.value) === top) return;
    aim.value = top;
    turned.value = still ? top : withSpring(top, SETTLE);
  }, [top, still, aim, turned]);

  // A first-time tip for the card on top, one at a time (see `components/tips.tsx`).
  // None for a stretch: its card says "Swipe up" in its own words.
  const onCard = top < cards - 1 ? active.items[top] : undefined;
  const lifting = !!onCard && !isCardio(onCard) && !isMobility(onCard);
  const target = lifting ? currentPrescription(state)?.reps : undefined;
  const cardDone = !!onCard && cardMark(state, top) === "done";
  const tip = firstUnseen(state, [
    lifting && target !== undefined && onCard.logged.some((r) => r !== null && r < target) && "short",
    // The very first card says in words what a card is for: do it, fill it
    // in, swipe on — and that the same swipe skips it.
    top === 0 && !!onCard && !cardDone && "begin",
    lifting && currentWarmup(state).length > 0 && !onCard.logged.some((r) => r !== null) && "warmup",
    // The finger shows the swipe once a card is done, when moving on is
    // what comes next — never first thing, where it reads as "throw this away".
    cardDone && "swipe",
    lifting && "menu",
    top >= 2 && "overview",
  ]);

  const land = (on: number) => {
    Haptics.selectionAsync();
    // Turned by a swipe: the swipe is learned, its hint never comes again.
    setState((s) => seeTip(seeTip(goToCard(s, on), "swipe"), "begin"));
  };
  // A tip closed for now by a touch: it stays away until the workout is opened again.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const last = cards - 1;

  /**
   * The two cards, swapped: 0 is the deck big and the workout card small
   * above it; 1 is the workout card big — every card, and the way out — and
   * the deck down to a strip at the foot. Pulled down or up by the thumb
   * anywhere on the screen, and it follows; let go and it settles one way.
   */
  const opened = useSharedValue(0);
  const openedFrom = useSharedValue(0);
  const [open, setOpenRaw] = useState(false);
  // Opened by the thumb or a tap: the pull is learned, its hint never comes again.
  const setOpenState = (on: boolean) => {
    setOpenRaw(on);
    if (on) setState((s) => seeTip(s, "overview"));
  };
  const setOpen = (on: boolean) => {
    setOpenState(on);
    opened.value = still ? (on ? 1 : 0) : withSpring(on ? 1 : 0, SETTLE);
  };
  // The list of every card, when it is too long to fit even with its rows
  // drawn tighter, scrolls — by this same pull, the way an iOS sheet does it.
  // Which one a swipe moves is settled as it starts and never changes
  // halfway, so the card never wobbles under a scroll: on the list, a swipe
  // scrolls it and stops at its ends; only a push up that starts with the
  // list at its end closes the card (it hangs from the top, so up is shut). The header, the grab bar and the strip
  // close it from anywhere, since there is no list under them.
  const listRef = useAnimatedRef<Reanimated.ScrollView>();
  const scrollY = useSharedValue(0);
  const scrollMax = useSharedValue(0);
  const scrollFrom = useSharedValue(0);
  /** The pull began on the list itself, not its header or the strip. */
  const onList = useSharedValue(false);
  /** What this swipe moves: the card, the list and only the list, or — on a list at its end — not yet known. */
  const moves = useSharedValue<"card" | "list" | "either">("card");
  const listTop = useSharedValue(0);
  useAnimatedReaction(
    () => scrollY.value,
    (y) => scrollTo(listRef, 0, y, false),
  );
  useEffect(() => {
    listTop.value = insets.top + 4 + shut;
  }, [insets.top, shut, listTop]);
  const pull = Gesture.Pan()
    .enabled(!keyboardOpen)
    .activeOffsetY([-14, 14])
    .failOffsetX([-12, 12])
    .onBegin((e) => {
      onList.value = opened.value > 0.99 && e.absoluteY > listTop.value && e.absoluteY < listTop.value + shift - LEAVE_AREA;
    })
    .onStart(() => {
      openedFrom.value = opened.value;
      cancelAnimation(scrollY);
      scrollFrom.value = scrollY.value;
      // A list that scrolls takes the whole swipe — unless it's at its end
      // and the swipe pushes up: that closes the card, like a sheet. Which
      // way it goes is read from its first movement.
      moves.value = !onList.value || scrollMax.value <= 0 ? "card" : scrollY.value > scrollMax.value - 1 ? "either" : "list";
    })
    .onChange((e) => {
      if (shift <= 0) return;
      const by = e.translationY;
      if (moves.value === "either" && by !== 0) moves.value = by < 0 ? "card" : "list";
      if (moves.value === "either") return;
      if (moves.value === "list") {
        // Stops at either end; the card stays where it is.
        scrollY.value = Math.min(Math.max(scrollFrom.value - by, 0), scrollMax.value);
        return;
      }
      const want = openedFrom.value + by / shift;
      // Past either end it gives a little, stiffly.
      opened.value = want < 0 ? want * 0.15 : want > 1 ? 1 + (want - 1) * 0.15 : want;
    })
    .onEnd((e) => {
      if (shift <= 0) return;
      // The list was moving: let it carry on.
      if (moves.value === "list") {
        if (!still) scrollY.value = withDecay({ velocity: -e.velocityY, clamp: [0, scrollMax.value] });
        return;
      }
      const speed = e.velocityY / shift;
      // Where it would come to rest, carried on by a flick.
      const to = opened.value + speed * 0.2 > 0.5 ? 1 : 0;
      opened.value = still ? to : withSpring(to, { ...SETTLE, velocity: speed });
      scheduleOnRN(setOpenState, to === 1);
    });

  const { width } = room;
  const pan = Gesture.Pan()
    // Sideways turns the deck, while it is the big card; up and down swap the cards.
    .enabled(!open && !keyboardOpen)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onStart(() => {
      // Caught mid-turn, it carries on from where it is.
      from.value = turned.value;
    })
    .onChange((e) => {
      const by = -e.translationX / (width * DECK.travel);
      // One card either way from where it was heading, never more.
      const want = Math.min(Math.max(from.value + by, aim.value - 1), aim.value + 1);
      // The deck has two ends: past the first card or the end card it gives
      // a little, stiffly, and comes back.
      turned.value =
        want < 0 ? want * 0.18 : want > last ? last + (want - last) * 0.18 : want;
    })
    .onEnd((e) => {
      const moved = turned.value - aim.value;
      const flicked = Math.abs(e.velocityX) > DECK.flick && e.velocityX * moved < 0;
      const goes = Math.abs(moved) > DECK.away || (flicked && Math.abs(moved) > 0.04);
      const to = Math.min(Math.max(goes ? aim.value + (moved > 0 ? 1 : -1) : aim.value, 0), last);
      const changed = to !== aim.value;
      aim.value = to;
      turned.value = still
        ? to
        : withSpring(to, { ...SETTLE, velocity: -e.velocityX / (width * DECK.travel) });
      if (changed) scheduleOnRN(land, to);
    });

  const lowered = useAnimatedStyle(() => ({ transform: [{ translateY: opened.value * shift }] }));

  // The tip showing now, if any: none while the list is open or typing.
  const showing = tip && tip !== dismissed && !open && !keyboardOpen && shut > 0 ? tip : undefined;
  // A finger hint moves the real deck a little as it goes: a swipe turns it a
  // touch toward the next card, a pull lowers it a touch. `hintDrive` is how
  // far the finger is through its motion; `hintKind` which thing it moves.
  // The kind is kept after the hint goes, so its last word — back to 0 —
  // still puts the deck back.
  const hintDrive = useSharedValue(0);
  const hintKind = useSharedValue(0);
  useEffect(() => {
    if (showing === "swipe") hintKind.value = 1;
    else if (showing === "overview") hintKind.value = 2;
  }, [showing, hintKind]);
  useAnimatedReaction(
    () => hintDrive.value,
    (k, before) => {
      if (before === null || k === before) return;
      if (hintKind.value === 1) turned.value = k === 0 ? withSpring(aim.value, SETTLE) : aim.value + 0.14 * k;
      else if (hintKind.value === 2) opened.value = k === 0 ? withSpring(0, SETTLE) : 0.1 * k;
    },
  );
  /** Where each finger hint plays, on this screen: the card's middle, the workout card's handle, the name. */
  const hintAt = (id: HintId) => {
    if (id === "swipe") {
      const y = deckTop + cardHeight * 0.56;
      return { from: { x: width * 0.72, y }, to: { x: width * 0.3, y }, labelAt: { x: 0, y: deckTop + cardHeight * 0.38 } };
    }
    if (id === "overview") {
      const y = shut - 12;
      return { from: { x: width / 2, y }, to: { x: width / 2, y: y + 110 }, labelAt: { x: 0, y: y + 170 } };
    }
    return { from: { x: width / 2, y: deckTop + 62 }, labelAt: { x: 0, y: deckTop + 112 } };
  };

  return (
    // On paper the deck lies on a slightly darker ground, so paper cards stand off it.
    <View
      // Any touch puts a tip away: a hint for now, a callout for good.
      onTouchStart={() => {
        if (!showing) return;
        setDismissed(showing);
        if (!isHint(showing)) setState((s) => seeTip(s, showing));
      }}
      style={{ flex: 1, overflow: "hidden", backgroundColor: colors.surface, paddingTop: insets.top + 4 }}
    >
      <StatusBar style="dark" />
      <GestureDetector gesture={Gesture.Race(pan, pull)}>
        <View
          onLayout={(e) => setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          style={{ flex: 1 }}
        >
          <Reanimated.View
            // Under it all while it is a strip, the deck can still be tapped back up.
            style={[{ position: "absolute", left: 0, right: 0, top: deckTop, height: room.height }, lowered]}
          >
            {cardHeight > 0 && shut > 0
              ? Array.from({ length: cards }, (_, i) => (
                  <DeckCard
                    key={i}
                    index={i}
                    count={cards}
                    turned={turned}
                    onTop={i === top && !open}
                    width={width}
                    height={cardHeight}
                  >
                    {i === cards - 1 ? (
                      <CardContext.Provider value>
                        <Finished hasSession onCard />
                      </CardContext.Provider>
                    ) : (
                      // Every card has its real content from the start. Only the
                      // top card plays its illustrations.
                      <CardActiveContext.Provider value={i === top && !open}>
                        <CardStep index={i} />
                      </CardActiveContext.Provider>
                    )}
                  </DeckCard>
                ))
              : null}
          </Reanimated.View>

          <WorkoutCard
            opened={opened}
            open={open}
            shut={shut}
            onShut={setShut}
            room={shift}
            list={{ ref: listRef, y: scrollY, max: scrollMax, top: listTop }}
            onToggle={() => setOpen(!open)}
            onPick={(index) => {
              setState((s) => goToCard(s, index));
              setOpen(false);
            }}
            onLeave={() => router.replace("/")}
          />

          {showing && isHint(showing) && width > 0 ? (
            <GestureHint
              key={showing}
              {...hintAt(showing)}
              label={HINT_LABELS[showing]}
              drive={showing === "menu" ? undefined : hintDrive}
              onPlayed={() => {
                setDismissed(showing);
                setState((s) => playedHint(s, showing));
              }}
            />
          ) : null}
          <FloatingTip id={showing === "short" || showing === "warmup" || showing === "begin" ? showing : undefined} top={deckTop + 14} side={DECK.side} />

          {open ? (
            // The strip of the deck at the foot: a tap brings it back up.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Back to ${cardName(state, top) || "the workout"}`}
              onPress={() => setOpen(false)}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: MENU.strip }}
            />
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
}

/**
 * One card of the deck, drawn from where the deck is (`turned`) and nothing
 * else. How far this card is from the top:
 *
 * - 0 is the top card; 1 and 2 lie under it, each a little smaller and lower,
 *   so their feet show; further down, out of sight.
 * - Between 0 and −1 it is on its way off to the left — or, the same thing
 *   backwards, on its way back in over the top. At −1 it is gone.
 *
 * So swiping on and swiping back are one movement, run forwards or
 * backwards, and there is no moment where a card has to jump.
 */
function DeckCard({
  index,
  count,
  turned,
  onTop,
  width,
  height,
  children,
}: PropsWithChildren<{
  index: number;
  count: number;
  turned: SharedValue<number>;
  /** Whether the session is on this card: the one the thumb can use. */
  onTop: boolean;
  width: number;
  height: number;
}>) {
  const { state } = useSession();
  const item = state.active?.items[index];
  // The card is its own colour all the way to the edge, so the smoothed
  // pixels of a rounded or tilted edge never show white through.
  // The last card, the end, is in the workout's own colour.
  const family = item ? itemFamily(item) : state.active ? workoutFamily(state, currentWorkout(state)) : null;
  // The mobility card is white, the clay pictures' own (see `CLAY_CARD`).
  const clay = family === "mobility";
  const ground = clay ? CLAY_CARD.top : family ? fieldColors(family).bg : null;
  // How much each side is trimmed this far down the deck.
  const trimAt = (down: number) => {
    "worklet";
    return ((width - DECK.side * 2) * DECK.shrink * Math.max(0, down)) / 2;
  };
  const style = useAnimatedStyle(() => {
    // How far down the deck, from −1 (gone off to the left) up to the bottom.
    const place = index - turned.value;
    if (place <= -1) return { opacity: 0, zIndex: 0, left: DECK.side, right: DECK.side, transform: [{ translateX: 0 }, { translateY: 0 }, { rotateZ: "0deg" }, { scale: 1 }] };

    if (place < 0) {
      // Leaving to the left, or coming back from it: over everything else.
      const gone = -place;
      const x = -width * 1.12 * gone;
      return {
        opacity: 1,
        zIndex: count + 2,
        left: DECK.side,
        right: DECK.side,
        transform: [{ translateX: x }, { translateY: 0 }, { rotateZ: `${-9 * gone}deg` }, { scale: 1 }],
      };
    }
    const down = Math.min(place, 3);
    // Narrower the further down, but never scaled: iOS draws a scaled view
    // as a picture of itself, shrunk, and its lines and words come out soft.
    // Its sides are trimmed instead (see `inner`), so what is on it stays
    // sharp and still, and the edges grow back out as it comes to the top.
    const trim = trimAt(down);
    return {
      opacity: down <= 2 ? 1 : 3 - down,
      zIndex: count - Math.round(place),
      left: DECK.side + trim,
      right: DECK.side + trim,
      transform: [
        { translateX: 0 },
        // Lower by its share of the peek: its foot shows under the card above.
        { translateY: DECK.peek * down },
        { rotateZ: "0deg" },
        { scale: 1 },
      ],
    };
  });
  // In the shade of the cards above it, as in a real deck: clear on top,
  // a little darker each card down, and lifting as a swipe uncovers it.
  const shade = useAnimatedStyle(() => ({
    opacity: Math.min(2, Math.max(0, index - turned.value)) * DECK.shade,
  }));
  // What is on the card keeps the full card's width, centred, whatever is trimmed.
  const inner = useAnimatedStyle(() => {
    const trim = trimAt(Math.max(0, Math.min(index - turned.value, 3)));
    return { left: -trim, right: -trim };
  });

  return (
    <Reanimated.View
      // Only the top card is for the thumb; the rest are the deck.
      accessibilityElementsHidden={!onTop}
      importantForAccessibility={onTop ? "auto" : "no-hide-descendants"}
      style={[
        {
          position: "absolute",
          top: 0,
          left: DECK.side,
          right: DECK.side,
          height,
          overflow: "hidden",
          borderRadius: CLAY_LOOK.corner,
          borderCurve: "continuous",
          backgroundColor: ground ?? colors.bg,
          // A puffy lump of clay: no line round it, its own light and shadow
          // are its edge.
          boxShadow: CLAY_LOOK.puff,
          pointerEvents: onTop ? "auto" : "none",
        },
        style,
      ]}
    >
      {clay ? <ClayGround /> : null}
      <Reanimated.View style={[{ position: "absolute", top: 0, bottom: 0 }, inner]}>{children}</Reanimated.View>
      <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000" }, shade]} />
    </Reanimated.View>
  );
}

/**
 * One card in full (see `StepBody`), given the session as it is for that
 * card: everything on it reads and writes "the exercise on screen", and here
 * that is this card, wherever the row happens to be. What it writes lands in
 * the real session; only a move along the row — a card's own Done — moves
 * the row with it.
 */
function CardStep({ index }: { index: number }) {
  const { state, setState } = useSession();
  const value = useMemo(
    () => ({
      state: atCard(state, index),
      setState: (update: SessionState | ((s: SessionState) => SessionState)) =>
        setState((real) => {
          const next = typeof update === "function" ? update(atCard(real, index)) : update;
          if (!real.active || !next.active) return next;
          const moved = next.active.cursor - index;
          const cursor = moved === 0 ? real.active.cursor : index + moved;
          return { ...next, active: { ...next.active, cursor } };
        }),
    }),
    [state, index, setState],
  );
  return (
    <SessionContext.Provider value={value}>
      <CardContext.Provider value>
        <StepBody />
      </CardContext.Provider>
    </SessionContext.Provider>
  );
}

/**
 * How a card stands, as one small mark in its family's colour: an outline
 * while it is to do, filled once it is done. By fill, so it reads on white
 * and on any field.
 */
function CardDot({ mark, color, size = 14, current = false }: { mark: CardMark; color: string; size?: number; current?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: mark === "done" ? color : "transparent",
        }}
      />
      {/* Where you are: a short line under the mark. Always laid out. */}
      <View style={{ width: size, height: 3, borderRadius: 1.5, backgroundColor: current ? colors.text : "transparent" }} />
    </View>
  );
}

const MARK_WORD: Record<CardMark, string> = { todo: "", done: "Done" };

/**
 * Every card of the workout as a mark along the full width of the workout
 * card, threaded on a line like stops on a route: filled in its colour when
 * done, an outline while to do. The one you are on is unmistakable: larger,
 * inside a navy ring, and the line is drawn in navy up to it — the way you
 * have come. Spread evenly, however many there are.
 */
const TRACK = { mark: 18, here: 24, ring: 36 } as const;

function DeckTrack() {
  const { state } = useSession();
  const active = state.active;
  if (!active) return null;
  const n = active.items.length;
  if (!n) return null;
  const start = Math.max(0, Math.min(active.cursor - 5, n - 10));
  const visible = active.items.slice(start, start + 10);
  const count = visible.length;
  const here = active.cursor - start;
  const { mark, ring } = TRACK;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: ring, marginTop: 4, marginHorizontal: -4 }}
    >
      {/* The thread, from the first mark's centre to the last's. */}
      <View
        style={{
          position: "absolute",
          top: ring / 2 - 1.5,
          left: `${50 / count}%`,
          right: `${50 / count}%`,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: colors.line,
        }}
      />
      {/* The way you have come: navy from the first mark to this one. */}
      {here > 0 ? (
        <View
          style={{
            position: "absolute",
            top: ring / 2 - 1.5,
            left: `${50 / count}%`,
            width: `${(100 * here) / count}%`,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: colors.text,
          }}
        />
      ) : null}
      <View style={{ flexDirection: "row" }}>
        {visible.map((it, offset) => {
          const i = start + offset;
          const done = cardMark(state, i) === "done";
          const current = i === active.cursor;
          const color = FAMILY[itemFamily(it)].mark;
          const d = current ? TRACK.here : mark;
          const dot = (
            <View
              style={{
                width: d,
                height: d,
                borderRadius: d / 2,
                borderWidth: 2.5,
                borderColor: color,
                // Not done, it still hides the thread behind it.
                backgroundColor: done ? color : colors.panel,
              }}
            />
          );
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", height: ring, justifyContent: "center" }}>
              {current ? (
                // You are here: a navy ring around the mark, a gap between.
                <View
                  style={{
                    width: ring,
                    height: ring,
                    borderRadius: ring / 2,
                    borderWidth: 3,
                    borderColor: colors.text,
                    backgroundColor: colors.panel,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {dot}
                </View>
              ) : (
                dot
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The two cards' sizes: the room between them, and how much of the deck
 * still shows, as a strip at the foot, while the workout card is big.
 */
const MENU = { gap: 10, strip: 92 } as const;

/**
 * The workout card, above the deck: small, it is the workout's name, how
 * many cards are done and a mark for each, with a grab bar along its foot
 * that says it pulls down. Pulled down — or tapped — it grows to most of the
 * screen while the deck goes down to a strip: every card, to go to any of
 * them, and the way out. Pushed up, or the strip tapped, and they swap back.
 */
function WorkoutCard({
  opened,
  open,
  shut,
  onShut,
  room,
  list,
  onToggle,
  onPick,
  onLeave,
}: {
  opened: SharedValue<number>;
  open: boolean;
  /** Its height while small. */
  shut: number;
  /** Its height while small, measured, so the deck sits under it. */
  onShut: (height: number) => void;
  /** How much it grows by. */
  room: number;
  /** The list, scrolled by the deck's pull (see `Deck`): where it is, how far it goes, where it starts on screen. */
  list: {
    ref: ReturnType<typeof useAnimatedRef<Reanimated.ScrollView>>;
    y: SharedValue<number>;
    max: SharedValue<number>;
    top: SharedValue<number>;
  };
  onToggle: () => void;
  onPick: (index: number) => void;
  onLeave: () => void;
}) {
  const { state } = useSession();
  const active = state.active;
  // Small until it has been measured, then as tall as it has grown.
  const grown = useAnimatedStyle(
    () => ({ height: shut + Math.max(0, opened.value) * room, opacity: shut > 0 ? 1 : 0 }),
    [shut, room],
  );
  const turnChevron = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${180 * Math.min(1, Math.max(0, opened.value))}deg` }] }));
  const showList = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (opened.value - 0.25) / 0.5)) }));
  // The room the list has, measured. Rows close up to fit it — the words
  // stay their size, only the space between goes — and only past the
  // tightest still easy to hit does the list scroll.
  // Worked out, not measured: the card's height animates, and measuring the
  // list as it grew would redraw it on every frame of the opening.
  const view = Math.max(0, room - LEAVE_AREA - 3);
  const [content, setContent] = useState(0);
  // Every card, and the end of the workout as the last row.
  const count = (active?.items.length ?? 0) + 1;
  const pitch = count > 0 && view > 0 ? Math.min(ROW.most, Math.max(ROW.least, Math.floor((view - LIST_FOOT) / count))) : ROW.most;
  const row = pitch - ROW.gap;
  useEffect(() => {
    list.max.value = Math.max(0, content - view);
    if (list.y.value > list.max.value) list.y.value = list.max.value;
  }, [content, view, list]);
  // Opened on a long workout, the list starts with the card you're on in
  // the middle of it, not at the top.
  const cursor = active?.cursor ?? 0;
  useEffect(() => {
    if (!open) return;
    const max = Math.max(0, content - view);
    list.y.value = Math.min(max, Math.max(0, cursor * pitch - (view - pitch) / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // A soft fade at the foot while there is more below.
  const more = useAnimatedStyle(() => ({
    opacity: list.max.value <= 0 ? 0 : Math.min(1, Math.max(0, (list.max.value - list.y.value) / 24)),
  }));
  if (!active) return null;
  const done = active.items.filter((_, i) => cardMark(state, i) === "done").length;

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: DECK.side,
          right: DECK.side,
          overflow: "hidden",
          borderRadius: CLAY_LOOK.corner,
          borderCurve: "continuous",
          // Off the white, plainly: its own card, not part of the page.
          backgroundColor: colors.panel,
          // A bump of clay, like the deck under it.
          boxShadow: CLAY_LOOK.bump,
        },
        grown,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${currentWorkout(state).name}. ${done} of ${active.items.length} cards done. ${open ? "Close the list" : "Show every card"}`}
        onPress={onToggle}
        onLayout={(e) => onShut(e.nativeEvent.layout.height)}
        // Kept close, so the cards under it have the room.
        style={({ pressed }) => ({ gap: 4, paddingTop: 10, paddingBottom: 18, paddingHorizontal: 18, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 30 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 21 }}>
            {currentWorkout(state).name}
            {"  "}
            <Text style={{ fontFamily: fonts.italic, fontSize: 19 }}>
              {done} of {active.items.length} done
            </Text>
          </Text>
          <Reanimated.View style={turnChevron}>
            <Icon name="expand" size={20} color={colors.text} />
          </Reanimated.View>
        </View>
        <DeckTrack />
      </Pressable>

      <Reanimated.View
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        style={[{ flex: 1, paddingHorizontal: 10, pointerEvents: open ? "auto" : "none" }, showList]}
      >
        <View style={{ flex: 1 }}>
        <Reanimated.ScrollView
          ref={list.ref}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: LIST_FOOT }}
          // Moved by the deck's pull, never on its own: one swipe, one owner.
          scrollEnabled={false}
          onContentSizeChange={(_, height) => setContent(height)}
          showsVerticalScrollIndicator
        >
        {active.items.map((it, i) => {
          const mark = cardMark(state, i);
          const color = FAMILY[itemFamily(it)].mark;
          const done = mark === "done";
          const current = i === active.cursor;
          // Read at a glance: done is a solid band in its clay, struck
          // through, with a tick; the one you are on is white with an
          // outline and says so; the rest are plain.
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${cardName(state, i)}. ${current ? "You are here. " : ""}${done ? "Done" : "Not done"}`}
              onPress={() => onPick(i)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                height: row,
                marginBottom: ROW.gap,
                paddingHorizontal: 12,
                borderRadius: radii.button,
                borderWidth: 2,
                borderColor: current ? colors.text : "transparent",
                // Done: a solid band in the exercise's own clay.
                backgroundColor: pressed ? colors.line : current ? colors.bg : done ? CLAY_TONE[itemFamily(it)].card : "transparent",
              })}
            >
              <CardDot mark={mark} color={color} size={18} />
              <WholeText
                least={0.8}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: current ? fonts.semibold : fonts.regular,
                  fontSize: 19,
                  lineHeight: 22,
                  textDecorationLine: done && !current ? "line-through" : "none",
                }}
              >
                {cardName(state, i)}
              </WholeText>
              {current ? (
                <Text style={{ color: colors.text, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Now</Text>
              ) : done ? (
                <Icon name="check" size={20} color={colors.text} />
              ) : null}
            </Pressable>
          );
        })}
        {/* The end card: where you finish, reachable from here like any other. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Finish. ${active.cursor >= active.items.length ? "You are here." : ""}`}
          onPress={() => onPick(active.items.length)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            height: row,
            marginBottom: ROW.gap,
            paddingHorizontal: 12,
            borderRadius: radii.button,
            borderWidth: 2,
            borderColor: active.cursor >= active.items.length ? colors.text : "transparent",
            backgroundColor: pressed ? colors.line : active.cursor >= active.items.length ? colors.bg : "transparent",
          })}
        >
          <View style={{ width: 18, alignItems: "center" }}>
            <Icon name="check" size={18} color={colors.text} />
          </View>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>
            Finish
          </Text>
        </Pressable>
        </Reanimated.ScrollView>
        <Reanimated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36 }, more]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="listFoot" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.panel} stopOpacity={0} />
                <Stop offset="1" stopColor={colors.panel} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#listFoot)" />
          </Svg>
        </Reanimated.View>
        </View>
        {/* Always clear of the list: a fixed gap above the way out. */}
        <View style={{ paddingHorizontal: 8, paddingTop: 16, paddingBottom: 30, height: LEAVE_AREA }}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Your workout is kept: carry on with it from Next up."
            onPress={onLeave}
            style={({ pressed }) => ({
              minHeight: 60,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.button,
              backgroundColor: colors.text,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: colors.bg, fontFamily: fonts.semibold, fontSize: 21 }}>Leave for now</Text>
          </Pressable>
        </View>
      </Reanimated.View>

      {/* The grab bar: this card pulls down. */}
      <View
        style={{
          position: "absolute",
          bottom: 6,
          alignSelf: "center",
          width: 40,
          height: 5,
          borderRadius: 3,
          backgroundColor: colors.text,
          opacity: 0.25,
          pointerEvents: "none",
        }}
      />
    </Reanimated.View>
  );
}

/**
 * One card of the row, in full: the lift, the machine or the routine that is
 * "on screen" in the session it is given (see `Step`), with everything it
 * needs to be done there. Which card that is, and moving between them, is
 * the row's business — see `Deck`.
 */
function StepBody() {
  const { state, setState } = useSession();
  const barSpace = useBarSpace();
  const [swapping, setSwapping] = useState(false);
  const [anywhere, setAnywhere] = useState(false);
  const [guiding, setGuiding] = useState(false);
  // How to warm up, opened from the line under the name.
  const [warming, setWarming] = useState(false);
  // The ⋯ menu, open under the button it came from.
  const [menu, setMenu] = useState<Anchor | null>(null);
  const root = useRef<View>(null);
  // The card's room and what its lift needs: when the lift outgrows the room,
  // the card draws it tight — and stays tight, so it never jumps back and forth.
  const [room, setRoom] = useState(0);
  const [fill, setFill] = useState(0);
  const [tightened, setTightened] = useState(false);
  // Room to spare, given back as space between the weight, the circles, the
  // clock and the words under them, rather than left at the foot — up to
  // `SPREAD.most`. What the lift needs on its own is what was measured less
  // what was given, so giving never feeds back into the measuring.
  const [spread, setSpread] = useState(0);
  const needs = fill - spread;
  // How much the gaps and the weight have given way, 1 for not at all.
  const [squeeze, setSqueeze] = useState(1);
  useEffect(() => {
    if (room <= 0 || fill <= 0) return;
    if (needs > room + 1) setTightened(true);
    const want = Math.max(0, Math.min(SPREAD.most, room - needs));
    if (Math.abs(want - spread) > 2) setSpread(want);
  }, [room, fill, needs, spread]);
  // The weight, while it is being changed, closes on a tap anywhere else.
  const tapAway = useRef<TapAway>({ close: null, inside: false });
  // The exercise whose note is open — this lift's, or its superset partner's.
  const [noting, setNoting] = useState<string | null>(null);
  // A chain's steps, all of them, with yours marked: one tap to go to any.
  const [stepsOpen, setStepsOpen] = useState(false);
  // What sits under the name — a word in italics, your note — measured, so
  // the gap above the weight gives way to it rather than the circles moving.
  const [underName, setUnderName] = useState<number | null>(null);

  const active = state.active;
  const done = !active || isComplete(state);

  // A lift done well gets its moment — see `useCheer` — and a send-off on
  // Next. Reduce Motion keeps the buzzes and drops the movement.
  const { cheer, well } = useCheer(state);
  const still = useReduceMotion();
  // Leaving a lift done well: a light passes over the button that comes up
  // under your thumb — see `SendOff`. It stands for a second, then is spent.
  const [glint, setGlint] = useState(0);
  useEffect(() => {
    if (!glint) return;
    const spent = setTimeout(() => setGlint(0), 1000);
    return () => clearTimeout(spent);
  }, [glint]);
  const sendOff = still ? 0 : glint;

  // What the gaps and the weight came to on this draw (set further down,
  // once the card's layout is known) — read once it is on screen.
  const squeezing = useRef<{ given: number; all: number; solo: boolean } | null>(null);
  squeezing.current = null;
  useEffect(() => {
    const at = squeezing.current;
    if (!at || room <= 0 || fill <= 0) return;
    const rest = needs - at.given;
    const want = at.solo ? 1 : Math.min(1, Math.max(SQUEEZE_LEAST, (room - rest) / at.all));
    if (Math.abs(want - squeeze) > 0.01) setSqueeze(want);
  });

  // Past the last card there is nothing to draw here: the row's end card is its own.
  if (done) return null;


  const item = active.items[active.cursor];
  const motion = cheer && !still ? cheer : null;

  // A goal's step is its own screen too: circles like a lift's, but the
  // step you are on where the weight would be. See `GoalBlock`.
  if (isGoal(item)) {
    return (
      <OnField family="goal" sendOff={sendOff}>
        <GoalBlock
          key={item.slot}
          item={item}
          motion={motion}
          onNext={(practised) => {
            if (well) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGlint((g) => g + 1);
            }
            setState((s) => completeGoal(s, practised));
          }}
        />
      </OnField>
    );
  }

  // Cardio and mobility are their own screens: no weight, no rep circles and
  // no rep ladder. They still sit inside the same session, so the bar's Back,
  // Leave and Skip work on them exactly as on a lift. Each is drawn on its
  // family's colour, like a lift.
  if (isMobility(item)) {
    return (
      <OnField family="mobility" sendOff={sendOff}>
        {/* Ink on white, not the dusk card's cream: see `CLAY_CARD`. */}
        <ClayField>
          <Mobility key={item.slot} item={item} />
        </ClayField>
      </OnField>
    );
  }
  if (isConditioning(item)) {
    return (
      <OnField family="cardio" sendOff={sendOff}>
        <Conditioning key={item.slot} item={item} />
      </OnField>
    );
  }

  const family = itemFamily(item);
  // This screen sits on the family's colour: see `fieldColors`.
  const colors = fieldColors(family);

  const p = currentPrescription(state)!;
  const partner = item.supersetWith ? byId(item.supersetWith) : undefined;
  // The partner keeps its own scheme, set count and set log when folded in.
  const partnerP = partnerPrescription(state);
  // A lift that will ask how it felt is drawn tight from its first set, so the
  // question arriving changes nothing else on the card.
  const L = partner ? LAYOUT.paired : willAskFeel(state) || tightened ? LAYOUT.tight : LAYOUT.solo;

  const warmup = currentWarmup(state);
  // Always offered — the library is in reach, so there is something to swap
  // to. After sets are logged the sheet says first that they won't be kept.
  const pool = currentPool(state);
  // With "Any exercise" at the foot of the list, there is always something.
  const canSwap = true;
  const setsIn = item.logged.filter((r) => r !== null).length;
  // A step on the way to a pull-up or a push-up: which, and whether it is owned.
  const step = stepHere(state);

  // Your note on this lift: shown under the name until you change it.
  const myNote = noteFor(state, p.exercise.id);
  const noteSheet = (
    <NoteSheet
      visible={noting !== null}
      id={noting ?? p.exercise.id}
      name={byId(noting ?? p.exercise.id)?.name ?? ""}
      onClose={() => setNoting(null)}
    />
  );

  // The ramp up to the working weight: a reminder under the name, its
  // numbers a tap away (see `WarmupSheet`), so the card stays clear. Gone
  // once the first working set is in: it has done its job.
  const rampLine = warmup.length > 0 && !item.logged.some((r) => r !== null) ? "Warm up first" : "";

  // Moving on is always your call — a swipe — so filling the last circle
  // changes nothing but the line at the foot of the card, and a rep or a
  // weight can still be fixed before you go.
  const logged = allSetsLogged(state);
  const after = nextItemName(state);
  // Said before you move on, so what happens next time is never a surprise:
  // a line with some attitude, and the plain fact under it. It updates as
  // you correct a circle.
  const verdict = nextTime(state);
  // A lift Klay is still learning: once every set is in, it asks how it felt.
  const asking = !partner && asksFeel(state);
  const result = verdict
    ? {
        ...verdict,
        quip: pickLine(OUTCOME_LINES[verdict.say], `${active.startedAt}:${active.cursor}`),
      }
    : null;

  // Said in italics under the name, where it applies.
  const note = [
    p.reload ? "reload" : null,
    p.exercise.timed ? "seconds, not reps" : null,
    item.derive
      ? `${Math.round(item.derive.fraction * 100)}% of ${inSentence(byId(item.derive.from)!.name)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Opens the ⋯ menu under its button, in this screen's coordinates.
  const openMenu = (button: View) => {
    // Opened by a tap on the name: learned, its hint never comes again.
    setState((s) => seeTip(s, "menu"));
    button.measureInWindow((x, y, width, height) =>
      root.current?.measureInWindow((rx, ry) => setMenu({ x: x - rx, y: y - ry, width, height })),
    );
  };
  const tools: Tool[] = [
    { icon: "info", label: "How to do it", onPress: () => setGuiding(true) },
    canSwap ? { icon: "swap", label: "Swap for today", onPress: () => setSwapping(true) } : null,
    step ? { icon: "plan", label: "All steps", onPress: () => setStepsOpen(true) } : null,
    !myNote ? {
      icon: "note",
      label: "Add a note",
      onPress: () => setNoting(p.exercise.id),
    } : null,
  ].filter((t): t is Tool => t !== null);

  // Before it is measured, a fair guess at what sits under the name.
  const under = underName ?? (note ? 28 : 0) + (myNote ? 39 : 0) + (rampLine ? 26 : 0) + (step ? 76 : 0);
  // When the tight layout still does not fit, the parts that can give way —
  // the gaps and the weight — take a smaller real size, together, by just
  // enough; the circles and the words keep theirs. Laid out, never scaled as
  // a picture, so nothing is ever blurred. What the rest needs is what was
  // measured less what gives way, so squeezing never feeds back into it.
  const gives = {
    weight: note || myNote || rampLine ? Math.max(10, L.weight - under) : L.weight,
    number: L.number,
    sets: L.sets,
    clock: 14,
    under: L.underGap,
  };
  const givesAll = gives.weight + gives.number + (UNIT_BELOW ? UNIT_ROOM : 0) + gives.sets + gives.clock + gives.under;
  const numberSize = Math.round(gives.number * squeeze);
  const given =
    gives.weight * squeeze + numberSize + (UNIT_BELOW ? UNIT_ROOM : 0) * squeeze + (gives.sets + gives.clock + gives.under) * squeeze;
  squeezing.current = { given, all: givesAll, solo: L === LAYOUT.solo };

  return (
    <OnField family={family} sendOff={sendOff}>
    <View
      ref={root}
      onStartShouldSetResponderCapture={() => {
        const away = tapAway.current;
        if (away.close) {
          away.inside = false;
          // Once the touch has reached whatever it landed on, which marks it
          // if it landed on the weight.
          Promise.resolve().then(() => {
            if (!away.inside) away.close?.();
          });
        }
        return false;
      }}
      style={{ flex: 1, backgroundColor: colors.ground }}
    >
      <Header showRest />

      <Fit
        // On a card it never moves: a pull down opens the workout's track.
        // It fits instead — `LAYOUT.tight` first, then `Fit` draws it smaller.
        // With the number pad up, a tap on a circle or − and + still counts.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 8,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
        }}
      >
        {item.placing && step ? (
          <PlaceOnChain
            chain={step.chain}
            family={family}
            onPlace={(at) => setState((s) => goToStep(s, at))}
          />
        ) : (
        <>
        <LiftTitle
          family={family}
          name={p.exercise.name}
          gear={gearOf(p.exercise)}
          onMore={openMenu}
          style={{ marginTop: L.name }}
        >
          {note || myNote || rampLine || step ? (
            <View onLayout={(e) => setUnderName(e.nativeEvent.layout.height)}>
              {step ? (
                <StepLine
                  chain={step.chain}
                  at={step.at}
                  owned={step.owned}
                  onAll={() => setStepsOpen(true)}
                  onStep={(at) => setState((s) => goToStep(s, at))}
                />
              ) : null}
              {rampLine ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Warm up first. How?"
                  hitSlop={10}
                  onPress={() => setWarming(true)}
                  style={({ pressed }) => ({ marginTop: 4, alignSelf: "center", opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.ui, fontSize: 16, lineHeight: 22 }}>
                    {rampLine}
                    {" · "}
                    <Text style={{ textDecorationLine: "underline" }}>How?</Text>
                  </Text>
                </Pressable>
              ) : null}
              {note ? (
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 4,
                    textAlign: "center",
                    color: colors.text,
                    fontFamily: fonts.italic,
                    fontSize: 19,
                  }}
                >
                  {note}
                </Text>
              ) : null}
              {myNote ? (
                <View style={{ paddingTop: 8 }}>
                  <NoteLine
                    text={myNote}
                    lines={partner ? 1 : 2}
                    center
                    onPress={() => setNoting(p.exercise.id)}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </LiftTitle>

        {/* The lift itself — weight, sets, what they mean — sits in the
            middle of what the card has left, rather than hanging off the name. */}
        <View
          style={{ flex: 1, justifyContent: "center", paddingBottom: 16 }}
          onLayout={(e) => setRoom(e.nativeEvent.layout.height - 16)}
        >
          {/* What the lift needs, measured apart from the room it is given. */}
          <View onLayout={(e) => setFill(e.nativeEvent.layout.height)}>
        <View
          style={{
            height: numberSize + (UNIT_BELOW ? UNIT_ROOM : 0) * squeeze,
            marginTop: gives.weight * squeeze + spread * SPREAD.weight,
            justifyContent: "center",
          }}
        >
          {p.exercise.unloaded ? (
            <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 24 }}>
              No weight — just the reps
            </Text>
          ) : item.derive ? (
            // Taken from the heavy day's weight, so there is nothing to edit.
            <View style={{ alignItems: "center" }}>
              <Weight weight={p.weight} unit={unitFor(p.exercise, p.weight)} size={numberSize} />
            </View>
          ) : (
            <WeightControl
              key={item.slot}
              weight={p.weight}
              bodyweight={p.exercise.bodyweight}
              holds={p.exercise.holds}
              perHand={p.exercise.perHand}
              size={numberSize}
              tapAway={tapAway}
              onNudge={(d) => setState((s) => nudgeWeight(s, d))}
              onSet={(w) => setState((s) => editWeight(s, w))}
            />
          )}
        </View>

        <View style={{ marginTop: gives.sets * squeeze + spread * SPREAD.sets }}>
          {p.exercise.timed ? (
            <HoldSets
              logged={item.logged}
              target={p.reps}
              role={partner ? "main" : "solo"}
              cheer={motion?.id ?? null}
              burst={motion?.big ? family : null}
              hold={holdOn(state, "main")}
              onStart={(i) => setState((s) => startHold(s, "main", i, Date.now()))}
              onStop={() => setState((s) => stopHold(s, Date.now()))}
              onCancel={() => setState((s) => cancelHold(s))}
              onTap={(i) => setState((s) => tapSet(s, i))}
              onReset={(i) => setState((s) => skipSet(s, i))}
            />
          ) : (
            <Sets
              logged={item.logged}
              target={p.reps}
              role={partner ? "main" : "solo"}
              cheer={motion?.id ?? null}
              burst={motion?.big ? family : null}
              onTap={(i) => setState((s) => tapSet(s, i))}
              onReset={(i) => setState((s) => skipSet(s, i))}
            />
          )}
        </View>

        {/* The rest between sets: from the first set until the last. Its room
            is always there, so the clock arriving moves nothing. */}
        <View style={{ height: REST_CLOCK_HEIGHT, marginTop: gives.clock * squeeze + spread * SPREAD.clock }}>
          {item.logged.some((r) => r !== null) && item.logged.some((r) => r === null) && !state.active?.hold ? (
            <RestClock since={state.active?.lastSetAt} />
          ) : null}
        </View>

        {/* At least this tall, so a line arriving moves nothing — but never
            capped: a two-line remark and the next-time line under it must
            both show in full, never clipped. */}
        <View style={{ minHeight: !partner && willAskFeel(state) ? FEEL_ROOM : L.under, marginTop: gives.under * squeeze + spread * SPREAD.under }}>
          <Why
            prescription={p}
            result={logged ? result : null}
            feel={asking ? { said: item.feel, onSay: (f) => setState((s) => setFeel(s, f)) } : null}
            started={item.logged.some((r) => r !== null)}
            compact={!!partner}
            glow={motion?.big ? motion.id : null}
          />
        </View>

        {partner && partnerP && item.supersetLogged ? (
          <Partner
            id={partner.id}
            name={partner.name}
            cue={partner.cue}
            weight={partner.unloaded ? "No weight" : weightLabel(partner, partnerP.weight)}
            sets={partnerP.sets}
            target={partnerP.reps}
            timed={partner.timed}
            note={noteFor(state, partner.id)}
            onNote={() => setNoting(partner.id)}
            logged={item.supersetLogged}
            onTap={(i) => setState((s) => tapSet(s, i, "partner"))}
            onReset={(i) => setState((s) => skipSet(s, i, "partner"))}
            hold={{
              clock: holdOn(state, "partner"),
              onStart: (i) => setState((s) => startHold(s, "partner", i, Date.now())),
              onStop: () => setState((s) => stopHold(s, Date.now())),
              onCancel: () => setState((s) => cancelHold(s)),
            }}
            onRemove={() => setState((s) => removeSuperset(s))}
          />
        ) : null}
          </View>
        </View>
        </>
        )}
      </Fit>

      {/* The way on: a swipe, or once every circle is filled, a button
          saying where to. Its room is always there, so it arriving moves nothing. */}
      <View style={{ height: 52, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginBottom: barSpace + 6 }}>
        {logged ? (
          <NextButton
            next={after}
            onPress={() => setState((s) => (s.active ? seeTip(goToCard(s, s.active.cursor + 1), "swipe") : s))}
          />
        ) : null}
      </View>

      {menu ? <ToolsMenu anchor={menu} tools={tools} onClose={() => setMenu(null)} /> : null}

      <GuideSheet
        visible={guiding}
        id={p.exercise.id}
        name={p.exercise.name}
        cue={p.exercise.cue}
        onClose={() => setGuiding(false)}
      />
      {step ? (
        <StepsSheet
          visible={stepsOpen}
          chain={step.chain}
          at={step.at}
          onClose={() => setStepsOpen(false)}
          onStep={(at) => {
            setStepsOpen(false);
            setState((s) => goToStep(s, at));
          }}
        />
      ) : null}
      <Sheet visible={swapping} title="Swap for today" onClose={() => { setSwapping(false); setAnywhere(false); }}>
        {setsIn > 0 ? (
          // On the sheet's white, so the app's own navy, not this field's.
          <Text style={{ color: paper.text, fontSize: 17, lineHeight: 24, paddingBottom: 14 }}>
            {`You've done ${setsIn} ${setsIn === 1 ? "set" : "sets"} of ${p.exercise.name}. The new one starts from set 1, and ${setsIn === 1 ? "that set won't" : "those sets won't"} be saved.`}
          </Text>
        ) : null}
        {anywhere ? (
          <SwapBrowser
            exercises={swapAnywhere(state).filter((e) => e.id !== item.exerciseId)}
            inIt={currentTaken(state)}
            note={atGym(state) ? undefined : "Only what you have where you train with this plan. Change that in Settings, Your plans."}
            onPick={(id) => {
              setSwapping(false);
              setAnywhere(false);
              setState((s) => swapForSession(s, id));
            }}
            onBack={() => setAnywhere(false)}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <SwapList
              options={pool}
              taken={currentTaken(state)}
              current={item.exerciseId}
              onPick={(id) => {
                setSwapping(false);
                setState((s) => swapForSession(s, id));
              }}
            />
            <AnyExerciseRow onPress={() => setAnywhere(true)} />
          </View>
        )}
      </Sheet>
      {noteSheet}
      <WarmupSheet
        visible={warming}
        exercise={p.exercise}
        sets={warmup}
        onClose={() => setWarming(false)}
      />
    </View>
    </OnField>
  );
}

/**
 * How to warm up for this lift, in plain words: a couple of lighter rounds
 * before the first real one, with this lift's own numbers. They are never
 * logged and change nothing.
 */
function WarmupSheet({
  visible,
  exercise,
  sets,
  onClose,
}: {
  visible: boolean;
  exercise: Exercise;
  sets: WarmupSet[];
  onClose: () => void;
}) {
  const what = (weight: number) => (exercise.perHand ? `${weight} kg in each hand` : `${weight} kg`);
  return (
    <Sheet visible={visible} title="Warm up first" closeLabel="Done" onClose={onClose} swipeToDismiss>
      <View style={{ gap: 22, paddingTop: 8 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 27 }}>
          Before your first real round, do {sets.length === 2 ? "two" : sets.length === 3 ? "three" : "a few"} lighter
          ones. They wake up the muscles and let you feel the movement. They don&apos;t count, so don&apos;t tap a circle.
        </Text>
        <View style={{ gap: 12 }}>
          {sets.map((w, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "baseline", gap: 14, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 21 }}>{what(w.weight)}</Text>
              <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 19 }}>{w.reps} times</Text>
            </View>
          ))}
        </View>
        <Text style={{ color: colors.muted, fontFamily: fonts.italic, fontSize: 18, lineHeight: 25 }}>
          Rest a moment between them. Then start your real rounds.
        </Text>
      </View>
    </Sheet>
  );
}

/**
 * The send-off for a lift done well, while it stands: whichever button comes
 * up under your thumb after Next — the next lift's, its warm-up's Ready,
 * cardio's Done, the stretches' — has a light pass over it. See `Glint`.
 */
const SendOff = createContext(0);

/**
 * Draws everything inside on the family's colour, with the status bar to
 * match: light over the dark fields, dark over the light ones.
 */
function OnField({
  family,
  sendOff = 0,
  children,
}: PropsWithChildren<{ family: Family; sendOff?: number }>) {
  // A card sits under the row's white header, so the status bar stays dark.
  const onCard = useOnCard();
  return (
    <Field family={family}>
      {onCard ? null : <StatusBar style="dark" />}
      <SendOff.Provider value={sendOff}>{children}</SendOff.Provider>
    </Field>
  );
}

/**
 * Where you are in the session: the workout's name and how far in, the rest
 * since your last set, and one segment per block — the current one at full
 * strength, the ones behind you a step down.
 *
 * Shared by the lifting screen and the conditioning ones so the bar of
 * progress does not jump or reset when the session moves between them.
 */
function Header({ showRest = false }: { showRest?: boolean }) {
  const colors = useColors();
  const { state } = useSession();
  const insets = useSafeAreaInsets();
  const onCard = useOnCard();
  const active = state.active;
  // On a card of the row the session's header is the row's own: `DeckHeader`.
  if (!active || onCard) return null;

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 22 }}>
      <Column>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 32 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>
            {currentWorkout(state).name}
            {"  "}
            <Text style={{ fontFamily: fonts.italic }}>
              {exerciseCount(state, "done") + 1}/{exerciseCount(state, "total")}
            </Text>
          </Text>
        </View>

        {/* The day's shape: one segment per exercise in its family's colour,
            filling in as you go and pale until you get there. Weighted — a
            paired screen holds two exercises, so it is twice as wide and the
            total never changes when you superset. On a white track, since
            the family colours sit too close to each other to read on a
            field; on white each one keeps its hue and 3:1. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: 2, marginTop: 10, padding: 2, borderRadius: 4, backgroundColor: colors.white }}
        >
          {active.items.map((it, i) => (
            <View
              key={i}
              style={{
                flex: it.supersetWith ? 2 : 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: FAMILY[itemFamily(it)].mark,
                opacity: i <= active.cursor ? 1 : 0.28,
              }}
            />
          ))}
        </View>
      </Column>
    </View>
  );
}

/** A name on a card, in Bebas. */
const TITLE_SIZE = 44;
/** The gear's icon at the start of a card's title row. */
const GEAR_ICON = 30;
/** The round ⋯ button in the card's top-right corner. */
const MORE_BUTTON = 44;

/**
 * The lift's name, centred over the number and circles below it. On a card:
 * one row: the gear's icon, the name in the display face — "DB", "KB" and
 * "BB" kept, so a dumbbell bench and a barbell bench stay two lifts — and a
 * round ⋯ button, the one way into the menu. Off a card, one button: the
 * shape, the name and ⋯.
 * Under it, whatever applies (a word in italics, your note).
 */
function LiftTitle({
  family,
  name,
  gear = null,
  onMore,
  style,
  children,
}: PropsWithChildren<{
  family: Family;
  name: string;
  /** The gear shown at the start of the row on a card. */
  gear?: Pictured | null;
  /** Opens the menu under the ⋯, which is handed over to anchor it. */
  onMore: (button: View) => void;
  style?: ViewStyle;
}>) {
  const colors = useColors();
  const more = useRef<View>(null);
  const onCard = useOnCard();
  if (onCard) {
    // One row, on one centre line: the gear, the name, the ⋯. The gear's
    // place is kept even when there is none, so the name stays centred.
    // The name is always whole: a long one comes down in size, then takes
    // two lines, and the card's height never changes.
    return (
      <View style={style}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: MORE_BUTTON, height: MORE_BUTTON, alignItems: "center", justifyContent: "center" }}>
            {gear ? <GearIcon gear={gear} size={GEAR_ICON} color={colors.text} /> : null}
          </View>
          {/* Bebas's capitals sit high in its line (ascent 0.9, descent 0.3,
              capitals 0.7 of its size): on its own full line, with the
              capitals' middle brought down by the 0.05 they sit above it,
              they line up with the gear and the ⋯. */}
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={fullName(name)}
            style={{ flex: 1, marginTop: TITLE_SIZE * 0.05, marginBottom: -TITLE_SIZE * 0.05 }}
          >
            <WholeText
              least={0.75}
              style={{ textAlign: "center", color: colors.text, fontFamily: fonts.display, fontSize: TITLE_SIZE, lineHeight: Math.round(TITLE_SIZE * 1.2) }}
            >
              {name}
            </WholeText>
          </View>
          {/* A little bump of cream clay, the one way into the menu; pressed, it gives in. */}
          <Pressable
            ref={more}
            accessibilityRole="button"
            accessibilityLabel={`More for ${name}`}
            accessibilityHint="How to do it, swap it, a note and more."
            hitSlop={8}
            onPress={() => more.current && onMore(more.current)}
            style={({ pressed }) => ({
              width: MORE_BUTTON,
              height: MORE_BUTTON,
              borderRadius: MORE_BUTTON / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? colors.raised : CLAY_LOOK.well,
              boxShadow: pressed ? CLAY_LOOK.dent : CLAY_LOOK.bump,
            })}
          >
            <Icon name="more" size={20} color={colors.text} />
          </Pressable>
        </View>
        {children}
      </View>
    );
  }
  return (
    <View style={style}>
      {/* One button, the whole title: the name and the ⋯ that says a tap opens more. */}
      <Pressable
        ref={more}
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint="Opens more for this exercise."
        onPress={() => more.current && onMore(more.current)}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 44, borderRadius: radii.card, backgroundColor: pressed ? colors.surface : "transparent" })}
      >
        <Mark family={family} size={24} color={colors.text} />
        <WholeText
          accessibilityRole="header"
          style={{
            flexShrink: 1,
            textAlign: "center",
            color: colors.text,
            fontFamily: fonts.display,
            fontSize: 27,
            lineHeight: 33,
          }}
        >
          {name}
        </WholeText>
        <Icon name="more" size={20} color={colors.text} />
      </Pressable>
      {children}
    </View>
  );
}

/**
 * The way on once a card is done: "Swipe for lateral raise", the quietest
 * thing on the card — a reminder, not a button to look for. A tap does the
 * same as the swipe. It fades in, so it arriving reads as the card being done.
 */
function NextButton({ next, onPress }: { next: string | null | undefined; onPress: () => void }) {
  const colors = useColors();
  return (
    <Reanimated.View entering={FadeIn.duration(220)} style={{ maxWidth: "100%" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={next ? `Next: ${next}` : "Finish the workout"}
        hitSlop={12}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.3 : 0.55 })}
      >
        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 16 }}>
          {next ? `Swipe for ${inSentence(next)}` : "Swipe to finish"}
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

/** Where the ⋯ is on screen, so its menu opens under it. */
type Anchor = { x: number; y: number; width: number; height: number };
type Tool = { icon: IconName; label: string; onPress: () => void };

/**
 * What used to sit in round buttons around the lift — how-to, swap, a note,
 * a superset — in one small card off the ⋯. Each is wanted once a session at
 * most, so they wait a tap away rather than crowd the weight and circles.
 * White whatever the field, like the sheets they open; a tap anywhere else
 * closes it.
 */
function ToolsMenu({
  anchor,
  tools,
  onClose,
}: {
  anchor: Anchor;
  tools: Tool[];
  onClose: () => void;
}) {
  const { width: screen } = useWindowDimensions();
  const shown = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(shown, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shown]);

  const width = 250;
  // Its right edge on the button's, kept inside the screen's margins.
  const left = Math.max(22, Math.min(screen - 22 - width, anchor.x + anchor.width - width));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Close menu"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        accessibilityViewIsModal
        style={{
          position: "absolute",
          top: anchor.y + anchor.height + 8,
          left,
          width,
          paddingVertical: 6,
          borderRadius: 22,
          borderCurve: "continuous",
          backgroundColor: colors.bg,
          boxShadow: "0 10px 30px rgba(8, 28, 60, 0.28)",
          opacity: shown,
          transformOrigin: "top right",
          transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        {tools.map((tool, i) => (
          <View key={tool.label}>
            {i > 0 ? (
              <View
                style={{ height: StyleSheet.hairlineWidth, marginLeft: 52, backgroundColor: colors.line }}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                tool.onPress();
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                minHeight: 52,
                paddingHorizontal: 18,
                backgroundColor: pressed ? colors.surface : "transparent",
              })}
            >
              <Icon name={tool.icon} size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontFamily: fonts.ui, fontSize: 18 }}>
                {tool.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * What the number is in: "kg"; "kg / hand" for a dumbbell in each hand; "kg
 * added" on a bodyweight lift with a belt or a dumbbell; "kg assist" where a
 * negative number is the machine's help, so it never reads as an error; and
 * "s hold" on a lift that progresses by holding, where it is seconds.
 */
function unitFor(
  { perHand, bodyweight, holds }: { perHand?: boolean; bodyweight?: boolean; holds?: boolean },
  weight: number,
) {
  if (holds) return "s hold";
  return [
    "kg",
    perHand ? "/ hand" : null,
    weight < 0 ? "assist" : bodyweight && weight > 0 ? "added" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The weight and its unit, on one baseline. */
function Weight({
  weight,
  unit,
  size,
  line,
  faint,
  caret,
}: {
  /** A number, or what is being typed in its place. */
  weight: number | string;
  unit: string;
  size: number;
  /** Can be changed: dashes under the figures, a solid line while it is being changed. */
  line?: "dashed" | "solid";
  /** Held back like a placeholder: the weight before you type a new one. */
  faint?: boolean;
  /** Being typed: where the caret blinks. */
  caret?: "start" | "end";
}) {
  const colors = useColors();
  const text = String(weight);
  // A five-character weight (102.5) is set a size down, so it and its unit
  // still fit between the steppers.
  const fit = text.length > 4 ? Math.round(size * 0.84) : size;
  if (UNIT_BELOW) {
    // Spelled out, now it has a line of its own: "kg per hand", "seconds".
    const said = unit === "s hold" ? "seconds" : unit.replace("/ hand", "per hand");
    return (
      <View style={{ alignItems: "center" }}>
        <Underline size={fit} line={line} caret={caret}>
          <Text
            style={{
              color: colors.text,
              opacity: faint ? 0.4 : 1,
              fontFamily: fonts.semibold,
              fontSize: fit,
              lineHeight: fit,
              letterSpacing: -fit * 0.02,
              fontVariant: ["lining-nums", "tabular-nums"],
            }}
          >
            {text}
          </Text>
        </Underline>
        <Text ui style={{ marginTop: Math.round(fit * 0.14), color: colors.text, opacity: 0.8, fontSize: 16, lineHeight: 20 }}>
          {said}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
      <Underline size={fit} line={line} caret={caret}>
        <Text
          style={{
            color: colors.text,
            opacity: faint ? 0.4 : 1,
            fontFamily: fonts.semibold,
            fontSize: fit,
            letterSpacing: -fit * 0.02,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {text}
        </Text>
      </Underline>
      <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>{unit}</Text>
    </View>
  );
}

/**
 * Under whatever it wraps, as wide as it is and just below the baseline: a
 * row of short dashes, which says a number can be changed without drawing a
 * box round it, or a solid line while it is being changed. With a caret, the
 * text is being typed.
 */
function Underline({
  size,
  line,
  caret,
  children,
}: PropsWithChildren<{ size: number; line?: "dashed" | "solid"; caret?: "start" | "end" }>) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const dash = 9;
  const gap = 5;
  const count = Math.max(1, Math.floor((width + gap) / (dash + gap)));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {children}
      {line && width > 0 ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // The figures stand almost on the bottom of the line: this puts
            // the line a small gap under them.
            bottom: -Math.round(size * 0.07),
            flexDirection: "row",
            justifyContent: "space-between",
            opacity: line === "solid" ? 1 : 0.35,
          }}
        >
          {line === "solid" ? (
            <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.text }} />
          ) : (
            Array.from({ length: count }, (_, i) => (
              <View
                key={i}
                style={{ width: dash, height: 2, borderRadius: 1, backgroundColor: colors.text }}
              />
            ))
          )}
        </View>
      ) : null}
      {caret ? <Caret size={size} at={caret} /> : null}
    </View>
  );
}

/** The text cursor, blinking the way iOS's does: before a placeholder, after typing. */
function Caret({ size, at }: { size: number; at: "start" | "end" }) {
  const colors = useColors();
  const on = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const step = (toValue: number) =>
      Animated.timing(on, { toValue, duration: 0, useNativeDriver: true });
    const blink = Animated.loop(
      Animated.sequence([Animated.delay(530), step(0), Animated.delay(530), step(1)]),
    );
    blink.start();
    return () => blink.stop();
  }, [on]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        [at === "start" ? "left" : "right"]: -Math.max(5, Math.round(size * 0.06)),
        bottom: Math.round(size * 0.02),
        width: Math.max(2, Math.round(size * 0.03)),
        height: Math.round(size * 0.7),
        borderRadius: 2,
        backgroundColor: colors.text,
        opacity: on,
      }}
    />
  );
}

/** The saved target and one result field, using the shared card title and menu. */
function Conditioning({ item }: { item: Item }) {
  const colors = useColors();
  const barSpace = useBarSpace();
  const { state, setState } = useSession();
  const [swapping, setSwapping] = useState(false);
  const [noting, setNoting] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const root = useRef<View>(null);
  const cardio = currentCardio(state);
  const pool = conditioningPool(state, item);
  const note = cardio ? noteFor(state, cardio.id, "cardio") : "";
  if (!cardio) return null;
  const clockOnly = onTheClock(cardio);
  const target = item.course !== undefined ? `${item.course} ${cardio.metric.unit}` : `${item.minutes} min`;
  const effort = EFFORT[cardioEnd(item) === "open" ? "open" : "close"];
  const amount = item.course !== undefined
    ? { value: `${item.course}`, unit: cardio.metric.unit }
    : { value: `${item.minutes}`, unit: "min" };
  const openMenu = (button: View) => {
    Keyboard.dismiss();
    button.measureInWindow((x, y, width, height) => root.current?.measureInWindow((rx, ry) => setMenu({ x: x - rx, y: y - ry, width, height })));
  };
  const tools: Tool[] = [
    { icon: "info", label: "How to do it", onPress: () => setGuiding(true) },
    ...(pool.length > 1 ? [{ icon: "swap" as const, label: "Swap for today", onPress: () => setSwapping(true) }] : []),
    ...(!note ? [{ icon: "note" as const, label: "Add a note", onPress: () => setNoting(true) }] : []),
  ];

  return (
    <View ref={root} style={{ flex: 1, backgroundColor: colors.ground }}>
      <Header />
      <View style={{ flex: 1, paddingHorizontal: 22, width: "100%", maxWidth: COLUMN, alignSelf: "center" }}>
        <CardioKeyboardArea>
          <LiftTitle family="cardio" name={cardio.name} onMore={openMenu}>
            {note ? <View style={{ paddingTop: 8 }}><NoteLine text={note} lines={1} center onPress={() => setNoting(true)} /></View> : null}
          </LiftTitle>

          {clockOnly ? (
            // No machine to read a number off: just the minutes, counting
            // down, and how hard. Running out is done.
            <CardioClock
              minutes={item.minutes ?? CARDIO_MINUTES}
              clock={item.clock}
              ran={item.ran}
              onStart={() => setState((s) => startClock(s, Date.now()))}
              onPause={() => setState((s) => pauseClock(s, Date.now()))}
              onFinish={() => setState((s) => finishClock(s))}
            >
              <Text style={{ textAlign: "center", color: colors.muted, fontFamily: fonts.italic, fontSize: 18, lineHeight: 24, paddingHorizontal: 8 }}>{effort}</Text>
            </CardioClock>
          ) : (
            <>
              {/* What to do, as one thing to read: the amount set large in ink,
                  and how hard, in a line. No shape: no other card has one here. */}
              <View accessible accessibilityLabel={`Target: ${target}. ${effort}`} style={{ alignItems: "center", gap: 6, paddingHorizontal: 8 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 72, lineHeight: 82, fontVariant: ["lining-nums"] }}>
                  {amount.value}
                  <Text style={{ fontFamily: fonts.regular, fontSize: 30, color: colors.muted }}> {amount.unit}</Text>
                </Text>
                <Text style={{ textAlign: "center", color: colors.muted, fontFamily: fonts.italic, fontSize: 18, lineHeight: 24 }}>{effort}</Text>
              </View>

              <CardioResult key={`${cardio.id}:${item.course !== undefined ? "distance" : "time"}:${item.course ?? item.minutes}`}
                cardio={cardio} item={item} record={cardioRecord(state, item)} onSet={(v) => setState((s) => setScore(s, v))} />
            </>
          )}
        </CardioKeyboardArea>
      </View>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        {/* No Done: what you entered decides that it's done, and a swipe
            moves on. Once it's in, a quiet line says so — and works as a tap,
            for anyone who doesn't swipe. */}
        <Column style={{ minHeight: 60, justifyContent: "center" }}>
          {cardioDone(item) ? (
            <View style={{ alignItems: "center" }}>
              <NextButton
                next={nextItemName(state)}
                onPress={() => { Keyboard.dismiss(); setState((s) => completeCardio(s)); }}
              />
            </View>
          ) : null}
        </Column>
      </View>

      <Sheet visible={swapping} title="Swap for today" onClose={() => setSwapping(false)}>
        <CardioChoices options={pool} current={item.exerciseId} onPick={(id) => {
          setSwapping(false);
          if (id !== item.exerciseId) setState((s) => swapConditioning(s, id));
        }} />
      </Sheet>
      <GuideSheet visible={guiding} id={cardio.id} name={cardio.name} cue={cardio.cue} onClose={() => setGuiding(false)} />
      {menu ? <ToolsMenu anchor={menu} tools={tools} onClose={() => setMenu(null)} /> : null}
      <NoteSheet visible={noting} id={cardio.id} kind="cardio" name={cardio.name} onClose={() => setNoting(false)} />
    </View>
  );
}

/**
 * The mobility routine: its name and ⋯ like any card, then its moves as a
 * stack you work down — see `MobilityDeck`. Finishing it counts as done, all
 * of it held or not (`finishRoutine`).
 */
function Mobility({ item }: { item: Item }) {
  const barSpace = useBarSpace();
  const { state, setState } = useSession();
  const [swapping, setSwapping] = useState(false);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const more = useRef<View>(null);
  const root = useRef<View>(null);
  const colors = useColors();
  const routine = currentRoutine(state);
  const pool = conditioningPool(state, item);
  if (!routine) return null;
  const openMenu = () =>
    more.current?.measureInWindow((x, y, width, height) => root.current?.measureInWindow((rx, ry) => setMenu({ x: x - rx, y: y - ry, width, height })));
  // No How to do it: the card already shows the position and says how.
  const tools: Tool[] = pool.length > 1 ? [{ icon: "swap", label: "Swap for today", onPress: () => setSwapping(true) }] : [];
  const count = routine.moves.length;

  return (
    <View ref={root} style={{ flex: 1, backgroundColor: colors.ground }}>
      <Header />

      {/* Not a big title: the moves are the thing here. The routine is a
          line above them — its shape, its name, how many moves — saying
          this card is a set of steps, not one exercise. Where there is more
          (a swap), the whole line is the button, ⋯ at its end. */}
      <View style={{ paddingHorizontal: 22, paddingTop: 4 }}>
        <Column>
          <Pressable
            ref={more}
            disabled={!tools.length}
            accessibilityRole={tools.length ? "button" : "header"}
            accessibilityLabel={`${routine.name}, ${count} ${count === 1 ? "move" : "moves"}`}
            accessibilityHint={tools.length ? "Opens more for this routine." : undefined}
            onPress={openMenu}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 44,
              paddingHorizontal: 8,
              marginHorizontal: -8,
              borderRadius: radii.card,
              backgroundColor: pressed ? colors.surface : "transparent",
            })}
          >
            <Mark family="mobility" size={18} color={colors.text} />
            <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>
              {routine.name}
            </Text>
            <Text style={{ flex: 1, color: colors.muted, fontFamily: fonts.italic, fontSize: 17 }}>
              {count} {count === 1 ? "move" : "moves"}
            </Text>
            {tools.length ? (
              <Icon name="more" size={20} color={colors.text} />
            ) : null}
          </Pressable>
        </Column>
      </View>

      <Sheet visible={swapping} title="Swap for today" onClose={() => setSwapping(false)}>
        <ConditioningSwap
          options={pool}
          current={item.exerciseId}
          onPick={(id) => {
            setSwapping(false);
            setState((s) => swapConditioning(s, id));
          }}
        />
      </Sheet>

      {/* Keyed by routine and its holds: a swap, or an edit in Plan, deals a
          fresh deck with fresh timers. */}
      <MobilityDeck
        key={`${routine.id}:${routine.moves.map((m) => `${m.id}/${m.seconds}/${m.perSide ? 2 : 1}`).join(",")}`}
        routine={routine}
        barSpace={barSpace}
        completed={item.moves}
        steps={item.routineSteps}
        finished={item.finished}
        onStep={(i, status) => setState((s) => resolveRoutineStep(s, i, status))}
        // Finished is done, however much of it you held: see `finishRoutine`.
        onFinish={() => setState((s) => finishRoutine(s))}
      />
      {/* Last, so it sits over the cards. */}
      {menu ? <ToolsMenu anchor={menu} tools={tools} onClose={() => setMenu(null)} /> : null}
    </View>
  );
}

/**
 * A goal's step, on the goal's violet. Laid out like a lift so it reads at a
 * glance the same way: the drill's name with ⋯ beside it, the goal it is for
 * in italics, then — where a lift has its weight — the step you are on, with
 * the whole ladder in small under it. Then the work, and what it means:
 *
 * - reps are circles exactly like a lift's;
 * - holds are circles too, each its own clock — tap to start, it buzzes at
 *   the target, tap to stop early and log what you held;
 * - practice is one clock, and a button for when you've got it.
 *
 * Owning a step gets the lift's cheer with the goal's stars, and the line
 * under it says what comes next.
 */
function GoalBlock({
  item,
  motion,
  onNext,
}: {
  item: Item;
  /** A step done well, just now — see `useCheer`. */
  motion: Cheer | null;
  /** Next, with the seconds practised where practice was timed. */
  onNext: (practised?: number) => void;
}) {
  const { state, setState } = useSession();
  const colors = useColors();
  const barSpace = useBarSpace();
  const root = useRef<View>(null);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const [editing, setEditing] = useState(false);
  // Practice's clock, here so Next knows how long it ran: what is left, and
  // when it runs out while it runs. Null until it is started.
  const [practice, setPractice] = useState<{ left: number; endAt: number | null } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!practice?.endAt) return;
    const endAt = practice.endAt;
    const timer = setInterval(() => {
      if (endAt - Date.now() > 0) return tick((t) => t + 1);
      clearInterval(timer);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPractice({ left: 0, endAt: null });
    }, 200);
    return () => clearInterval(timer);
  }, [practice?.endAt]);

  const found = goalStepOf(state, item);
  const after = nextItemName(state);
  const next = after ? `Next: ${after}` : "Finish workout";

  if (!found) {
    // Deleted in Plan while the session ran: nothing left to do here.
    return (
      <View style={{ flex: 1, backgroundColor: colors.ground }}>
        <Header />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 22 }}>
          <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 22 }}>
            This goal has been deleted.
          </Text>
        </View>
        <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
          <Column>
            <Action label={next} arrow fill onPress={() => setState((s) => completeExercise(s))} />
          </Column>
        </View>
      </View>
    );
  }

  const { goal, step, index } = found;
  const timed = step.measure === "practice";
  const total = step.target * 60;
  const left = practice
    ? practice.endAt
      ? Math.max(0, (practice.endAt - Date.now()) / 1000)
      : practice.left
    : total;
  const ready = timed || item.logged.every((r) => r !== null);

  const openMenu = (button: View) =>
    button.measureInWindow((x, y, width, height) =>
      root.current?.measureInWindow((rx, ry) => setMenu({ x: x - rx, y: y - ry, width, height })),
    );
  const tools: Tool[] = [
    hasTutorial(goal.link)
      ? { icon: "play", label: "Watch the tutorial", onPress: () => openTutorial(goal.link) }
      : null,
    { icon: "note", label: "Change the goal", onPress: () => setEditing(true) },
  ].filter((t): t is Tool => t !== null);

  return (
    <View ref={root} style={{ flex: 1, backgroundColor: colors.ground }}>
      <Header showRest />

      <Fit
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 8,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
        }}
      >
        <LiftTitle family="goal" name={step.name} onMore={openMenu} style={{ marginTop: LAYOUT.solo.name }}>
          <Text
            numberOfLines={1}
            style={{ marginTop: 4, textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 20 }}
          >
            {goal.name}
          </Text>
          {step.note ? (
            <View style={{ paddingTop: 6 }}>
              <NoteLine text={step.note} lines={2} center onPress={() => setEditing(true)} />
            </View>
          ) : null}
        </LiftTitle>

        <View
          accessible
          accessibilityLabel={`Step ${index + 1} of ${goal.steps.length}`}
          // Practice carries a clock and a button under it, so it sits a little higher.
          style={{ marginTop: (step.note ? 26 : 40) - (timed ? 8 : 0), alignItems: "center", gap: 12 }}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.semibold,
                fontSize: LAYOUT.solo.number,
                lineHeight: LAYOUT.solo.number + 4,
                letterSpacing: -2,
                fontVariant: ["lining-nums"],
              }}
            >
              {index + 1}
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 24 }}>
              of {goal.steps.length}
            </Text>
          </View>
          <Pips goal={goal} at={index} color={colors.text} size="large" />
        </View>

        <View style={{ marginTop: timed ? 16 : 36 }}>
          {timed ? (
            <PracticeClock
              left={left}
              total={total}
              running={!!practice?.endAt}
              cheer={motion?.id ?? null}
              onStart={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPractice({ left, endAt: Date.now() + left * 1000 });
              }}
              onPause={() => setPractice({ left, endAt: null })}
            />
          ) : step.measure === "hold" ? (
            <HoldSets
              logged={item.logged}
              target={step.target}
              cheer={motion?.id ?? null}
              burst={motion?.big ? "goal" : null}
              hold={holdOn(state, "main")}
              onStart={(i) => setState((s) => startHold(s, "main", i, Date.now()))}
              onStop={() => setState((s) => stopHold(s, Date.now()))}
              onCancel={() => setState((s) => cancelHold(s))}
              onTap={(i) => setState((s) => tapGoalSet(s, i))}
              onReset={(i) => setState((s) => skipGoalSet(s, i))}
            />
          ) : (
            <Sets
              logged={item.logged}
              target={step.target}
              cheer={motion?.id ?? null}
              burst={motion?.big ? "goal" : null}
              onTap={(i) => setState((s) => tapGoalSet(s, i))}
              onReset={(i) => setState((s) => skipGoalSet(s, i))}
            />
          )}
        </View>

        <View style={{ minHeight: LAYOUT.solo.under, marginTop: timed ? 14 : LAYOUT.solo.underGap }}>
          <GoalWhy
            goal={goal}
            step={step}
            index={index}
            item={item}
            glow={motion?.big ? motion.id : null}
          />
        </View>
      </Fit>

      <View style={{ paddingHorizontal: 22, paddingBottom: barSpace + 14 }}>
        <Column>
          <Action
            label={next}
            arrow
            fill
            disabled={!ready}
            onPress={() => {
              setMenu(null);
              // Practice counts at what the clock ran, or the whole time if it never started.
              onNext(timed && practice ? total - left : undefined);
            }}
          />
        </Column>
      </View>

      {menu ? <ToolsMenu anchor={menu} tools={tools} onClose={() => setMenu(null)} /> : null}
      <GoalSheet goalId={editing ? goal.id : null} onClose={() => setEditing(false)} />
    </View>
  );
}

/**
 * Circles for timed holds — a plank, a dead hang, a goal's hold step. Tap an
 * empty one and it counts 3, 2, 1 with a tick a second, so there's time to
 * get your hands on the bar or down on the floor; a note says go, and it
 * counts up. At the target a sound and a buzz say you're there, and it keeps
 * counting: every second past it is yours. Tap it again to stop, and what it
 * read is logged — so the phone can stay on the floor until you're done.
 * Tapped during 3, 2, 1, it's put away. A hold already in comes down a few
 * seconds a tap, like any set; holding a circle marks it not done.
 *
 * One clock at a time: another circle tapped meanwhile says so, where you
 * tapped, rather than doing nothing.
 */
function HoldSets({
  logged,
  target,
  hold,
  role,
  cheer = null,
  burst = null,
  onStart,
  onStop,
  onCancel,
  onTap,
  onReset,
}: {
  logged: (number | null)[];
  target: number;
  /** The clock running on these circles, if any — see `HoldClock`. */
  hold: { set: number; startAt: number } | null;
  role?: keyof typeof CIRCLES;
  cheer?: number | null;
  burst?: Family | null;
  onStart: (index: number) => void;
  onStop: () => void;
  onCancel: () => void;
  onTap: (index: number) => void;
  onReset: (index: number) => void;
}) {
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  // The last second announced, so each tick, the go and the target sound once.
  const said = useRef<number | null>(null);
  const startAt = hold?.startAt ?? null;
  useEffect(() => {
    if (startAt === null) return;
    // Back to a clock already going: what has passed is not news.
    said.current = heldFor({ startAt }, Date.now());
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      const at = heldFor({ startAt }, time);
      if (said.current !== null && at <= said.current) return;
      said.current = at;
      if (at < 0) Haptics.selectionAsync().catch(() => {});
      else if (at === 0) {
        cue("start");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else if (at === target) {
        cue("end");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, 100);
    return () => clearInterval(timer);
  }, [startAt, target]);
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setBusy(false), 2500);
    return () => clearTimeout(t);
  }, [busy]);

  const at = hold ? (now - hold.startAt) / 1000 : 0;
  return (
    <View>
      <Sets
        logged={logged}
        target={target}
        role={role}
        seconds
        clocked
        clock={hold ? { index: hold.set, at } : null}
        cheer={cheer}
        burst={burst}
        onTap={(i) => {
          if (hold) {
            if (hold.set !== i) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              return setBusy(true);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            return at < 0 ? onCancel() : onStop();
          }
          if (logged[i] === null) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setNow(Date.now());
            return onStart(i);
          }
          onTap(i);
        }}
        onReset={(i) => {
          if (hold?.set === i) onCancel();
          onReset(i);
        }}
      />
      {/* Said where you tapped, laid over what's below so nothing moves. */}
      {busy ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "100%", alignItems: "center", paddingTop: 6 }}>
          <View style={{ backgroundColor: paper.bg, borderRadius: 14, borderCurve: "continuous", paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }}>
            <Text accessibilityLiveRegion="polite" style={{ color: paper.text, fontFamily: fonts.medium, fontSize: 17 }}>
              Stop the hold that's running first.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Practice: one clock for the minutes, and nothing to count. It is a guide,
 * not a gate — Next is there all along — and it buzzes when the time is up.
 */
function PracticeClock({
  left,
  total,
  running,
  cheer,
  onStart,
  onPause,
}: {
  left: number;
  total: number;
  running: boolean;
  /** You've got it, just now: the goal's stars go up from the clock. */
  cheer: number | null;
  onStart: () => void;
  onPause: () => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const done = left <= 0;
  const started = left < total;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ alignItems: "center", gap: 10 }}
    >
      {cheer !== null && width > 0 ? (
        <Burst
          key={cheer}
          family="goal"
          from={[0.3, 0.5, 0.7].map((f, i) => ({ x: width * f, y: 44, at: i * 0.12 }))}
          radius={40}
        />
      ) : null}
      <View
        accessible
        accessibilityLabel={`${timeLabel(Math.ceil(left))} of practice ${done ? "done" : "left"}`}
        style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.semibold,
            fontSize: 76,
            lineHeight: 84,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {timeLabel(Math.ceil(left))}
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 22 }}>
          {done ? "practised" : "practice"}
        </Text>
      </View>
      {done ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={running ? onPause : onStart}
          style={({ pressed }) => ({
            minWidth: 180,
            height: 52,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.button,
            backgroundColor: running ? colors.surface : colors.cloud,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              color: running ? colors.text : colors.ink,
              fontFamily: fonts.medium,
              fontSize: 21,
            }}
          >
            {running ? "Pause" : started ? "Resume" : "Start"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * The words under a step, like a lift's: before it is done, a line from
 * Klay and what owning the step takes; once every circle is in, what
 * that means for next time — the next step, lit up, when this one is owned.
 * Practice says it is your call, and carries the button that makes it.
 */
function GoalWhy({
  goal,
  step,
  index,
  item,
  glow,
}: {
  goal: Goal;
  step: GoalStep;
  index: number;
  item: Item;
  glow: number | null;
}) {
  const { state, setState } = useSession();
  const colors = useColors();
  const seed = `${state.active?.startedAt}:${item.slot}`;
  const verdict = goalVerdict(state, item);
  const line = { textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 24 } as const;
  const voice = { textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 24, lineHeight: 28 } as const;

  const live = Math.min(goal.at, goal.steps.length - 1) === index && !goal.learned;
  const said = !verdict
    ? null
    : verdict.learned
      ? "learned"
      : verdict.outcome === "owned"
        ? step.measure === "practice"
          ? "got"
          : "owned"
        : verdict.outcome === "hit"
          ? "hit"
          : "miss";
  const quip = said
    ? pickLine(GOAL_LINES[said], seed)
    : step.measure === "practice"
      ? null
      : pickLine(live && goal.streak > 0 ? GOAL_LINES.once : GOAL_LINES.start, seed);
  const fact = verdict
    ? verdict.outcome === "owned"
      ? nextStepLine(goal, index)
      : verdict.outcome === "hit"
        ? "Same step next time. Once more moves you on."
        : "Same step next time."
    : ruleLine(step);

  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 6 }}>
      {quip ? (
        <Text style={voice}>
          {quip}
        </Text>
      ) : null}
      <View>
        {glow !== null ? <Glow key={glow} /> : null}
        <Text style={line}>
          {fact}
        </Text>
      </View>
      {step.measure === "practice" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ checked: !!item.got }}
          onPress={() => setState((s) => setGot(s, !item.got))}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            marginTop: 4,
            paddingHorizontal: 20,
            borderRadius: radii.button,
            backgroundColor: item.got ? colors.cloud : colors.surface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {item.got ? <Icon name="check" size={16} color={colors.ink} /> : null}
          <Text
            style={{
              color: item.got ? colors.ink : colors.text,
              fontFamily: item.got ? fonts.medium : fonts.regular,
              fontSize: 19,
            }}
          >
            {item.got ? "Got it — tap to undo" : "I've got it — next step"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Seconds between one move and the next, to get into position. */
const CHANGE_SECONDS = 5;
/** How far up a card must be thrown to go. */
const THROW = 90;
/** A rep, unhurried: a move done for reps runs this long a rep, so it can run itself too. */
const REP_SECONDS = 4;
/** How long one side of a move runs. */
const holdOf = (m: MobilityMove) => (m.reps ? m.reps * REP_SECONDS : m.seconds);

/**
 * Where a move's sides sit in the session's record of the routine, which
 * keeps one step per side: see `resolveRoutineStep`.
 */
const stepsOf = (moves: MobilityMove[]) => {
  let at = 0;
  return moves.map((m) => {
    const first = at;
    at += m.perSide ? 2 : 1;
    return first;
  });
};

/**
 * The routine's moves, one at a time, drawn on its card. A move is thrown
 * off upwards when you are done with it — a swipe up, like a note off a pad
 * — and the next comes in where it was; or it goes by itself once its clock
 * runs out, so the phone can lie on the floor from the first move to the
 * last. Every move runs on a clock, one done for reps too (`holdOf`).
 *
 * A move with two sides is one clock: left, then a chime and "Now your right
 * side" as it starts again. Every hold ends with the chime and a buzz, so you
 * never have to look. A tap starts or pauses.
 */
function MobilityDeck({
  routine,
  barSpace,
  completed,
  steps,
  finished,
  onMove,
  onStep,
  onFinish,
}: {
  routine: MobilityRoutine;
  barSpace: number;
  completed?: boolean[];
  steps?: ("done" | "skipped" | null)[];
  /** The routine was finished: it shows as done, not as an empty table. */
  finished?: boolean;
  /** The move on screen, as it changes. */
  onMove?: (move: MobilityMove) => void;
  onStep: (index: number, status: "done" | "skipped") => void;
  onFinish: () => void;
}) {
  const colors = useColors();
  const still = useReduceMotion();
  const cardActive = useCardActive();
  const moves = routine.moves;
  const first = stepsOf(moves);
  const sides = (m: MobilityMove) => (m.perSide ? 2 : 1);

  // Where each move is: which side it is on, and the seconds left on it. A
  // move on its last side with nothing left is done.
  const [at, setAt] = useState(() =>
    moves.map((m, i) => {
      if (completed?.[i]) return { side: sides(m) - 1, left: 0 };
      const leftDone = m.perSide && steps?.[first[i]] === "done";
      return { side: leftDone ? 1 : 0, left: holdOf(m) };
    }),
  );
  const [page, setPage] = useState(() => Math.max(0, at.findIndex((a, i) => !(a.left <= 0 && a.side === sides(moves[i]) - 1))));
  // The clock that is running, and when it runs out — an end time, so a slow
  // frame or a locked phone cannot stretch the hold.
  const [running, setRunning] = useState<{ endAt: number } | null>(null);
  // Started, and not paused since: each move then follows the last by itself.
  const [flowing, setFlowing] = useState(false);
  // A side just changed: said for a moment.
  const [turned, setTurned] = useState(false);
  // Finished, and asked to go round again.
  const [again, setAgain] = useState(false);
  // Paused by a tap: it stays paused until the next tap.
  const [held, setHeld] = useState(false);

  const move = moves[page];
  const here = at[page];
  const done = !!here && here.left <= 0 && here.side === sides(move) - 1;
  const last = page === moves.length - 1;

  useEffect(() => {
    if (move) onMove?.(move);
  }, [move]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving this card pauses the routine, including its automatic next move.
  useEffect(() => {
    if (cardActive) return;
    setFlowing(false);
    setRunning(null);
  }, [cardActive]);

  // No button to start it: on top, the routine starts by itself — a moment to
  // get into position, then the clock — unless it was paused by a tap.
  useEffect(() => {
    if (cardActive && !held && !flowing && !done) setFlowing(true);
  }, [cardActive, held, flowing, done, page]);

  const setHere = (patch: Partial<{ side: number; left: number }>, p = page) =>
    setAt((all) => all.map((a, i) => (i === p ? { ...a, ...patch } : a)));

  /** Hold now: heard and felt, and the clock runs. */
  const begin = (seconds: number) => {
    cue("start");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning({ endAt: Date.now() + seconds * 1000 });
  };

  // Once started, the routine runs itself to the end: each new move gets a
  // moment to get into position, then starts on its own — reps included, at
  // an unhurried pace — so it can be followed by sound alone.
  const waiting = flowing && !running && !done;
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => begin(here.left), CHANGE_SECONDS * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, page]);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      const rem = (running.endAt - Date.now()) / 1000;
      if (rem > 0) return setHere({ left: rem });
      clearInterval(tick);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onStep(first[page] + here.side, "done");
      if (move.perSide && here.side === 0) {
        // The other side, straight on, on the same clock: the end chime says
        // change, and the clock starts again.
        chime();
        setHere({ side: 1, left: holdOf(move) });
        setTurned(true);
        setRunning({ endAt: Date.now() + holdOf(move) * 1000 });
        return;
      }
      // The end of a move — or, on the last, of the whole routine.
      cue(last ? "finish" : "end");
      setHere({ left: 0 });
      setRunning(null);
      if (last) setFlowing(false);
      // On to the next by itself, after a beat to see it is done.
      if (!last) setTimeout(() => throwAway(true), 900);
    }, 200);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!turned) return;
    const t = setTimeout(() => setTurned(false), 4000);
    return () => clearTimeout(t);
  }, [turned]);

  const pause = () => {
    setHeld(true);
    setFlowing(false);
    if (!running) return;
    setHere({ left: Math.max(0, (running.endAt - Date.now()) / 1000) });
    setRunning(null);
  };

  // The card in the air, thrown up and off.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const lift = useSharedValue(0);
  // Which move is on top, on the UI thread: a throw hands the top to the next
  // card in the same frame it ends, so nothing is redrawn and nothing blinks.
  const topAt = useSharedValue(page);

  /**
   * Done with this card: the next comes up, or the routine is finished. A
   * routine that is running keeps running — thrown away by hand or by
   * itself, the next move starts on its own after a moment.
   */
  const advance = (_automatic: boolean) => {
    setRunning(null);
    // A side never held is left unmarked; one cut short is skipped.
    if (!done && here.left < holdOf(move)) onStep(first[page] + here.side, "skipped");
    setTurned(false);
    if (last) {
      lift.value = 0;
      setAgain(false);
      return onFinish();
    }
    setPage(page + 1);
  };
  // In step with the page however it changed: thrown (already there), Reduce
  // Motion, or Do it again.
  useLayoutEffect(() => {
    topAt.value = page;
    lift.value = 0;
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  // Handed to the UI thread's animation as it is, so the call comes back
  // here: a function made over there cannot be run on this side.
  const advanceLatest = (automatic: boolean) => advanceRef.current(automatic);
  const height = size.height;

  /** Thrown off: on the UI thread, the card underneath becomes the top at once. */
  const handOn = (automatic: boolean, isLast: boolean) => {
    "worklet";
    if (!isLast) {
      topAt.value = topAt.value + 1;
      lift.value = 0;
    }
    scheduleOnRN(advanceLatest, automatic);
  };

  const throwAway = (automatic = false) => {
    if (still) return advanceRef.current(automatic);
    lift.value = withTiming(-height - 60, { duration: 260 }, (finished) => {
      if (finished) handOn(automatic, last);
    });
  };

  const swipe = Gesture.Pan()
    .activeOffsetY(-12)
    .failOffsetX([-18, 18])
    .onUpdate((e) => {
      lift.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < -THROW || e.velocityY < -900) {
        lift.value = withTiming(-height - 60, { duration: 200 }, (finished) => {
          if (finished) handOn(false, last);
        });
      } else {
        lift.value = withSpring(0, { damping: 20, stiffness: 260 });
      }
    });


  // Done: the routine is over, so the stack is too. Back on this card later,
  // it says so — and offers another round.
  if ((finished || completed?.every(Boolean)) && !again && moves.length) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 8, paddingBottom: barSpace + 14 }}>
        <Column style={{ flex: 1, gap: 18 }}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
            <Icon name="check" size={44} color={colors.text} />
            <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 30 }}>Done</Text>
            <Text style={{ textAlign: "center", color: colors.muted, fontFamily: fonts.regular, fontSize: 18, lineHeight: 24 }}>
              {moves.map((m) => m.name).join(" · ")}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Action
              label="Do it again"
              onPress={() => {
                setAt(moves.map((m) => ({ side: 0, left: holdOf(m) })));
                setPage(0);
                setRunning(null);
                setFlowing(false);
                setTurned(false);
                setHeld(false);
                lift.value = 0;
                setAgain(true);
              }}
            />
          </View>
        </Column>
      </View>
    );
  }

  if (!moves.length) return <View style={{ flex: 1, justifyContent: "center", padding: 22 }}><Text style={{ color: colors.text, fontSize: 22 }}>No movements in this routine.</Text><Action label="Continue" fill onPress={onFinish} /></View>;

  /**
   * Straight to another move, back or ahead, from the segments. The move left
   * counts as skipped if it was started and not finished; the one arrived at
   * gets its whole clock again and starts after a moment to get in position.
   */
  const goTo = (i: number) => {
    if (i === page) return;
    if (!done && here.left < holdOf(move)) onStep(first[page] + here.side, "skipped");
    setRunning(null);
    setTurned(false);
    setHeld(false);
    setAt((all) => all.map((a, k) => (k === i ? { side: 0, left: holdOf(moves[i]) } : a)));
    Haptics.selectionAsync();
    setPage(i);
  };

  const start = () => {
    setHeld(false);
    setFlowing(true);
    begin(here.left);
  };
  const away = last ? "Swipe up to finish" : "Swipe up for the next";
  // What a tap on the card does now, and the words under it.
  const tap = running || waiting
    ? { hint: `Tap to pause · ${away.toLowerCase()}`, onPress: pause }
    : done
      ? { hint: away, onPress: () => throwAway() }
        : { hint: `Tap to carry on · ${away.toLowerCase()}`, onPress: start };
  // Under the clock: what is happening now, when there is something to say;
  // otherwise the breath, where the picture keeps one.
  const status = turned ? "Now your right side" : waiting ? "Get into position" : held && !done ? "Paused. Tap to carry on" : "";

  // The moves as a stack: the one on top, the next under it, and the one
  // after, ready. Each keeps its key as it rises, so its picture is never
  // drawn twice.
  const shown = [page, page + 1, page + 2].filter((i) => i < moves.length);

  return (
    <>
      {/* The steps, across the top like a story's: one a move, done ones in
          the routine's colour, the one on screen in ink. */}
      <View style={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: 12 }}>
        <Column>
          {/* The whole routine, one segment a move: done ones fill in its
              colour, the one on screen in ink. */}
          {/* Each segment is a way to that move: tap it to go back, or ahead.
              Drawn a little thicker than a line, with a finger's room to hit. */}
          <View style={{ flexDirection: "row", gap: 4 }}>
            {moves.map((m, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Move ${i + 1} of ${moves.length}, ${m.name}`}
                accessibilityState={{ selected: i === page }}
                onPress={() => goTo(i)}
                hitSlop={{ top: 12, bottom: 12 }}
                style={{ flex: 1, height: 24, justifyContent: "center" }}
              >
                <View
                  style={{
                    height: 7,
                    borderRadius: 4,
                    // In the card's own ink: the routine's yellow would vanish on its yellow.
                    backgroundColor: i <= page ? colors.text : colors.line,
                    opacity: i === page && !done ? 0.55 : 1,
                  }}
                />
              </Pressable>
            ))}
          </View>
        </Column>
      </View>
      <View
        // Edge to edge: the picture runs to the card's sides; the words keep their own margin.
        style={{ flex: 1, paddingBottom: 8 }}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        <GestureDetector gesture={swipe}>
          <View style={{ flex: 1 }}>
            {shown.map((i) => (
              <MoveSheet key={i} index={i} topAt={topAt} lift={lift} height={height} onTop={i === page}>
                <Pressable
                  disabled={i !== page}
                  accessibilityRole="button"
                  accessibilityLabel={`${moves[i].name}${moves[i].perSide ? `, ${at[i].side === 0 ? "left side" : "right side"}` : ""}`}
                  accessibilityHint={i === page ? tap.hint : undefined}
                  accessibilityActions={[{ name: "activate" }, { name: "next", label: last ? "Finish" : "Next move" }]}
                  onAccessibilityAction={(e) => (e.nativeEvent.actionName === "next" ? throwAway() : tap.onPress())}
                  onPress={tap.onPress}
                  style={{ flex: 1, paddingBottom: barSpace + 14 }}
                >
                  <MobilityCard
                    move={moves[i]}
                    side={moves[i].perSide ? (at[i].side === 0 ? "Left side" : "Right side") : null}
                    turned={i === page && turned}
                    left={at[i].left}
                    number={i + 1}
                    count={moves.length}
                    // Only the top move moves: the one underneath holds still until it is up.
                    paused={i !== page || held}
                    status={i === page ? status : ""}
                    away={i === moves.length - 1 ? "Swipe up to finish" : "Swipe up for the next"}
                  />
                </Pressable>
              </MoveSheet>
            ))}
          </View>
        </GestureDetector>
      </View>
    </>
  );
}

/**
 * One move's card in the routine's stack: solid, the card's own white running
 * to grey, so the one under it never shows through. On top it follows the
 * thumb up and off; the next lies just under it, a little smaller, and rises
 * into place as the top one goes. Which is which is `topAt`, on the UI thread.
 */
function MoveSheet({
  index,
  topAt,
  lift,
  height,
  onTop,
  children,
}: PropsWithChildren<{ index: number; topAt: SharedValue<number>; lift: SharedValue<number>; height: number; onTop: boolean }>) {
  const style = useAnimatedStyle(() => {
    const d = index - topAt.value;
    if (d === 0) {
      return {
        zIndex: 3,
        opacity: 1,
        shadowOpacity: Math.min(0.16, -lift.value / 400),
        transform: [{ translateY: lift.value }, { rotate: `${lift.value / 60}deg` }, { scale: 1 }],
      };
    }
    if (d === 1) {
      const t = height ? Math.min(1, -lift.value / height) : 0;
      return {
        zIndex: 2,
        opacity: 1,
        shadowOpacity: 0,
        transform: [{ translateY: 24 * (1 - t) }, { rotate: "0deg" }, { scale: 0.96 + 0.04 * t }],
      };
    }
    return { zIndex: 1, opacity: 0, shadowOpacity: 0, transform: [{ translateY: 24 }, { rotate: "0deg" }, { scale: 0.96 }] };
  });
  return (
    <Reanimated.View
      pointerEvents={onTop ? "auto" : "none"}
      accessibilityElementsHidden={!onTop}
      importantForAccessibility={onTop ? "auto" : "no-hide-descendants"}
      style={[
        StyleSheet.absoluteFill,
        { shadowColor: "#000", shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
        style,
      ]}
    >
      <ClayGround corner={DECK.corner} from={0.55} />
      {children}
    </Reanimated.View>
  );
}

function MobilityCard({ move, side, turned, left, number, count, paused, status, away }: {
  move: MobilityMove;
  side: "Left side" | "Right side" | null;
  /** The other side has just begun. */
  turned: boolean;
  left: number;
  /** Which move this is, of how many: said big, so it reads as a series. */
  number: number;
  count: number;
  /** Paused by a tap: the picture holds still. */
  paused?: boolean;
  /** What is happening now, under the clock; empty for nothing to say. */
  status: string;
  /** How to move on, always at the foot. */
  away: string;
}) {
  // The breath, said under the clock rather than over the picture.
  const [breath, setBreath] = useState<"inhale" | "exhale" | null>(null);
  const colors = useColors();
  const done = left <= 0 && side !== "Left side";
  const active = useCardActive();
  // The clay figure where the stretch has it (see `components/clay.tsx`):
  // breathing by itself while the clock runs, still before it starts.
  const clay = hasClay(pictureOf(move)) ? pictureOf(move) : null;

  // The picture is the card: the clay figure, whole, as big as the words
  // leave room for, straight on the card's own white so it has no box round
  // it. Under it, quietly: the move, its clock, how to do it. Which move of
  // how many is the segments above; the full guide is under the card's ⋯.
  return (
    // No frame of its own: the move is drawn straight on the routine's card,
    // and thrown off it whole.
    <View style={{ flex: 1, gap: 4 }}>
      <View
        accessible
        accessibilityLabel={`Move ${number} of ${count}${side ? `, ${side.toLowerCase()}` : ""}`}
        style={{ flex: 1, minHeight: 160 }}
      >
        {clay ? (
          <ClayStretch
            id={clay}
            words={false}
            onBreath={setBreath}
            still={!active || !!paused || done}
            style={{ flex: 1, backgroundColor: "transparent" }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Mark family="mobility" size={72} />
          </View>
        )}
      </View>

      <View style={{ alignItems: "center", gap: 2, paddingHorizontal: 30 }}>
        <WholeText style={{ textAlign: "center", color: colors.text, fontFamily: fonts.medium, fontSize: 28, lineHeight: 34 }}>
          {move.name}
        </WholeText>
        {side ? (
          <Text style={{ color: colors.text, fontFamily: turned ? fonts.medium : fonts.italic, fontSize: 18, opacity: turned ? 1 : 0.75 }}>
            {side}
          </Text>
        ) : null}
        <Text
          style={{
            textAlign: "center",
            color: colors.text,
            fontFamily: fonts.medium,
            fontSize: 48,
            lineHeight: 56,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {done ? "Done" : timeLabel(Math.ceil(left))}
        </Text>
        {/* What is happening now, else the breath: always laid out, so the
            words changing move nothing. */}
        <Text
          accessibilityLiveRegion="polite"
          style={{ height: 26, textAlign: "center", color: colors.text, fontFamily: status && turned ? fonts.medium : fonts.italic, fontSize: 19 }}
        >
          {status || (breath === "inhale" ? "Breathe in" : breath === "exhale" ? "Breathe out" : "")}
        </Text>
        <Text style={{ marginTop: 4, textAlign: "center", color: colors.muted, fontFamily: fonts.regular, fontSize: 17, lineHeight: 23 }}>
          {/* Never capped: the picture above gives up the room, so the whole cue
              always shows. Every move runs on a clock; for one done for reps,
              the reps are a pace, not a count. */}
          {move.reps ? `About ${move.reps} slow reps${side ? " each side" : ""}. ` : ""}
          {move.cue ?? "Ease in, breathe slowly, and stop when the tension fades."}
        </Text>
      </View>
      {/* How to move on, always: the card says it, so it never needs a tip. */}
      <View style={{ height: 30, marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Icon name="collapse" size={18} color={colors.text} />
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 18 }}>{away}</Text>
      </View>
    </View>
  );
}

/** The machines or routines this block could use instead. */
function ConditioningSwap({
  options,
  current,
  onPick,
}: {
  options: { id: string; name: string }[];
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <View
      style={{
        gap: 2,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 10,
      }}
    >
      {options.map((o) => {
        const active = o.id === current;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onPick(o.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              minHeight: 50,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: active ? colors.cloud : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                flex: 1,
                color: active ? colors.ink : colors.text,
                fontSize: 16,
                fontWeight: active ? "800" : "600",
              }}
            >
              {o.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The exercises that can fill this slot, each a lump of its own family's
 * clay — push orange, pull teal — so a swap is seen to keep to the same kind
 * of work as the lift it replaces. The one you are on is outlined and says
 * so.
 */
function SwapList({
  options,
  taken,
  current,
  onPick,
}: {
  options: string[];
  /** Exercises another slot in this module is using — shown, but unavailable. */
  taken: Set<string>;
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((id) => {
        const active = id === current;
        const used = taken.has(id) && !active;
        const tone = CLAY_TONE[familyOf(byId(id))];
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: used }}
            disabled={used}
            onPress={() => onPick(id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 56,
              paddingHorizontal: 16,
              borderRadius: radii.button,
              borderCurve: "continuous",
              backgroundColor: tone.card,
              borderWidth: 2.5,
              borderColor: active ? tone.ink : "transparent",
              boxShadow: CLAY_LOOK.bump,
              opacity: used ? 0.4 : pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                flex: 1,
                color: tone.ink,
                fontSize: 17,
                fontFamily: active ? fonts.bold : fonts.semibold,
              }}
            >
              {byId(id)!.name}
            </Text>
            {active ? (
              <Text style={{ color: tone.ink, fontSize: 15, fontFamily: fonts.bold }}>Now</Text>
            ) : used ? (
              <Text style={{ color: tone.ink, fontSize: 14 }}>in use</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}


/**
 * A number that rolls on to its next value, like a counter: counting down,
 * the old figure drops out below and the new one comes in from above;
 * counting up, the other way. Moved and faded, never scaled, so the figures
 * stay sharp the whole way. A tap before it has finished starts the next
 * roll from there.
 */
function Roll({ value, distance, children }: { value: number; distance: number; children: ReactNode }) {
  const reduce = useReduceMotion();
  const prev = useRef({ value, node: children });
  const [gone, setGone] = useState<{ node: ReactNode; key: number } | null>(null);
  const t = useSharedValue(1);
  const dir = useSharedValue(1);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = { value, node: children };
    if (before.value === value || reduce) return;
    dir.value = value < before.value ? 1 : -1;
    setGone({ node: before.node, key: Date.now() });
    t.value = 0;
    t.value = withTiming(1, { duration: 260, easing: Ease.out(Ease.cubic) }, (finished) => {
      if (finished) scheduleOnRN(setGone, null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, children, reduce]);
  const coming = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 1.6),
    transform: [{ translateY: -(1 - t.value) * distance * dir.value }],
  }));
  const going = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - t.value * 1.6),
    transform: [{ translateY: t.value * distance * dir.value }],
  }));
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {gone ? (
        <Reanimated.View key={gone.key} style={[{ position: "absolute" }, going]}>
          {gone.node}
        </Reanimated.View>
      ) : null}
      <Reanimated.View style={coming}>{children}</Reanimated.View>
    </View>
  );
}

/**
 * One circle per set. An empty circle is an outline with the target in it;
 * tapped, it fills solid at the target reps, counting down on each further
 * tap and clearing when it passes 1. A set short of the target fills with a
 * tint instead, so a miss reads at a glance without shouting.
 */
function Sets({
  logged,
  target,
  onTap,
  onReset,
  role = "solo",
  cheer = null,
  burst = null,
  seconds = false,
  clocked = false,
  clock = null,
}: {
  logged: (number | null)[];
  target: number;
  onTap: (index: number) => void;
  /** Long press: back to the target in one go. */
  onReset: (index: number) => void;
  /** Which lift these are for — see `CIRCLES`. */
  role?: keyof typeof CIRCLES;
  /** A lift done well, just now: see `useCheer`. */
  cheer?: number | null;
  /** The heavier weight earned, too: the circles let loose this family's marks. */
  burst?: Family | null;
  /** Holds: each circle counts seconds, and says so. */
  seconds?: boolean;
  /** Each empty circle starts a clock rather than filling — see `HoldSets`. */
  clocked?: boolean;
  /** The hold whose clock is running: seconds counted, below zero while getting ready. */
  clock?: { index: number; at: number } | null;
}) {
  const colors = useColors();
  // On target: a ripple runs through the circles, left to right, each one
  // swelling a touch and sending a thin ring out that fades. A fresh value
  // per cheer, so it starts at rest-before rather than flashing.
  const wave = useMemo(() => new Animated.Value(cheer === null ? 1 : 0), [cheer]);
  useEffect(() => {
    if (cheer === null) return;
    Animated.timing(wave, {
      toValue: 1,
      duration: RIPPLE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [cheer, wave]);
  // Every circle is the same fixed size, centred as a group, and one row
  // is always the same height — two sets must not make bigger circles than
  // three, or the screen changes shape from one exercise to the next. Only
  // when there are too many to fit across do they get smaller, and past
  // five they wrap.
  const [width, setWidth] = useState(0);
  const { full, gap, font } = CIRCLES[role];
  // What a tap here has just made each set, shown at once; the session — and
  // the rest of the card with it — follows a moment later, as a transition,
  // so a count never waits on the whole card being drawn again. Cleared as
  // soon as the session says the same.
  const [pending, setPending] = useState<Record<number, number | null>>({});
  useEffect(() => setPending({}), [logged]);
  const tap = (i: number) => {
    if (!seconds && !clocked) {
      const now = i in pending ? pending[i] : logged[i];
      const next = now === null ? target : now === 0 ? null : Math.max(0, now - 1);
      setPending((p) => ({ ...p, [i]: next }));
    }
    startTransition(() => onTap(i));
  };
  const n = logged.length;
  // Up to five in a row; more wrap onto a second row, or a third — never
  // squeezed below a thumb's width or past the card's edge. One row keeps
  // the same height whatever the count, so the card keeps its shape.
  const perRow = n <= 5 ? n : Math.ceil(n / Math.ceil(n / 5));
  const rows = Math.max(1, Math.ceil(n / perRow));
  const across = width > 0 ? (width - gap * (perRow - 1)) / perRow : full;
  const down = rows === 1 ? full : (full * 1.5 - gap * (rows - 1)) / rows;
  const size = Math.max(36, Math.min(full, across, down));
  const tall = rows === 1 ? full : rows * size + (rows - 1) * gap;
  const fontSize = Math.round((font * size) / full);
  // Each circle's turn in the ripple, spread so the last starts by 0.4.
  const stagger = n > 1 ? Math.min(0.14, 0.4 / (n - 1)) : 0;
  const centre = (k: number) => {
    const row = Math.floor(k / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const left = (width - inRow * size - (inRow - 1) * gap) / 2;
    return { x: left + (k - row * perRow) * (size + gap) + size / 2, y: (tall - (rows * size + (rows - 1) * gap)) / 2 + row * (size + gap) + size / 2 };
  };
  const circles = logged.map((saved, i) => {
        const reps = i in pending ? pending[i] : saved;
        const running = clock?.index === i;
        const ready = running && clock.at < 0;
        const filled = reps !== null && !running;
        const short = filled && reps < target;
        const zero = filled && reps === 0;
        const shown = running ? (ready ? Math.ceil(-clock.at) : Math.floor(clock.at)) : filled ? reps : target;
        const at = i * stagger;
        const ring = wave.interpolate({
          inputRange: [at, at + 0.55],
          outputRange: [1, 1.55],
          extrapolate: "clamp",
        });
        const ringFade = wave.interpolate({
          inputRange: [at, at + 0.04, at + 0.55],
          outputRange: [0, 0.7, 0],
          extrapolate: "clamp",
        });
        return (
          // The ripple runs through the ring of colour round each circle; the
          // circle itself never swells (a scaled view is drawn rough on iOS).
          <Animated.View key={i}>
            <SetCircle
              size={size}
              seed={i}
              filled={filled}
              zero={zero}
              short={short}
              level={filled && target > 0 ? reps / target : 0}
              // Three colours a set can be, told apart at a glance: deep clay
              // on target, a pale clay short of it, and the card's own colour,
              // hollow, not done. Cream is only ever a set not yet started.
              wash={short ? mix(CLAY_LOOK.well, colors.wash, 0.42) : colors.wash}
              card={colors.bg}
              ink={colors.text}
              ringWidth={role === "partner" ? 2 : 3}
              label={
                seconds
                  ? `Hold ${i + 1}${
                      running
                        ? ready
                          ? `, get ready, ${shown}`
                          : `, ${shown} seconds of ${target}`
                        : filled
                          ? `, ${reps} seconds`
                          : `, target ${target} seconds, not started`
                    }`
                  : `Set ${i + 1}${zero ? ", not done" : filled ? `, ${reps} reps${short ? ` of ${target}` : ""}` : `, target ${target}, not logged`}`
              }
              hint={
                seconds
                  ? running
                    ? ready
                      ? "Tap to put the clock away."
                      : "Tap to stop and log what you held."
                    : "Tap to start its clock, or to take a few seconds off. Hold if you didn't do it."
                  : "Tap to log or count down. Hold if you didn't do it."
              }
              onTap={() => tap(i)}
              onReset={() => onReset(i)}
              fillsOnTap={!clocked || filled}
            >
              {running ? <HoldRing size={size} fill={ready ? 0 : clock.at / target} /> : null}
              <Roll value={shown} distance={size * 0.34}>
              <Text
                style={{
                  // The figures sit a touch low in a circle: lift them to its
                  // optical centre.
                  marginTop: -Math.round(fontSize * 0.08),
                  // On a stamp the number is in the ink; a set well short
                  // still has most of it on the bare clay.
                  color: filled ? colors.ink : colors.text,
                  fontFamily: fonts.semibold,
                  fontSize: seconds ? Math.round(fontSize * 0.92) : fontSize,
                  fontVariant: ["lining-nums", "tabular-nums"],
                }}
              >
                {shown}
                {/* A short set is said by how full the circle is, so just the reps. */}
                {seconds && !ready ? (
                  <Text style={{ fontFamily: fonts.semibold, fontSize: Math.round(fontSize * 0.4) }}>
                    {" s"}
                  </Text>
                ) : null}
              </Text>
              </Roll>
            </SetCircle>
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: size,
                height: size,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.text,
                opacity: ringFade,
                transform: [{ scale: ring }],
                pointerEvents: "none",
              }}
            />
          </Animated.View>
        );
      });
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: tall, justifyContent: "center", gap }}>
        {/* First, so the circles cover where the marks start from. */}
        {burst && cheer !== null ? (
          <Burst
            key={cheer}
            family={burst}
            from={logged.map((_, i) => ({ ...centre(i), at: i * stagger }))}
            radius={size / 2}
          />
        ) : null}
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={{ flexDirection: "row", justifyContent: "center", gap }}>
            {circles.slice(r * perRow, (r + 1) * perRow)}
          </View>
        ))}
    </View>
  );
}

/**
 * A running hold's ring: a faint track, and the time held as an arc from
 * the top, growing clockwise until it closes at the target.
 */
function HoldRing({ size, fill }: { size: number; fill: number }) {
  const colors = useColors();
  const r = (size - 3) / 2;
  const round = 2 * Math.PI * r;
  return (
    <Svg
      width={size}
      height={size}
      style={{ position: "absolute", left: 0, top: 0, transform: [{ rotate: "-90deg" }] }}
    >
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.line} strokeWidth={3} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.text}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0, Math.min(1, fill)) * round} ${round}`}
      />
    </Svg>
  );
}

/**
 * Hears every touch on the lift screen before anything else does, so a
 * control can put itself away on a tap anywhere but on it: the control marks
 * the touches that land on it, and once a touch has been handed out an
 * unmarked one closes it.
 */
type TapAway = { close: (() => void) | null; inside: boolean };

/** Keeps decimals only, with a dot whichever separator you type. */
function cleanNumber(typed: string) {
  const [whole, ...rest] = typed.replace(",", ".").replace(/[^0-9.]/g, "").split(".");
  return (rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole).slice(0, 6);
}

/**
 * The weight. Klay sets it and you rarely change it, so it stands alone,
 * its figures underlined in dashes to say they can be changed.
 *
 * Tap it and it is being changed, all at once: the number pad comes up, the
 * dashes turn to a solid line, and − and + come in at the row's ends. Until
 * you type, the weight is held back like a placeholder, with the caret before
 * it; what you type is drawn in its place at the same size, so nothing
 * jumps. − and + still step it while the pad is up. A tap on the number or
 * anywhere else keeps what you typed and puts it all away.
 * VoiceOver steps it with a swipe up or down without opening anything.
 */
function WeightControl({
  weight,
  bodyweight,
  holds,
  perHand,
  size,
  tapAway,
  onNudge,
  onSet,
}: {
  weight: number;
  bodyweight?: boolean;
  /** Progresses by holding: the number is seconds, from bodyweight up. */
  holds?: boolean;
  /** Held in each hand: the number shown is one dumbbell, marked per hand. */
  perHand?: boolean;
  /** How big the number is drawn — see `LAYOUT`. */
  size: number;
  tapAway: RefObject<TapAway>;
  onNudge: (direction: 1 | -1) => void;
  onSet: (weight: number) => void;
}) {
  const colors = useColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Finishing runs once, whichever way it comes: a tap on the number or
  // anywhere else, or Return on a hardware keyboard. Not on the pad going down: iOS reports that as soon
  // as a field takes focus with no pad to show (a hardware keyboard).
  const open = useRef(false);
  const input = useRef<NativeTextInput>(null);
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shown, {
      toValue: editing ? 1 : 0,
      duration: editing ? 160 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editing, shown]);

  const keep = () => {
    const typed = parseFloat(draft);
    if (draft !== "" && !Number.isNaN(typed)) onSet(typed);
    setDraft("");
  };
  const start = () => {
    open.current = true;
    setDraft("");
    setEditing(true);
  };
  const finish = () => {
    if (!open.current) return;
    open.current = false;
    keep();
    setEditing(false);
  };
  const close = () => {
    finish();
    Keyboard.dismiss();
  };
  // A step keeps what you typed, then steps from it; the pad stays up, and
  // the field keeps the keys (a click on the web moves focus off it).
  const nudge = (direction: 1 | -1) => {
    keep();
    onNudge(direction);
    input.current?.focus();
  };

  useEffect(() => {
    const away = tapAway.current;
    if (!editing || !away) return;
    away.close = close;
    return () => {
      away.close = null;
    };
  });

  // A touch on the number or on − and + is the weight's own; anything else,
  // even the empty ends of its row, puts it away.
  const mine = () => {
    if (tapAway.current) tapAway.current.inside = true;
    return false;
  };

  const typed = editing && draft !== "";
  const typedNumber = parseFloat(draft);
  const unit = unitFor(
    { perHand, bodyweight, holds },
    typed && !Number.isNaN(typedNumber) ? typedNumber : weight,
  );
  const line = editing ? "solid" : "dashed";
  const caret = editing ? (typed ? "end" : "start") : undefined;
  // An unloaded bodyweight lift has no number worth showing — a bare "0 kg"
  // reads as an error — until you type a load (belt, dumbbell).
  const label = !typed && bodyweight && weight === 0;
  const half = Math.round(size * 0.5);

  return (
    <View style={{ height: size + (UNIT_BELOW ? UNIT_ROOM : 0), alignItems: "center", justifyContent: "center" }}>
      <View onStartShouldSetResponderCapture={mine}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={holds ? "Hold" : "Weight"}
          accessibilityValue={{
            text: label ? (holds ? "Bodyweight, no hold" : "Bodyweight") : `${weight} ${unit}`,
          }}
          accessibilityHint={holds ? "Tap to type a hold" : "Tap to type a weight"}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => onNudge(e.nativeEvent.actionName === "increment" ? 1 : -1)}
          onPress={() => (editing ? close() : start())}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed && !editing ? 0.6 : 1 })}
        >
          {label ? (
            <Underline size={half} line={line} caret={caret}>
              <Text
                style={{
                  color: colors.text,
                  opacity: editing ? 0.4 : 1,
                  fontFamily: fonts.medium,
                  fontSize: half,
                }}
              >
                Bodyweight
              </Text>
            </Underline>
          ) : (
            <Weight
              weight={typed ? draft : weight}
              unit={unit}
              size={size}
              line={line}
              faint={editing && !typed}
              caret={caret}
            />
          )}
        </Pressable>
      </View>

      {/* The field you type into is never seen: the number above draws what
          you type, so it stays exactly where it was. */}
      {editing ? (
        <TextInput
          ref={input}
          autoFocus
          value={draft}
          onChangeText={(t) => setDraft(cleanNumber(t))}
          onSubmitEditing={close}
          keyboardType="decimal-pad"
          returnKeyType="done"
          caretHidden
          contextMenuHidden
          accessibilityLabel={holds ? "Hold in seconds" : "Weight in kilograms"}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* At the row's ends, each on its own so the number between them
          stays tappable. */}
      {([-1, 1] as const).map((direction) => (
        <Animated.View
          key={direction}
          onStartShouldSetResponderCapture={mine}
          accessibilityElementsHidden={!editing}
          importantForAccessibility={editing ? "auto" : "no-hide-descendants"}
          style={{
            position: "absolute",
            // Level with the figures, whatever hangs under them.
            top: (size - 48) / 2 + (UNIT_BELOW ? 4 : 0),
            [direction < 0 ? "left" : "right"]: 0,
            opacity: shown,
            pointerEvents: editing ? "auto" : "none",
          }}
        >
          <Step label={direction < 0 ? "−" : "+"} onPress={() => nudge(direction)} />
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * − or +: a soft circle in a tint of the field. Letterpress keeps them quiet —
 * a faint pressed ring, smaller, the glyph stepped back — so the number
 * between them stays the thing; the touch area is still a full 48.
 */
function Step({ label, onPress }: { label: "−" | "+"; onPress: () => void }) {
  const colors = useColors();
  // Quiet: a fine ring, not a filled button.
  const size = 38;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "More" : "Less"}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      hitSlop={9}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.line,
        }}
      >
        <View style={{ opacity: 0.7 }}>
          <Icon name={label === "+" ? "plus" : "minus"} size={16} color={colors.text} />
        </View>
      </View>
    </Pressable>
  );
}

/** A lift done well, just now: on target, or the heavier weight earned (`big`). */
type Cheer = { id: number; key: string; big: boolean };

/** How long a cheer stands: past its longest movement, then it is spent. */
const CHEER_MS = 2600;

/**
 * How long the circles must sit still before a lift done well is cheered.
 * A short set passes through the target on its way down — tap for 6, tap
 * again for 5 — so the moment waits to see where the circles settle. Long
 * enough for a quick count down, short enough to still feel like an answer.
 */
const SETTLE_MS = 650;

/**
 * When a lift gets its moment. On target — every set at its reps — and more
 * so when that earns the heavier weight. Never for a set short or a weight
 * going down: those keep their plain, calm line. A goal's step gets the same:
 * on target, and more so when that owns the step.
 *
 * It comes once the circles have settled on target, whether the last one
 * just filled or a correction made it a hit, and once per lift: putting a
 * circle right afterwards does not play it again, and coming back to a lift
 * already done well is not the moment. A circle put wrong while it plays
 * takes it away at once. A success buzz says it under the thumb; the
 * heavier weight gets a second, firmer one.
 *
 * `well` is the lift as it stands, done well or not, for the send-off on Next.
 */
function useCheer(state: ReturnType<typeof useSession>["state"]): {
  cheer: Cheer | null;
  well: boolean;
} {
  const cardActive = useCardActive();
  const active = state.active;
  const item = active && !isComplete(state) ? active.items[active.cursor] : undefined;
  const lift = !!item && isLift(item) && currentWarmup(state).length === 0;
  const say = lift && allSetsLogged(state) ? nextTime(state)?.say : undefined;
  // A goal's step: on target, and more so when that owns it — or practice
  // you've got, which owns it outright.
  const goal = item && isGoal(item) ? goalVerdict(state, item)?.outcome : undefined;
  const good = lift ? say === "hit" || say === "owned" : goal === "hit" || goal === "owned";
  const big = lift ? say === "owned" : goal === "owned";
  const key = active && item ? `${active.startedAt}:${active.cursor}` : "";
  // What the circles say now, the partner's too: any tap starts the wait again.
  const circles =
    (lift || goal !== undefined) && item
      ? `${item.logged.join()}|${item.supersetLogged?.join() ?? ""}|${item.got ? 1 : 0}`
      : "";

  const [track, setTrack] = useState<{
    key: string;
    done: string[];
    count: number;
    cheer: Cheer | null;
  }>(() => ({ key, done: good ? [key] : [], count: 0, cheer: null }));
  if (track.key !== key) {
    // Arriving at a lift already done well — Back to it — is not the moment.
    const done = good && !track.done.includes(key) ? [...track.done, key] : track.done;
    setTrack({ ...track, key, done, cheer: null });
  } else if (!good && track.cheer) {
    setTrack({ ...track, cheer: null });
  }

  const waiting = cardActive && good && track.key === key && !track.done.includes(key);
  useEffect(() => {
    if (!waiting) return;
    const settled = setTimeout(
      () =>
        setTrack((t) =>
          t.key !== key || t.done.includes(key)
            ? t
            : {
                key,
                done: [...t.done, key],
                count: t.count + 1,
                cheer: { id: t.count + 1, key, big },
              },
        ),
      SETTLE_MS,
    );
    return () => clearTimeout(settled);
  }, [waiting, key, circles, big]);

  const id = track.cheer?.id;
  const firm = track.cheer?.big;
  useEffect(() => {
    if (id === undefined) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const second = firm
      ? setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 220)
      : undefined;
    // Spent once it has played, so a line drawn again later stays still.
    const spent = setTimeout(
      () => setTrack((t) => (t.cheer?.id === id ? { ...t, cheer: null } : t)),
      CHEER_MS,
    );
    return () => {
      clearTimeout(second);
      clearTimeout(spent);
    };
  }, [id, firm]);

  return { cheer: good && track.cheer?.key === key ? track.cheer : null, well: good };
}

/** How long the ripple takes to run through the circles and settle. */
const RIPPLE_MS = 1100;

/**
 * The heavier weight earned: each circle lets loose a few marks of the
 * lift's family as the ripple reaches it. They come out from behind it and
 * fan upward and away from the middle, turning a little, and fade before
 * they get far — around the weight rather than over it. A handful, not a
 * shower, some fainter so they sit at different depths. Touches nothing.
 */
function Burst({
  family,
  from,
  radius,
}: {
  family: Family;
  /** Each circle's centre in the row, and its turn in the ripple (0–1). */
  from: { x: number; y: number; at: number }[];
  radius: number;
}) {
  const colors = useColors();
  // Worked out once, as it appears: the screen redraws every second while
  // resting, and the marks must not start again each time.
  const [pieces] = useState(() => {
    const per = from.length > 3 ? 2 : 3;
    const middle = (from.length - 1) / 2;
    return from.flatMap((c, i) =>
      Array.from({ length: per }, (_, j) => {
        // A fan over the top of the circle, leaning away from the middle.
        const spread = per === 3 ? (j - 1) * 50 : (j - 0.5) * 60;
        const angle =
          ((-90 + spread + (i - middle) * 24 + (Math.random() - 0.5) * 24) * Math.PI) / 180;
        const far = radius * 0.9 + 40 + Math.random() * 45;
        return {
          x: c.x,
          y: c.y,
          dx: Math.cos(angle) * far,
          dy: Math.sin(angle) * far,
          turn: Math.round((Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 80)),
          size: 13 + Math.round(Math.random() * 7),
          delay: Math.round(c.at * RIPPLE_MS + 40 + Math.random() * 120),
          duration: 1100 + Math.round(Math.random() * 400),
          soft: (i + j) % 3 === 0,
          t: new Animated.Value(0),
        };
      }),
    );
  });
  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.t, {
          toValue: 1,
          delay: p.delay,
          duration: p.duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        pointerEvents: "none",
      }}
    >
      {pieces.map((p, i) => {
        const along = (to: number) => p.t.interpolate({ inputRange: [0, 1], outputRange: [0, to] });
        const turn = p.t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.turn}deg`] });
        const grow = p.t.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.5, 1, 0.8] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              opacity: p.t.interpolate({
                inputRange: [0, 0.1, 0.55, 1],
                outputRange: [0, p.soft ? 0.5 : 0.95, p.soft ? 0.4 : 0.75, 0],
              }),
              transform: [
                { translateX: along(p.dx) },
                { translateY: along(p.dy) },
                { rotate: turn },
                { scale: grow },
              ],
            }}
          >
            <Mark family={family} size={p.size} color={colors.text} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/** A soft light behind a line, coming up and going again: the heavier weight, earned. */
function Glow() {
  const colors = useColors();
  const t = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      delay: 520,
      duration: 1500,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [t]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -3,
        bottom: -3,
        left: -14,
        right: -14,
        borderRadius: radii.button,
        backgroundColor: colors.white,
        opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.26, 0] }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.92, 1, 1.04] }) },
        ],
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * The line under the circles, which follows the exercise through. Before the
 * first set, where today's number came from — last time's weight and reps,
 * the reps in small circles like the ones above, or why it changed. Between
 * sets, how to own the next one: the position to hold. Once every set is in,
 * what that means for next time: a line from Klay, and the plain fact
 * under it.
 */
const FEEL_LABEL: Record<Feel, string> = { light: "Too light", right: "About right", heavy: "Too heavy" };

function Why({
  prescription,
  result,
  feel = null,
  started,
  compact,
  glow = null,
}: {
  prescription: ReturnType<typeof currentPrescription>;
  /** Every set is in: what it means for next time, shown in the hint's place. */
  result: { fact: string; quip: string } | null;
  /**
   * The first time on a lift: how it felt, asked in the remark's place, and
   * next time's weight under the answer once it is given.
   */
  feel?: { said: Feel | undefined; onSay: (feel: Feel) => void } | null;
  /** A set is logged, so where the number came from has been read. */
  started: boolean;
  /** Sharing the screen with a superset: one line for the remark. */
  compact?: boolean;
  /** The heavier weight earned, just now: its line lights up for a moment. */
  glow?: number | null;
}) {
  const colors = useColors();
  if (!prescription) return null;
  const line = { textAlign: "center", color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 24 } as const;

  if (result && feel) {
    return (
      <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 10 }}>
        <Text style={{ textAlign: "center", color: colors.text, fontFamily: fonts.italic, fontSize: 22, lineHeight: 26 }}>
          How did that feel?
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(Object.keys(FEEL_LABEL) as Feel[]).map((f) => {
            const on = feel.said === f;
            return (
              <Pressable
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  Haptics.selectionAsync();
                  feel.onSay(f);
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  borderRadius: radii.button,
                  borderWidth: 2,
                  borderColor: colors.text,
                  backgroundColor: on ? colors.text : "transparent",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: on ? colors.bg : colors.text, fontFamily: fonts.uiMedium, fontSize: 16 }}>
                  {FEEL_LABEL[f]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {feel.said ? (
          <Text numberOfLines={1} style={line}>
            {result.fact}
          </Text>
        ) : null}
      </View>
    );
  }

  if (result) {
    // Two voices, told apart by weight and strength, not by a box: the
    // fact that matters — what happens next time — in bold, and Klay's
    // remark over it, lighter and softer.
    const remark = { textAlign: "center", color: colors.text, opacity: 0.72, fontFamily: fonts.regular, fontSize: 18, lineHeight: 23 } as const;
    return (
      <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 8 }}>
        {compact ? (
          <FitText least={0.75} style={remark}>
            {result.quip}
          </FitText>
        ) : (
          <Text style={remark}>
            {result.quip}
          </Text>
        )}
        <View>
          {glow !== null ? <Glow key={glow} /> : null}
          <FitText least={0.8} style={{ textAlign: "center", color: colors.text, fontFamily: fonts.bold, fontSize: 20 }}>
            {result.fact}
          </FitText>
        </View>
      </View>
    );
  }
  const { last, deloaded, skippedLast, exercise } = prescription;

  if (exercise.unloaded) {
    return (
      <Text style={line}>
        Maximum effort every rep. Rest as long as you need between sets.
      </Text>
    );
  }

  if (started) {
    // Every cue opens on a verb, so it carries on the sentence: "Own it: pause…".
    const cue = ownCue(exercise.id, exercise.holds ? prescription.weight : 0);
    return (
      <Text style={line}>
        <Text style={{ fontFamily: fonts.bold }}>Own it: </Text>
        {cue.charAt(0).toLowerCase() + cue.slice(1)}
      </Text>
    );
  }

  const text = prescription.decay
    ? `Lighter this time: ${weightLabel(exercise, prescription.weight)}. Build it up again.`
    : skippedLast
      ? "Skipped last time. Same weight and reps as before."
      : deloaded
        ? exercise.holds || exercise.timed
          ? "Easier after two sessions short of target. Build it up again."
          : prescription.deloadHeld
            ? `Same weight, back to ${prescription.reps} reps after two sessions short of target. Build it up again.`
            : `Easier after two sessions short of target: ${weightLabel(exercise, prescription.weight)}. Build it up again.`
        : prescription.reload === "start"
          ? `Reload: same ${exercise.holds ? "hold" : "weight"}, back to ${prescription.reps} reps. Own it before the next step.`
          : last
            ? null
            : exercise.id === "kb_swing"
              ? "First time on this one. Practise the hip hinge before adding swings. Use a light bell."
            : exercise.timed
              ? "First time on this one. Stop while your form is still good."
            : exercise.bodyweight && !exercise.assistable
              ? "First time on this one. Slow, controlled reps, with two to spare."
              : "First time on this one. Pick a weight you control, with two reps to spare.";

  if (text !== null || !last) {
    return (
      <Text style={line}>
        {text}
      </Text>
    );
  }

  const weight = weightLabel(exercise, last.weight);
  // Five or more sets would crowd the line, so their circles come down a size.
  const mini = last.reps.length > 4 ? 26 : 30;
  // Drawn exactly as the big circles were: solid at the target, a tint where
  // a set fell short of it.
  return (
    <View
      accessible
      accessibilityLabel={`Last time: ${weight}, ${last.reps.join(", ")} reps`}
      // "5 kg per hand" is long: where the circles don't fit beside it, they go under.
      style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 10, rowGap: 6, minHeight: 32 }}
    >
      <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 19 }}>Last time</Text>
      <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>{weight}</Text>
      <View style={{ flexDirection: "row", gap: 6, marginLeft: 4 }}>
        {last.reps.map((r, i) => (
          <View
            key={i}
            style={{
              width: mini,
              height: mini,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              backgroundColor: r < last.target ? colors.raised : colors.cloud,
            }}
          >
            <Text
              style={{
                marginTop: -2,
                color: r < last.target ? colors.text : colors.ink,
                fontFamily: fonts.semibold,
                fontSize: Math.round(mini * 0.6),
                fontVariant: ["lining-nums", "tabular-nums"],
              }}
            >
              {r}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The folded-in partner: its own weight, target and tappable circles. */
function Partner({
  id,
  name,
  cue,
  weight,
  sets,
  target,
  timed,
  note,
  onNote,
  logged,
  onTap,
  onReset,
  hold,
  onRemove,
}: {
  id: string;
  name: string;
  cue?: string;
  weight: string;
  sets: number;
  target: number;
  timed?: boolean;
  /** Your note on the partner, if you wrote one. */
  note: string;
  onNote: () => void;
  logged: (number | null)[];
  onTap: (index: number) => void;
  onReset: (index: number) => void;
  /** A timed partner's clock — see `HoldSets`. */
  hold: {
    clock: { set: number; startAt: number } | null;
    onStart: (index: number) => void;
    onStop: () => void;
    onCancel: () => void;
  };
  /** Unpair it: goes back to its own place in the workout, keeping its sets. */
  onRemove: () => void;
}) {
  const colors = useColors();
  // Kept short — two rows over its circles — so a paired screen still fits
  // above the bar without scrolling.
  return (
    <View
      style={{
        gap: 8,
        marginTop: 12,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.italic, fontSize: 18 }}>
          Superset · {sets} sets of {target}
          {timed ? " seconds" : ""}
        </Text>
        <GuideButton id={id} name={name} cue={cue} size={36} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from this superset`}
          onPress={onRemove}
          hitSlop={4}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            marginRight: -8,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Icon name="close" size={16} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 21 }}>
          {name}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.semibold,
            fontSize: 24,
            fontVariant: ["lining-nums", "tabular-nums"],
          }}
        >
          {weight}
        </Text>
      </View>

      {/* One line, and only when there is one: the pair still has to fit. */}
      {note ? <NoteLine text={note} lines={1} size={15} onPress={onNote} /> : null}

      {timed ? (
        <HoldSets logged={logged} target={target} role="partner" hold={hold.clock} onStart={hold.onStart} onStop={hold.onStop} onCancel={hold.onCancel} onTap={onTap} onReset={onReset} />
      ) : (
        <Sets logged={logged} target={target} onTap={onTap} onReset={onReset} role="partner" />
      )}
    </View>
  );
}

/**
 * The way on: a full-width slab under the thumb. Waiting, it is a soft tint
 * with its label held back; ready, it turns solid — white or navy on a
 * field, blue on white — with an arrow.
 */
function Action({
  label,
  onPress,
  fill,
  arrow,
  disabled,
}: {
  label: string;
  onPress: () => void;
  /** The affirmative action: solid once it can be pressed. */
  fill?: boolean;
  /** Points on to what comes next. */
  arrow?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const glint = useContext(SendOff);
  const on = !!fill && !disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 60,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 18,
        borderRadius: radii.action,
        borderCurve: "continuous",
        backgroundColor: on ? colors.cloud : colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          flexShrink: 1,
          color: on ? colors.ink : colors.text,
          opacity: disabled ? 0.6 : 1,
          fontFamily: on ? fonts.uiSemibold : fonts.ui,
          fontSize: 19,
        }}
      >
        {label}
      </Text>
      {arrow && on ? <Icon name="forward" size={20} color={colors.ink} /> : null}
      {glint > 0 ? <Glint key={glint} /> : null}
    </Pressable>
  );
}

/**
 * The send-off for a lift done well: as you press Next, a soft band of light
 * passes over the button now in its place, left to right, once. The screen
 * has already moved on, so it is whatever comes next that carries it.
 */
function Glint() {
  const [width, setWidth] = useState(0);
  const t = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    if (!width) return;
    Animated.timing(t, {
      toValue: 1,
      duration: 700,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [t, width]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        overflow: "hidden",
        borderRadius: radii.action,
        borderCurve: "continuous",
        pointerEvents: "none",
      }}
    >
      {width ? (
        <Animated.View
          style={{
            position: "absolute",
            top: -24,
            bottom: -24,
            left: 0,
            width: 16,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            boxShadow: "0 0 22px 10px rgba(255, 255, 255, 0.45)",
            opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-40, width + 40] }) },
              { rotate: "16deg" },
            ],
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * The deck's last card, in the workout's own colours. Laid out like every
 * other card — a small label, a big headline on the left, then what it
 * means — rather than a block of centred text. What is not done is the
 * headline, said plainly and never scolded: each is named on its own row, a
 * tap goes back to it, and finishing as it is is always fine. How it went is
 * a short list of facts, one to a line. Nothing about tomorrow here.
 */
function EndCard({ left, nothing, quip, facts, onFinish }: {
  /** The cards not done, by index. */
  left: number[];
  /** Not one card done. */
  nothing: boolean;
  quip: string;
  facts: string[];
  onFinish: () => void;
}) {
  const { state, setState } = useSession();
  const colors = useColors();
  const items = state.active?.items ?? [];
  const headline = nothing ? "Nothing done yet" : left.length > 0 ? `${left.length} not done` : "Done";
  return (
    <View style={{ flex: 1, backgroundColor: colors.ground, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 22, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <Text ui style={{ color: colors.text, opacity: 0.75, fontSize: 14, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>
            End of workout
          </Text>
          <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 52, lineHeight: 58 }}>
            {headline}
          </Text>
          {nothing ? (
            <Text style={{ color: colors.text, opacity: 0.85, fontFamily: fonts.regular, fontSize: 20, lineHeight: 27 }}>
              Swipe back to start, or end it here. It won't count, and {currentWorkout(state).name || "this workout"} stays next.
            </Text>
          ) : (
            <Text style={{ color: colors.text, fontFamily: fonts.italic, fontSize: 24, lineHeight: 30 }}>{quip}</Text>
          )}
        </View>

        {!nothing && facts.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
            {facts.map((fact) => (
              <View key={fact} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 25 }}>{fact}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {left.length > 0 && !nothing ? (
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.text, opacity: 0.85, fontFamily: fonts.regular, fontSize: 19, lineHeight: 25 }}>
              Swipe back to {left.length === 1 ? "it" : "them"}, or finish as it is.
            </Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              {left.slice(0, 5).map((i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`Back to ${cardName(state, i)}`}
                  onPress={() => setState((s) => goToCard(s, i))}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    minHeight: 52,
                    paddingHorizontal: 14,
                    borderRadius: radii.button,
                    borderCurve: "continuous",
                    backgroundColor: pressed ? colors.raised : colors.surface,
                  })}
                >
                  <Mark family={itemFamily(items[i])} size={18} color={colors.text} />
                  <WholeText style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 20 }}>
                    {cardName(state, i)}
                  </WholeText>
                  <Icon name="previous" size={15} color={colors.text} />
                </Pressable>
              ))}
              {left.length > 5 ? (
                <Text style={{ color: colors.text, opacity: 0.75, fontFamily: fonts.italic, fontSize: 17, paddingLeft: 14 }}>
                  and {left.length - 5} more
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={onFinish}
        style={({ pressed }) => ({
          minHeight: 60,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.button,
          borderCurve: "continuous",
          backgroundColor: colors.cloud,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 21 }}>
          {nothing ? "End without training" : left.length > 0 ? "Finish as it is" : "Finish workout"}
        </Text>
      </Pressable>
    </View>
  );
}

function Finished({
  hasSession,
  onCard,
}: {
  hasSession: boolean;
  /** Drawn as the deck's last card. */
  onCard?: boolean;
}) {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  // What is left, said plainly and never asked about: leaving early counts.
  const left = onCard
    ? (state.active?.items ?? []).map((_, i) => i).filter((i) => cardMark(state, i) === "todo")
    : [];

  // How it went, before the session is committed and gone.
  const t = sessionTally(state);
  const scored = t.hit + t.miss + t.drop;
  const mood: FinishedMood =
    t.lifts === 0
      ? "done"
      : t.unfinished * 2 >= t.lifts
        ? "partial"
        : t.drop > 0 || t.miss > t.hit
          ? "rough"
          : t.miss > 0 || t.unfinished > 0
            ? "mixed"
            : "perfect";
  const quip = pickLine(FINISHED_LINES[mood], String(state.active?.startedAt ?? ""));
  const nextUp = nextAfterSession(state);
  const facts = [
    scored > 0 ? `${t.hit} of ${scored} ${scored === 1 ? "lift" : "lifts"} on target.` : null,
    t.drop > 0 ? `${t.drop} going back a step next time.` : null,
    t.reload > 0 ? `${t.reload} ${t.reload === 1 ? "lift reloads" : "lifts reload"} next time.` : null,
    // Tomorrow's workout is tomorrow's business; only the full screen says it.
    !onCard && nextUp ? `Next up: ${nextUp.name || "Untitled"}.` : null,
  ].filter(Boolean);

  const close = () => {
    if (hasSession) setState((s) => finishWorkout(s));
    router.replace("/");
  };

  if (onCard) {
    const items = state.active?.items ?? [];
    return (
      <Field family={workoutFamily(state, currentWorkout(state))}>
        <EndCard
          left={left}
          nothing={items.length > 0 && left.length === items.length}
          quip={quip}
          facts={facts as string[]}
          onFinish={close}
        />
      </Field>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "space-between",
        backgroundColor: colors.bg,
        paddingTop: insets.top + 90,
        paddingHorizontal: 22,
        // The floating bar sits over the foot of the screen; clear it.
        paddingBottom: barSpace + 14,
      }}
    >
      <Column style={{ gap: 12 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 60, lineHeight: 66 }}>
          Done.
        </Text>
        {hasSession ? (
          <>
            <Text
              style={{
                color: mood === "perfect" ? colors.rise : colors.text,
                fontFamily: fonts.italic,
                fontSize: 28,
                lineHeight: 34,
              }}
            >
              {quip}
            </Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 19, lineHeight: 26 }}>
              {facts.join(" ")}
            </Text>
          </>
        ) : null}
      </Column>
      <Column>
        <Action label="Close" fill onPress={close} />
      </Column>
    </View>
  );
}
