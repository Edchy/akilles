# Paper refinements

Preview: http://127.0.0.1:8095/humbell-paper-refinements.html

Source: humbell-paper-refinements.html

Five finish studies: Pure ink, Soft graphite, Indigo wash, Sage wash, Clay wash.
All variants share the same HTML structure, positions, type sizes and spacing.
The layout reference is the original app's video/public/shots/home.png and
video/public/shots/lift0.png, checked against current index.tsx and workout.tsx.
The phone study uses the original Garamond, category marks, centered title,
working weight, three set controls, last-time comparison and stacked deck.
Today keeps Skip on the left, Start on the right, and the preview inside one border.
The workout hides the bottom tab bar, matching the original deck.
These are browser studies, not modifications to the running app.

Watercolour asset: assets/watercolour-wash.png (original) and
assets/watercolour-wash-preview.png (720px preview). Generated with the built-in
image_gen tool. The wash is embedded once in the fragment; sage and clay use hue
adjustments. All pigment stays behind legible foreground content. Replay and
set logging trigger a single left-to-right reveal; Reduce Motion disables it.

Generation prompt:
Use case: stylized-concept. Asset type: a reusable translucent watercolor wash for
a very minimal paper-based mobile interface. Generate ONE isolated horizontal
sweep of real ultramarine-blue watercolour pigment on transparent background.
Scan-like flat overhead artwork, genuine wet-on-wet pigment, soft irregular
feathered perimeter, delicate capillary blooms, subtle granulation, darker pigment
pooling in a few very small areas. A loose broad organic brush mark from left to
right, approximately 3:1 width to height, no geometrically rounded blob, no hard
outline. Very pale translucent center, richer irregular edges, plenty of
completely transparent space around all sides. Minimal and beautiful, restrained
Japanese watercolor study. No letters, text, symbols, UI, brush, objects, shadows,
border, or paper rectangle. Actual transparency behind the paint.

Verification: JavaScript syntax checked. Rendered in Chrome, and the Indigo wash
set logging and replay were exercised. Native device performance is not tested.
