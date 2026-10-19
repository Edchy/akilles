/**
 * How to do each movement well: a few steps and the one mistake to watch for.
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
  db_row: g(
    [
      "Hand and knee on a bench, back flat.",
      "Pull the dumbbell toward the hip, elbow close.",
      "Lower to a straight arm and a stretch.",
    ],
    "Twisting the torso open to heave the weight.",
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
};

// ---- cardio ----

const CARDIO: Record<string, Guide> = {
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

const COUCH = g(
  [
    "Back knee against a wall or bench, shin up it.",
    "Front foot flat, torso upright.",
    "Squeeze the glute of the back leg and hold.",
  ],
  "Arching the lower back to get upright — tuck the pelvis instead.",
);
const CHILD = g(
  [
    "Kneel, big toes together, knees wide.",
    "Sink the hips back to the heels.",
    "Arms long in front, breathe into the back.",
  ],
  "Holding the breath — slow breaths let it open.",
);
const HANG = g(
  [
    "Hang from a bar with an overhand grip.",
    "Let the shoulders rise toward the ears.",
    "Relax and breathe.",
  ],
  "Gripping so hard the shoulders stay tense.",
);
const DOORWAY = g(
  [
    "Forearm on the doorframe, elbow at shoulder height.",
    "Step through until the chest stretches.",
    "Hold, then switch.",
  ],
  "Pushing so far the front of the shoulder pinches.",
);
const HAMSTRING = g(
  [
    "Legs straight, hinge at the hips.",
    "Reach for the shins or toes.",
    "Let the head hang and breathe.",
  ],
  "Rounding hard through the back instead of folding at the hips.",
);

const MOBILITY: Record<string, Guide> = {
  fb_couch: COUCH,
  hp_couch: COUCH,
  fb_child: CHILD,
  sp_child: CHILD,
  sh_hang: HANG,
  qk_hang: HANG,
  sh_doorway: DOORWAY,
  qk_doorway: DOORWAY,
  fb_ham: HAMSTRING,
  hp_ham: HAMSTRING,
  qk_fold: HAMSTRING,
  fb_pigeon: g(
    [
      "Front shin across the body, back leg long behind.",
      "Square the hips toward the floor.",
      "Fold forward over the front leg.",
    ],
    "Letting the hips tip to one side.",
  ),
  fb_thoracic: g(
    [
      "Kneel with elbows on a bench, hands together.",
      "Sink the chest toward the floor.",
      "Hold and breathe into the upper back.",
    ],
    "Arching the lower back instead of the upper.",
  ),
  hp_90: g(
    [
      "Sit with both knees bent at 90°, one in front and one to the side.",
      "Sit tall over the front shin.",
      "Hold, then rotate the knees to the other side.",
    ],
    "Slumping backward — sit up tall.",
  ),
  hp_frog: g(
    [
      "On all fours, knees wide, ankles in line with the knees.",
      "Rock the hips slowly back.",
      "Stop at a strong stretch in the inner thighs.",
    ],
    "Forcing it deeper than feels safe.",
  ),
  hp_lizard: g(
    [
      "Lunge forward, hands inside the front foot.",
      "Let the hips sink toward the floor.",
      "Hold, then switch sides.",
    ],
    "The back knee locked out — let it rest down.",
  ),
  sh_sleeper: g(
    [
      "Lie on your side, lower arm out at 90°.",
      "Use the other hand to press the forearm toward the floor.",
      "Stop at a gentle stretch at the back of the shoulder.",
    ],
    "Pressing hard enough to pinch the front of the shoulder.",
  ),
  sh_thread: g(
    [
      "On all fours, slide one arm under the body.",
      "Rest the shoulder and cheek on the floor.",
      "Breathe into the upper back.",
    ],
    "Letting the hips swing out to one side.",
  ),
  sh_wall: g(
    [
      "Back against a wall, arms in a W.",
      "Keep the wrists and elbows on the wall.",
      "Hold where you can keep contact.",
    ],
    "Arching the lower back away from the wall.",
  ),
  sp_cat: g(
    [
      "On all fours, hands under the shoulders.",
      "Round the back up, then let it sag.",
      "One slow breath for each position.",
    ],
    "Rushing through it.",
  ),
  sp_twist: g(
    [
      "Lie back, drop both knees to one side.",
      "Arms wide, look the other way.",
      "Let the shoulders stay on the floor.",
    ],
    "Forcing the knees all the way down.",
  ),
  sp_cobra: g(
    [
      "Lie face down, hands under the shoulders.",
      "Press the chest up, hips on the floor.",
      "Keep the shoulders down away from the ears.",
    ],
    "Pushing into pain in the lower back — go only as high as feels good.",
  ),
  sp_knees: g(
    [
      "Lie on your back.",
      "Hug both knees to the chest.",
      "Rock gently side to side if it helps.",
    ],
    "Lifting the head — let it rest.",
  ),
  qk_lunge: g(
    [
      "Stand in a long split stance.",
      "Tuck the pelvis and shift forward.",
      "Feel the front of the back hip, then switch.",
    ],
    "Arching the back instead of tucking.",
  ),
};

const GUIDES: Record<string, Guide> = { ...LIFTS, ...CARDIO, ...MOBILITY };

/** The guide for an exercise, machine or pose, if one has been written. */
export const guideFor = (id: string): Guide | undefined => GUIDES[id];
