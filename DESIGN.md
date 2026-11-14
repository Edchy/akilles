# Milo — core reset design

Mode: Operate. Primary device: iPhone, used between sets in a gym.

The current UI has three states: Today, one exercise, and Finish. No bottom tabs,
card deck, dashboard or illustration. This is a baseline to evaluate the mechanism.

Keep the existing EB Garamond fonts, white ground and navy text (`theme.ts`).
Use a single reading column, 24pt side gutters, clear headings, and generous spacing.
Headings use 40–48pt type; instructions and controls use 19–23pt. Keep data readable.

Editable weight is an outlined field with its unit beside it. Set rows have one
explicit action, Log set or Edit. Logging asks for the actual completed count and
requires Save set; taps do not secretly decrement a number. Timed lifts say seconds.

The next action sits below the exercise, becomes available when its sets are logged,
and names what happens: Next exercise or Review workout. Back and Skip or finish
are visible below it. Save & leave returns to Today without ending the session.

Set rows use a quiet grey surface and 14pt corners. Do not introduce nested cards,
decorative colour, animation, or more navigation while testing this baseline.
Use safe areas and scrolling content so short screens and the keyboard can fit.

The saved-program defaults and progression rules remain provisional. Do not explain
away confusing behaviour with more copy; bring the mechanism back for a decision.
