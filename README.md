# Milo

A workout app with one job: open it and know exactly what to do.

No planning, no picking, no thinking. One exercise on screen at a time with the
weight and reps already decided.

**Own the weight.** Most gym apps count how much you lift. Milo counts how
much you own. A rep counts when you lower it under control, hold it where it is
hardest, and lift it without a swing or a bounce — so start lighter than your
ego wants and log only the reps you owned. Progress is slow on purpose: every
lift [reloads](#reloads) as it climbs, so form keeps up with the number.

## Run

```bash
npm install
npm start
```

## How it works

**The split** — workouts in a cycle, top to bottom and round again. It advances
*when you train*, not when the calendar moves: miss a day and you pick up at the
next workout. There is no debt and nothing to make up.

A fresh install starts with the three below — push, pull, legs — so legs
come round as often as the rest, and three visits a week is about a lap a
week. They are a starting point, not a fixture — see
[Editing your training](#editing-your-training).

| | | Main lifts | Arms & abs |
|---|---|---|---|
| 1 | **Push** · chest, shoulders | DB bench `3x` · DB shoulder press `3x` · cable crossover `3x` | triceps pushdown `3x` · ab crunch machine `2x` |
| 2 | **Pull** · back, arms | lat pulldown `3x` · seated cable row `3x` · face pull `3x` | DB curl `3x` · plank `2x` |
| 3 | **Legs** · legs, hips | goblet squat `3x` · DB Romanian deadlift `3x` · leg press `3x` · leg curl `3x` | |

Every lift climbs **6 → 8 → 10 → 12** reps — except the small muscles:
triceps, biceps, shoulders, calves and core climb **10 → 12 → 14**, since
they do their best work on ten reps or more. Dips and close-grip bench are
presses first, so they keep their six; planks keep their 30–60 seconds. Abs
are always two sets.

The picks are ones a first-timer can lower slowly and lift without swinging
from the first day: dumbbells, cables and machines. The harder versions —
pull-ups, dips, barbell squats and rows — are one swap away. Pull-ups and
dips climb a rep range like everything else, and topping it out adds weight
— or takes assistance off, on an assist machine.

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

**An exercise in two workouts is one ladder.** Put DB bench in a workout of
your own as well as Push and it is *one* ladder at one weight, so both days
move it along — and in the new workout it starts where you left it.

**Warm-ups** run before the first exercise of each muscle group: three ramping
sets at 40/60/80% of the working weight, for 10/6/3 reps. Tap each one as you
finish it — **Ready** stays inert until all three are ticked, so the screen
cannot be tapped past without reading. Nothing here is logged or affects
progression; bodyweight and timed movements get no ramp at all. **Skip** on a
warm-up is refused once with a word from Milo; pressed again it skips the
warm-up only and goes straight to that exercise's working sets.

**Arms and abs close each session**; fold them into an earlier lift's rest
period as a superset and the session doesn't get longer. They get no warm-up
ramp — by then they are warm.

**On a day that presses, the shoulder warm-up comes straight after the opening
cardio**, before any goal or lift: a ball on the wall under the front of each
shoulder, 15 band pull-aparts, and 12 band external rotations each side —
about three minutes. A day presses when any of its lifts is a press or a
chest fly. Take it out, put it back, or add it to any other day from the
workout's Warm-up row in Plan; its moves are edited like a stretch routine's.
It runs as the same deck of cards as mobility, below, except that a move done
for reps has no countdown: its button is **Done**, and it moves you on.

**Mobility closes each session** as a deck of cards, one per stretch and one
per side where a stretch has two: the picture, the name, a line on how, and a
countdown. One big button does everything — Start, Pause, Resume, then Next
once the hold runs out (the phone buzzes), and Finish on the last card. Swipe
to move between cards at any time; swiping away mid-hold pauses it. Nothing
is recorded.

**Cardio and mobility belong to each workout.** Out of the box every workout
opens on the treadmill (1 km, timed), finishes on the ski-erg (5 minutes, for
distance), and ends on the **everyday stretch**: couch stretch, world's
greatest stretch, figure-four, seated hamstring, a chest and shoulder opener
and child's pose — about seven minutes. Open a workout in **Plan** to change
any of it: the machine, a set distance or a set time and how long, the
routine — or take a block out altogether. Each length keeps its own record, so
a 2 km run on leg day never competes with the 1 km on push day. A swap with
`⇄` mid-workout is for today only, as with lifts. So is a different length:
tap "1 km" on the cardio screen to make it 2 km, then choose **Just today** or
**Every time in Push**. The warm-up is never a race: its line says to go at an
easy pace, and only the finishing block cheers a faster time. Exercises →
Cardio → a machine lists every workout that uses it, each with its own − and +.

**Where to change what.** Exercises is what a thing is, the same in every
workout: a lift's name, weight step and note (its weight follows it too), a
machine's note, a routine's stretches. A workout is how it uses them: which
exercises, their order, sets and reps, which machine and how far, which
routine. A running workout is just today.

**Routines are yours to change**, from a workout's Mobility sheet or from
Exercises → Mobility: add stretches, take them out, hold and drag to reorder,
tap one to change its time or hold it on each side. Stretches are added from a
list of fourteen, each with a photo and a guide (`STRETCHES` in
`src/data/conditioning.ts`); one you type in yourself has neither. A routine is
shared by every workout that ends on it — the sheet says which — and **Make a
copy just for …** gives one workout its own. An edited built-in can be put back
as it was. A new routine starts as a copy of the everyday stretch.

**How to do it** — the ⓘ beside any lift or machine, and on every mobility
card, opens a sheet: the picture, three steps, and the one mistake to watch
for. A lift's sheet also says how to **own it** — the position to hold for a
second, or the part to slow down. Guides live in `src/data/guides.ts`; an
exercise you added yourself shows its own cue instead.

**Notes to yourself** — the ✎ beside a lift or machine writes one: the
treadmill's speed, the seat height, which grip. It shows under the name every
time that exercise comes up, in any workout, until you change it; tap it to
edit, clear it to remove it. One note per exercise or machine, not one per
session, and nothing shows until there is one. The same note is under **Note**
when you tap an exercise or machine in Plan.

**Films** are Milo's own pictures, so far of the back squat and the bench
press: a short loop drawn flat after the Munich '72 pictograms — a circle
head, a ▽ trunk, even bars for limbs, in the family's ink on its field. A
squat shows a rep from the side, turns, and shows one from the front; a bench
press stays side on. The pose isn't drawn but worked out from the rules a
coach gives — feet flat, knees over the toes, the bar over mid-foot; on the
bench, the arch, forearms upright, elbows about 45° — so it is true from any
side, and `tests/motion.cjs` checks it against a coach's ranges. A plate seen
from the side is see-through, so the bar reads as where it is. With Reduce
Motion, a film holds the bottom of the rep. See `src/motion/`. Thumbnails in
lists keep the photo.

**Photos** come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db),
public domain under the Unlicense, matched by hand in `src/data/photos.ts`. A
lift's start and finish frames flip back and forth like a short loop; a
stretch shows the one frame of the hold. Only stretches with a photo are
offered; the couch stretch borrows the kneeling hip-flexor stretch, its nearest
match. Where their library has no true match — the ski-erg, the assault bike
and the rotary torso machine — a placeholder shows.

**Logging a set** — one circle per set. Tap it and it fills at the target reps;
tap again and it counts down if you got fewer — and a rep you swung, bounced or
cut short is one you got fewer of. Tap past 1 and it clears.
Hold a circle to put it straight back to the target — a stray extra tap on a
15-rep set is undone in one press, not fourteen.

```
( 5 )( 5 )(  )(  )      tap        ( 5 )( 5 )( 5 )(  )
( 5 )( 5 )( 5 )(  )     tap tap    ( 5 )( 5 )( 4 )(  )   ← short, shown coral
```

The weight is an input. Type into it or use −/+ to step by one increment,
any time you want.

**Progression** — the reps decide it; nothing is asked:

| | |
|---|---|
| every set on target | climb the rep ladder — 6 → 8 → 10 → 12 |
| on target at the top | weight += increment, back to the bottom rung |
| …after two steps up | **reload**: same weight, back to 10 reps, the top climbed again |
| short of target | hold everything, repeat it exactly |
| short twice in a row | deload 10%, back to the bottom rung |

The line under the circles follows the exercise through. Before the first set
it says where today's number came from — last time's weight and reps, or why it
changed. Between sets it says how to own the next one: "Own it: pause with the
bar on your chest." Once every circle is filled, it says which of these happens
next time, and changes as you tap a circle down. Nothing moves you on by
itself: **Next** — named for what comes next, "Next: Dips" — sits pinned above
the bar where the warm-up's Ready does, and wakes up once every circle (the
partner's too) is filled, so a rep or a weight can still be fixed first. To
move on before that, use Skip. **An unfinished exercise is not a miss**: leave with
sets still empty and it simply repeats, since running out of time says nothing
about the weight.

<a id="reloads"></a>**Reloads.** Two steps up, then a reload: the lift tops out at 12 reps, the
weight stays, and it goes back to 10 — a lighter day that is still work — then
12 again to prove it. Then it goes up. On 20 kg dumbbells that is 20 → 22.5 →
25, then 25 × 10 and 25 × 12 once more, then 27.5. Not back to 6: six reps at a
weight you just did twelve with is a wasted session, and a whole second climb
would keep one weight for eight sessions. On a narrower range the reload is
the last two rungs all the same, so 10 → 12 on 8–12 and the whole of 10–12.

The reload is called by progress, never by the calendar, and it is counted in
steps rather than kilograms, so it means the same thing on a dumbbell (5 kg),
a machine stack (10 kg) or a kettlebell (8 kg). It adds two sessions to every
two steps: a dumbbell bench takes 10 sessions to gain 5 kg instead of 8.
Waiting for three or four steps would barely be quicker, since the ladder is
what takes the time, but a light lift would be 40–50% heavier before it ever
stopped to consolidate. A reload is a hit, not a setback: Today announces it,
the lift screen marks it, and Milo treats it as one.

The one rule that reads the calendar is the **layoff**: three weeks or more
away from a lift, and Today offers to ease it back 5–30% before you start.
That is about time away, not pace, and it waits for your yes.

**Rep ranges.** Every target is 6, 8, 10 or 12 — reps climb two at a time,
never to an 11 or a 13. Slots start on 6–12; one can be narrowed (8–12,
10–12) in Plan. Each exercise is tracked **separately per rep range**, so
narrowing a slot's range starts that lift on a new record — set its weight
in the same sheet. Saves from before the even steps were moved onto 6–12 with
each lift's heaviest recent weight, at the rung nearest the reps it was on.
A small-muscle lift climbs 10–14 in whatever slot it sits in, and its range
can only be set within 10–14; the slot keeps its own range for anything
swapped in. Saves from before this kept each such lift's weight and started
its ladder again at 10.

**Add superset** folds any lift from later in the workout into the current one,
removing it from further down so it isn't done twice. What to pair is your
call: every lift still ahead is offered, each with its ⓘ so you can check how
it is done first, and the partner card keeps that ⓘ.

A `×` on the partner card undoes the pairing: the exercise goes back to its own
place in the workout's slot order, keeping any sets already logged against it.

The partner gets **its own circles**, its own target, and its own weight
record — a supersetted curl progresses on the same ladder it would have on its
own. Both sets of circles must be filled before the exercise counts as done,
and each progresses on its own reps.

## Screens

Three tabs, plus the workout itself which takes over the screen.

**The intro.** A new phone opens on six short pages: why first (a little at
a time, every visit counts, Milo tells you what to do, light and slow), then
how (exercises are building blocks, workouts take turns). Skip is always
there, and seeing or skipping it once is enough. A phone that already has
training on it never gets it by itself; the **?** beside Plan's title opens
it any time.

| Tab | |
|---|---|
| **Today** | The next workout, large and nothing else. **Start**, or **Skip**: **Do this next time** trains the following workout now and returns to this one next session; **Skip this round** leaves it until the cycle repeats. Both offer Undo and record no training. With a workout in progress, **Continue** and **End** instead. |
| **Progress** | This week's training days as seven circles, then your **goals** — each one's ladder with the day you owned every step, and the goals you have learned — then three views. **Results**: total weight lifted (put in proportion — "3.8 small cars"), sessions this month, weeks in a row, share of lifts on target, lifts that got stronger, standing records, cardio that got faster or further. **Sessions**: every finished workout, newest first, with each set coloured hit or short. **Lifts**: every exercise by muscle group at its current weight, tap for its past sessions; cardio bests too. Backup & restore sits in a sheet at the bottom, and under it **Test mode**. |
| **Plan** | Three segments: **Workouts** (your sessions, their order, what fills each slot, and the cardio and mobility either side), **Exercises** (the catalogue of every movement) and **Goals** (what you are learning, step by step). |

Both segments are accordions — one workout or one category open at a time, so
the whole list fits on a screen.

The **Exercises** segment is your catalogue, grouped the way you train:
**Push, Pull, Legs, Core** — then cardio machines and mobility routines. Each
exercise is listed by name with its weight step; nothing else.

**Tap an exercise** to rename it, set its **weight** — where it starts before
you have trained it, the weight it opens at next time after — or change its
**weight step** — how many kg
one press of − or + moves it. Enter any positive number, including decimals;
changes save automatically. For dumbbells, the step is per dumbbell. Edits work on
built-ins too: they are stored alongside, so the exercise keeps its id and its
history. **Remove** (two taps) puts a built-in back in the library, or deletes
one of your own — **unless it is the last one of a movement type**, since a
slot of that type would then have nothing to prescribe. Either way, training
history is kept, so adding it back later resumes where it left off.

**+ on a group adds.** First the **library** — built-in exercises you are not
using, one tap to add — then **Create your own**: name it, pick the equipment
(barbell, dumbbells, kettlebell, machine, bodyweight — which sets a sensible
weight step, or holds for bodyweight), give it a starting weight if you know it,
and say what it counts as. The catalogue starts with the program's exercises
plus a common alternative or two for each job; everything else waits in the
library rather than cluttering the list.

**An exercise can belong to more than one group or type.** Groups come from
movement types, so a face pull (shoulders and a row) is under Push and Pull,
and fills slots of both types.

**But it can only fill one slot per module.** If hip thrust is your Hinge on
Legs, a Hamstrings slot there still lists it — greyed out and marked
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
it — one continuous scale, one number, with a dip belt above bodyweight. Back
extensions keep kilograms too: you hold a plate. Everything else still floors
at zero, since a barbell cannot weigh less than nothing.

**Bodyweight movements you cannot load progress by holding.** Nobody straps a
plate to a hanging leg raise or puts one on their own back for a push-up. So
on those — push-up, inverted row, bench dip, Nordic curl, hanging and lying
leg raise, captain's chair, ab wheel, and any bodyweight exercise you create —
the number is **seconds held at the hardest point of every rep**:

```
Bodyweight × 12   →   1 s hold × 6 … × 12   →   2 s hold   …   5 s hold × 12
```

Topping out adds a second where a loaded lift would add 2.5 kg. Reloads,
misses and deloads work exactly the same (two misses take a second off). At
five seconds the lift has gone as far as it goes and stays at twelve reps
there. The lift screen's **Own it** line says where and for how long: *hold
the legs up for 2 seconds. No swing.*

**Planks count real seconds.** A timed hold climbs the same ladder five
seconds a rep — 30 → 40 → 50 → 60 seconds — and stays at a minute. Tapping a
set's circle counts down five seconds at a time when one gives out early.

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
     ⏮            ×            ⏭
   Back        Leave        Skip
```

Back steps to the previous exercise with its circles still filled, so a
mis-tap is fixable. Skip moves on (on a warm-up, see above).

**Leave steps out without ending anything.** The session stays exactly where
it is — circles, weights, the exercise you were on — while you change a
weight in Plan or check Progress. Today then offers **Continue**, which picks
up where you left it, or **End**, which commits it.

Every control is at least the 44pt platform minimum — the bar is 72pt tall to
hold a full-size target plus its label.

**Your training is saved to the device.** The cycle position, your slot
choices, exercises you have added or removed, and the full per-exercise history
are written to AsyncStorage after every change and read back on launch. It is
one small JSON blob; a year of training is around 35KB.

**Nothing is committed to history until the workout ends.** Circle taps, weight
edits and skips all live on the session, so Back can revisit any exercise and
change what you logged. The single commit happens when you
finish the last exercise or press End on Today.

**Ending before you've trained anything cancels.** If no set was logged and no
distance entered, End simply closes the workout: the same one stays next and
nothing is flagged as skipped. Starting and bailing should not drop a workout
from the rotation.

**A workout in progress survives until the end of the day it was started.**
Close the app mid-session, or have the OS kill it, and Today offers to
continue it on the same exercise with your circles still filled. Open the app
on a later day and the session is closed out as if you had pressed End — what
you trained counts,
the rest is skipped, and the cycle moves on — so a dead phone never costs you a
session's progress. It is a calendar day in the phone's own timezone, not
twenty-four hours: a workout begun at 9pm is stale by the next morning, not by
the next evening.

**A skip records nothing** — the weight and rep ladder come back next time
exactly as they were. The flag is written when the workout *ends*, not when
you tap Skip, so a skip you undo with Back leaves no trace. Anything you never
reached because you ended early counts the same way. Skips show in History and
in the line under the weight, so a lift you keep avoiding becomes visible
rather than silently stalling.

Dark throughout: black ground, acid green for the weight and for a set that hit
target, coral for one that came up short.

**Test mode** (Progress → Test mode) is for trying things out on your own
phone. It is a second, separate save: while it is on, your real training is
neither read nor written, and a navy strip across the top of every screen
says "Test mode · your real training is safe", with **Leave** beside it.
Start it **like a new phone** (the intro, the starting program, nothing
trained) or with **a copy of your training**; next time you can **carry on**
where you left it, or start again. Inside it, **Short workouts** runs each
workout's first two exercises only, so a whole session takes minutes.
Backup is off while it is on, so a test never ends up in a backup file.
Test mode left on is still on after a restart.

## Editing your training

Everything about the program is edited in the app, under **Plan → Workouts**.

**Workouts.** Any number from one up; with one, it simply repeats.
- **+ New workout** adds an empty one at the bottom of the cycle, or a copy
  of one you have.
- **Make a copy**, at the foot of a workout's own sheet, does the same from
  there: "Push 2" goes at the bottom with the same exercises, cardio, stretch
  and goals, and its sheet opens with the name selected, so typing renames it.
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
see what it can be swapped for; tap one and it's swapped. Under it, its
**weight**, then **Sets & reps**: the set count and the rep range (bottom and
top, 6–12 in steps of two). **Remove** takes it out of the workout.

**+ Add exercise** adds a slot by movement type, filled with the first exercise
of that type the workout is not already using. **Hold and drag** a slot to
reorder it within the workout.

Edits to a workout that is in progress take effect from its next run; the
session you are in keeps the shape it started with. A weight is the exception:
set one while a workout is in progress and any of its exercises not yet
started pick it up.

**Goals.** Something you are learning — a handstand push-up, a pistol squat —
written as a ladder of steps, the way a tutorial teaches it. Under
**Plan → Goals**, **New goal** takes a name and, if you like, the tutorial's
link (▶ opens it). Each step is one drill, measured in **reps** (circles like
a lift's), a **hold** (each circle its own clock: tap to start, it buzzes at
the target) or **practice** (minutes on a clock). Tap a step to change it or to
work on it from there; hold and drag to reorder. **Practise in** puts the goal
in the workouts you choose — or switch it on from a workout's own sheet — and
it runs there as its own block, first thing after the warm-up.

Milo comes with one: **Handstand push-up**, in eight steps from the tutorial
in its link — crow pose, handstand, forearm stand, planche lean, planche lean
with a bend and press, pike push-up leaning forward, pike push-up with the
feet floating, and the whole move put together. It is in no workout until you
switch it on, and it stays off Progress until then. Delete it like any goal.

A reps or hold step moves on when you own it: every set on target, two
sessions running. Short of target starts the count again; skipping it changes
nothing. Practice has nothing to count, so it moves on when you press
**I've got it**. Owning the last step learns the goal: it leaves every workout
and lives on in Progress. Several goals can run at once, each its own block.

| What | Where |
|---|---|
| The starting program a fresh install opens with | `src/data/split.ts` |
| The menu of available exercises | `src/data/exercises.ts` |
| Progression rules and rep ladders | `src/lib/progression.ts`, `src/data/split.ts` |
| Goals and how a step is owned | `src/data/goals.ts` |

## Known gaps

- **Your training lives only on this phone.** It survives closing the app and
  restarting the device, but uninstalling, wiping, or moving to a new phone
  loses it unless you saved a backup (History → Backup & restore). No sync yet.
- No rest timer between sets.
- The session log starts with the version that added it; workouts before that
  show only in Lifts, not in Sessions.
- **Starting weights are guesses** (`STARTING_WEIGHT` in `progression.ts`)
  unless you set one in Plan, or when creating the exercise.
- No way to log what you *actually* did if it differs from the prescription.

Product direction and research notes live in [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md).
