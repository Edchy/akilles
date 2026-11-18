# Archive

What was put away when Humbell was cut back to its core (November 2026), and how
to get each thing back. Nothing here was lost.

## The full app

The app as it was before the cut is the git tag **`full-app-2026-11-13`**
(also the `main` branch at that date). `git checkout full-app-2026-11-13`
shows all of it; `git diff full-app-2026-11-13 core` shows what changed since.

## Put away, still in the code

| What | Where it lives | How to bring it back |
| --- | --- | --- |
| **Goals** — skills learned a step at a time inside a workout (the handstand push-up ladder). Liked as an idea, too cluttered as built; to be redesigned. | `src/data/goals.ts`, `src/components/goals.tsx`, `src/components/goal-progress.tsx`, the goals section of `src/store/session.ts`, `GoalBlock` in `src/app/workout.tsx`. Its tests are in `tests/archived/goals.cjs`. | Set `GOALS_ON` to `true` in `src/data/goals.ts` and move the test back to `tests/`. Saved goals were never touched. |

## Tried and set aside

| What | Why | Where |
| --- | --- | --- |
| **Films computed from a skeleton** ("Humbell's marks") as the picture of every movement. | Open, side-on poses read; folded and floor poses turn into a pile of limbs, and the trunk can't bend. | `src/motion/`, `src/components/film.tsx`. Still shown wherever there is no drawing; sixteen that don't read show their photo instead (`RESHOOT` in `src/motion/moves.ts`). |
| **Drawn figure four and lying twist.** | Knotted floor stretches don't read drawn either; they are clay now. | `art/drawn/figure_four-0.png`, `art/drawn/supine_twist-0.png`. |

Add a row here whenever something is cut or put away.
