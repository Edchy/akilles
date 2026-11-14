/**
 * How to do each movement well: a few steps, how to own it, and the one
 * mistake to watch for.
 *
 * Written to be read in the gym, between sets — short lines, plain words, the
 * cues a good coach would actually say. Keyed by exercise, machine or pose id.
 * Anything without an entry (an exercise you added yourself) falls back to its
 * own one-line cue, if it has one.
 */

export type Guide = {
  /** In order. Three is the aim; never more than four. */
  steps: string[];
  /** The most common way it goes wrong. */
  avoid: string;
  /** Lifts only: the position to hold, or the part to slow down — see `OWN`. */
  own?: string;
};

const g = (steps: string[], avoid: string): Guide => ({ steps, avoid });

// ---- lifts ----

const LIFTS: Record<string, Guide> = {
  bench: g(
    [
      "Eyes under the bar, feet flat, shoulder blades pinched back and down.",
      "Lower to the low chest with elbows about 45° from your sides.",
      "Touch, then drive up and slightly back over the shoulders.",
    ],
    "Bouncing the bar off your chest or letting the elbows flare straight out.",
  ),
  db_bench: g(
    [
      "Sit with the dumbbells on your thighs, lie back and kick them up.",
      "Lower until you feel a stretch across the chest, elbows at 45°.",
      "Press up and slightly in, without clanking them together.",
    ],
    "Dropping the elbows far below the bench and losing the shoulder position.",
  ),
  incline_bench: g(
    [
      "Bench at 30–45°. Shoulder blades back, feet planted.",
      "Lower to the upper chest, just under the collarbone.",
      "Press straight up over the shoulders.",
    ],
    "An incline so steep it turns into a shoulder press.",
  ),
  machine_chest: g(
    [
      "Set the seat so the handles line up with mid-chest.",
      "Shoulder blades against the pad, press out smoothly.",
      "Control the return until you feel the stretch.",
    ],
    "Shoulders rolling forward off the pad at the end of each rep.",
  ),
  incline_db_press: g(
    [
      "Bench at 30–45°, dumbbells at the upper chest.",
      "Press up and slightly in, palms forward or a little turned in.",
      "Lower slowly to a stretch, elbows under the wrists.",
    ],
    "Rushing the lowering half — that's where the work is.",
  ),
  dips: g(
    [
      "Lock out on the bars, shoulders down away from the ears.",
      "Lean slightly forward and lower until the upper arms are level.",
      "Push back up to straight arms.",
    ],
    "Sinking so deep the shoulders roll forward and ache.",
  ),
  push_up: g(
    [
      "Hands just wider than the shoulders, body in one straight line.",
      "Lower until the chest is a fist from the floor, elbows about 45°.",
      "Push the floor away to straight arms.",
    ],
    "Hips sagging or piking — the body moves as one piece.",
  ),
  decline_bench: g(
    [
      "Legs hooked in, shoulder blades pinched back and down.",
      "Lower to the bottom of the chest, elbows about 45°.",
      "Press straight up over the shoulders.",
    ],
    "Letting the bar drift toward the neck on the way down.",
  ),
  close_grip_bench: g(
    [
      "Hands about shoulder width, elbows tucked close to the sides.",
      "Lower to the low chest, forearms vertical.",
      "Press up by straightening the elbows hard.",
    ],
    "A grip so narrow the wrists bend back and ache.",
  ),
  smith_bench: g(
    [
      "Set the bench so the bar comes down on the low chest.",
      "Shoulder blades back and down, then twist the bar off the hooks.",
      "Lower to the chest and press straight up.",
    ],
    "Lying too far up the bench, so the bar comes down toward the neck.",
  ),
  smith_incline_press: g(
    [
      "Bench at about 30°, set so the bar lands on the upper chest.",
      "Shoulder blades back, twist the bar off the hooks.",
      "Touch just under the collarbone, then press straight up.",
    ],
    "Elbows flaring straight out to the sides at the bottom.",
  ),
  incline_machine_press: g(
    [
      "Seat so the handles start level with the upper chest.",
      "Shoulder blades against the pad, press up and out.",
      "Lower slowly until you feel the stretch.",
    ],
    "Letting the weights touch down and rest between reps.",
  ),
  cable_fly: g(
    [
      "Pulleys low, bench on an incline between them.",
      "Soft bend in the elbows, fixed for the whole rep.",
      "Sweep the hands up and together over the upper chest.",
    ],
    "Turning it into a press by bending the elbows more as you go.",
  ),
  cable_crossover: g(
    [
      "Pulleys high, step forward into a split stance.",
      "Soft elbows, sweep the hands down and together in front of the hips.",
      "Let them open slowly back to a stretch.",
    ],
    "Heavy weight pulling you off balance — go lighter and feel the chest.",
  ),
  pec_deck: g(
    [
      "Seat so the handles are at chest height, back flat on the pad.",
      "Soft bend in the elbows, sweep the hands together in front.",
      "Open slowly until the chest stretches.",
    ],
    "Pushing with the hands instead of hugging with the arms.",
  ),
  db_fly: g(
    [
      "Lie back with the dumbbells over the chest, palms facing.",
      "Soft elbows, open the arms wide until the chest stretches.",
      "Sweep them back up and together, as if hugging a barrel.",
    ],
    "Going so deep the shoulders take over — stop at a good stretch.",
  ),
  incline_db_fly: g(
    [
      "Bench at about 30°, dumbbells over the upper chest, palms facing.",
      "Soft elbows, open out wide to a stretch.",
      "Sweep them back up and together over the chest.",
    ],
    "Bending the elbows more as it gets heavy, until it's a press.",
  ),
  ohp: g(
    [
      "Bar on the front of the shoulders, grip just outside them.",
      "Squeeze glutes and brace, then press straight up past the face.",
      "Push the head through at the top so the bar is over the midfoot.",
    ],
    "Leaning back and turning it into a standing incline press.",
  ),
  db_shoulder: g(
    [
      "Sit tall, dumbbells at ear height, palms forward.",
      "Press up until the arms are straight, not quite touching.",
      "Lower back to ear height under control.",
    ],
    "Arching the lower back off the seat to finish a rep.",
  ),
  pike_push_up: g(
    [
      "Hands and feet on the floor, hips high, so your body makes an upside-down V.",
      "Bend your elbows and lower the top of your head toward the floor just in front of your hands.",
      "Push back up until your arms are straight. Hips stay high the whole time.",
    ],
    "Letting the hips drop until it turns into an ordinary push-up.",
  ),
  kb_press: g(
    [
      "Clean the bell to the shoulder, resting on the back of the forearm.",
      "Squeeze the glutes and press straight up, biceps by the ear.",
      "Lower under control back to the rack. Switch arms.",
    ],
    "Leaning away from the bell to get it up.",
  ),
  machine_shoulder: g(
    [
      "Seat so the handles start around shoulder height.",
      "Back flat on the pad, press up to straight arms.",
      "Lower slowly back to the start.",
    ],
    "Shrugging the shoulders up to the ears as you press.",
  ),
  arnold_press: g(
    [
      "Sit tall, dumbbells at the shoulders, palms facing you.",
      "Press up, turning the palms forward as you go.",
      "Lower and turn them back to the start.",
    ],
    "Rushing the turn and letting the dumbbells swing.",
  ),
  smith_shoulder_press: g(
    [
      "Seat under the bar so it comes down just in front of the face.",
      "Back flat on the pad, twist it off the hooks and press to straight arms.",
      "Lower to chin height under control.",
    ],
    "Sitting so far back that the bar comes down on your face.",
  ),
  pullup: g(
    [
      "Hang from an overhand grip a little wider than shoulders.",
      "Pull the shoulders down, then drive the elbows toward your ribs.",
      "Chin over the bar, then lower all the way to straight arms.",
    ],
    "Half reps — start every one from a full hang.",
  ),
  lat_pulldown: g(
    [
      "Thighs under the pad, grip a little wider than shoulders.",
      "Lean back slightly, pull the bar to the top of the chest.",
      "Let it rise until the arms are straight and the lats stretch.",
    ],
    "Swinging the whole body back to move the weight.",
  ),
  chinup: g(
    [
      "Hang from an underhand grip, shoulder width.",
      "Pull the chest toward the bar, elbows down and in.",
      "Lower slowly all the way to straight arms.",
    ],
    "Kicking the legs to get the last reps.",
  ),
  close_grip_pulldown: g(
    [
      "Close-grip handle on the pulldown, thighs under the pad.",
      "Lean back slightly and pull the handle to the top of the chest.",
      "Let it rise until the arms are straight and the lats stretch.",
    ],
    "Leaning so far back that it turns into a row.",
  ),
  machine_pulldown: g(
    [
      "Seat so the handles are just in reach, thighs under the pad.",
      "Pull the elbows down toward the ribs.",
      "Let the handles rise until the arms are straight.",
    ],
    "Cutting the top short — let the arms straighten every rep.",
  ),
  straight_arm_pulldown: g(
    [
      "High pulley, bar or rope, hinge slightly forward.",
      "Arms straight, sweep the bar down to the thighs.",
      "Let it rise to head height under control.",
    ],
    "Bending the elbows and turning it into a pushdown.",
  ),
  bb_row: g(
    [
      "Hinge until the torso is about 45°, back flat, knees soft.",
      "Pull the bar to the lower ribs, elbows back.",
      "Lower to straight arms without standing up.",
    ],
    "The torso rising with every rep until it becomes a shrug.",
  ),
  cable_row: g(
    [
      "Sit tall, knees soft, arms straight.",
      "Pull the handle to the belly button, squeezing the shoulder blades.",
      "Let it go forward until the shoulders reach, then repeat.",
    ],
    "Rocking back and forth to swing the weight.",
  ),
  chest_supported_row: g(
    [
      "Chest on the pad, arms hanging straight.",
      "Row the elbows back past the ribs.",
      "Lower slowly to a full stretch.",
    ],
    "Lifting the chest off the pad to cheat the weight up.",
  ),
  machine_row: g(
    [
      "Seat so the handles line up with the lower chest.",
      "Chest on the pad, pull the elbows back.",
      "Return until the arms are straight.",
    ],
    "Shrugging instead of pulling back with the elbows.",
  ),
  db_floor_press: g(
    [
      "Lie on the floor, knees up, feet flat, a dumbbell in each hand over your chest.",
      "Lower until your upper arms rest on the floor, elbows a little out from your sides.",
      "Press straight back up.",
    ],
    "Dropping the elbows onto the floor with a bump.",
  ),
  kb_floor_press: g(
    [
      "Lie on the floor, knees up, feet flat. Hold each bell by the handle, the bell on the back of your wrist.",
      "Lower until your upper arms rest on the floor.",
      "Press straight back up. One bell? Do one arm, then the other.",
    ],
    "Letting the wrist bend back under the bell.",
  ),
  db_pullover: g(
    [
      "Lie on a bench and hold one dumbbell by the handle in both hands, over your chest, arms long.",
      "Lower it in an arc behind your head until your upper arms are by your ears.",
      "Pull it back over your chest, arms staying long.",
    ],
    "Bending the elbows to make it a triceps lift.",
  ),
  kb_row: g(
    [
      "Hand and knee on a bench or a sturdy chair, back flat.",
      "Pull the bell toward the hip, elbow close.",
      "Lower to a straight arm and a stretch.",
    ],
    "Twisting the torso open to heave the weight.",
  ),
  kb_rdl: g(
    [
      "Stand tall, the bell in both hands in front of your thighs, knees soft.",
      "Push your hips back and let the bell slide down your legs, back flat.",
      "Stop at a big stretch behind your thighs, then stand up by pushing the hips forward.",
    ],
    "Rounding the back to reach the bell lower.",
  ),
  kb_curl: g(
    [
      "Stand tall, holding the bell by the sides of its handle, arms straight.",
      "Curl it up toward your chest. Only your forearms move.",
      "Lower all the way to straight arms.",
    ],
    "Swinging it up with the hips.",
  ),
  db_row: g(
    [
      "Hand and knee on a bench, back flat.",
      "Pull the dumbbell toward the hip, elbow close.",
      "Lower to a straight arm and a stretch.",
    ],
    "Twisting the torso open to heave the weight.",
  ),
  tbar_row: g(
    [
      "Straddle the bar, hinge until the torso is about 45°, back flat.",
      "Pull the handle to the lower chest, elbows back.",
      "Lower to straight arms without standing up.",
    ],
    "Jerking it up with the hips and lower back.",
  ),
  inverted_row: g(
    [
      "Hang under a bar at waist height, body straight, heels down.",
      "Pull the chest to the bar, elbows back.",
      "Lower to straight arms.",
    ],
    "Hips sagging, so the chest never reaches the bar.",
  ),
  back_squat: g(
    [
      "Bar on the upper back, feet shoulder width, toes slightly out.",
      "Brace, then sit down between the heels, knees tracking the toes.",
      "Hips to knee level or lower, then drive up through the whole foot.",
    ],
    "Knees caving in on the way up.",
  ),
  front_squat: g(
    [
      "Bar across the front of the shoulders, elbows high.",
      "Sit straight down, chest tall.",
      "Stand up keeping the elbows up the whole way.",
    ],
    "Elbows dropping, so the bar rolls forward.",
  ),
  goblet_squat: g(
    [
      "Hold a dumbbell at the chest, elbows under it.",
      "Squat down between the knees, chest up.",
      "Stand up through the whole foot.",
    ],
    "Heels lifting — widen the stance if they do.",
  ),
  bw_squat: g(
    [
      "Feet a little wider than your hips, toes turned out a touch.",
      "Reach your arms forward and sit down between your heels, chest up.",
      "Go below level with your knees, then stand up tall.",
    ],
    "Heels lifting, or knees falling in toward each other.",
  ),
  kb_goblet_squat: g(
    [
      "Hold the bell by the horns at the chest, elbows down.",
      "Squat down between the knees, elbows brushing inside them.",
      "Stand up through the whole foot, chest tall.",
    ],
    "The bell drifting away from the chest and pulling you forward.",
  ),
  hack_squat: g(
    [
      "Back flat on the pad, feet shoulder width mid-platform.",
      "Lower until the thighs are at least parallel.",
      "Press up without locking the knees hard.",
    ],
    "Cutting the depth short when the weight gets heavy.",
  ),
  leg_press: g(
    [
      "Feet shoulder width in the middle of the platform.",
      "Lower until the knees are near the chest, lower back on the pad.",
      "Press away without snapping the knees straight.",
    ],
    "Going so deep the hips curl off the seat.",
  ),
  smith_squat: g(
    [
      "Bar on the upper back, feet a little in front of it.",
      "Twist it off the hooks, brace and sit down, knees tracking the toes.",
      "Hips to knee level or lower, then drive up through the whole foot.",
    ],
    "Cutting the depth short — the rails make it easy to stop high.",
  ),
  deadlift: g(
    [
      "Bar over the midfoot, grip just outside the legs.",
      "Chest up, back flat, pull the slack out of the bar.",
      "Push the floor away and stand tall, bar close to the legs.",
    ],
    "Rounding the lower back to break the bar off the floor.",
  ),
  rdl: g(
    [
      "Stand tall with the bar, knees soft.",
      "Push the hips back, bar sliding down the thighs.",
      "Stop at a big hamstring stretch, then drive the hips forward.",
    ],
    "Turning it into a squat by bending the knees more.",
  ),
  kb_swing: g(
    [
      "Feet a little wider than the hips, bell a foot in front of you.",
      "Hike it back between the legs, then snap the hips forward.",
      "Let it float to chest height and fall back into the next hinge.",
    ],
    "Squatting it up or lifting with the arms — it is a hip snap.",
  ),
  good_morning: g(
    [
      "Bar on the upper back, knees soft.",
      "Hinge at the hips until the torso nears level.",
      "Drive the hips forward to stand.",
    ],
    "Going heavy before the hinge is solid — this one is for feel.",
  ),
  hip_thrust: g(
    [
      "Upper back on a bench, bar padded over the hips.",
      "Feet flat, shins vertical at the top.",
      "Drive the hips up until the body is straight, squeeze, lower.",
    ],
    "Arching the lower back instead of finishing with the glutes.",
  ),
  back_ext: g(
    [
      "Pad just below the hips, ankles locked in.",
      "Lower with a flat back to a hamstring stretch.",
      "Rise until the body is straight — no further.",
    ],
    "Swinging up past straight into a big back arch.",
  ),
  db_rdl: g(
    [
      "Dumbbells in front of the thighs, knees soft.",
      "Hips back, dumbbells close to the legs.",
      "Stretch, then drive the hips through to stand.",
    ],
    "Letting the dumbbells drift away from the legs.",
  ),
  nordic_curl: g(
    [
      "Kneel with the ankles anchored.",
      "Lower the body forward as slowly as you can, hips straight.",
      "Catch yourself with the hands, push back up.",
    ],
    "Bending at the hips — keep knees to head in one line.",
  ),
  sumo_deadlift: g(
    [
      "Wide stance, toes out, shins against the bar.",
      "Grip inside the knees, chest up, knees pushed out.",
      "Push the floor apart and stand tall.",
    ],
    "Hips shooting up first, so it becomes a stiff-legged pull.",
  ),
  trap_bar_deadlift: g(
    [
      "Stand in the middle of the bar, hands on the handles.",
      "Hips back and down, chest up, back flat.",
      "Push the floor away and stand tall.",
    ],
    "Yanking it off the floor before the back is set.",
  ),
  glute_bridge: g(
    [
      "Lie on your back, knees bent, feet flat near the hips.",
      "Drive through the heels and lift the hips until the body is straight.",
      "Squeeze the glutes, then lower slowly.",
    ],
    "Pushing through the toes — keep the heels down.",
  ),
  cable_pull_through: g(
    [
      "Low pulley, rope between the legs, face away and step out.",
      "Push the hips back, the rope following between the thighs, back flat.",
      "Drive the hips forward to stand and squeeze the glutes.",
    ],
    "Squatting down instead of pushing the hips back.",
  ),
  single_leg_rdl: g(
    [
      "A dumbbell in each hand, standing on one leg, knee soft.",
      "Hinge forward as the free leg reaches back, hips square.",
      "Stretch, then drive the hip through to stand.",
    ],
    "The hip opening toward the ceiling — keep both hips facing the floor.",
  ),
  bulgarian: g(
    [
      "Back foot on a bench, front foot far enough out.",
      "Drop the back knee straight down.",
      "Drive up through the front heel.",
    ],
    "A stance so short the front knee shoots way past the toes.",
  ),
  walking_lunge: g(
    [
      "Long step forward, torso upright.",
      "Lower until the back knee nearly touches.",
      "Drive through the front heel into the next step.",
    ],
    "Short, choppy steps that load the knees, not the hips.",
  ),
  step_up: g(
    [
      "Whole foot on a knee-high box.",
      "Stand up through that foot, not pushing off the back one.",
      "Lower slowly on the same leg.",
    ],
    "Bouncing off the floor foot to get up.",
  ),
  reverse_lunge: g(
    [
      "Dumbbells at your sides, feet hip width.",
      "Step back and lower until the back knee nearly touches.",
      "Drive through the front heel to step back up.",
    ],
    "Stepping back so short that the front heel lifts.",
  ),
  bw_split_squat: g(
    [
      "Long split stance, arms at your sides, back heel up.",
      "Drop the back knee straight down until it nearly touches.",
      "Drive up through the front heel, feet staying put.",
    ],
    "Leaning forward and pushing off the back foot instead of the front leg.",
  ),
  split_squat: g(
    [
      "Long split stance, dumbbells at your sides, back heel up.",
      "Drop the back knee straight down.",
      "Drive up through the front heel, feet staying put.",
    ],
    "Pushing off the back foot instead of the front leg.",
  ),
  leg_ext: g(
    [
      "Knees in line with the machine's pivot.",
      "Straighten the legs and squeeze for a moment.",
      "Lower slowly.",
    ],
    "Kicking the weight up and letting it drop.",
  ),
  leg_curl: g(
    [
      "Knees in line with the pivot, pad above the heels.",
      "Curl as far as you can, hips down.",
      "Return slowly to straight.",
    ],
    "Hips lifting off the pad to finish the rep.",
  ),
  seated_leg_curl: g(
    [
      "Knees in line with the pivot, thigh pad snug, lower pad above the heels.",
      "Curl the heels down and back as far as you can.",
      "Return slowly to straight legs.",
    ],
    "Letting the pad fly back up instead of lowering it.",
  ),
  hip_abduction: g(
    [
      "Sit back, pads on the outside of the knees.",
      "Push the knees out as wide as you can.",
      "Let them come back together slowly.",
    ],
    "Letting the weights slam together between reps.",
  ),
  hip_adduction: g(
    [
      "Sit back, pads on the inside of the knees, legs open.",
      "Squeeze the knees together.",
      "Open slowly back to a comfortable stretch.",
    ],
    "Setting it wider than is comfortable — the stretch should never be sharp.",
  ),
  cable_kickback: g(
    [
      "Ankle strap on a low pulley, hands on the frame.",
      "Hinge forward a little and kick the leg straight back.",
      "Return slowly, knee coming forward under the hip.",
    ],
    "Arching the lower back to get the leg higher.",
  ),
  lateral_raise: g(
    [
      "Dumbbells at your sides, slight lean forward.",
      "Raise out to the sides to shoulder height, elbows soft.",
      "Lower slowly — slower than you raised.",
    ],
    "Swinging with the body and shrugging the weight up.",
  ),
  rear_delt_fly: g(
    [
      "Hinge forward or lie chest down, arms hanging.",
      "Sweep the arms out wide, thumbs slightly down.",
      "Lower under control.",
    ],
    "Squeezing the shoulder blades together — it's the rear shoulder, not the back.",
  ),
  face_pull: g(
    [
      "Rope at face height, thumbs toward you.",
      "Pull toward the forehead, splitting the rope wide.",
      "Finish with the hands beside the ears, then return.",
    ],
    "Going heavy and turning it into a row.",
  ),
  cable_lateral_raise: g(
    [
      "Low pulley, stand side-on, handle in the far hand.",
      "Raise the arm out to the side to shoulder height, elbow soft.",
      "Lower slowly back across the body.",
    ],
    "Leaning away from the stack to swing it up.",
  ),
  machine_lateral_raise: g(
    [
      "Seat so the shoulders line up with the machine's pivot.",
      "Pads on the outside of the arms, raise to shoulder height.",
      "Lower slowly — slower than you raised.",
    ],
    "Shrugging the shoulders up to lift the pads.",
  ),
  front_raise: g(
    [
      "Dumbbells in front of the thighs, palms down.",
      "Raise to shoulder height, elbows soft.",
      "Lower slowly.",
    ],
    "Leaning back and swinging the weight up.",
  ),
  upright_row: g(
    [
      "Bar in front of the thighs, hands about shoulder width.",
      "Pull up along the body, elbows leading, to chest height.",
      "Lower under control to straight arms.",
    ],
    "Pulling up to the chin — stop at chest height if the shoulders pinch.",
  ),
  reverse_fly_machine: g(
    [
      "Face the pad, handles at shoulder height, arms long.",
      "Sweep the arms back and out until they line up with the body.",
      "Return slowly to the front.",
    ],
    "Bending the elbows so it turns into a row.",
  ),
  cable_rear_delt_fly: g(
    [
      "Two pulleys at shoulder height, cables crossed, a handle in each hand.",
      "Arms long, sweep them out and back into a T.",
      "Return slowly, crossing in front.",
    ],
    "Shrugging up toward the ears as you pull.",
  ),
  db_shrug: g(
    [
      "Dumbbells at your sides, stand tall.",
      "Shrug the shoulders straight up toward the ears.",
      "Lower all the way down to a stretch.",
    ],
    "Rolling the shoulders in circles — straight up, straight down.",
  ),
  bb_shrug: g(
    [
      "Bar in front of the thighs, grip just outside the legs.",
      "Shrug straight up toward the ears, arms long.",
      "Lower all the way to a stretch.",
    ],
    "Bending the elbows to help — the arms are just hooks.",
  ),
  db_curl: g(
    [
      "Stand tall, elbows at your sides.",
      "Curl up, turning the palms to face you.",
      "Lower all the way to straight arms.",
    ],
    "Swinging the elbows forward to lift more.",
  ),
  bb_curl: g(
    [
      "Shoulder-width grip, elbows at your sides.",
      "Curl the bar up without moving the elbows.",
      "Lower slowly to straight arms.",
    ],
    "Rocking the hips to get it moving.",
  ),
  hammer_curl: g(
    [
      "Dumbbells at your sides, palms facing in.",
      "Curl up keeping the palms facing in.",
      "Lower to straight arms.",
    ],
    "Letting the wrists bend back.",
  ),
  cable_curl: g(
    [
      "Stand close to a low pulley, elbows pinned.",
      "Curl up to the shoulders.",
      "Lower slowly against the pull of the cable.",
    ],
    "Leaning back to help the weight up.",
  ),
  spider_curl: g(
    [
      "Chest on an incline bench, arms hanging straight down.",
      "Curl up without moving the upper arms.",
      "Lower all the way down.",
    ],
    "Cutting the bottom half short.",
  ),
  preacher_curl: g(
    [
      "Armpits snug to the top of the pad, upper arms flat on it.",
      "Curl the bar up toward the shoulders.",
      "Lower slowly until the arms are almost straight.",
    ],
    "Letting the bar drop into the bottom — lower it, don't fall into it.",
  ),
  ez_bar_curl: g(
    [
      "Grip the angled part of the bar, elbows at your sides.",
      "Curl up without moving the elbows.",
      "Lower slowly to straight arms.",
    ],
    "Leaning back to get the bar moving.",
  ),
  incline_db_curl: g(
    [
      "Bench at 45–60°, lie back, arms hanging straight down.",
      "Curl up without the elbows moving forward.",
      "Lower all the way to a stretch.",
    ],
    "Sitting up off the bench as the set gets hard.",
  ),
  concentration_curl: g(
    [
      "Sit, elbow braced against the inside of the thigh.",
      "Curl the dumbbell up toward the shoulder.",
      "Lower slowly to a straight arm, then switch.",
    ],
    "Lifting the elbow off the thigh to swing it up.",
  ),
  machine_curl: g(
    [
      "Seat so the elbows line up with the machine's pivot.",
      "Upper arms flat on the pad, curl up to the shoulders.",
      "Lower slowly to straight arms.",
    ],
    "Lifting the elbows off the pad to finish the rep.",
  ),
  cable_hammer_curl: g(
    [
      "Rope on a low pulley, palms facing in, elbows at your sides.",
      "Curl up toward the shoulders.",
      "Lower slowly against the pull of the cable.",
    ],
    "Elbows drifting forward as the set gets hard.",
  ),
  reverse_curl: g(
    [
      "Overhand grip, shoulder width, elbows at your sides.",
      "Curl the bar up, wrists straight.",
      "Lower slowly to straight arms.",
    ],
    "Letting the wrists bend back as the forearms tire.",
  ),
  pushdown: g(
    [
      "High pulley, elbows tucked at your sides.",
      "Push down until the arms are straight.",
      "Let the hands rise to chest height, elbows still.",
    ],
    "Elbows drifting forward so the shoulders do the work.",
  ),
  overhead_ext: g(
    [
      "Weight behind the head, elbows pointing up.",
      "Lower behind the head to a deep stretch.",
      "Straighten the arms overhead.",
    ],
    "Elbows flaring wide open.",
  ),
  skullcrusher: g(
    [
      "Lie back, arms straight up over the shoulders.",
      "Bend only at the elbows, lowering toward the forehead.",
      "Straighten back up.",
    ],
    "Letting the upper arms swing and turning it into a press.",
  ),
  kickback: g(
    [
      "Hinge forward, upper arm level with the body.",
      "Straighten the arm back, squeeze.",
      "Return to 90° at the elbow.",
    ],
    "The upper arm dropping as you tire.",
  ),
  rope_pushdown: g(
    [
      "Rope on a high pulley, elbows tucked at your sides.",
      "Push down and spread the rope at the bottom.",
      "Let the hands rise to chest height, elbows still.",
    ],
    "Leaning over the rope and pushing with the body.",
  ),
  cable_overhead_ext: g(
    [
      "Rope on a pulley behind you, face away, one foot forward.",
      "Elbows up by the head, straighten the arms overhead.",
      "Lower behind the head to a deep stretch.",
    ],
    "Elbows drifting apart and down — keep them by the head.",
  ),
  seated_dip: g(
    [
      "Seat so the handles sit at your sides, just below the chest.",
      "Push down until the arms are straight.",
      "Let the handles rise slowly until the elbows reach 90°.",
    ],
    "Letting the shoulders roll forward as the handles come up.",
  ),
  bench_dip: g(
    [
      "Hands on the edge of a bench behind you, fingers forward.",
      "Bend the elbows straight back until the upper arms are level.",
      "Push back up to straight arms.",
    ],
    "Sinking too deep — the front of the shoulders takes the strain.",
  ),
  calf_raise: g(
    [
      "Balls of the feet on the edge, heels hanging.",
      "Rise as high as you can, pause.",
      "Lower slowly into a full stretch.",
    ],
    "Bouncing at the bottom — pause instead.",
  ),
  seated_calf: g(
    [
      "Pad on the thighs, balls of the feet on the plate.",
      "Press up onto the toes as high as you can.",
      "Lower to a full stretch.",
    ],
    "Short, fast reps that never reach the stretch.",
  ),
  leg_press_calf: g(
    [
      "Legs straight, balls of the feet on the platform's edge.",
      "Push through the toes as far as you can.",
      "Let the heels come back to a stretch.",
    ],
    "Bending the knees to help.",
  ),
  single_leg_calf_raise: g(
    [
      "One foot on a step, heel hanging, a hand on something for balance.",
      "Rise as high as you can on that foot.",
      "Lower slowly into a full stretch. Switch.",
    ],
    "Bending the knee to help push up.",
  ),
  box_jump: g(
    [
      "Stand a foot from the box, swing the arms back.",
      "Jump and land softly in a quarter squat.",
      "Stand up, then step down — don't jump down.",
    ],
    "A box so high you land in a deep squat.",
  ),
  broad_jump: g(
    [
      "Feet hip width, swing the arms back as you dip.",
      "Jump forward as far as you can.",
      "Land softly, knees bent, and stick it.",
    ],
    "Landing stiff-legged.",
  ),
  depth_jump: g(
    [
      "Step off a low box — don't jump off it.",
      "Land and jump up the instant you touch.",
      "Land softly.",
    ],
    "A box too high to rebound quickly from.",
  ),
  jump_squat: g(
    [
      "Squat to a quarter or half depth.",
      "Jump as high as you can.",
      "Land softly and reset before the next one.",
    ],
    "Chaining reps so fast they lose height.",
  ),
  med_ball_slam: g(
    [
      "Ball overhead, arms long, up on the toes.",
      "Slam it into the floor as hard as you can.",
      "Squat down to pick it up and reset.",
    ],
    "Throwing with the arms only — the whole body drives it down.",
  ),
  speed_squat: g(
    [
      "Light weight, normal squat setup.",
      "Lower under control.",
      "Stand up as fast as you possibly can.",
    ],
    "Letting the reps slow down — if they do, the set is over.",
  ),
  speed_deadlift: g(
    [
      "Light weight, normal deadlift setup.",
      "Pull the bar up as fast as you can.",
      "Lower under control and reset each rep.",
    ],
    "Bouncing it off the floor.",
  ),
  hanging_leg_raise: g(
    [
      "Hang from a bar, shoulders engaged.",
      "Raise the legs by curling the pelvis up.",
      "Lower slowly without swinging.",
    ],
    "Swinging to get the legs up.",
  ),
  rotation_machine: g(
    [
      "Sit with the hips fixed and the chest against the pad.",
      "Rotate from the midsection to one side.",
      "Return slowly, then switch.",
    ],
    "Throwing the weight with momentum.",
  ),
  cable_crunch: g(
    [
      "Kneel below a high pulley, rope beside the head.",
      "Curl the ribs down toward the hips.",
      "Return slowly, hips still.",
    ],
    "Sitting back on the heels and pulling with the arms.",
  ),
  ab_machine: g(
    [
      "Hips square, chest against the pad.",
      "Rotate the torso through a comfortable range.",
      "Return slowly and switch sides.",
    ],
    "Twisting beyond where it feels good.",
  ),
  plank: g(
    [
      "Forearms under the shoulders, body in one line.",
      "Squeeze the glutes and pull the ribs down.",
      "Breathe and hold.",
    ],
    "Hips sagging toward the floor.",
  ),
  crunch: g(
    [
      "Lie on your back, knees bent, hands by the head.",
      "Curl the ribs toward the hips, shoulder blades off the floor.",
      "Lower slowly.",
    ],
    "Pulling on the head with the hands.",
  ),
  machine_crunch: g(
    [
      "Seat so the pads sit on the chest or shoulders, feet hooked in.",
      "Curl the ribs down toward the hips.",
      "Return slowly without letting the stack rest.",
    ],
    "Pulling with the arms instead of crunching.",
  ),
  decline_situp: g(
    [
      "Feet hooked in on a decline bench, arms across the chest.",
      "Curl up until the chest is over the knees.",
      "Lower slowly, back rounding down to the bench.",
    ],
    "Yanking up with momentum and dropping back down.",
  ),
  ab_wheel: g(
    [
      "Kneel, wheel under the shoulders, glutes tight.",
      "Roll out slowly as far as you can keep the back flat.",
      "Pull back in with the abs, not the hips.",
    ],
    "The lower back sagging at the far end — stop before it does.",
  ),
  lying_leg_raise: g(
    [
      "Lie flat, hands under the hips, legs straight.",
      "Raise the legs to vertical, lower back pressed down.",
      "Lower slowly until the heels hover off the floor.",
    ],
    "The lower back arching off the floor as the legs come down.",
  ),
  captains_chair: g(
    [
      "Back against the pad, forearms on the rests, legs hanging.",
      "Raise the knees toward the chest, curling the pelvis up.",
      "Lower slowly without swinging.",
    ],
    "Only lifting the knees — curl the pelvis up too.",
  ),
  russian_twist: g(
    [
      "Sit, knees bent, lean back with a flat back.",
      "Hold the weight at the chest and turn it to one side.",
      "Turn through the middle to the other side.",
    ],
    "Moving only the arms — turn the ribs, not just the hands.",
  ),
  side_plank: g(
    [
      "On one forearm, elbow under the shoulder, feet stacked.",
      "Lift the hips until the body is in one line.",
      "Breathe and hold. Switch sides.",
    ],
    "Hips drifting back behind the shoulders.",
  ),
  pallof_press: g(
    [
      "Stand side-on to a cable at chest height, handle at the chest.",
      "Press it straight out without letting it pull you round.",
      "Bring it back to the chest under control.",
    ],
    "Twisting toward the stack — the job is not to turn.",
  ),
  woodchop: g(
    [
      "Pulley high, stand side-on, both hands on the handle.",
      "Pull it down and across the body, turning from the ribs.",
      "Return slowly, arms long.",
    ],
    "Pulling with the arms — they stay long, the trunk turns.",
  ),
};

// ---- cardio ----

const CARDIO: Record<string, Guide> = {
  outdoor: g(
    [
      "Head out of the door at a brisk walk, or an easy jog.",
      "Go out for half the minutes, then turn round and come back.",
      "Keep it easy enough to talk. The lifts come next.",
    ],
    "Racing it — this is a warm-up, not the workout.",
  ),
  skipping: g(
    [
      "Hold the handles at your hips, elbows in by your sides.",
      "Turn the rope with your wrists, not your arms.",
      "Small hops on the balls of your feet, just high enough for the rope.",
    ],
    "Jumping high and landing on the heels.",
  ),
  treadmill: g(
    [
      "Start easy for the first minute.",
      "Settle into a pace you can hold.",
      "Speed up in the last stretch.",
    ],
    "Holding the handrails — let the arms swing.",
  ),
  row: g(
    [
      "Push with the legs first, then lean back, then pull the arms.",
      "Return in reverse: arms, body, then knees.",
      "Aim for long strokes, not fast ones.",
    ],
    "Pulling with the arms before the legs have finished.",
  ),
  ski_erg: g(
    [
      "Hands high, arms long.",
      "Hinge at the hips and drive the handles down past the pockets.",
      "Stand back up tall and repeat.",
    ],
    "Only pulling with the arms — the hips do the work.",
  ),
  bike: g(
    [
      "Seat so the knee is slightly bent at the bottom.",
      "Settle into a steady cadence.",
      "Add resistance rather than spinning faster.",
    ],
    "A seat so low the knees ache.",
  ),
  assault_bike: g(
    [
      "Push and pull the handles while you pedal.",
      "Start controlled — this bike punishes a fast start.",
      "Empty the tank at the end.",
    ],
    "Going flat out in the first ten seconds.",
  ),
  stair: g(
    [
      "Stand tall, hands light on the rails.",
      "Step through the whole foot.",
      "Keep a steady rhythm.",
    ],
    "Leaning on the rails and taking the weight off the legs.",
  ),
  elliptical: g(
    [
      "Stand tall, push and pull the handles.",
      "Keep the whole foot on the pedals.",
      "Add resistance to make it work.",
    ],
    "Coasting on momentum with no resistance.",
  ),
};

// ---- mobility ----

/** One per stretch in `STRETCHES`, by its id. */
const MOBILITY: Record<string, Guide> = {
  couch: g(
    [
      "Back knee down by a wall or bench, shin and foot up against it.",
      "Front foot flat, knee over the ankle, torso upright.",
      "Squeeze the glute of the back leg and hold.",
    ],
    "Arching the lower back to get upright — tuck the pelvis instead.",
  ),
  worlds_greatest: g(
    [
      "Step into a long lunge, back knee off the floor.",
      "Both hands down inside the front foot; sink the elbow toward the instep.",
      "Turn the chest open and reach the inside arm to the ceiling.",
    ],
    "Letting the back knee drop and the hips sag — keep the back leg long.",
  ),
  figure_four: g(
    [
      "Lie on your back, knees bent, feet on the floor.",
      "Cross one ankle over the opposite knee.",
      "Hold behind the bottom thigh and pull both legs toward the chest.",
    ],
    "Lifting the head and shoulders — let them rest on the floor.",
  ),
  seated_hamstring: g(
    [
      "Sit with one leg straight, the other foot against its inner thigh.",
      "Hinge forward from the hips over the straight leg.",
      "Reach for the shin or ankle and breathe.",
    ],
    "Rounding hard through the back instead of folding at the hips.",
  ),
  standing_hip_flexor: g(
    [
      "Stand in a long split stance, back heel up.",
      "Tuck the pelvis under and bend both knees a little.",
      "Shift forward until the front of the back hip stretches.",
    ],
    "Arching the back instead of tucking — no floor needed, so no excuses.",
  ),
  forward_fold: g(
    [
      "Feet hip-width, knees soft.",
      "Fold forward from the hips and let the upper body hang.",
      "Let the arms and head drop and breathe.",
    ],
    "Bouncing to reach further — hang and let it come.",
  ),
  calf_wall: g(
    [
      "Hands on a wall, one foot well behind the other.",
      "Back leg straight, heel pressed to the floor.",
      "Lean into the wall until the calf stretches.",
    ],
    "Letting the back heel lift off the floor.",
  ),
  supine_twist: g(
    [
      "Lie on your back with one leg straight.",
      "Bend the other knee and draw it across the body to the floor.",
      "Hold the knee down, other arm out wide, look away from it.",
    ],
    "Letting the far shoulder lift — keep both shoulder blades down.",
  ),
  knees_to_chest: g(
    [
      "Lie on your back.",
      "Hug both knees in, hands under the knees, not over.",
      "Rock gently side to side if it helps.",
    ],
    "Lifting the head — let it rest.",
  ),
  cat_cow: g(
    [
      "On all fours, hands under the shoulders.",
      "Round the back up, then let it sag.",
      "One slow breath for each position.",
    ],
    "Rushing through it.",
  ),
  childs_pose: g(
    [
      "Kneel, big toes together, knees wide.",
      "Sink the hips back to the heels.",
      "Arms long in front, breathe into the back.",
    ],
    "Holding the breath — slow breaths let it open.",
  ),
  chest_opener: g(
    [
      "Hold a stick or empty bar, hands well wider than the shoulders.",
      "Arms straight, raise it overhead.",
      "Take it back behind the head until the chest and shoulders stretch.",
    ],
    "Forcing it with a narrow grip — go wider before you go further back.",
  ),
  lat_wall: g(
    [
      "Stand side-on to a wall, forearm on it above your head.",
      "Lean into the wall and let the chest sink away from the arm.",
      "Hold, then switch.",
    ],
    "Shrugging the shoulder up to the ear.",
  ),
  cross_body: g(
    [
      "Bring one arm straight across the chest.",
      "Hold it at the elbow with the other hand.",
      "Pull it in gently, shoulder kept down.",
    ],
    "Pulling at the wrist or twisting the body with it.",
  ),
  ball_shoulder: g(
    [
      "Stand by a wall with a tennis or massage ball between it and the front of your shoulder.",
      "Lean in until it presses firmly, then roll it slowly in small circles.",
      "Stop on a tender spot and breathe. Then the back of the shoulder.",
    ],
    "Pressing so hard you tense up — firm, but you should be able to relax into it.",
  ),
  arm_circles: g(
    [
      "Stand tall and hold your arms straight out to the sides.",
      "Draw small circles with your hands, growing them slowly bigger.",
      "Halfway through, circle the other way.",
    ],
    "Shrugging the shoulders up toward the ears.",
  ),
  wall_slide: g(
    [
      "Stand with your back against a wall, feet a step out from it.",
      "Put your arms on the wall in a W: elbows bent, a little below the shoulders.",
      "Slide them up into a Y, keeping them on the wall, then slowly back down.",
    ],
    "Arching the lower back away from the wall to get the arms higher.",
  ),
  prone_y_raise: g(
    [
      "Lie face down, arms overhead in a Y, thumbs pointing up.",
      "Squeeze the shoulder blades and lift your arms a hand's width off the floor.",
      "Hold for a moment, then lower slowly.",
    ],
    "Lifting the head and chest instead of the arms.",
  ),
  band_pull_apart: g(
    [
      "Hold a light band in front of you at shoulder height, hands shoulder width.",
      "Keep the arms straight and pull the band apart until it touches your chest.",
      "Squeeze the shoulder blades together, then let it back slowly.",
    ],
    "Shrugging the shoulders up or arching the back to get the band wider.",
  ),
  band_external_rotation: g(
    [
      "Tie a light band at elbow height and stand side-on to it, holding it in the far hand.",
      "Elbow bent to a right angle and pinned to your side.",
      "Turn the hand out away from your belly, slowly, then back. Then the other side.",
    ],
    "Letting the elbow drift away from your side — it does the work for the shoulder.",
  ),
  wide_stance: g(
    [
      "Stand with your feet wide, well past your shoulders, toes turned out a little.",
      "Sit down between your heels as far as is comfortable, chest up, knees out over the toes.",
      "Stay there and breathe. Push the knees gently apart with the elbows if you like.",
    ],
    "Letting the knees fall in, or rounding the back to get lower.",
  ),
  side_stance: g(
    [
      "From the wide stance, shift your weight over to one side and bend that knee.",
      "Keep the other leg straight, heel down and toes pointing up.",
      "Sink until you feel the back and inside of the straight leg. Then the other side.",
    ],
    "Rounding the back or lifting the heel of the bent leg.",
  ),
  leg_swing: g(
    [
      "Stand side-on to a wall or rail and hold it with one hand.",
      "Swing the outside leg forward and back, easy and loose, a little higher each time.",
      "Keep the body tall and still. Then turn round for the other leg.",
    ],
    "Kicking hard, or leaning back to get the leg higher.",
  ),
  bodyweight_squat: g(
    [
      "Feet shoulder width, arms out in front for balance.",
      "Sit down slowly, as deep as you can with the chest up, and pause at the bottom.",
      "Stand up, pushing the floor away.",
    ],
    "Dropping fast into the bottom, or the heels coming up.",
  ),
};

// ---- owning it ----

/**
 * What owning each lift looks like: the position to hold for a second, or the
 * part to slow down. The app's standard for a rep that counts — lowered under
 * control, held where it is hardest, no swing and no bounce — made concrete
 * for the movement. Shown in its guide, and on the lift screen between sets.
 */
const OWN: Record<string, string> = {
  bench: "Pause with the bar on your chest. No bounce.",
  db_bench: "Pause for a second in the stretch at the bottom.",
  db_floor_press: "Rest your upper arms on the floor for a second.",
  kb_floor_press: "Rest your upper arms on the floor for a second.",
  db_pullover: "Pause in the stretch behind your head.",
  kb_row: "Hold the bell at your hip for a second.",
  kb_rdl: "Pause in the stretch, back flat.",
  kb_curl: "Hold at the top for a second, elbows still.",
  incline_bench: "Pause on the upper chest. No bounce.",
  machine_chest: "Pause in the stretch before each press.",
  incline_db_press: "Pause for a second in the stretch at the bottom.",
  dips: "Pause at the bottom, upper arms level.",
  push_up: "Pause with your chest just off the floor.",
  decline_bench: "Pause on the lower chest. No bounce.",
  close_grip_bench: "Pause on the chest, elbows tucked. No bounce.",
  smith_bench: "Pause with the bar on your chest. No bounce.",
  smith_incline_press: "Pause on the upper chest. No bounce.",
  incline_machine_press: "Pause in the stretch before each press.",
  cable_fly: "Hold the hands together at the top for a second.",
  cable_crossover: "Hold the hands together at the bottom for a second.",
  pec_deck: "Hold the hands together for a second.",
  db_fly: "Pause for a second in the stretch at the bottom.",
  incline_db_fly: "Pause for a second in the stretch at the bottom.",
  ohp: "Hold the lockout overhead for a second, ribs down.",
  db_shoulder: "Pause at the bottom, dumbbells by your ears.",
  kb_press: "Pause in the rack, then press. No dip from the legs.",
  pike_push_up: "Pause with your head just off the floor.",
  machine_shoulder: "Pause at the bottom without resting the stack.",
  arnold_press: "Pause at the bottom, palms facing you.",
  smith_shoulder_press: "Pause at the bottom without resting the bar.",
  pullup: "Hold your chin over the bar for a second.",
  lat_pulldown: "Hold the bar at your upper chest for a second.",
  chinup: "Hold your chin over the bar for a second.",
  close_grip_pulldown: "Hold the handle at your upper chest for a second.",
  machine_pulldown: "Hold the handles at your shoulders for a second.",
  straight_arm_pulldown: "Hold the bar at your thighs for a second.",
  bb_row: "Hold the bar at your stomach for a second. Torso still.",
  cable_row: "Hold the handle at your stomach for a second.",
  chest_supported_row: "Hold the squeeze at the top for a second.",
  machine_row: "Hold the squeeze at the top for a second.",
  db_row: "Hold the dumbbell at your hip for a second.",
  tbar_row: "Hold the handle at your chest for a second. Torso still.",
  inverted_row: "Hold your chest at the bar for a second.",
  back_squat: "Pause at the bottom, staying tight. Then stand.",
  front_squat: "Pause at the bottom, elbows high. Then stand.",
  goblet_squat: "Pause at the bottom, chest up.",
  kb_goblet_squat: "Pause at the bottom, chest up.",
  bw_squat: "Pause at the bottom, chest up, heels down.",
  hack_squat: "Pause at the bottom. No bounce out of it.",
  leg_press: "Pause at the bottom. No bounce out of it.",
  smith_squat: "Pause at the bottom, staying tight. Then stand.",
  deadlift: "Stand tall for a second, then lower it under control.",
  rdl: "Pause in the stretch, back flat.",
  kb_swing: "Hold the top for a beat: glutes tight, body straight.",
  good_morning: "Pause in the stretch, back flat.",
  hip_thrust: "Hold the top for a second, glutes squeezed.",
  back_ext: "Hold the top for a second, body in a line.",
  db_rdl: "Pause in the stretch, back flat.",
  nordic_curl: "Lower as slowly as you can. That is the rep.",
  sumo_deadlift: "Stand tall for a second, then lower it under control.",
  trap_bar_deadlift: "Stand tall for a second, then lower it under control.",
  glute_bridge: "Hold the top for a second, glutes squeezed.",
  cable_pull_through: "Hold the top for a second, glutes squeezed.",
  single_leg_rdl: "Pause in the stretch, hips square.",
  bulgarian: "Pause at the bottom, front heel down.",
  walking_lunge: "Pause with the back knee just off the floor.",
  step_up: "Stand tall on the box for a second. No push from the back foot.",
  reverse_lunge: "Pause with the back knee just off the floor.",
  split_squat: "Pause at the bottom, front heel down.",
  bw_split_squat: "Pause at the bottom, front heel down.",
  leg_ext: "Hold the legs straight for a second.",
  leg_curl: "Hold the squeeze for a second.",
  seated_leg_curl: "Hold the squeeze for a second.",
  hip_abduction: "Hold the knees wide for a second.",
  hip_adduction: "Hold the knees together for a second.",
  cable_kickback: "Hold the leg back for a second, glute squeezed.",
  lateral_raise: "Hold at shoulder height for a second.",
  rear_delt_fly: "Hold the arms out wide for a second.",
  face_pull: "Hold the rope by your ears for a second.",
  cable_lateral_raise: "Hold at shoulder height for a second.",
  machine_lateral_raise: "Hold at shoulder height for a second.",
  front_raise: "Hold at shoulder height for a second.",
  upright_row: "Hold at chest height for a second, elbows high.",
  reverse_fly_machine: "Hold the arms out wide for a second.",
  cable_rear_delt_fly: "Hold the arms out wide for a second.",
  db_shrug: "Hold the top for a second, shoulders by the ears.",
  bb_shrug: "Hold the top for a second, shoulders by the ears.",
  db_curl: "Hold at the top for a second, elbows still.",
  bb_curl: "Hold at the top for a second, elbows still.",
  hammer_curl: "Hold at the top for a second, elbows still.",
  cable_curl: "Hold at the top for a second, elbows still.",
  spider_curl: "Hold at the top for a second.",
  preacher_curl: "Lower slowly and pause just short of straight.",
  ez_bar_curl: "Hold at the top for a second, elbows still.",
  incline_db_curl: "Pause in the stretch at the bottom.",
  concentration_curl: "Hold at the top for a second.",
  machine_curl: "Hold at the top for a second.",
  cable_hammer_curl: "Hold at the top for a second, elbows still.",
  reverse_curl: "Hold at the top for a second, wrists straight.",
  pushdown: "Hold the lockout for a second, elbows pinned.",
  overhead_ext: "Pause in the stretch behind your head.",
  skullcrusher: "Lower slowly and pause just above your forehead.",
  kickback: "Hold the arm straight for a second.",
  rope_pushdown: "Hold the lockout for a second, rope spread.",
  cable_overhead_ext: "Pause in the stretch behind your head.",
  seated_dip: "Hold the lockout for a second.",
  bench_dip: "Pause at the bottom, upper arms level.",
  calf_raise: "Pause in the stretch at the bottom. Hold the top.",
  seated_calf: "Pause in the stretch at the bottom. Hold the top.",
  leg_press_calf: "Pause in the stretch at the bottom. Hold the top.",
  single_leg_calf_raise: "Pause in the stretch at the bottom. Hold the top.",
  box_jump: "Stick every landing for a second before stepping down.",
  broad_jump: "Stick every landing for a second.",
  depth_jump: "Land quiet and balanced, every time.",
  jump_squat: "Land soft and stick it before the next one.",
  med_ball_slam: "Stand tall and reset before every slam.",
  speed_squat: "Down slow and controlled. Only the way up is fast.",
  speed_deadlift: "Set your position every rep. Speed comes after.",
  hanging_leg_raise: "Hold the legs up for a second. No swing.",
  rotation_machine: "Pause at the end of each turn.",
  cable_crunch: "Hold the crunch for a second.",
  ab_machine: "Pause at the end of each turn.",
  plank: "Still and quiet. Breathe.",
  crunch: "Hold the crunch for a second.",
  machine_crunch: "Hold the crunch for a second.",
  decline_situp: "Lower slowly. No dropping back to the bench.",
  ab_wheel: "Pause at the far end, back flat.",
  lying_leg_raise: "Hold the heels just off the floor for a second.",
  captains_chair: "Hold the knees up for a second. No swing.",
  russian_twist: "Pause at the end of each turn.",
  side_plank: "Still and quiet. Breathe.",
  pallof_press: "Hold the arms out for a second, chest square.",
  woodchop: "Pause at the end of each turn.",
};

/** The standard itself, for a movement with no line of its own. */
const OWN_ANY = "Lower it slowly and hold where it's hardest.";

/**
 * Where a holds lift is held, with `{s}` for how long: "2 seconds". Once its
 * hold is above nothing, this replaces the line above — the hold IS how the
 * lift gets harder, so the line says exactly how long.
 */
const HOLD: Record<string, string> = {
  push_up: "Pause for {s} with your chest just off the floor.",
  bw_squat: "Pause for {s} at the bottom, chest up, heels down.",
  pike_push_up: "Pause for {s} with your head just off the floor.",
  bw_split_squat: "Pause for {s} with the back knee just off the floor.",
  inverted_row: "Hold your chest at the bar for {s}.",
  nordic_curl: "Pause halfway down for {s}, hips straight.",
  bench_dip: "Pause at the bottom for {s}, upper arms level.",
  hanging_leg_raise: "Hold the legs up for {s}. No swing.",
  ab_wheel: "Hold at the far end for {s}, back flat.",
  lying_leg_raise: "Hold the heels just off the floor for {s}.",
  captains_chair: "Hold the knees up for {s}. No swing.",
};

/** A holds lift of your own: the hold, wherever its hardest point is. */
const HOLD_ANY = "Hold where it's hardest for {s}.";

/**
 * How to own this movement, for the lift screen between sets. A holds lift
 * given a hold of `seconds` says where to hold and for how long.
 */
export const ownCue = (id: string, seconds = 0): string =>
  seconds > 0
    ? (HOLD[id] ?? HOLD_ANY).replace("{s}", seconds === 1 ? "1 second" : `${seconds} seconds`)
    : (OWN[id] ?? OWN_ANY);

const GUIDES: Record<string, Guide> = { ...LIFTS, ...CARDIO, ...MOBILITY };

/** The guide for an exercise, machine or pose, if one has been written. */
export const guideFor = (id: string): Guide | undefined =>
  GUIDES[id] && OWN[id] ? { ...GUIDES[id], own: OWN[id] } : GUIDES[id];
