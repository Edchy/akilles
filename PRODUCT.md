# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Right now: one person, the author, training in a commercial gym with an iPhone in hand between sets. The app is also meant to grow into a product for the people described in `PRODUCT_STRATEGY.md`: people who want to train but struggle to start and keep coming back. Design for the first user without closing the door on the second group. The only onboarding is the intro: six pages on first launch (why, then how), reopened from Plan's ?. There is no marketing surface yet.

Situation of use: mid-session, heart rate up, sweaty hands, a glance at arm's length, often while walking between machines.

## Product Purpose

Open it and know exactly what to do. One exercise on screen at a time, with the weight and reps already decided, and the next session's numbers worked out from how this one went. Success means the user keeps coming back, not that they have a perfect program (see "Governing Principle" in `PRODUCT_STRATEGY.md`).

## Positioning

The app decides and the user performs. It is not a logbook you have to fill in and not a program you have to plan. Progression is automatic, done per exercise and per rep range. Missed days create no debt: the cycle only moves forward when you actually train.

## Philosophy: Own the Weight

Leave the ego at the door. Milo is the opposite of the typical gym-bro app, and it wants gym bros anyway.

> Most gym apps count how much you lift. Milo counts how much you own. A rep counts when you lower it slowly, hold it where it's hardest, and lift it without a swing. When a lift climbs, it reloads: back down the ladder and up again, slower. Lighter today is how you get heavier for good.

- **A rep counts when it is owned:** lowered under control, held where it is hardest, no swing and no bounce. Progression runs entirely on the reps you log, so honest counting is the form check. Progress slows to the speed of your form without another rule.
- **Lift less.** Weights start with two reps to spare. Light and controlled is praised over heavy and sloppy.
- **Harder without heavier.** Where nothing can be added — a hanging leg raise, a push-up — the step up is a longer hold at the hardest point, a second at a time up to five. Owning the position is the progress.
- **Reload as you climb.** After two steps up, a lift climbs the same weight again before the next. Progress calls it, never the calendar. The only calendar rule is the layoff: easing back after weeks away, offered and never forced.
- **Make control the flex.** Reloads, honest short counts and slow reps are what Milo praises. Momentum and ego are what it teases. The only pitch that reaches gym bros is control as the harder, more impressive thing, so say it in their language: "lighter is the flex", "owned, not borrowed".

## Operating Context

- Three tabs: **Today** (the next workout, Start or Skip), **Progress** (this week, then Results — the good news — Sessions — each workout set by set — and Lifts — each exercise's weight and past), **Plan** (Workouts and Exercises segments, both accordions).
- The workout screen takes over the whole display: the exercise name and the weight are the surface. You log each set by tapping its circle, and at the end you give a thumbs up or down on how it felt.
- Cardio blocks open and close each session, and mobility ends it. Each workout sets its own machine, length and routine in Plan, and can drop any of them. A block is either timed minutes scored by distance, or a set distance (the treadmill, 1 km by default, in 0.5 km steps) scored by time. Mobility defaults to one everyday stretch routine, every stretch with a photo and a guide; routines are edited in Plan and run as a checklist.
- A persistent bottom bar, mounted once, carries the tabs or the workout actions (Back / Leave / Skip).
- It ships to the phone through Expo Go and EAS Update. There is no standalone build and no paid Apple developer account.

## Capabilities and Constraints

- Expo SDK 57 / React Native 0.86, expo-router, running in Expo Go. Native modules are limited to what Expo Go bundles, so custom fonts have to load through `expo-font` / `@expo-google-fonts/*` and icons have to come from a JS icon set or SVG.
- The theme tokens live in `src/constants/theme.ts`. Styles are inline objects, with no styling library.
- All state stays on the device (AsyncStorage). Backup and restore work through a file.
- The program the user must never lose lives in code defaults (`src/data/split.ts`, `src/data/exercises.ts`).

## Brand Commitments

- The name is **Milo**, after Milo of Croton, who carried a calf every day until it was a bull: the oldest story of getting stronger a little at a time. It was Akilles until November 2026; the repository folder ("achilles"), the Expo slug and scheme ("akilles") and the storage key (`achilles/state`) keep the old name, so saved training and published updates carry over.
- Two voices. **Instructions and facts** are plain and direct: what to do, what happens next time, in full sentences. **Milo itself** talks back: cheeky, blunt, a bit harsh — about the lifting, never about the person. It teases momentum, swinging and ego, never a small number. It respects an honest short count, doesn't call anyone weak, and doesn't guilt anyone for skipping. A quip is always paired with the plain fact, so nothing important lives only in the joke. Lines live in `src/data/voice.ts`.
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
7. Simple is the product. Milo is the answer to gym apps that are far too cluttered, and that is its reason to exist. Every new feature has to stay minimal, clean and intuitive and add no cognitive load: one smart default beats a setting, one quiet line beats a new screen, and an option that doesn't change what Milo builds gets cut. Grow by filling real gaps, never by adding more for its own sake.

## Accessibility & Inclusion

The app is used in bright gyms and at arm's length: text must be highly legible with strong contrast, and touch targets should be well above 44pt (the bottom bar uses about twice that).
