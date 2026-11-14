# Milo — core reset

Platform: Expo / React Native, primarily iPhone. Used between sets in the gym.

## The product we are testing

Open the app, know what to do, train, finish. One prescribed workout at a time.
This is a deliberately small working baseline for rethinking the product.
`PRODUCT_STRATEGY.md` contains earlier ideas, not the current implementation brief.

## The whole visible app

1. **Today:** the next workout and its exercises. Start, or Continue an existing session.
2. **Exercise:** name, today’s weight, target sets and reps, explicit logging of actual counts.
   Back, Save & leave, Skip, and Review and finish now remain available.
3. **Finish:** review the number of sets logged, then save or return to the workout.

Saved training on Today opens backup and restore. It is the one supporting utility.
A running session stays saved on the device using the existing storage lifecycle.
Nothing is written to training history until the session is finished.

## Provisional defaults

The existing saved workout rotation and strength prescriptions remain for now.
New sessions include its lifts, with automatic cardio, routine and ramp blocks put aside.
The underlying progression engine is unchanged. Logging still affects its next prescription.
Existing in-progress sessions are retained intact, including older activities and paired lifts.

These are compatibility decisions, not the final default program. Which exercises,
how many sets, how progression should work, and what belongs in a complete session
are still to be designed. We have not introduced a replacement training method.

## Put aside

Navigation tabs, Plan and Profile, workout editing, the exercise catalogue, charts,
card swiping, illustrations, notes, swaps, supersets for new sessions, rest timers,
progression commentary, onboarding questions, and the intro tour.

No new feature returns by default. First make the core feel understandable and useful,
then decide what earns a place. Previously saved workouts and history are retained.
See `ARCHIVE.md` for recovery and `REDESIGN.md` for implementation and verification.
