# Achilles

A workout app with one job: open it and know exactly what to do.

No planning, no picking, no thinking. One exercise on screen at a time with the
weight and reps already decided.

## Run

```bash
npm install
npm start
```

## How it works

**The split** — five workouts in a cycle. It advances *when you train*, not when
the calendar moves: miss a day and you pick up at the next workout. There is no
debt and nothing to make up.

| | | Main slots | Floaters |
|---|---|---|---|
| 1 | **Push · Pull · Heavy** | h-press, v-pull, v-press `4x5` · h-pull `3x8` | rear delts, biceps, triceps, abs |
| 2 | **Legs · Heavy** | squat, hinge `4x5` · lunge, hamstrings, calves `3x8` | biceps, triceps, abs |
| 3 | **Push · Pull** | h-press, v-pull, v-press `3x8` · h-pull `3x12` | side delts, biceps, triceps, abs |
| 4 | **Legs · Explosive** | jump `5x3` · speed squat, speed hinge `6x3` · quads, hamstrings | calves, biceps, triceps, abs |
| 5 | **Shoulders · Arms** | h-press, v-pull, v-press, h-pull `3x12` · side delts | rear delts, biceps, triceps, abs |

Every workout ends with the same three floaters — biceps, triceps, abs at 2
sets — so arms and abs are trained every day without outweighing the compounds.

Weekly sets per slot:

```
Horizontal press  10     Horizontal pull    9     Rear delts    4
Vertical pull     10     Hamstrings         6     Squat         4
Vertical press    10     Calves             6     Hinge         4
Biceps            10     Side delts         6     Quads         4
Triceps           10     Speed squat/hinge  6     Lunge         3
Abs               10     Jump               5
```

Every pattern gets direct work, nothing sits below 3 sets, and pressing and
pulling are matched. Squat and hinge read low because their heavy sets are
`4x5` — the compound work is the reps, not the set count, and speed squats
and jumps add five more lower-body exposures on top.

**Slots, not fixed exercises.** Each module is a fixed sequence of *slots* —
"Horizontal press", "Vertical pull", "Biceps" — and a slot offers every
exercise of its movement type. The slot is the module's contract, so the
muscles trained stay the same however you fill it.

Swap with the `⇄` next to the exercise name during a workout, before you log
the first set — swapping after that would throw the work away. The choice
sticks as the module's new default, and **Plan** shows what each slot is set to.

**Progression follows the exercise, not the slot.** Swap bench for dumbbell
bench and you get dumbbell bench's own weight and ladder, not bench's numbers
applied to dumbbells; swap back weeks later and barbell bench resumes exactly
where it left off.

**The same lifts come back at different rep ranges.** Bench is `4x5` on day 1 and
`3x8` on day 3, on *independent ladders at independent weights*. Each main lift
is therefore trained twice a cycle rather than once, so it progresses twice as
fast and you get familiar with a small number of movements. Day 5 is the
exception — machines and cables, lighter on the joints.

**Day 4 is explosive work**, borrowed from PHAT and Candito. Jumps come first
— they are the most neurally demanding, so they want you fresh — then loaded
speed work: sets of three at 65% of your heavy-day weight, moved fast.

That 65% is **derived, not tracked**. Speed squat reads whatever your heavy
squat currently is and takes a fraction of it, so it keeps up on its own with
no second number to maintain and no 1RM test. Jumps have no weight at all.
Neither is rated or progressed — you make a jump harder by jumping higher, and
speed work by moving faster, and the app does not try to measure either.

**Warm-ups** run before the first exercise of each muscle group: three ramping
sets at 40/60/80% of the working weight, for 10/6/3 reps. Tap each one as you
finish it — **Ready** stays inert until all three are ticked, so the screen
cannot be tapped past without reading. Nothing here is logged or affects
progression; bodyweight and timed movements get no ramp at all.

**Arms and abs every day**, always the last three, always 2 sets so they don't
outweigh the compounds over a week. All three are floaters: fold them into an
earlier lift's rest period and the session doesn't get longer.

Weekly sets land at 10 for each press/pull pattern, 10 each for biceps, triceps
and abs, 7 for squat and hinge.

**Logging a set** — one circle per set. Tap it and it fills at the target reps;
tap again and it counts down if you got fewer; tap past 1 and it clears.

```
( 5 )( 5 )(  )(  )      tap        ( 5 )( 5 )( 5 )(  )
( 5 )( 5 )( 5 )(  )     tap tap    ( 5 )( 5 )( 4 )(  )   ← short, shown coral
```

The weight is an input. Type into it or use −/+ to step by one increment,
any time you want.

**Progression** — only once every set hit its target are you asked how it felt:

| | |
|---|---|
| 👍 | climb the rep ladder — 8 → 10 → 12 |
| 👍 at the top | weight += increment, back to the bottom rung |
| 👎 | hold everything, repeat it exactly |
| 👎 twice in a row | deload 10%, back to the bottom rung |

**A short session asks nothing.** If any set came in under target there is no
thumbs question — missing reps already says the weight was too much, so the
same prescription simply comes back next time.

Strength days use the 5 → 6 → 8 ladder at 4 sets; volume days use 8 → 10 → 12 at
3 sets. Each exercise is tracked **separately per scheme** — bench on a strength
day and bench on a volume day sit on their own ladders at their own weights.

**Superset** folds an arms/abs exercise from later in the workout into the
current one, removing it from the tail so it isn't done twice. Only entries
marked `floater: true` in `split.ts` are offered.

A `×` on the partner card undoes the pairing: the exercise goes back to its own
place in the workout's slot order, keeping any sets already logged against it.

The partner gets **its own circles**, its own target, and its own weight
record — a supersetted curl progresses on the same ladder it would have on its
own. Both sets of circles must be filled before the exercise counts as done,
and both must hit target for the thumbs question to appear. The single 👍/👎
then applies to both.

## Screens

Three tabs, plus the workout itself which takes over the screen.

| Tab | |
|---|---|
| **Today** | The next workout and its exercises. One button: Start. |
| **History** | Every exercise you've trained, its current weight and next target. |
| **Plan** | Two segments: **Workouts** (the five sessions and what fills each slot) and **Exercises** (the catalogue of every movement). |

Both segments are accordions — one workout or one category open at a time, so
the whole list fits on a screen.

The **Exercises** segment is the catalogue of what exists, **grouped by
muscle** — Chest,
Back, Shoulders, Arms, Quads & squats, Hamstrings & hinge, Calves, Core,
Explosive. So an overhead press sits under Shoulders, where you would look for
it, with its movement type shown underneath as a subtitle.

That finer movement type is still what slots match on; it just is not the
browsing structure.

`+` on a heading adds an exercise: name it, pick which movement types it counts
as, and say how its weight moves. `−` removes any exercise, built-in or not,
after a confirmation — **unless it is the last one of a movement type**, since
a slot of that type would then have nothing to prescribe. A removed exercise
keeps its training history, so adding it back later resumes where it left off.

**An exercise can belong to more than one type.** A hip thrust is both a hinge
and hamstring work; dips are a horizontal press and triceps work; a chin-up is
a vertical pull and biceps work. Those appear under every heading they belong
to, and in every slot of those types. When adding one, "also counts as" picks
the extra categories.

**But it can only fill one slot per module.** If hip thrust is your Hinge on
Lower · Strength, the Hamstrings slot still lists it — greyed out and marked
**in use** — so it is clear *why* you cannot pick it rather than the option
silently vanishing. Your current pick is never greyed in its own slot.

The catalogue says what *exists*; the swap button says what a workout *uses*.
The two always agree: a slot offers exactly the exercises the library files
under its type, minus whatever another slot in that module has taken.

**Dumbbell weights are per hand.** A dumbbell exercise stores and shows the
weight of *one* dumbbell, marked `×2` — `20 kg ×2`, not `40 kg` — because that
is the number written on the thing you pick up. Progression, warm-up ramps and
History all follow the same convention.

**Bodyweight movements go negative.** Pull-ups, chin-ups and dips can be done
on an assist machine, so their weight runs below zero:

```
−30 kg assist   →   Bodyweight   →   +10 kg added
```

Progress is the assistance shrinking toward zero, then load being added past
it — one continuous scale, one number. Everything else still floors at zero,
since a barbell cannot weigh less than nothing.

**The bottom bar is one persistent element.** It is mounted once in the root
layout and never animates — screens slide in from the right underneath it, and
only its buttons change. Mounting a second bar per screen was what made the
Start button appear to slide as the tab bar faded out.

The workout takes over the screen — the exercise name and the weight are the
surface, not contents of a card. The superset panel sits directly below the
circles.

A segmented bar across the top shows one mark per exercise — acid for done,
grey for the one you are on, dim for what is left — with the count beside it.

**Supersetting never changes the total.** A paired screen holds two exercises,
so its segment is twice as wide and the count stays put — `1/8` before and
after. Finishing that screen advances the count by two, because two exercises
were done.

While a workout is running the bar carries its buttons instead of the tabs — same surface, height and weight as the tab
bar on the other screens, so navigation looks the same everywhere:

```
     ←           (×)          →
   Back        Leave        Skip
```

Back steps to the previous exercise with its circles still filled, so a
mis-tap is fixable. Skip moves on.

**Leave is press-and-hold.** The circle around the `×` fills from the bottom
up over a second; let go early and it drains away with nothing changed. Ending
the session is consequential enough that a stray thumb mid-set should not do
it, but not so grave that it deserves a confirmation dialog.

Every control is at least the 44pt platform minimum — the bar is 72pt tall to
hold a full-size target plus its label.

**Nothing is saved until the workout ends.** Circle taps, weight edits, thumbs
and skips all live on the session, so Back can revisit any exercise and change
what you answered. The single commit happens when you finish the last exercise
or press Leave — a session you abandon by closing the app entirely is lost, and
that is the intended trade for being able to change your mind freely.

**A skip records nothing** — the weight and rep ladder come back next time
exactly as they were. The flag is written when the workout *ends*, not when
you tap Skip, so a skip you undo with Back leaves no trace. Anything you never
reached because you left early counts the same way. Skips show in History and
in the line under the weight, so a lift you keep avoiding becomes visible
rather than silently stalling.

Dark throughout: black ground, acid green for the weight and for a set that hit
target, coral for one that came up short.

## Editing your training

| What | Where |
|---|---|
| Slots, their exercise pools, and rep schemes | `src/data/split.ts` |
| The menu of available exercises | `src/data/exercises.ts` |
| Progression rules and rep ladders | `src/lib/progression.ts`, `src/data/split.ts` |

`split.ts` is the one you'll actually edit — swap an `exerciseId`, reorder the
list, mark something `floater: true` to make it superset-able. `exercises.ts` is
the menu those ids come from.

## Known gaps

- **State is in-memory.** Closing the app resets everything. Needs AsyncStorage.
- No rest timer between sets.
- History shows current state per exercise, not a session-by-session log.
- **Starting weights are guesses** (`STARTING_WEIGHT` in `progression.ts`). You
  correct each one on its first session.
- No way to log what you *actually* did if it differs from the prescription.

Product direction and research notes live in [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md).
