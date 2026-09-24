# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Right now: one person, the author, training in a commercial gym with an iPhone in hand between sets. The app is also meant to grow into a product for the people described in `PRODUCT_STRATEGY.md`: people who want to train but struggle to start and keep coming back. Design for the first user without closing the door on the second group. There is no onboarding or marketing surface yet.

Situation of use: mid-session, heart rate up, sweaty hands, a glance at arm's length, often while walking between machines.

## Product Purpose

Open it and know exactly what to do. One exercise on screen at a time, with the weight and reps already decided, and the next session's numbers worked out from how this one went. Success means the user keeps coming back, not that they have a perfect program (see "Governing Principle" in `PRODUCT_STRATEGY.md`).

## Positioning

The app decides and the user performs. It is not a logbook you have to fill in and not a program you have to plan. Progression is automatic, done per exercise and per rep range. Missed days create no debt: the cycle only moves forward when you actually train.

## Operating Context

- Three tabs: **Today** (the next workout, Start or Skip), **Progress** (this week, then Results — the good news — Sessions — each workout set by set — and Lifts — each exercise's weight and past), **Plan** (Workouts and Exercises segments, both accordions).
- The workout screen takes over the whole display: the exercise name and the weight are the surface. You log each set by tapping its circle, and at the end you give a thumbs up or down on how it felt.
- Cardio blocks open and close each session. A block is either timed minutes scored by distance, or a set distance (the treadmill, 1 km by default, adjustable in 0.5 km steps) scored by time. Mobility runs as a checklist.
- A persistent bottom bar, mounted once, carries the tabs or the workout actions (Back / Leave / Skip).
- It ships to the phone through Expo Go and EAS Update. There is no standalone build and no paid Apple developer account.

## Capabilities and Constraints

- Expo SDK 57 / React Native 0.86, expo-router, running in Expo Go. Native modules are limited to what Expo Go bundles, so custom fonts have to load through `expo-font` / `@expo-google-fonts/*` and icons have to come from a JS icon set or SVG.
- The theme tokens live in `src/constants/theme.ts`. Styles are inline objects, with no styling library.
- All state stays on the device (AsyncStorage). Backup and restore work through a file.
- The program the user must never lose lives in code defaults (`src/data/split.ts`, `src/data/exercises.ts`).

## Brand Commitments

- The name is **Akilles** (the repository folder is "achilles").
- Two voices. **Instructions and facts** are plain and direct: what to do, what happens next time, in full sentences. **Akilles itself** talks back: cheeky, blunt, a bit harsh — about the lifting, never about the person. It teases the bar, the reps and the heel; it doesn't call anyone weak or guilt them for skipping. A quip is always paired with the plain fact, so nothing important lives only in the joke. Lines live in `src/data/voice.ts`.
- The product promise: "Open the app. Do the next useful thing. Leave before you hate it."

## Evidence on Hand

No users other than the author, and no testimonials, metrics or press. None should be invented.

## Product Principles

1. The screen shows the next thing to do and nothing else. Remove options before adding toggles.
2. Big, stable targets. Nothing shifts under a thumb, and controls are sized for a glance mid-set.
3. The app does the arithmetic. The user only sees an instruction and one number to beat.
4. No guilt: a short session is a complete session, and skipping is always one tap and never punished.

## Accessibility & Inclusion

The app is used in bright gyms and at arm's length: text must be highly legible with strong contrast, and touch targets should be well above 44pt (the bottom bar uses about twice that).
