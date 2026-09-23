# Akilles

A workout app with one job: open it and know exactly what to do.

No planning, no picking, no thinking. One exercise on screen at a time with the
weight and reps already decided.

## Run

```bash
npm install
npm start
```

## How it works

**The split** — workouts in a cycle, top to bottom and round again. It advances
*when you train*, not when the calendar moves: miss a day and you pick up at the
next workout. There is no debt and nothing to make up.

A fresh install starts with the five below — push, pull, legs, push, pull.
They are a starting point, not a fixture — see
[Editing your training](#editing-your-training).

| | | Main lifts | Arms & abs |
|---|---|---|---|
| 1 | **Push A** · chest focus | DB bench `3x6–10` · DB shoulder press `3x8–12` · cable crossover `3x12–15` · dips `3x6–12` | hanging leg raise `3x10–15` |
| 2 | **Pull A** · vertical pull focus | pull-ups `3x5–10` · barbell row `3x6–10` · row machine `3x10–12` | barbell curl `3x8–12` · ab machine `3x12–15` |
| 3 | **Legs** | back squat `3x6–10` · RDL `3x8–10` · Bulgarian split squat `2x8–10` | hanging leg raise `3x10–15` |
| 4 | **Push B** · shoulder focus | DB shoulder press `3x6–10` · DB bench `3x10–12` · cable crossover `3x12–15` | pushdown `3x10–15` · ab machine `3x12–15` |
| 5 | **Pull B** · row focus | lat pulldown `3x8–12` · DB row `3x8–12` · row machine `3x10–12` | DB curl `3x10–12` · hanging leg raise `3x10–15` |

Pull-ups and dips are "as many as you can" in spirit. Here they climb a rep
range like everything else, and topping it out adds weight — or takes
assistance off, on an assist machine.

**Slots, not fixed exercises.** Each module is a sequence of *slots* —
"Horizontal press", "Vertical pull", "Biceps" — and a slot offers every
exercise of its movement type. The slot is the module's contract, so the
muscles trained stay the same however you fill it. The slots themselves are
yours to add, remove and reorder in **Plan**.

Swap with the `⇄` next to the exercise name during a workout, before you log
the first set — swapping after that would throw the work away. A swap there is
**for this session only**: the machine is taken today, so next time the usual
exercise comes back. To change what a slot uses for good, change it in
**Plan**.

**Progression follows the exercise, not the slot.** Swap bench for dumbbell
bench and you get dumbbell bench's own weight and ladder, not bench's numbers
applied to dumbbells; swap back weeks later and barbell bench resumes exactly
where it left off.

**The same lifts come back at different rep ranges.** DB bench is `6–10` on
Push A and `10–12` on Push B, on *independent ladders at independent weights*,
so each main lift is trained twice a cycle and progresses on both.

**Warm-ups** run before the first exercise of each muscle group: three ramping
sets at 40/60/80% of the working weight, for 10/6/3 reps. Tap each one as you
finish it — **Ready** stays inert until all three are ticked, so the screen
cannot be tapped past without reading. Nothing here is logged or affects
progression; bodyweight and timed movements get no ramp at all.

**Arms and abs close each session**; fold them into an earlier lift's rest
period as a superset and the session doesn't get longer. They get no warm-up
ramp — by then they are warm.

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
| 👍 | climb the rep ladder — 6 → 8 → 10 |
| 👍 at the top | weight += increment, back to the bottom rung |
| 👎 | hold everything, repeat it exactly |
| 👎 twice in a row | deload 10%, back to the bottom rung |

**A short session asks nothing.** If any set came in under target there is no
thumbs question — missing reps already says the weight was too much, so the
same prescription simply comes back next time.

**Rep ranges.** A slot climbs from the bottom of its range to the top in three
rungs — `6–10` is 6 → 8 → 10, `12–15` is 12 → 14 → 15 — or rep by rep when the
range is too narrow for that: `8–10` is 8 → 9 → 10. Each exercise is tracked
**separately per rep range**: bench at 6–10 and bench at 10–12 sit on their
own ladders at their own weights, and changing a slot's range starts that lift
on a new record.

**Superset** folds any lift from later in the workout into the current one,
removing it from further down so it isn't done twice. What to pair is your
call: every lift still ahead is offered.

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
| **Today** | The next workout, large and nothing else. **Start**, or **Skip** to move the cycle on without recording anything (with an Undo for a mis-tap). |
| **History** | Every exercise you've trained, its current weight and next target. |
| **Plan** | Two segments: **Workouts** (your sessions, their order, and what fills each slot) and **Exercises** (the catalogue of every movement). |

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

**Your training is saved to the device.** The cycle position, your slot
choices, exercises you have added or removed, and the full per-exercise history
are written to AsyncStorage after every change and read back on launch. It is
one small JSON blob; a year of training is around 35KB.

**Nothing is committed to history until the workout ends.** Circle taps, weight
edits, thumbs and skips all live on the session, so Back can revisit any
exercise and change what you answered. The single commit happens when you
finish the last exercise or press Leave.

**Leaving before you've trained anything cancels.** If no set was logged and no
distance entered, Leave simply closes the workout: the same one stays next and
nothing is flagged as skipped. Starting and bailing should not drop a workout
from the rotation.

**A workout in progress survives until the end of the day it was started.**
Close the app mid-session, or have the OS kill it, and reopening puts you back
on the same exercise with your circles still filled. Come back the next day and
the session is closed out as if you had pressed Leave — what you trained counts,
the rest is skipped, and the cycle moves on — so a dead phone never costs you a
session's progress. It is a calendar day in the phone's own timezone, not
twenty-four hours: a workout begun at 9pm is stale by the next morning, not by
the next evening.

**A skip records nothing** — the weight and rep ladder come back next time
exactly as they were. The flag is written when the workout *ends*, not when
you tap Skip, so a skip you undo with Back leaves no trace. Anything you never
reached because you left early counts the same way. Skips show in History and
in the line under the weight, so a lift you keep avoiding becomes visible
rather than silently stalling.

Dark throughout: black ground, acid green for the weight and for a set that hit
target, coral for one that came up short.

## Editing your training

Everything about the program is edited in the app, under **Plan → Workouts**.

**Workouts.** Any number from one up; with one, it simply repeats.
- **+ New workout** adds an empty one at the bottom of the cycle.
- **Hold and drag** a workout to reorder the cycle. Dragging only changes the
  order — whatever was next stays next, and the cycle carries on from wherever
  it now sits.
- **Do next** makes a workout the next one Start runs. It is the only way to
  change what is next, other than finishing a workout.
- **Rename** edits its name and the line under it.
- **Remove** takes two taps. If it was next, the one after it becomes next.
  The last workout cannot go. History is per exercise, not per workout, so
  removing one loses no training.
- A removed built-in workout goes to **Removed** at the bottom of the list,
  kept exactly as you left it; **Put back** returns it to where it sat. A
  workout you created yourself is deleted outright instead.

Everything here is saved on the phone (AsyncStorage, under `achilles/state`)
after every change, so it survives reloads and restarts. It is lost only if
Expo Go's data is cleared or the app is uninstalled.

**Exercises inside a workout.** Tap a workout open, then tap an exercise to
see what it can be swapped for; tap one and it's swapped. **Sets & reps**
under the list changes the set count and rep range (any bottom and top, 1–30),
and **Remove** takes it out of the workout.

**+ Add exercise** adds a slot by movement type, filled with the first exercise
of that type the workout is not already using. **Hold and drag** a slot to
reorder it within the workout.

Edits to a workout that is in progress take effect from its next run; the
session you are in keeps the shape it started with.

| What | Where |
|---|---|
| The starting program a fresh install opens with | `src/data/split.ts` |
| The menu of available exercises | `src/data/exercises.ts` |
| Progression rules and rep ladders | `src/lib/progression.ts`, `src/data/split.ts` |

## Known gaps

- **Your training lives only on this phone.** It survives closing the app and
  restarting the device, but uninstalling, wiping, or moving to a new phone
  loses it. There is no export and no sync yet.
- No rest timer between sets.
- History shows current state per exercise, not a session-by-session log.
- **Starting weights are guesses** (`STARTING_WEIGHT` in `progression.ts`). You
  correct each one on its first session.
- No way to log what you *actually* did if it differs from the prescription.

Product direction and research notes live in [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md).
