# Current reset

Branch: `redesign/workout-core`. Base: `83ca871`.

The previous screen-by-screen redesign is set aside. The current experiment is
Today → one exercise at a time → Finish. No tabs or swipe deck.

## Code

- `src/app/index.tsx`: next workout, Start / Continue, backup access.
- `src/app/workout.tsx`: weight, explicit set counts, navigation, finish summary.
- `src/store/core.ts`: starts a strength-only session from the existing plan and logs counts.
- `src/store/session.ts`: existing storage, history and progression mechanics, unchanged.

Old Plan, Profile, History and Settings routes redirect to Today. The earlier UI is
in `archive/before-core-reset/` as text so it is recoverable without becoming routes.
The earlier redesign patch is there too. Existing unused components stay dormant;
there is no new feature-flag framework or second mode to configure.

## Behaviour boundaries

The saved plan is not rewritten. New sessions omit automatic cardio/routine/ramp
blocks. Continuing an existing session preserves it; older non-lifting blocks can
be moved past, and previously paired exercises can still be logged.
Finishing uses the existing progression engine and saved-session lifecycle.
No new default exercise program or progression algorithm has been chosen.

The removed Today skip/postpone UI test is archived with its UI. Queue engine tests
remain active. `tests/core-loop.cjs` covers the new session boundaries and persistence.

## Review

TypeScript checks, the store test suite and web export must pass before handoff.
Visual and iPhone interaction QA remain pending: scoped browser access failed in
the preceding pass, and whole-browser inspection was rejected by automatic approval
review because it could expose unrelated private tabs. No rendered QA is claimed.

Next product decision: the smallest default workout worth coming back for.
Evaluate its exercises, session size and progression explicitly before adding tools.
