import { inSentence } from "@/data/exercises";

/**
 * Goals: something you are learning, one step at a time — a handstand
 * push-up, a pistol squat — the way a tutorial teaches it.
 *
 * A goal is a ladder of steps, and each step is one drill, measured one of
 * three ways: reps in sets, holds in seconds, or minutes of practice. The
 * step you are on is done in every workout the goal is part of, as a block
 * of its own straight after the warm-up, while you are fresh.
 *
 * A step measured in reps or seconds moves on once you own it: every set on
 * target, two sessions running — the same standard as a lift's weight going
 * up. Practice has nothing to count, so it moves on when you say you've got
 * it. Nothing about a goal is built in: you write the steps, from the video
 * or from your head.
 */

export type Measure = "reps" | "hold" | "practice";

export type GoalStep = {
  id: string;
  /** What you do: "Pike push-up". */
  name: string;
  measure: Measure;
  /** Circles on screen. Practice has a single clock instead. */
  sets: number;
  /** Reps a set, seconds a hold, or minutes of practice. */
  target: number;
  /** The cue from the video: "Hips high, head through the arms". */
  note?: string;
};

export type Goal = {
  id: string;
  name: string;
  /** The tutorial it follows, if there is one. */
  link?: string;
  steps: GoalStep[];
  /** Index into `steps` of the step you are on. */
  at: number;
  /** Sessions in a row with the current step on target. Owned at `OWN_AFTER`. */
  streak: number;
  /**
   * When each step was owned, by step id. Kept when you step back down the
   * ladder, so the date is still there when you climb past it again.
   */
  owned: Record<string, number>;
  /** The workouts it is practised in, by id. */
  workouts: string[];
  /**
   * When the goal was set: "since 14 Oct", "in 9 weeks". 0 for a starting
   * goal nobody has taken up yet; it is set the day it starts (`isStarted`).
   */
  since: number;
  /** When the last step was owned. A learned goal leaves every workout. */
  learned?: number;
};

/** Sessions running with every set on target that own a step. */
export const OWN_AFTER = 2;

/**
 * Goals are put away while Klay is cut back to its core (the full app is the git tag full-app-2026-11-13):
 * no Goals in Plan, none in a workout, none on Progress. Everything behind
 * them is kept, and saved goals stay saved, so turning this on brings them
 * back as they were. They return when they have a simpler design.
 */
export const GOALS_ON: boolean = false;

/**
 * Whether a goal has begun: it is in a workout, or it has climbed. One that
 * is only written down — the starting goal, or one of yours not placed yet —
 * waits in Plan, not in Progress.
 */
export const isStarted = (goal: Goal): boolean =>
  goal.workouts.length > 0 ||
  goal.at > 0 ||
  goal.streak > 0 ||
  Object.keys(goal.owned).length > 0 ||
  goal.learned !== undefined;

/**
 * The goal a fresh install comes with: the handstand push-up, the way the
 * tutorial in its link teaches it. Crow and the stands first, for balance;
 * then planche leans and pike push-ups, shifting the weight forward until the
 * feet float; then the whole move, put together. Positions are holds,
 * strength is reps, and the two that are coordination — the feet floating,
 * the whole move — are practice, done when you say so.
 *
 * It starts in no workout, so nobody meets a handstand they didn't ask for:
 * it waits in Plan until it is switched on. A save from before goals existed
 * picks it up too, since a missing list is filled in from the start.
 */
export const STARTING_GOALS: Goal[] = [
  {
    id: "handstand_push_up",
    name: "Handstand push-up",
    link: "https://www.facebook.com/share/v/1DuLJyBGvj/",
    steps: [
      {
        id: "crow",
        name: "Crow pose",
        measure: "hold",
        sets: 3,
        target: 20,
        note: "Knees on the backs of the arms, eyes forward",
      },
      {
        id: "handstand",
        name: "Handstand",
        measure: "hold",
        sets: 3,
        target: 20,
        note: "Against a wall to start, from crow when you can",
      },
      {
        id: "forearm_stand",
        name: "Forearm stand",
        measure: "hold",
        sets: 3,
        target: 20,
        note: "Against a wall to start",
      },
      {
        id: "planche_lean",
        name: "Planche lean",
        measure: "hold",
        sets: 3,
        target: 20,
        note: "Straight arms, shoulders past the hands",
      },
      {
        id: "lean_press",
        name: "Planche lean, bend and press",
        measure: "reps",
        sets: 3,
        target: 5,
        note: "Lean, bend the elbows, press back up",
      },
      {
        id: "pike_lean",
        name: "Pike push-up, leaning forward",
        measure: "reps",
        sets: 3,
        target: 8,
        note: "A little further forward each session",
      },
      {
        id: "pike_float",
        name: "Pike push-up, feet floating",
        measure: "practice",
        sets: 1,
        target: 5,
        note: "Walk the feet in until the weight shifts and they lift",
      },
      {
        id: "whole_move",
        name: "The whole move",
        measure: "practice",
        sets: 1,
        target: 5,
        note:
          "Crow → headstand lean → bent-arm stand → handstand → planche lean → press up",
      },
    ],
    at: 0,
    streak: 0,
    owned: {},
    workouts: [],
    since: 0,
  },
];

/** How a step's number moves in the step sheet, and where a new one starts. */
export const TARGET_LIMITS: Record<
  Measure,
  { min: number; max: number; step: number; start: number }
> = {
  reps: { min: 1, max: 30, step: 1, start: 5 },
  hold: { min: 5, max: 120, step: 5, start: 20 },
  practice: { min: 1, max: 20, step: 1, start: 5 },
};

export const GOAL_SETS = { min: 1, max: 6, start: 3 } as const;

/** Holds come down five seconds a tap, like a timed lift. */
export const GOAL_HOLD_STEP = 5;

/** The step you are on, or undefined for a goal with no steps yet. */
export const currentStep = (goal: Goal): GoalStep | undefined =>
  goal.steps[Math.min(goal.at, goal.steps.length - 1)];

/** Whether the step at an index is behind you. A learned goal has every one. */
export const isOwned = (goal: Goal, index: number): boolean =>
  !!goal.learned || index < goal.at;

/** "3 × 8", "3 × 45 s", "5 min". */
export const stepAmount = (step: GoalStep): string =>
  step.measure === "practice"
    ? `${step.target} min`
    : `${step.sets} × ${step.target}${step.measure === "hold" ? " s" : ""}`;

/** The step sheet's own words for what moves a step on. */
export const movesOnWhen = (measure: Measure, target: number): string =>
  measure === "practice"
    ? "Moves on when you say you've got it. Practice has nothing to count."
    : measure === "hold"
      ? `Moves on when every hold reaches ${target} s, two sessions running.`
      : `Moves on when every set reaches ${target}, two sessions running.`;

/** Under the circles before they are in: what owning this step takes. */
export const ruleLine = (step: GoalStep): string =>
  step.measure === "practice"
    ? "Move on when it's easy, every time. Your call."
    : step.measure === "hold"
      ? `Move on: every hold to ${step.target} s, two sessions running.`
      : `Move on: every set at ${step.target}, two sessions running.`;

/** Every circle in and none short. */
export const onTarget = (step: GoalStep, logged: (number | null)[]): boolean =>
  logged.length > 0 && logged.every((r) => r !== null && r >= step.target);

/** How a session went on a goal step. */
export type GoalOutcome = "owned" | "hit" | "miss" | "practised";

/** "Step 3 next time: kick-ups to the wall." — or, after the last, the goal learned. */
export const nextStepLine = (goal: Goal, index: number): string => {
  const next = goal.steps[index + 1];
  return next
    ? `Step ${index + 2} next time: ${inSentence(next.name)}.`
    : "Goal learned. It lives in Progress now.";
};

/**
 * What a session on one step does to its goal, worked out once, when the
 * workout ends — and on screen beforehand, so the line under the circles
 * can never disagree with what happens.
 *
 * A step changed in Plan while the session ran is logged as it went but
 * moves nothing: the ladder has moved under it.
 */
export const applyGoal = (
  goal: Goal,
  stepId: string,
  logged: (number | null)[],
  got: boolean,
  now: number,
): { goal: Goal; outcome: GoalOutcome } => {
  const step = goal.steps.find((s) => s.id === stepId);
  const current = currentStep(goal);
  const live = !!step && current?.id === stepId && !goal.learned;

  const own = (): Goal => {
    const at = goal.at + 1;
    const owned = { ...goal.owned, [stepId]: now };
    return at >= goal.steps.length
      ? { ...goal, owned, streak: 0, at: goal.steps.length - 1, learned: now }
      : { ...goal, owned, streak: 0, at };
  };

  if (!step || step.measure === "practice") {
    return got && live ? { goal: own(), outcome: "owned" } : { goal, outcome: "practised" };
  }
  if (!onTarget(step, logged)) {
    return { goal: live ? { ...goal, streak: 0 } : goal, outcome: "miss" };
  }
  if (!live) return { goal, outcome: "hit" };
  return goal.streak + 1 >= OWN_AFTER
    ? { goal: own(), outcome: "owned" }
    : { goal: { ...goal, streak: goal.streak + 1 }, outcome: "hit" };
};
