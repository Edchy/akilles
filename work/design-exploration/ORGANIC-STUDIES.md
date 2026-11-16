# Organic Humbell studies

Preview: http://127.0.0.1:8095/humbell-organic.html
Source: humbell-organic.html

## Pigment pools
A large asymmetric ochre wash replaces the workout's rectangular container.
Three separate violet, turquoise and coral paint wells are the three set targets.
The generated contours, rather than geometric clipping, define their visible shape.
A tap records immediately. An expanding feathered mask, seeded at the actual tap
position, deposits the corresponding pigment image over 650 ms. No linear wipe.
The generated alpha defines the final silhouette. Repeated taps correct the count.

## One continuous stroke
A black calligraphic contour groups the planned session. A different, horizontal
connected ink gesture groups the sets. A logged set adds a red, pressure-varying
brush mark beneath its number over 350 ms. Each set is independently marked.
White space, sans typography, one red accent, no exercise panel or rectangular card.

Both studies retain Start/Skip, workout icons, the exercise menu and three rep
targets. Swiping moves through three sample exercises. The previews do not change
app data. These are exploratory browser studies, not native app implementations.
Reduced Motion produces the final pigment/ink state immediately. There are no
idle animation loops. State echoes do not interrupt an in-progress animation.

## Artwork
All four originals were generated with the built-in image_gen tool and saved
non-destructively under assets/. The -web copies are 640px previews.

- assets/pool-workout.png
- assets/pool-sets.png
- assets/stroke-workout.png
- assets/stroke-sets.png

## Generation prompts

### pool-workout
Use case: stylized-concept. Create an isolated organic PAINTED FIELD, no interface or text. Portrait composition about 3:4, fully transparent outside. One very pale golden ochre wet-on-wet watercolour pool large enough to hold a mobile workout list: asymmetric upright silhouette, a shoulder bulging left near top, narrower waist on right, soft heavy bottom. NOT rectangular, NOT a rounded rectangle, NOT a perfect ellipse. Broad, nearly ivory center with exquisitely subtle ochre granulation; slightly richer pigment edges that feather naturally. Clean restrained art-direction, 90% delicate pale paint. Shape feels like a single confident drop spreading across cold-pressed paper. NO separate splatter dots, objects, shadows, line border, icons or letters. Actual alpha transparency.

### pool-sets
Use case: stylized-concept. Transparent background. THREE entirely distinct small pools of genuine wet-on-wet watercolour, horizontally aligned with generous equal gaps and no overlap. Left: softly lobed pale dusty lilac with one pointed tail. Middle: an irregular shallow turquoise pool with a broader bottom. Right: a pale coral pool, wider at top, a tiny dried edge. All three organically shaped and roughly equally sized, not circles or rounded squares. Delicate paper granulation and pigment feathering, darker small pockets around edges, luminous light centers. Graphic and artful but clean, no speckles outside the marks. Plenty of transparent room. No text, no UI, no shadows. The whole image wide landscape 3:1.

### stroke-workout
Use case: stylized-concept. One isolated continuous BLACK INK BRUSH GESTURE on fully transparent background. Tall portrait 3:4. An open freeform organic contour that can loosely enclose a vertical list: a long graceful curving stroke travels up the left, hooks over the top, curves loosely down the right and ends with a tapered sweep at bottom. The loop is asymmetric and comfortably roomy in the middle, approximately a flowing bean shape, not rectangle/rounded rectangle/circle. Thin black calligraphic line, with subtle thick-to-thin pressure variation and light dry-brush breaks. Sophisticated minimalist modernist ink drawing; not distressed, not messy, not a stock circle scribble. Interior stays entirely transparent. No text, no other objects, no paper rectangle, no shadow.

### stroke-sets
Use case: stylized-concept. Minimalist black ink gesture on actual transparent background, wide landscape 3:1. Three small OPEN ORGANIC INK LOOPS connected by one quiet flowing hand-brushed line. Each loop is an asymmetric small kidney shape with a wide clear transparent inside, all distinct, the left leaning, the middle shallow and wider, the last a little taller. Deliberate controlled calligraphy with beautiful pressure variation, thin to medium black ink, tiny drybrush breaks. The connecting line flows into each loop, suggesting one continuous gesture. No perfect circles, no squares, no outlined pill, no text, no numbers, no icons, no objects or shadows. Large transparent margins.

## Verification
JavaScript syntax checked; preview served successfully. Both initial compositions
were inspected in Chrome, and pigment logging was exercised. A subsequent pass
fixed state-echo animation interruption, clipping on Start, and text clearance in
the ink composition. Final corrected Pigment pools was visually checked. Browser
control failed during the final corrected ink screenshot; native performance and
physical touch gestures remain unverified.
