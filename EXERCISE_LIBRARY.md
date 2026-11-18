# Exercise library

Keep the full pool broad and searchable, while Klay's recommended workouts stay small.
Expand toward 500 exercises in reviewed batches, starting with common movements and
meaningful equipment variations. Alternate names belong in `aliases`, not duplicate entries.

## Movement-first selection

The core philosophy is recorded in `PRODUCT.md`: train useful movements for life.
Recommended workouts start with squatting, hinging, pushing, pulling, single-leg
work and trunk stability. Loaded carries belong in the library too. Isolation
exercises remain available as accessories and accessible options; they do not
define the default program. Dips and pull-ups are useful options, with assistance
or simpler progressions when appropriate, rather than compulsory beginner lifts.

The November 16 batch adds 14 options, taking the strength pool to 148 entries
(147 enabled). Default plans replace the chest-fly slot with an incline push-up,
the machine crunch with a dead bug, and the second bilateral leg press with a
split squat. A pushdown and curl remain as accessories. Existing saved workouts
and training history keep their actual exercises; creating a new plan uses the
new defaults.

New optional entries have `autoSelect: false`: adding a reference to the large
library must not silently change equipment substitutions. Explicit workout
options still work, and adding an exercise to the personal catalogue makes it
available to that person's normal slot pool. The version-20 migration keeps new
optional entries in the library without overwriting saved plans or choices.

## Tags and workout slots

An exercise has independent dimensions:

- `patterns`: existing workout-slot compatibility and progression rules. These also
  derive the familiar Push, Pull, Legs and Core browsing categories. Pull means
  upper-body pulling; hinges belong to Legs.
- `movements`: precise discovery tags, such as hinge, knee flexion, rotation or carry.
- `muscles`: muscles useful for search, without implying they are all worked equally.
- `equipment`: everything required to perform that version. Requirements combine
  with AND: a band and anchor must both be available.
- `bodyweight`: whether the exercise uses bodyweight. This does not mean no equipment.

The vocabulary and backward-compatible discovery defaults live in
`src/data/exercise-tags.ts`. Explicit exercise tags override defaults. Existing
exceptions are recorded there, including hip adduction (inner thighs, even though
its legacy workout slot says hamstrings). New exercises should specify accurate
tags directly in their definition when the defaults do not fit.

Discovery tags never authorize a workout substitution or change a rep range.
Do not add a slot pattern merely to make an exercise appear in search.

Built-in equipment requirements live in `src/data/kit.ts`; custom exercises carry
their own `equipment` array. List only required equipment. If a different setup
changes execution or tracking meaningfully, give it its own exercise entry.
Medicine balls, slam balls and stability balls are distinct, as are pull-up bars,
parallel bars and barbells. Optional added load is not a prerequisite for a
bodyweight exercise.

## Finding exercises

The Library and Add exercise share equipment filters. Bodyweight includes exercises
such as pull-ups that require equipment; No equipment checks an empty requirement
list, following the current kit convention that a floor, wall, chair or step is
available. Search combines names, aliases, categories, movement tags, muscle tags
and equipment, so queries such as “kettlebell glutes” or “bodyweight pull” work.

Strength discovery is separate from the existing cardio and mobility catalogues.
New equipment vocabulary makes tagging possible; it does not add exercise content
or implement new tracking systems such as band resistance levels or carry distances.
The new carries use timed sets and separately tracked kilograms; distance is not
tracked. A suitcase-carry set includes both sides, logging the shorter side's time.

## Instruction and evidence standard

`src/data/reviewed-guides.ts` holds original guide summaries with source URLs and
the date the references were checked. `guides.ts` retains the older content still
awaiting source comparison. A source check is an editorial record, not professional
sign-off or a promise that an exercise cannot cause injury.

- Setup, execution and the Watch out correction must be supported by a source
  that actually describes the movement. Prefer certifying bodies, the original
  equipment manufacturer, clinical educators or an identifiable expert's direct
  technique instruction. Read the content, not just a search title.
- Name a documented mistake. Do not invent a "most common" ranking; a source
  saying something is a mistake does not establish how often it occurs.
- Keep session prescriptions out of technique guides: no instruction to sprint at
  the end, empty the tank, or prepare for the lifts next.
- "Own it" and longer pause progression are Klay coaching choices. Describe a
  stable, controllable position, not an invented universal point of maximum tension.
  Squeezing or feeling a muscle does not prove effectiveness. Repetition counting
  conventions and time targets are also app choices, not quotations from a source.
- Running allows natural arm swing. Rowing is rhythmic. Kettlebell swings use
  deliberate hip-driven momentum and never pause the bell at the top. Do not
  impose the slow strength-lifting rule on cardio or ballistic technique.
- Use a reviewed in-app visual when one exists. Otherwise link to the original
  publisher's demonstration instead of borrowing a different exercise's animation.
  These reference demonstrations need internet access; written guides remain offline.
- New loaded exercises without a researched starting ratio use explicit low
  placeholders, not fabricated strength standards. Users adjust to their ability
  and available kit. These entries are not automatic substitution candidates.

Run `npm run audit:exercises` for current counts, default-plan coverage, source
links and the complete remaining review queue. The current snapshot is
`work/exercise-library/audit.md`. A link-count check cannot certify the meaning
of the instructions: qualified review remains a separate step.

## Steps from here

1. Finish source comparison of the existing library, including warm-up and
   mobility movements. Prioritize exercises already used in saved/default plans,
   then popular swaps. Every new batch must keep default-plan source coverage intact.
2. Arrange qualified technique review of the text, pause positions, warnings and
   demonstrations. Resolve disagreements instead of merging conflicting cues.
3. Add proper band-resistance tracking before offering band exercises with automatic
   progression; band colours and stretches are not universal kilograms. Finish
   reviewed in-app demonstrations for the new library entries.
4. Expand toward 250 by filling the movement × equipment × difficulty checklist,
   then toward 500 if there are still useful gaps. Ship reviewed batches with
   aliases, multi-value tags, requirements, progression and guides together.
5. Verify search, swapping, equipment availability, saved history and the guide
   screen on iPhone and iPad. Preserve saved personal workout choices.

## Adding content

1. Check coverage across movement, equipment and difficulty. Fill a real gap rather
   than multiplying names for the same exercise.
2. Add a stable ID, aliases, accurate discovery tags, equipment requirements and
   an appropriate progression method. Keep old IDs to preserve training history.
3. Write a guide covering setup, execution, breathing, control, an exercise-specific
   pause where appropriate, and common mistakes. Ballistic exercises need their
   own technique and should not inherit slow, paused lifting cues.
4. Review technique against reliable sources and obtain qualified review before
   treating safety instructions as finished. Instructions cannot guarantee freedom
   from injury.
5. Check search, equipment eligibility, guide coverage and progression before
   making the batch available. Bands, timed carries and other new tracking modes
   need their own progression support before entering automatic recommendations.
