/**
 * Chains: an exercise you climb to, one step at a time — a pull-up, a
 * push-up. The chain belongs to the exercise, not to a workout: put a
 * pull-up in any workout and it is done at your step, and owning a step in
 * one workout moves you on in all of them (`state.steps`).
 *
 * Each step is an exercise of its own, so it keeps its own history and
 * progresses as any lift does — a hang's seconds grow, a push-up's reps
 * climb. Owning a step (its top, on target) offers the next; Easier and
 * Harder on the card move between them any day.
 *
 * Where you start is found at the bar, not guessed at in onboarding: the
 * first time the chain comes up, the card asks one plain question — two at
 * most — and puts you on your step (`place`).
 */

export type ChainStep = {
  exerciseId: string;
  /** Why this step comes where it does, in one sentence. */
  why: string;
};

/** A first-time question: each answer is a step, or a further question. */
export type Placement = {
  question: string;
  answers: { label: string; step?: number; then?: Placement }[];
};

export type Chain = {
  /** The exercise a workout names: "pullup". */
  id: string;
  name: string;
  steps: ChainStep[];
  /** The step a workout is built on before you have been placed. */
  start: number;
  place: Placement;
};

export const CHAINS: Chain[] = [
  {
    id: "pullup",
    name: "Pull-up",
    start: 0,
    steps: [
      { exerciseId: "dead_hang", why: "Your hands and shoulders get used to holding you. Every pull-up starts from this hang." },
      { exerciseId: "scap_pullup", why: "The first move of every pull-up: shoulders down, before the arms bend." },
      { exerciseId: "pullup_negative", why: "Lowering slowly builds the strength to pull up. You get to the top with a step or a jump." },
      { exerciseId: "pullup", why: "The whole pull-up. Use the assist machine or a band until you can do them on your own." },
    ],
    place: {
      question: "Try one pull-up. How many can you do with good form?",
      answers: [
        {
          label: "None",
          then: {
            question: "Can you hang from the bar for 20 seconds?",
            answers: [
              { label: "Yes", step: 1 },
              { label: "No", step: 0 },
            ],
          },
        },
        { label: "1 to 4", step: 2 },
        { label: "5 or more", step: 3 },
      ],
    },
  },
  {
    id: "push_up",
    name: "Push-up",
    start: 1,
    steps: [
      { exerciseId: "wall_push_up", why: "The lightest push-up: you learn to move as one piece." },
      { exerciseId: "incline_push_up", why: "Hands on a bench. The lower the bench, the more of you there is to push." },
      { exerciseId: "knee_push_up", why: "On the floor, from your knees: most of a push-up, a little lighter." },
      { exerciseId: "push_up", why: "The whole push-up, from your toes." },
      { exerciseId: "decline_push_up", why: "Feet up on a bench: more of you over your hands." },
    ],
    place: {
      question: "Do push-ups. How many can you do with good form?",
      answers: [
        { label: "None", step: 1 },
        { label: "1 to 5", step: 2 },
        { label: "6 or more", step: 3 },
      ],
    },
  },
  {
    id: "handstand",
    name: "Handstand",
    start: 0,
    steps: [
      { exerciseId: "tripod_knees_elbows", why: "Head and hands take your weight while you learn to balance upside down." },
      { exerciseId: "tripod_headstand", why: "The same balance with your legs up: your first time fully upside down." },
      { exerciseId: "pike_push_up", why: "Hips high, you press with your shoulders. That is the strength a handstand stands on." },
      { exerciseId: "wall_walk", why: "Feet up the wall, hands closer each time: more of you over your hands." },
      { exerciseId: "wall_handstand", why: "Chest to the wall, arms straight: a handstand, with the wall to keep you there." },
      { exerciseId: "handstand", why: "On your own. Learn to step down safely before you try to hold it." },
    ],
    place: {
      question: "Try a handstand against a wall, chest facing the wall. Can you hold it for 20 seconds?",
      answers: [
        {
          label: "No",
          then: {
            question: "Can you balance on your head and hands, with your knees resting on your elbows?",
            answers: [
              { label: "Yes", step: 1 },
              { label: "No", step: 0 },
            ],
          },
        },
        { label: "Yes", step: 5 },
      ],
    },
  },
];

/** The chain an exercise names, if it is one. */
export const chainFor = (exerciseId: string): Chain | undefined => CHAINS.find((c) => c.id === exerciseId);

/** The chain a step belongs to, and where in it. */
export const chainOfStep = (exerciseId: string): { chain: Chain; at: number } | undefined => {
  for (const chain of CHAINS) {
    const at = chain.steps.findIndex((s) => s.exerciseId === exerciseId);
    if (at >= 0) return { chain, at };
  }
  return undefined;
};
