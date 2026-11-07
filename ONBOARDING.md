# Onboarding: a plan that fits, in under a minute

Draft 2026-11-06; steps 1–3 built 2026-11-07. See **Status** at the end.

## The goal

Today a new user gets the author's push / pull / legs, cables and all. Someone training at home with two dumbbells can't do a single workout of it. Onboarding has to give every new user a plan they can start **today, where they are, with what they have**, and feel like Milo already understands them.

It must not turn into planning. Milo decides, you lift. Every question has to change what Milo builds; if an answer wouldn't change the plan, the question goes.

## The fork: "Milo's pick" or "make it mine"?

The instinct is right: some people want to answer questions, and some want to be handed something good. But Milo's pick can't be one fixed plan. A great gym plan is useless in a living room, and an hour-long plan is useless to someone with 30 minutes. Milo's pick needs **two facts** whatever happens: *where you train* and *how long you have*.

So instead of a fork at the start, the fork comes **after** two quick questions:

1. Two questions everyone answers (two taps, about ten seconds).
2. Milo shows its pick for that answer: "Here's your plan."
3. Two doors:
   - **Start with this** (big, primary): Milo's pick, no more questions.
   - **Make it mine** (quiet, secondary): what to avoid, what to focus on, or a different shape of plan.

People who want to be handed something get it almost straight away. People who want to customise do it while looking at a real plan, which is far easier than answering questions in the abstract. Nobody ever gets cable crossovers at home.

## The flow

```
 Welcome ─▶ Where? ─▶ (Home: what do you have?) ─▶ How long? ─▶ Your plan ─▶ Start
                                                                   │
                                                                   └▶ Make it mine ─▶ Go easy on / Skip / Shape ─▶ Your plan
```

Then the intro pages, the "why" of Milo, now ending on *their* workouts instead of a generic picture. (Today the intro runs before anything; see Open questions.)

### 1. Welcome

> **Let's build your plan.**
> Two quick questions, and Milo does the rest.
>
> [ Let's go ]

### 2. Where do you train?

> **Where do you train?**
>
> ( At a gym )
> ( At home )

One tap moves on. At a gym means Milo assumes a normal commercial gym: barbells, dumbbells, cables, machines.

### 2b. What do you have at home? (home only)

> **What do you have at home?**
> Pick everything you have. Nothing at all is fine too.
>
> [ ] Dumbbells
> [ ] Kettlebells
> [ ] A pull-up bar
> [ ] A bench
> ( Nothing, just me )
>
> [ Next ]

Pull-up bar and bench are here because they decide whole movements. Without a bar there's almost no way to train pulling *down*, and without a bench dumbbell pressing becomes floor pressing. "Nothing, just me" clears the others.

### 3. How long do you have?

> **How long do you usually have?**
> For the whole visit, warm-up and stretching included.
>
> ( About 30 minutes )
> ( About 45 minutes )
> ( An hour or more )

No question about days per week. The loop doesn't care: you do the next workout whenever you come.

### 4. Your plan

> **Here's your plan.**
> Two workouts that take turns. Do whichever is next whenever you come.
>
> ┌ Upper ───────────────── chest, back, shoulders, arms ┐
> │ Dumbbell bench press · Pull-up · Dumbbell row · …     │
> └──────────────────────────────────────────────────────┘
> ┌ Lower ───────────────────────────── legs, hips ┐
> │ Goblet squat · Romanian deadlift · Lunge · …   │
> └────────────────────────────────────────────────┘
>
> [ Start with this ]
>           Make it mine

Each workout card shows its name, what it trains, and its exercises with their pictures, so the user sees *their* plan, not a description of one. It reads in a glance: no sets, reps or weights here.

### 5. Make it mine (optional)

One screen, three short sections. Every change updates the plan live, and **Done** returns to the plan.

> **Go easy on…**
> Milo will leave out the exercises that load these the most.
> [ ] My knees  [ ] My lower back  [ ] My shoulders

> **Leave these out**
> [ ] Barbell squats  [ ] Deadlifts  [ ] Pressing overhead  [ ] Jumping

> **Shape of plan** (shown only if more than one fits their time)
> ( Milo's pick: Upper / Lower )
> ( Full body, every time )
> ( Push / Pull / Legs )

"Go easy on" is not medical advice and must not sound like it. It's a preference, like the others, and Milo can say so plainly: "Milo isn't a doctor. If something hurts, stop and ask one."

---

## Time decides the shape

Time is the one question that decides both **how many exercises** sit in a workout and **how the loop is split**. Short visits have to cover the whole body each time; longer visits have room to specialise.

| Time | Lifts per workout | Milo's pick | Cardio + stretch |
|---|---|---|---|
| ~30 min | 3 | **Full body A / B** | 5 min to open, short stretch to close |
| ~45 min | 4–5 | **Upper / Lower** | Opening block only, stretch to close |
| 60+ min | 5 | **Push / Pull / Legs** (today's plan) | Both blocks, full stretch |

The author's current plan is Milo's pick for *gym, an hour or more*: nothing about it changes.

A lift with 3 sets and rests takes roughly 7–9 minutes. That's where the counts come from. These numbers should be checked against real sessions.

### The templates

A template is a list of **slots**: a movement pattern, the reason it's there, and a preference list of exercises. Milo fills each slot with the first exercise the user has the equipment for and hasn't ruled out. Every slot keeps the existing 6 → 8 → 10 → 12 ladder (10 → 14 for small muscles).

**Full body A / B** (30 min)

| A | B |
|---|---|
| Squat | Hinge |
| Horizontal press | Vertical press |
| Row | Vertical pull |

**Upper / Lower** (45 min)

| Upper | Lower |
|---|---|
| Horizontal press | Squat |
| Vertical pull | Hinge |
| Vertical press | Lunge / single leg |
| Row | Hamstrings |
| Arms (biceps or triceps, alternating) | Abs |

**Push / Pull / Legs** (60+ min): exactly today's `FULL_CYCLE` in `src/data/split.ts`.

The shape of the plan is a starting point, not a cage. Plan already lets you add, remove, swap and reorder.

---

## Equipment

### What the code needs

`Exercise` gets a new field saying what it needs: every item in it must be on hand.

```ts
type Kit = "barbell" | "dumbbells" | "kettlebell" | "cable" | "machine"
         | "pullup_bar" | "bench" | "box";

needs: Kit[]          // [] = bodyweight, nothing at all
```

"At a gym" counts as having every kit. "At home" counts as having what was ticked. A chair, a step and a wall count as everywhere: Bulgarian split squats and bench dips work off a chair.

### Coverage today, per home kit

This is what the existing 126 exercises give each home setup. ✓ = at least one good option; ✗ = a gap.

| Slot | Nothing | + Dumbbells | + Kettlebell | + Pull-up bar |
|---|---|---|---|---|
| Horizontal press | ✓ push-up | ✓ DB bench* | ✗ | |
| Vertical press | ✗ | ✓ DB shoulder press | ✓ KB press | |
| Vertical pull | ✗ | ✗ | ✗ | ✓ pull-up, chin-up |
| Row | ✗ | ✓ DB row | ✗ | ✓ inverted row (low bar) |
| Squat | ✗ | ✓ goblet squat | ✓ KB goblet squat | |
| Hinge | ✓ glute bridge | ✓ DB Romanian deadlift | ✓ KB swing | |
| Lunge / single leg | ✓ split squat, reverse lunge | ✓ | ✓ | |
| Hamstrings | ✓ glute bridge | ✓ DB Romanian deadlift | ✓ | |
| Biceps | ✗ | ✓ DB curl, hammer curl | ✗ | ✓ chin-up |
| Triceps | ✓ bench dip (chair) | ✓ overhead extension | ✗ | |
| Shoulders | ✗ | ✓ lateral raise, rear delt fly | ✗ | |
| Abs | ✓ plank, crunch, leg raise | ✓ | ✓ | ✓ hanging leg raise |

\* Without a bench: floor press (missing, see below).

### Exercises to add

The gaps are small and well known. These would close them:

| Exercise | Fills | Kit | Progresses by |
|---|---|---|---|
| Bodyweight squat | Squat, nothing at all | — | holds, like the push-up |
| Pike push-up | Vertical press, nothing at all | — | holds |
| Table row (under a sturdy table) | Row, nothing at all | — | holds |
| DB floor press | Horizontal press, no bench | dumbbells | weight |
| DB pullover | Vertical pull, no bar | dumbbells | weight |
| KB floor press | Horizontal press | kettlebell | weight |
| KB row | Row | kettlebell | weight |
| KB deadlift | Hinge | kettlebell | weight |
| KB curl | Biceps | kettlebell | weight |

That's 9 exercises. Each needs a guide, a photo and a film in Milo's marks, so the films are the real cost. Two honest limits remain:
- **Update, built:** the table row is just the inverted row (a low bar, or the edge of a sturdy table), so it needs no new exercise. Lunges all need dumbbells, so a **bodyweight split squat** joins the list, and with the **bodyweight squat** they're the first two built.
- **Nothing at all + no bar** has no true vertical pull. The table row covers pulling; Milo says plainly that a pull-up bar is the single best thing to buy.
- **Kettlebell-only** progresses in big jumps (4 kg). The ladder already handles that by climbing reps first, but some lifts will sit on a weight for a while.

### Cardio and warm-up at home

- The cardio pool is all machines. At home, the opening block becomes **Brisk walk or easy jog, outside** (timed minutes, distance optional) or **Skipping rope**, and the closing block is off by default.
- The shoulder warm-up uses a ball and a band. At home it needs a band-free version (arm circles, wall slides, prone Y-raises).
- The everyday stretch already works anywhere.

---

## "Go easy on" and "Leave these out"

Each choice removes exercises from the pool. The slot then falls to the next one on its list. A slot left with nothing is dropped, never filled with something the user ruled out.

| Choice | Leaves out |
|---|---|
| My knees | Jumps, lunges and split squats, leg extension, front and hack squat |
| My lower back | Deadlifts, Romanian deadlifts, good morning, barbell and T-bar row, back squat, KB swing |
| My shoulders | Every overhead press, dips, upright row, skullcrusher, bench dip |

"Barbell squats", "Deadlifts", "Pressing overhead" and "Jumping" were cut: no template uses them by default, so the answer would change nothing (principle 7). The lists live in `src/data/templates.ts`.

These lists need a careful pass before they ship.

---

## After onboarding

- **Changing it later:** Plan gets a **Change my plan** row that reruns these same screens. Every lift keeps its weight and its place on the ladder, because history is stored per exercise and per rep range, not per plan. Milo can say so: "Your numbers come with you."
- **The author's phone** never sees onboarding. Like the intro today, it only opens on a phone that has trained nothing yet.
- **Answers are saved** (where, kit, time, avoid). Where and kit become the usual place for the switch below.

---

## Training somewhere else

Most weeks you train in your usual place. Some weeks you're away: a hotel with nothing, a cabin with one kettlebell, a friend's garage with dumbbells. Milo should handle that with one switch, not a second plan.

### The idea: same plan, different exercises

Switching place **doesn't change the plan**. Push is still Push and the loop carries on where it was. What changes is the exercise inside each slot: the horizontal press slot that holds the DB bench press at the gym holds push-ups in a hotel room. Each slot already knows its movement pattern, so Milo picks the best exercise for it from what you have.

- **Your gym numbers are untouched.** A push-up has its own history, separate from the bench press. When you're back, every gym lift is exactly where you left it.
- **Away numbers build up too.** The next trip, push-ups pick up where the last trip ended.
- **Swaps work as they do at the gym:** a swap mid-workout is for that session only, and the swap list shows only what the place has. One rule everywhere, nothing new to learn.
- **Cardio and warm-up follow the place.** Away from machines, the opening block becomes a walk, a jog or skipping rope, and the warm-up drops the band.
- **A slot with nothing that fits** is left out of that session, and the workout says so plainly: "No row today. Nothing here to row with." It never shows up as a miss.

### Two places, not a list

There are exactly two places:

1. **Your usual place.** What onboarding answered: "At the gym", or "At home" with its kit.
2. **Somewhere else.** It has its own kit, which Milo remembers until you change it.

Two is enough for the cases that matter, and it stays one tap. Named saved places ("Hotel", "Cabin") can come later if two turns out too few.

### Where the switch lives

On **Today**, above Start, one quiet line that always says where you are:

> **At the gym** · Change

Tap it and a sheet opens:

> **Where are you training?**
>
> ( At the gym )
> ( Somewhere else )
>
> *Somewhere else selected:*
> **What do you have there?**
> [ ] Dumbbells  [ ] Kettlebells  [ ] A pull-up bar  [ ] A bench
> ( Nothing, just me )
>
> [ Done ]

- **The place sticks** until you change it. Set it once for a week away, not every day.
- **Today always shows it**, so you can't start a hotel workout in the gym without seeing it. Away, the line stands out more: "**Somewhere else** · bodyweight only · Change".
- **Only before Start.** The place can't change in the middle of a workout.
- Today's workout card updates straight away to show the exercises you'll actually do.

### What the code does

- Saved state has `place: "usual" | "away"` and a kit for each place (`store/session.ts`).
- `fillWorkout` picks the exercise for every slot from the kit, top to bottom. Onboarding uses it to build the plan; Today and Start use it whenever you're not at a full gym. At a full gym nothing changes: every slot holds what Plan says.

### A fixed weight: one 10 kg kettlebell

The kit sheet asks which weights are there ("Any weight", or tick 10 kg). Then:

- **The weight is the bell.** Milo uses the heaviest weight there at or below what you're due.
- **A first guess comes from the gym.** A kettlebell goblet squat or press you've never done borrows your dumbbell number (one bell in one hand moves like one dumbbell).
- **Too light, a harder lift stands in.** If the bell is under 60% of what you're due, Milo reaches for a loaded lift that fits, then a single-leg lift (a bodyweight split squat makes 10 kg plenty), and only then an easy bodyweight one. Someone with a 24 kg goblet squat and one 10 kg bell gets split squats; with a 24 kg bell, goblet squats.
- **Too heavy, the slot sits out.** If even the lightest weight is over 130% of what you're due, that slot is left out of the session, said plainly on Today.
- **Topping out moves you on.** A step up goes to the next weight there is, however far. With nothing heavier, the lift stays at the top and is marked as outgrown, and next time a harder lift takes the slot.
- **No guessing from nothing.** A lift with no record of its own (and no dumbbell twin) is never called too light or too heavy: one set tells.

---

## Decided

- **Questions first**, then the intro, its last page showing the user's own workouts.
- **Time sets the shape**: 30 min → full body A/B, 45 → upper/lower, 60+ → push/pull/legs.
- **Gym and home both** are handled now, with the place switch above.
- **The 9 new exercises** get added, with films in Milo's marks.
- **Home cardio** starts as walk or jog outside, and skipping rope.

---

## Status (2026-11-07)

**Built, tested, checked on the simulator, committed:**

1. **Equipment.** Every exercise says what it needs (`src/data/kit.ts`); `src/lib/fill.ts` picks a slot's exercise from a kit, weights included. Progression steps to the next weight on hand and marks a lift outgrown at the heaviest (`src/lib/progression.ts`).
2. **The place switch** lives in Settings (the gear on Plan), with the "Where are you training?" sheet and weights to tick (`src/components/place.tsx`, `src/app/settings.tsx`). Today says nothing at your usual place; away, one quiet line says where you are and why the workout changed. Away: slots filled from the kit, machine cardio and the band warm-up left out, what sits out said plainly, gym numbers untouched.
3. **Onboarding, one flow.** Welcome (a film of Milo's marks), where, home kit, time, the plan, Make it mine, then three how-it-works pages — the last with your own workouts — under one progress line, each page sliding in (`src/components/onboarding.tsx`). The old six-page intro is three pages (the wrestler and the building blocks are gone) and opens again from Settings.
4. **Home lifts:** bodyweight squat and split squat, pike push-up, KB row, KB Romanian deadlift, KB curl, DB and KB floor press, DB pullover — guides and films in Milo's marks. Storage versions 14 and 15 put them in the library on existing phones.
5. **No sparse workouts.** A slot with nothing of its own kind takes the nearest kind (no bar to pull down on: a row), and a plan tops a short workout up with extras (bench dips, planks) to its template's length.
6. **The kit picker** has a drawn icon for each thing and "Another weight" to type any weight.

**Still to do in step 4:**

- Home cardio: walk or jog outside, skipping rope.
- A band-free shoulder warm-up (arm circles, wall slides, prone Y-raises).
