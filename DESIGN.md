---
name: Klay
description: A strength-training app where each exercise owns the whole screen in its family's colour.
colors:
  navy: "#13325B"
  white: "#FFFFFF"
  surface-grey: "#F0F2F5"
  raised-grey: "#E6E9EE"
  hairline: "#DDE1E6"
  slate-muted: "#4E6585"
  slate-faint: "#596E8E"
  push-blue: "#2277BB"
  pull-green: "#23864D"
  legs-orange: "#F08A24"
  legs-mark: "#E07400"
  core-magenta: "#D6287E"
  cardio-teal: "#3CC2CB"
  cardio-mark: "#1E9CA6"
  stretch-yellow: "#F6C12A"
  stretch-mark: "#BC8B00"
  goal-violet: "#6A4AB0"
  field-tint-dark: "rgba(8, 28, 60, 0.20)"
  field-tint-dark-raised: "rgba(8, 28, 60, 0.30)"
  field-tint-light: "rgba(255, 255, 255, 0.38)"
  field-tint-light-raised: "rgba(255, 255, 255, 0.55)"
typography:
  display:
    fontFamily: "EB Garamond Medium (EBGaramond_500Medium)"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: "52px"
    fontFeature: "lnum"
  number:
    fontFamily: "EB Garamond SemiBold (EBGaramond_600SemiBold)"
    fontSize: "84px"
    fontWeight: 600
    letterSpacing: "-0.02em"
    fontFeature: "lnum"
  set-count:
    fontFamily: "EB Garamond SemiBold (EBGaramond_600SemiBold)"
    fontSize: "50px"
    fontWeight: 600
    fontFeature: "lnum, tnum"
  headline:
    fontFamily: "EB Garamond Medium (EBGaramond_500Medium)"
    fontSize: "27px"
    fontWeight: 500
    lineHeight: "33px"
    fontFeature: "lnum"
  voice:
    fontFamily: "EB Garamond Italic (EBGaramond_400Regular_Italic)"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: "28px"
  body:
    fontFamily: "EB Garamond Regular (EBGaramond_400Regular)"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: "24px"
    fontFeature: "lnum"
  label:
    fontFamily: "EB Garamond Italic (EBGaramond_400Regular_Italic)"
    fontSize: "19px"
    fontWeight: 400
  action:
    fontFamily: "EB Garamond Medium (EBGaramond_500Medium)"
    fontSize: "21px"
    fontWeight: 500
  bar-label:
    fontFamily: "EB Garamond Regular (EBGaramond_400Regular)"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  action: "999px"
  card: "28px"
  pill: "999px"
spacing:
  segment-gap: "2px"
  inline: "12px"
  card-padding: "18px"
  gutter: "22px"
  name-gap: "28px"
  weight-gap: "42px"
  sets-gap: "40px"
components:
  button-action:
    backgroundColor: "{colors.push-blue}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "0 18px"
    height: "60px"
  button-action-quiet:
    backgroundColor: "{colors.surface-grey}"
    textColor: "{colors.navy}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    padding: "0 18px"
    height: "60px"
  slab-next-on-dark-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.push-blue}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    height: "60px"
  slab-next-on-light-field:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.legs-orange}"
    typography: "{typography.action}"
    rounded: "{rounded.action}"
    height: "60px"
  step-circle:
    backgroundColor: "{colors.field-tint-dark}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    size: "48px"
  tool-circle:
    backgroundColor: "{colors.field-tint-dark}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    size: "40px"
  set-circle:
    backgroundColor: "{colors.white}"
    textColor: "{colors.push-blue}"
    typography: "{typography.set-count}"
    rounded: "{rounded.pill}"
    size: "92px"
  pill-soft:
    backgroundColor: "{colors.field-tint-dark}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    height: "44px"
  bottom-bar:
    backgroundColor: "Liquid Glass, tinted with the ground (white fallback)"
    textColor: "{colors.navy}"
    typography: "{typography.bar-label}"
    rounded: "{rounded.pill}"
    padding: "6px"
    height: "80px"
  card:
    backgroundColor: "{colors.surface-grey}"
    textColor: "{colors.navy}"
    rounded: "{rounded.card}"
    padding: "18px"
---

# Design System: Klay

## Overview

**Creative North Star: "The Sports Hall in Munich Colours"**

Klay is two grounds. Off the floor it is a white page with deep navy words, set in EB Garamond like a well-made programme. On the floor, each exercise takes the entire screen in its family's colour: the screen turns orange for the squat, blue for the bench, and you know what you are doing before you read a word. Colour carries meaning and nothing else; it is never decoration and never a status tint.

Density is low and the targets are huge, because the reader is mid-set, sweaty-thumbed, at arm's length under bright light. The lift screen is a fixed vertical rhythm whose blocks are sized for their largest case, so nothing moves under a thumb. Hierarchy comes from size and italics, never from faded ink. Shapes are the family's six solid marks, soft circles in a tint of the field, one solid pill to move on, and a capsule of Liquid Glass floating over everything, tinted with whatever it floats over.

The system refuses the fitness-app default of a white card stack with a tinted accent, dashboard tiles, and a tab of stats over the set log.

**Key Characteristics:**
- One saturated field per exercise family while lifting; white ground with navy words everywhere else.
- EB Garamond throughout, sentence case, lining figures for every number.
- Klay's remarks and short labels in italics; instructions and facts in roman.
- Six bare solid marks on a 48-unit grid identify the families; no tiles behind them.
- Secondary controls are soft circles and pills in a tint of the field; one solid slab moves you on.
- A floating capsule bar of Liquid Glass, the same shape on every screen, tinted with the ground beneath it.

## Colors

A Munich '72 discipline: one deep navy for words, white for ground, and six saturated family colours that each mean one kind of exercise.

### Primary
- **Munich Navy** (navy): every word and glyph on white, the type on light fields, and the "miss" state. A missed target is shown in navy, not red: a miss is information, not an error.
- **Push Blue** (push-blue): the push family's field and mark, and on white the colour of the active thing: Done's Close slab, a hit, a selected option (at 10% as a wash).

### Secondary: the family fields
Each family's field fills the whole lift screen; its mark is the solid shape on white, a shade deeper where the field would be too faint on white in a bright gym.
- **Push Blue** (push-blue) field and mark, white type. Mark: ▲.
- **Pull Green** (pull-green) field and mark, white type. Mark: ▼.
- **Core Magenta** (core-magenta) field and mark, white type. Mark: ●.
- **Legs Orange** (legs-orange) field, navy type; mark in the deeper **Burnt Orange** (legs-mark). Mark: ■.
- **Cardio Teal** (cardio-teal) field, navy type; mark in the deeper **Pool Teal** (cardio-mark). Mark: ◆.
- **Stretch Yellow** (stretch-yellow) field, navy type; mark in the deeper **Ochre** (stretch-mark). Mark: ◣ (a quarter-circle sweep).
- **Goal Violet** (goal-violet) field and mark, white type (6.5:1). Mark: ★, a five-point star. Not an exercise family but a goal: something you are learning, a step at a time. Violet is the one hue the six leave free, so a goal never reads as a kind of lift. On white it washes a goal's cards at 10%.

### Neutral
- **White** (white): Today's ground, the bottom bar's fallback, sheets, and the fill of logged circles and the solid slab on dark fields.
- **Soft Grey** (surface-grey): every secondary control and raised panel on white (Skip slab, cards, the active tab lozenge).
- **Raised Grey** (raised-grey): a control sitting on a soft-grey panel.
- **Hairline** (hairline): progress tracks and dividers on white.
- **Slate** (slate-muted) and **Faint Slate** (slate-faint): secondary words on white only (a target, a duration, a hint). Both hold 4.5:1 on white and on Soft Grey.
- **Field tints** (field-tint-dark, field-tint-light and their raised steps): soft controls on a field. Dark fields take a navy tint; light fields take a white tint.

### Named Rules
**The One Ink Rule.** On a field, every word is drawn in one colour (white on push, pull and core; navy on legs, cardio and stretch) at full strength. Hierarchy comes from size and italics. Slate greys exist only on white. The one exception is a control that cannot be pressed yet: the waiting Next / Done / Ready slab holds its label at 60%, as the approved comp draws it, and wakes to full strength (solid slab, field-coloured words) the moment it can be pressed.

**The Colour Means Family Rule.** A family colour appears only where that family is: its field, its mark, its exercise, its segment of the day, and the Start that opens onto its field. Never use a family colour as a generic accent, except push blue as the active colour on white.

**The Deeper Mark Rule.** On white, the light families draw their marks in the deeper shade (legs-mark, cardio-mark, stretch-mark), never the field colour.

## Typography

**Display Font:** EB Garamond Medium
**Body Font:** EB Garamond Regular
**Voice Font:** EB Garamond Italic

**Character:** A classic book face in a gym: calm, literate, and set very large. Figures are forced to lining so a weight or rep count stands steady at cap height.

Every word goes through the app's own `Text` wrapper, which maps `fontWeight` and `fontStyle` to the matching Garamond file (one step lighter than asked: 700 draws SemiBold) and adds lining figures. A style without a `fontFamily` has its size and line height scaled ×1.12 to compensate for Garamond's short x-height; a style that names its `fontFamily` is drawn at exactly the size written, which is how the lift screen is specified. The sizes below are rendered sizes.

### Hierarchy
- **Display** (500, 44/52): the workout name on Today, beside its 30pt mark, set like the lift screen's title.
- **Number** (600, 84, -2% tracking): the weight on the lift screen, 64 when a superset is folded in. Unit beside it in Regular 22.
- **Set count** (600, 50, lining and tabular): the rep count inside a 92pt set circle; 44 in an 80 circle and 28 in a 52 partner circle.
- **Headline** (500, 27/33, single line with ellipsis): the exercise name beside its mark.
- **Voice** (Italic 400, 24/28): Klay's remark once the sets are in; 20/26 on Today ("Back squat goes up to 60 kg. Earned.").
- **Body** (400, 19/24): facts and instructions, the top line's workout name, the rest timer.
- **Label** (Italic 400, 19): short labels in a note slot: "Last time", "To beat", the n/total count. 15 for section labels in sheets and history.
- **Action** (500 on a solid slab, 400 on a soft one, 21): slab words, "Next: X".
- **Bar label** (400, 15/18): under each bottom-bar glyph.

### Named Rules
**The Two Voices Rule.** Italics belong to Klay's remarks and to short labels. Instructions and facts are set roman.

**The Sentence Case Rule.** Every label is sentence case. Small headings are italic, not tracked capitals.

**The Lining Figures Rule.** Every number is data and stands at cap height. Old-style figures only when asked for explicitly.

## Layout

A single column with a 22px gutter on both sides, the same inset the bottom bar keeps from the screen edge, so the capsule lines up with the slabs above it.

The lift screen is a fixed rhythm, top to bottom: a top line (workout name with italic n/total, rest timer right), then the day's shape: a white track 8px high (2px padding, 4px corners) holding one 4px segment per exercise in its family's mark colour, 2px apart, a superset twice as wide. Segments up to and including the current one are full colour; the rest wait at 28%, a pale tint of their own hue. The track is white because family colours sit at about 1:1 luminance on each other's fields, while on white each keeps its hue and 3:1. Then the name row, centred, 40 high: mark, headline, and a 36pt ⋯ circle that opens a small white menu card under it (How to do it, Swap for today, Add a note, Add superset — each only where it applies). Under the name, only what applies: an italic word (reload, seconds, a share of another lift) and your note. Then a gap of 52 to the weight block (96 high, the figures underlined in dashes), 48 to the set circles (three 92pt circles, 22 apart) and 28 to a note slot 84 high. The 60pt slab is pinned above the bar. The screen holds four things — name, weight, circles, the line on last time — and everything else waits behind the ⋯. A superset tightens every block (name 18, weight 22, number 64, sets 22, note 58) and shrinks the circles (main 80, partner 52) so both lifts fit above the bar.

**The Largest Case Rule.** Every block on the lift screen is sized for its largest content (a two-line remark, a five-figure weight). Smaller content sits inside that space; nothing shifts under the thumb.

Today holds the day in one card: the day's field colour as a 10% wash over white (pale blue on push, pale orange on legs), 28px continuous corners, 18 side padding, flat like every card, so the name and its list read as one thing and the wash previews the field Start opens onto. Every text colour inside stays above 4.5:1 on any day's wash. Inside it reads left to right like the lift screen's title, on one left edge. A 30pt column holds the shapes (the day's mark at 30, the list's at 22, centred in it), with 14 to the words, so the name, subtitle and every list name start 44 in. The name at 44 and the italic subtitle lead straight into the list. Klay's line sits outside the card, apart from the day it comments on: at the foot, flush with the buttons, 19/25, just above Skip and Start (carrying the Undo after a skip). It appears only when there is news: day one, a return after a week or more, a second session in a day, a skip, or what changed since these lifts were last done (a weight up or down, a lift never done). An ordinary day has no line. Below that, the session reads like a timetable: shape, name, and one figure right-aligned in slate with tabular lining figures. The figure is the weight for a lift (in full navy medium when it went up, so Klay's line has a row to point at), the sets for a lift with no load, and the distance or minutes for cardio and the stretch. A lift never done shows no figure until it has a weight of its own. Skip and Start are pills side by side above the bar.

Plan's workout list uses Today's language, a row per workout, so the plan reads as the run of colours you will train through. Each workout is a card in its own 10% wash: its mark at 24 in a 26 column, 14 to the name in Display 28/34, the italic subtitle and exercise count under it in slate, "Next" in italic navy on the right of the next workout, and a chevron. The explanatory sentence above the list stays: it is the one place that says how the cycle works. Inside a workout, each exercise row carries its mark at 16 before the name.

Under the loop, "New workout" opens a small inline form with one collapsed "Start from" selector. It defaults to Blank workout; existing active and paused workouts are copy templates. Choose a template, then press Create workout. Workout rows reveal Pause/Resume and Delete directly on a left swipe. Delete works on active or paused workouts and offers Undo; training history is preserved. The last workout and the workout currently being trained cannot be removed. There is no workout-copy action in a row menu.

## Elevation & Depth

Flat. Fields, slabs, circles and cards have no shadow; depth comes from tints of the ground (a navy tint on dark fields, a white tint on light ones, Soft Grey on white). The single lifted object is the bottom bar, a capsule of iOS Liquid Glass. Over a field it is tinted with that field (its colour at 70%), dark glass with white words on push, pull and core, and light glass with navy words on legs, cardio and stretch, so it is orange glass on orange, never a white slab on colour. Over white it is clear light glass. Where glass is unavailable (older iOS, the web preview), it falls back to a white capsule with a soft two-layer ambient shadow and an 8% navy hairline over white, and to the field's raised tint over a field. Sheets slide up white over a field and switch back to the white palette.

### Shadow Vocabulary
- **Bar float** (`0 12px 28px rgba(8, 28, 60, 0.16), 0 2px 6px rgba(8, 28, 60, 0.06)`): the bottom bar's no-glass fallback over white only.

### Named Rules
**The One Floating Thing Rule.** Only the bottom bar floats. Everything else is flat on its ground.

## Shapes

Two corner languages. Everything you tap is a circle or a full pill (999): set circles, steppers, tool buttons, the ⋯, the buttons that move you on (Start, Skip, Next, Done), and the bar and its slots, so the buttons above the bar share its shape. Cards and panels, which you read rather than press, keep a generous 28px continuous corner.

The family marks are the system's signature geometry: six solid primitives on one 48-unit grid (push triangle pointing up, pull pointing down, legs a square, core a circle drawn slightly larger to match visual weight, cardio a square on its point, stretch a quarter-circle sweep), plus the goal's five-point star, drawn as a path since five points don't fall out of a border. They are always bare: no tile, no outline, no background. The one exception is the star as an outline: a goal waiting for a workout, and the top of a goal's ladder in Progress.

Set circles are outlined (3px, 2px for a partner) in the field's ink when waiting, and filled solid in that ink with the field colour on top when logged.

## Components

### Buttons
Tactile and unmistakable: one solid way on, everything else soft.
- **Shape:** full pills, 60pt minimum height, 18px side padding.
- **Primary (solid slab):** on white, Start takes the day's family field colour, with that field's own words (white on push, pull and core; navy on legs), so it previews the screen it opens; Close on Done stays push blue with white words. On a field, the field's ink (white on dark fields, navy on light) with the field colour as the words, plus a forward arrow ("Next: X →"). Only one solid slab per screen.
- **Quiet slab:** Soft Grey on white (Skip), the field tint on a field. On the lift screen the Next slab stays quiet until every set is in, then turns solid.
- **Remove:** a red outline (`colors.danger`) with red words, for anything that takes something away — an exercise, a routine, a goal, a move. Where it can't be undone in a tap it asks first, and the second tap is the **Delete slab**: solid red, white words.
- **Text actions:** blue (Rise) words in the sans, 17/700, 48 tall: *add* with a plus ("+ Add move", "New routine"), *back* with a caret ("‹ All moves"), plain links ("Rename"). The way out ("Keep it", "Cancel") is the same in grey, centred under what it undoes.
- **Chips:** for choosing among a few (an area, equipment, a weight): 44 tall full pills, Soft Grey, navy with white words when chosen.
- **One source:** all of these are `Button`, `LinkButton` and `Chip` in `src/components/buttons.tsx`; screens never draw their own. The workout screen's Next slab and the bottom bar are the two exceptions, drawn on the field.
- **Removed things:** Klay's mobility routines that aren't in your list sit at the very foot of their page in a red dashed box, "Not in your list", each with + Add.
- **Pressed:** opacity drops to 0.6–0.8 under the thumb. No hover states: this is a phone.

### Soft circles and pills
- **Step (− / +):** 48pt circle in the field tint, icon at 22. On the lift screen they only show while the weight is being changed.
- **Editable number:** the weight's figures are underlined in short dashes (9 long, 2 thick, 55% of the text colour) to say they can be changed without drawing a box. Tap it and it is being changed, all at once: the number pad comes up, the dashes become a solid line, − and + fade in at the row's ends, and the weight is held back at 40% with a blinking caret before it, like a placeholder. What you type is drawn in its place at the same size — the field you type into is hidden — so nothing jumps. − and + still step it with the pad up. A tap on the number or anywhere else keeps what you typed and closes it at once; a tap on a set circle closes it and logs the set. VoiceOver adjusts the weight with a swipe up or down.
- **Tool (ⓘ, swap, note):** 40pt icon-only circle in the field tint, glyph at 20, on the cardio, mobility and warm-up screens. On white, the ⓘ uses Raised Grey.
- **Length pill (cardio):** after the tools, the block's length in italic 19 with a caret at 16, in a 40-tall pill of the field tint. It opens How far / How long: the length at 48 between − and +, changing today's block as pressed, and once it differs from the workout a line on records and two buttons, Just today and Every time in the workout. Under the score, the effort line for its end (warm-up: easy; finish: pick it up), then the machine's technique tip.
- **More (⋯):** 36pt circle in the field tint at the end of the lift's name. Opens a 250pt white card, 22px corners, with a soft shadow, right-aligned under the button: rows 52 high, outline icon at 20 and body roman at 19, hairlines between. A tap anywhere else closes it.

### Set circles

Current palette (18 November 2026): **Ice & acid**. Each family card uses one hue: a light field with its deeper shade for text, outlines, symbols, and completed sets. Push is ice blue; Pull jade; Legs lilac; Core dusty pink; Cardio pale teal; Mobility amber; Full body / Bodyweight wasabi. Completed sets use the light family shade for their figures. Short sets stay outlined with a stronger ring and show the actual count over the target (5/6); unlogged sets keep a thin outline and the target; zero remains crossed out. No red is used for short sets. These rules supersede the earlier palette and missed-set colour trials.

The signature control. 92pt outlined circles holding the target reps in SemiBold 50; tap to log (fills solid), tap again to count down, hold to reset. A short set fills with the raised tint instead of solid ink. Under them, "Last time" in italic, last time's weight in roman, and last time's sets as small solid circles.

**When a lift is done well.** Once the circles settle on target — 0.65s with no tap, since a short set passes through the target on its way down (tap for 6, tap again for 5) — the lift gets its moment, scaled to what was earned. *On target* (every set at its reps): a ripple runs through the circles left to right, each swelling about 9% and sending out a thin ring in the text colour that grows to 1.55× and fades, all over 1.1s, and a success buzz. *The heavier weight earned* (a reload owned): the same, plus each circle lets loose two or three of the family's marks (13–20pt, in the text colour, some fainter) as the ripple reaches it, coming out from behind it, fanning up and away from the middle, turning, and fading before they reach the weight; the "Up to … next time" line lights up with a soft white pill behind it; a second, firmer buzz. Klay's line itself appears the moment the last circle fills, as for any result. Nothing for a set short or a weight going down, which keep their calm line. It plays once per lift: putting a circle right afterwards, or coming back to a lift already done, plays nothing, and a circle put wrong while it plays takes it away at once. *The send-off:* pressing Next on a lift done well gives a light tap and a soft band of light passing once over the button that comes up in its place (the next lift's Next, its warm-up's Ready, cardio's Done, the stretches'), 0.7s, clipped to the pill. Nothing in any of it moves a control or takes a touch. With Reduce Motion, only the buzzes.

### A goal's step
A goal block sits straight after the warm-up, on Goal Violet, laid out like a lift so it reads the same way: the step's drill as the name with the ⋯ (Watch the tutorial, Change the goal), the goal's name in italics under it with the step's note, then, where a lift has its weight, the step number at 96 with "of 6" at 24 and the ladder in small under it (one 5pt bar a step, 22 wide, the current one 34, steps still to come at 30%). Then the work:
- **Reps** are set circles exactly as a lift's.
- **Holds** are set circles with a small "s", each its own clock: tap and it counts down from the target, the circle a tint of the field with a 3pt ring running down clockwise from the top over a faint track; it buzzes at zero and logs the hold, and a tap mid-hold stops it and logs what was held.
- **Practice** is one clock (76pt figures, "practice" beside it) with a white Start pill, and under the line an "I've got it — next step" pill that turns solid once pressed.

The line under it follows a lift's: Klay in italics and the plain rule ("Move on: every set at 8, two sessions running.") before, then what it means. A step owned gets the lift's whole cheer with stars for marks, and "Step 3 next time: kick-ups to the wall." lights up. Next is always there for practice, since its clock is a guide, not a gate.

A fresh install comes with one goal, the handstand push-up, waiting in no workout: a grey row with the open star, "8 steps · not in a workout yet". Once there are no goals at all, Plan › Goals shows what one looks like: a violet-washed card with the start of that ladder as four rungs on a rail (done with a check, the one you are on as a ring with a dot, one still to come, and the open star for the goal), the one rule for moving up, and a violet "New goal" pill.

### Cards / Containers
- **Corner Style:** 28px continuous.
- **Background:** Soft Grey on white; the field tint on a field.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none.
- **Internal Padding:** 18px.

### Segments
Two or three views of one tab (Plan's Workouts, Library and Goals, History's Sessions and Lifts): a Soft Grey pill track with 4pt padding; the chosen view is a white pill with a 1pt soft shadow and navy SemiBold words, the others slate roman. Never a family colour: a switch is not a family.

### Swipe to remove
Workout rows slide left to reveal two explicit actions: Pause (Resume when paused) and Delete. Exercise rows retain one Remove action. Swiping reveals buttons and never executes them; tapping the foreground or swiping right closes them. Closed rows ignore rightward and vertical drags. Screen readers get the corresponding row actions.

### Add exercise
Exercise first, never movement first. One sheet: a pill search field (Soft Grey, magnifier, "Search exercises"), then every exercise you could add as plain rows on white, mark at 16 and name at 18, grouped Push, Pull, Legs, Core under italic headings. Rows already in the workout are faint with an italic "in it". Search matches names, other names (aliases), plurals and muscles, best first. When nothing matches exactly, the last row is a push-blue "+ Create “…”" link opening two plain questions as chips: "What do you lift?" and "What does it work?" (in gym words, one row per family led by its mark). Selected chips are navy with white words; the final pill is navy, since what you make could be any family.

### Test mode
A navy strip under the status bar, full width, 40 tall: "Test mode" in bold and "· your real training is safe" in white roman, with a bold white "Leave" at the right. Navy because it is the colour of no family, so it reads as the app speaking, not as part of a workout; the screens below it are told the top is already clear. Its sheet (Progress → Test mode) is plain choice cards on Soft Grey — a bold 18 title and a muted 15 line of what you get — and, once on, a Short workouts switch row, "Leave test mode" and a quiet "Start over" that opens the same choices in place.

### The intro
Six pages over everything, the bar included, on white: Skip at the top right (Close when reopened), one picture in the top half, then the words, then one dash a page (22 wide, the one you are on 34, those to come at 20%) and a 60pt navy pill, "Next →", "Get started" on the last. The words are a 40/44 Medium heading that says what it means, never a slogan, and 20/29 roman body in plain full sentences, written so that someone who has never trained follows it the first time. Each picture is drawn from the app's own parts (the week's circles, a lift on push blue with what each part means written in italics, the weights as a staircase, an exercise feeding Push and a workout of your own, that one dashed like "New workout", then Push, Pull and Legs in order with a line back to the top). Nothing else goes on a page: when it crowds, take something away. On a short phone the picture is drawn smaller rather than the words moved.

### Navigation
The bottom bar: a Liquid Glass capsule 80pt high, 6pt inner padding, 22pt from the screen edges, mounted once so it never animates with screens. It works out its own ground: the current item's field on the workout screen, white everywhere else. Each slot is a full-height lozenge with an icon (24) over a 15pt Garamond label in the ground's ink (navy, or white on dark fields). The current tab sits in a Soft Grey lozenge; inactive tabs use slate. A pressed slot on a field takes a white (dark fields) or navy (light fields) wash. While lifting it carries Back, Leave and Skip instead of tabs; its shape never changes.

### Sheets
White, in the white palette even over a field. Section headings are italic 15 in faint slate, sentence case.

### Icons
Phosphor Icons in Bold, drawn in the current ink at one weight everywhere. Only the drawings the app uses are kept, as plain paths in `components/icon.tsx`, so the phone, Android and the web preview match. The tabs: weights for Today, stairs for Progress (climbed a rung at a time), a grid for Plan. In the workout bar, Leave is an open door, since the workout waits on Today, and Skip a double chevron.

## Do's and Don'ts

### Do:
- **Do** fill the whole lift screen with the exercise family's field colour and draw every word on it in that field's one ink at full strength.
- **Do** build hierarchy from size and italics: 84 for the weight, 50 in the circles, 27 for the name, 19 for facts.
- **Do** set Klay's remarks and short labels ("Last time", "To beat") in italics, and instructions and facts in roman.
- **Do** keep one solid slab per screen and make every other control a soft circle or pill in a tint of the ground.
- **Do** size every lift-screen block for its largest case so nothing moves under the thumb.
- **Do** use the six family marks bare, on the 48-unit grid, in the deeper mark shade on white.
- **Do** show a missed target in navy, not red.

### Don't:
- **Don't** put kicker or eyebrow text above a title.
- **Don't** fade a word on a field with opacity or a lighter tint; slate greys are for white only.
- **Don't** use tracked capitals for labels; small headings are italic sentence case.
- **Don't** put a mark on a tile or inside a badge.
- **Don't** use a family colour as a decorative accent away from its family.
- **Don't** add shadows to fields, cards, buttons or circles; only the bottom bar floats.
- **Don't** build the lift screen as a white card stack, dashboard tiles, or a stats tab over the set log.
- **Don't** use old-style figures for a number the user reads as data.


## Current redesign branch — November 14, 2026

This section supersedes the earlier navigation, session layout and cardio controls.
The existing family colours, Garamond typography and illustrations remain the visual foundation.

- Navigation is Today / Plan / Profile. Profile opens Progress & history and Settings.
- A workout is a horizontal row of coloured cards. Each card is complete before arrival;
  only the current card animates. Leaving a stretch card pauses its routine.
- The workout overview is a rounded, bordered button above the cards, with a disclosure icon.
- Plan owns lasting workout edits. Session swaps, targets and notes are for today only.
  Logged performance still drives the existing automatic progression.
- Workout rows stay in place when paused and fade. Swipe left reveals Pause/Resume and Delete directly, with Undo after deletion. Copying belongs to the collapsed template selector under New workout.
- Today, Plan and Profile disable native stack back-swipes. Plan blocks horizontal browser overscroll so gestures stay in its content.
- Workout editing follows the session order: 1 · Warm up / 2 · Train / 3 · Finish.
  Add exercise precedes the exercise list. An empty warm-up routine opens a chooser.
- Cardio uses the same LiftTitle and three-dot ToolsMenu as strength cards. No purpose heading, separate Change button, or typing instructions. The note sits under the name and tapping it edits it; the menu offers Add a note only when empty. The saved target is plain text, with no distance/time switch or target editing on the workout card. Distance/time are configured in Plan’s workout editor; Treadmill defaults to 1 km with a time result, while choosing Time starts at five minutes. The result is one input (5:30 or 530 for time); Last time is the main comparison, with Fastest (or Furthest for a time target) secondary on the same quiet line. Today's result stays empty until entered. The card stays fixed with the keyboard closed, and Done stays at the bottom. While editing, the active input is revealed above the keyboard; tap blank space or the numeric keyboard's Done control to dismiss it. Titles use 34/40 Garamond, wrap to two lines and never shrink to fit. Cardio numbers have no underlines. Workout swaps are session-only; saved cardio targets, exercise replacements and notes are shared across future workouts.
- Weights held in each hand say “kg / hand”. Shared exercise settings explain their scope.

- The Library searches the complete built-in strength pool and custom exercises, with movement and equipment filters and overlapping tags. Push means pressing (chest, shoulders and triceps); Pull means pulling (back and biceps). Cardio targets are read-only in the Library and edited in Workouts. Notes remain shared for cardio.
- Strength uses one working weight per exercise across workouts and rep ranges. Rep ladders remain range-specific; a stale range restarts at its bottom when the shared weight changes. A manual session weight carries forward only after actual sets are logged and the session finishes; untrained edits never change history.
- Warm-up and mobility routines allow Previous, Next, a movement picker and Skip movement. Each side saves Done or Skipped independently; skipping never pretends a pose was performed.
- Blank workouts start empty. No arbitrary exercise limit: a compact progress track shows up to ten marks around the current card; the expanded overview scrolls with 52-point rows and keeps Leave for now outside the scrolling list. Active workout rows use stronger family colours; paused rows use a neutral background.
