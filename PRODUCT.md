# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Right now: one person, the author, training in a commercial gym with an iPhone in hand between sets. The app is also meant to grow into a product for the people described in `PRODUCT_STRATEGY.md`: people who want to train but struggle to start and keep coming back. Design for the first user without closing the door on the second group. Teaching is in two parts: one film of about a minute (why: move every day, like eating and sleeping; then how a workout goes: Start, the circles, a short set, next time, swiping between cards, a stretch, Finish), shown after the two onboarding questions and again from Settings; and first-time tips on the screens for everything else (swap, warm-ups, a short set, the list of every card, Plan's workouts, the Library; never one a screen already says in its own words), each shown once. There is no marketing surface yet.

Situation of use: mid-session, heart rate up, sweaty hands, a glance at arm's length, often while walking between machines.

## Product Purpose

Open it and know exactly what to do. One exercise on screen at a time, with the weight and reps already decided, and the next session's numbers worked out from how this one went. Success means the user keeps coming back, not that they have a perfect program (see "Governing Principle" in `PRODUCT_STRATEGY.md`).

## Positioning

The app decides and the user performs. It is not a logbook you have to fill in and not a program you have to plan. Progression is automatic, done per exercise and per rep range. Missed days create no debt: the cycle only moves forward when you actually train.

Today always shows the next workout with Start and Skip, even after training earlier that day. Finishing advances the cycle; it does not turn Today into a completion screen. A workout in progress stays available to Continue or End, with no Skip while it is active. Skip advances straight to the next workout without logging training or asking a scheduling question; Undo reverses the latest skip. Workouts follow a rotation, not calendar dates. A plan with only one workout has no Skip.

## Philosophy: Own the Weight

**Train movements for life.** Klay is a movement app: stand up, squat down,
lift something from the floor, push, pull, step and carry. Recommended workouts
start with a few useful movements that involve several joints and muscles.
Single-leg work and trunk stability belong alongside squats, hinges and presses.
The aim is capability in everyday life, not a separate exercise for every muscle.

**Accessories are the seasoning.** Curls, pushdowns and isolation machines stay in
the library and can fill a particular need. They do not dominate our defaults.
An accessible machine or pushdown is a valid beginner option; dips and pull-ups
are progressions to earn or assist, not mandatory starting points. Choose an
exercise someone can perform well rather than treating complexity as quality.

**Control is specific to the movement.** For controlled strength work, lower
smoothly, avoid using a bounce or body swing to move the load, and use a brief
pause at a clearly described, stable position. Feel and control the working
muscles without forcing a range or joint position. That position is not always
the anatomical point of greatest tension; neither a squeeze nor soreness proves
effectiveness. Pause duration is our coaching approach, not a universal scientific
claim. Breathe throughout manageable efforts. Running uses natural arm swing;
rowing uses rhythm; kettlebell swings deliberately use hip-driven momentum.
Those movements must never inherit a slow-lifting or static-pause instruction.

**Teach the exercise, not the session.** Guides explain setup, execution, control
and a documented mistake in plain words. Workout targets, intervals and changes
of pace belong to the workout. Every new or substantively rewritten guide needs
traceable primary technique references, including support for its Watch out text.
We do not invent a "most common" mistake or imply a frequency ranking without
evidence. Source checking is separate from qualified professional review, and
neither guarantees that an exercise is appropriate or injury-free for everyone.

Leave the ego at the door. Klay is the opposite of the typical gym-bro app, and it wants gym bros anyway.

> Most gym apps count how much you lift. Klay counts how much you own. A rep counts when you lower it slowly, hold it where it's hardest, and lift it without a swing. When a lift climbs, it reloads: back down the ladder and up again, slower. Lighter today is how you get heavier for good.

- **A rep counts when it is owned:** lowered under control, held where it is hardest, no swing and no bounce. Progression runs entirely on the reps you log, so honest counting is the form check. Progress slows to the speed of your form without another rule.
- **Go light.** Weights start with two reps to spare. Light and controlled is praised over heavy and sloppy.
- **Harder without heavier.** Where nothing can be added — a hanging leg raise, a push-up — the step up is a longer hold at the hardest point, a second at a time up to five. Owning the position is the progress.
- **Reload as you climb.** After two steps up, a lift climbs the same weight again before the next. Progress calls it, never the calendar. Today explains changes beside each exercise: heavier or lighter weight, changed reps, or a repeat climb to practise control. Time away does not change weights in the normal Today flow.
- **Reps before weight.** One completed attempt short of target repeats unchanged. Two lower the reps one step at the same weight; only at the bottom of the range does the weight decrease. Skipped or unfinished work never counts as a miss. Reductions use the weights available; if none is lighter, a suitable alternative fills the slot or it sits out.
- **Make control the flex.** Reloads, honest short counts and slow reps are what Klay praises. Momentum and ego are what it teases. The only pitch that reaches gym bros is control as the harder, more impressive thing, so say it in their language: "lighter is the flex", "owned, not borrowed".

## The Core (November 2026)

Klay is being cut back to its core and rebuilt from it. What was put away is in the git tag `full-app-2026-11-13` (`git checkout full-app-2026-11-13` shows the app as it was).

- **Move every day.** The aim is that everyone trains every day, not three times a week: the hard thing done daily until it is not so hard. A day can be small — twenty minutes of cardio and a stretch — but there is always something for today, and Klay has it worked out. Start small, build up, drop back a little, build up again.
- **Two people.** Someone who has trained for years and never stayed consistent, and someone anxious about the gym who doesn't know where to go or what to do. Both get the same app: everything decided, easy to change, never a reason to feel ashamed.
- **Make a light weight feel heavy.** That is the skill. Every lift's instructions say how to breathe, how fast to move, and where to pause.
- **Never wait.** A lift you skip comes back after the others, so a taken bench costs nothing. Swapping the exercise for today is the other way round it.
- **The one that gets done.** The stretch, the cardio, the whole day: what is easy enough to do beats what is best on paper.
- **Start small, grow by showing up.** A new plan is Push, Pull, Legs with three lifts each, easy cardio to open and a stretch to close: about half an hour. Three weeks of coming most days (twelve workouts) earns an offer at the top of Today: one more exercise, more cardio, or a longer stretch. Each choice says exactly what it adds where, and nothing changes without a yes. Growth stops at the full plan (five lifts, cardio at both ends); past that, the weights do the growing. It works on slots, so a slot you swapped is never added twice and one you removed never comes back. See `src/data/growth.ts`.
- **Active and paused, for when life changes.** Plan has two lists: the active workouts, which take turns, and the paused ones, which wait exactly as they were. Away from the gym, pause what you can't do there and add a workout you can; back home, resume them. Weights belong to exercises, so nothing is lost either way. (Loops, a second set of workouts to switch to, were built and scrapped on 16 November 2026: too hard to understand, even for the person who designed them.)
- **Still to design:** the ladder of day sizes, one tap to train with the equipment at hand (barbell, dumbbells, kettlebell, machines, nothing), a core of the best exercises in place of the long catalogue, a short intro, a voice that talks you through the stretch, and goals in a simpler form.

## Operating Context

- Three tabs: **Today** (the next workout), **Plan** (Workouts and Library), and **Profile** (Progress & history and Settings). Main screens change through the tabs, not horizontal swipes.
- Plan workout rows reveal Pause/Resume and Delete directly. Deletion keeps training history and offers Undo; the final workout and an active session's workout are protected. New workout uses one collapsed selector to start blank or copy an existing workout.
- The workout is a swipeable row of coloured cards: the exercise name and the weight lead each card. You log each set by tapping its circle, and at the end you give a thumbs up or down on how it felt.
- Cardio blocks open and close each session, and mobility ends it. Cardio can use equipment, happen outdoors, or be bodyweight work. Choose a distance and log your time, or choose a time and log your distance or reps. The card uses the same title and three-dot menu as strength cards, with the saved target shown as plain text and one result input; time accepts 5:30 or 530. There is no Warm-up heading or typing instruction on the card. Notes sit beneath the exercise name and are edited by tapping them; only an absent note gets an Add a note menu action. Saved targets and cardio exercise replacements in Plan’s workout editor apply across future workouts; the current session is untouched. Each exact target and mode keeps separate records. Last time is the main comparison; Fastest (or Furthest for a time target) is the separate goal to beat. Today's result is never prefilled from either. Each workout can remove its cardio blocks or routine. Mobility defaults to one everyday stretch routine, every stretch with a photo and a guide; routines are edited in Plan and, once started, run themselves from the first stretch to the last.
- A persistent bottom bar, mounted once, carries the tabs or the workout actions (Back / Leave / Skip — which reads Later on a lift that will come back).
- It ships to the phone through Expo Go and EAS Update. There is no standalone build and no paid Apple developer account.

## Capabilities and Constraints

- Expo SDK 57 / React Native 0.86, expo-router, running in Expo Go. Native modules are limited to what Expo Go bundles, so custom fonts have to load through `expo-font` / `@expo-google-fonts/*` and icons have to come from a JS icon set or SVG.
- The theme tokens live in `src/constants/theme.ts`. Styles are inline objects, with no styling library.
- All state stays on the device (AsyncStorage). Backup and restore work through a file.
- The program the user must never lose lives in code defaults (`src/data/split.ts`, `src/data/exercises.ts`).

## Brand Commitments

- The app name is **Klay**, with the line **"Shape your life"** (App Store: **"Klay: Shape your life"**). The figure in the stretch pictures is a little clay fellow, and that is the idea: you are shaped slowly, by hand, a little every day — go light, own the weight, show up. Every other gym app is called heavy, strong or big; this one is soft clay that gets shaped. Never say "lift less" to users: it sounds like training fewer days, and Klay wants you there every day. Only the weight is ever less. It was called Akilles, then Humbell, then Humble Training before (renamed to Klay 2026-11-18). The Expo project, slug and scheme became "klay" on 2026-11-19 (nobody had training saved yet); the repository folder ("achilles") and the storage keys (`achilles/state`) keep the old name.
- Two voices. **Instructions and facts** are plain and direct: what to do, what happens next time, in full sentences. **Klay itself** talks back: cheeky, blunt, a bit harsh — about the lifting, never about the person. It teases momentum, swinging and ego, never a small number. It respects an honest short count, doesn't call anyone weak, and doesn't guilt anyone for skipping. A quip is always paired with the plain fact, so nothing important lives only in the joke. Lines live in `src/data/voice.ts`.
- The product promise: "Open the app. Do the next useful thing. Leave before you hate it."

## Evidence on Hand

No users other than the author, and no testimonials, metrics or press. None should be invented.

## Product Principles

1. The screen shows the next thing to do and nothing else. Remove options before adding toggles.
2. Big, stable targets. Nothing shifts under a thumb, and controls are sized for a glance mid-set.
3. The app does the arithmetic. The user only sees an instruction and one number to beat.
4. No guilt: a short session is a complete session, and skipping is always one tap and never punished.
5. Own the weight. Control beats load: the app slows progress on purpose, says why, and never rewards a heavier number for its own sake.
6. Clear to anyone. An 80-year-old opening the app for the first time should understand exactly what is going on. Plain words in full sentences, a heading that says what it means rather than a slogan, and no gym word (rep, set, reload) left unexplained where someone new meets it.
7. Simple is the product. Klay is the answer to gym apps that are far too cluttered, and that is its reason to exist. Every new feature has to stay minimal, clean and intuitive and add no cognitive load: one smart default beats a setting, one quiet line beats a new screen, and an option that doesn't change what Klay builds gets cut. Grow by filling real gaps, never by adding more for its own sake.

## Accessibility & Inclusion

The app is used in bright gyms and at arm's length: text must be highly legible with strong contrast, and touch targets should be well above 44pt (the bottom bar uses about twice that).

Session swaps apply to today only. Cardio mode and target are set in Plan’s workout editor, not changed on the workout card; Treadmill defaults to a distance of 1 km, scored by the time you enter. Selecting Time in Plan starts at five minutes. Cardio notes are shared per exercise across all workouts; strength notes can still be edited for the current session. Lasting workout edits belong in Plan. Logged results continue to drive automatic progression. See `REDESIGN.md` for the current simplification and review gaps.

- The Library searches the complete built-in strength pool and custom exercises, with movement and equipment filters and overlapping tags. Push means pressing (chest, shoulders and triceps); Pull means pulling (back and biceps). Cardio targets are read-only in the Library and edited in Workouts. Notes remain shared for cardio.
- Strength uses one working weight per exercise across workouts and rep ranges. Rep ladders remain range-specific; a stale range restarts at its bottom when the shared weight changes. A manual session weight carries forward only after actual sets are logged and the session finishes; untrained edits never change history.
- Warm-up and mobility routines allow Previous, Next, a movement picker and Skip movement. Each side saves Done or Skipped independently; skipping never pretends a pose was performed.
- Blank workouts start empty. No arbitrary exercise limit: a compact progress track shows up to ten marks around the current card; the expanded overview scrolls with 52-point rows and keeps Leave for now outside the scrolling list. Active workout rows use stronger family colours; paused rows use a neutral background.

- Cardio in the Library shows every built-in and custom cardio exercise in one list. Built-ins cannot be hidden from the Library; only custom cardio can be deleted. Workout cardio pickers show the same full pool, and explicitly choosing a previously hidden exercise makes it available again without changing saved records.
