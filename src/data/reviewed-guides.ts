import type { Guide } from "@/data/guides";

/** Original summaries checked against the linked technique and mistake guidance.
 * The date records a source check, not clinical validation or professional sign-off.
 * A deliberate pause is Klay's coaching choice, not a claim that the source
 * prescribes that pause or that one angle maximizes tension for every person.
 */
const nasm = (slug: string, title: string) => ({ title: `NASM · ${title}`, url: `https://www.nasm.org/resource-center/exercise-library/${slug}` });
const mayoWalk = { title: "Mayo Clinic · Walking technique", url: "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/walking/art-20046261" };
const treadmillSafety = { title: "Life Fitness · Treadmill safety", url: "https://support.lifefitness.com/hc/en-us/articles/42814152246039-Life-Fitness-Atmos-Treadmill-How-to-Use-Your-SL-Console-Guided-Tour" };

const reviewed = (steps: string[], avoid: string, sources: NonNullable<Guide["sources"]>, own?: string, stepTitles?: string[], hold?: string): Guide =>
  ({ steps, avoid, sources, demonstration: sources[0], own, stepTitles, hold, reviewedOn: "2026-11-16" });

/** As `reviewed`, for lifts checked on 2026-11-19: the PPLPPL plan's and the easy plan's dips and one-arm row. */
const reviewedPplppl = (steps: string[], avoid: string, sources: NonNullable<Guide["sources"]>, own: string, stepTitles: string[], hold?: string): Guide =>
  ({ ...reviewed(steps, avoid, sources, own, stepTitles, hold), reviewedOn: "2026-11-19" });
/** As `reviewed`, for the handstand and its steps, checked on 2026-11-20. */
const reviewedHandstand = (steps: string[], avoid: string, sources: NonNullable<Guide["sources"]>, own: string, stepTitles: string[], hold?: string): Guide =>
  ({ ...reviewed(steps, avoid, sources, own, stepTitles, hold), reviewedOn: "2026-11-20" });
const aloHeadstand = { title: "Alo Moves · Pose breakdown: headstand", url: "https://blog.alomoves.com/movement/pose-breakdown-headstand-sirsasana" };
const tripodHeadstand = { title: "Sensational Yoga Poses · Tripod headstand", url: "https://sensational-yoga-poses.com/tripod-headstand.html" };
const lifeTimeHandstand = { title: "Life Time · How to do a handstand", url: "https://experiencelife.lifetime.life/article/break-it-down-the-handstand/" };
const aceKettlebells = { title: "ACE · Advanced kettlebell workout", url: "https://www.acefitness.org/resources/pros/expert-articles/5386/advanced-kettlebell-workout-for-increased-strength-and-conditioning/" };

export const REVIEWED_GUIDES: Record<string, Guide> = {
  dips: reviewedPplppl([
    "Hold the middle of the grips and lift yourself to straight arms. Shoulders down and back, away from your ears. On the assisted machine, kneel or stand on the pad first.",
    "Lean a little forward and bend your elbows to lower yourself slowly, until your upper arms are about level with the bars.",
    "Push back up to straight arms without arching or rounding your back.",
  ], "Sinking so deep the shoulders roll forward. Stop where your shoulders still feel good; dips load the shoulder joint, so take more help from the machine if they ache.",
  [{ title: "ACE · Strength equipment: dip bars", url: "https://www.acefitness.org/continuing-education/certified/june-2018/7010/branch-out-with-strength-equipment/" },
   { title: "ACE · Triceps exercises and form", url: "https://www.acefitness.org/resources/everyone/blog/4930/tone-up-your-triceps-with-these-three-exercises/" },
   { title: "ACE · Most effective triceps exercises, and a shoulder caution", url: "https://www.acefitness.org/about-ace/press-room/press-releases/2718/american-council-on-exercise-study-highlights-most-effective-triceps-exercises/" }],
  "Pause at the bottom, upper arms level, shoulders down.", ["Lock out", "Lower slowly", "Push up"]),
  db_row: reviewedPplppl([
    "Put the hand and knee of one side on a bench, hand under the shoulder and knee under the hip. Hold the dumbbell in the other hand, arm long.",
    "Brace your stomach and keep your back flat. Pull the dumbbell up by driving the elbow back toward your hip.",
    "Lower it slowly to a straight arm without letting your chest turn. Do all your reps, then the other side.",
  ], "Twisting the chest open to heave the weight up. Keep the back flat and the shoulders square to the floor.",
  [{ title: "ACE · Single-arm row", url: "https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/" }],
  "Hold the dumbbell at your hip for a second.", ["Set up on the bench", "Elbow to the hip", "Lower slowly"]),
  double_kb_press: reviewedPplppl([
    "Clean both bells to the rack: they rest on the backs of your forearms, elbows close to your body. Squeeze your glutes, ribs down.",
    "Press both bells straight up, elbows staying under the bells and turning a little out. Finish with your arms locked and palms forward.",
    "Pull the bells back down to the rack under control, as if doing a pull-up.",
  ], "Leaning back to get the bells up. Keep the trunk tight and use lighter bells if you have to arch.",
  [aceKettlebells, { title: "StrongFirst · Mastering your press, part II", url: "https://www.strongfirst.com/mastering-your-press-part-ii/" }],
  "Pause in the rack before each press. No dip from the legs.", ["Rack and brace", "Press together", "Pull them down"]),
  double_kb_front_squat: reviewedPplppl([
    "Clean both bells to the rack, elbows under the bells and upper arms close to your body. Feet a little wider than your shoulders.",
    "Keep your back straight and lower your hips straight down between your heels, chest up, until your thighs are level with the floor.",
    "Push through your feet to stand, keeping the bells still in the rack.",
  ], "Sitting back so the chest tips forward and the bells pull you out of the rack. Drop the hips down, not back.",
  [aceKettlebells],
  "Pause at the bottom with your chest up and the bells still.", ["Rack the bells", "Drop between your heels", "Stand tall"]),
  turkish_get_up: reviewedPplppl([
    "Lie on your back with the bell pressed up in one hand, that knee bent. Keep your eyes on the bell.",
    "Roll to the other elbow, then the hand. Lift the hips, sweep the straight leg under you to a kneel, and stand up. The arm stays straight above you.",
    "Go back down the same way, one step at a time. Then do the other side.",
  ], "Letting the arm with the bell drift or bend. Learn the steps with no weight, or a shoe balanced on your fist, first.",
  [{ title: "ACE · Turkish get-up", url: "https://www.acefitness.org/resources/everyone/exercise-library/388/turkish-get-up/" },
   { title: "ACE · Do it better: the Turkish get-up", url: "https://www.acefitness.org/continuing-education/certified/march-2025/8824/the-ace-do-it-better-series-the-turkish-get-up/" }],
  "Pause for a breath at each step, arm straight above you.", ["Press and look", "Up, step by step", "Down the same way"]),
  db_bent_over_row: reviewedPplppl([
    "Hold a dumbbell in each hand. Bend your knees a little and lean forward from the hips until your back is nearly level, back flat.",
    "Pull both dumbbells up toward your hips, elbows close to your sides. Squeeze the shoulder blades together at the top.",
    "Lower them slowly until your arms are straight. Your back stays still the whole time.",
  ], "Standing up and swinging the weights. Keep the back still and flat; use lighter dumbbells if it moves.",
  [{ title: "ACE · Bent-over row", url: "https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/" }],
  "Hold the dumbbells at your hips for a second.", ["Hinge and set", "Pull to the hips", "Lower slowly"]),
  kb_high_pull: reviewedPplppl([
    "Stand over the bell, hinge at the hips and hold it in one hand, back flat.",
    "Hike it back, then drive your hips forward. As the bell floats up, pull the elbow back and up, keeping the bell close to your body.",
    "Stop with the bell about chest high, then let it fall back between your legs and hinge again. Switch hands halfway.",
  ], "Pulling with the arm before the hips have finished. The hips send the bell; the arm only guides it.",
  [{ title: "StrongFirst · Taming the arc in kettlebell lifts", url: "https://www.strongfirst.com/taming-the-arc-in-kettlebell-lifts/" }],
  "Hold the top for a moment, the bell close and level.", ["Hinge and grip", "Hips, then elbow", "Let it fall"]),
  deficit_push_up: reviewedPplppl([
    "Grip two dumbbells on the floor, slightly wider than your shoulders. Brace so your head, hips and heels are in line.",
    "Lower slowly until your chest goes past your hands. Only as deep as your shoulders feel good.",
    "Press back up without letting your hips sag or rise.",
  ], "Letting the lower back sag or the hips rise. Keep the body in one straight line, all the way down and up.",
  [{ title: "ACE · Push-up", url: "https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/" }],
  "Pause at the bottom, chest below your hands.", ["Grip the bells", "Sink past your hands", "Press up straight"],
  "Pause for {s} at the bottom, chest below your hands."),
  twisting_knee_raise: reviewedPplppl([
    "Hang from the bar with straight arms, shoulders gently down.",
    "Raise your knees up toward one side, turning from your stomach, not swinging.",
    "Lower slowly to straight legs, then raise them to the other side. Each side is one rep.",
  ], "Swinging your legs up with momentum. Move slowly and keep the turn in your stomach.",
  [nasm("reverse-crunch-to-knee-up-with-rotation", "Reverse crunch to knee-up with rotation")],
  "Hold the knees up for a second. No swing.", ["Hang", "Knees up and across", "Lower and switch"],
  "Hold the knees up for {s}. No swing."),

  treadmill: reviewed([
    "Clip the safety tether to your clothing and locate Stop. Begin at a slow walk, using the rails for balance.",
    "Look ahead, relax your shoulders and let your arms swing naturally as you walk or run.",
    "Choose a pace you can control. Slow the belt to a stop before stepping off.",
  ], "A belt moving faster than you can manage. Reduce the speed instead of trying to keep up. Use the rails whenever you need support.",
  [treadmillSafety, mayoWalk, { title: "Life Fitness · Controlling treadmill speed", url: "https://support.lifefitness.com/hc/en-us/articles/42814211779095-Life-Fitness-Atmos-Treadmill-How-to-Set-Up-an-Interval-Workout-on-Your-SL-Console" }], undefined, ["Set up safely", "Move naturally", "Stay in control"]),
  outdoor: reviewed([
    "Choose a clear route and wear shoes suited to walking or running.",
    "Look ahead with your neck and shoulders relaxed. Let your arms move naturally beside you.",
    "Move at a pace you can control, adjusting to the surface and your balance.",
  ], "Looking down continuously and tensing your shoulders. Look ahead and let your shoulders relax.", [mayoWalk], undefined, ["Choose your route", "Stand comfortably", "Find your rhythm"]),
  row: reviewed([
    "Strap your feet in. Start with arms long, shoulders relaxed and shins near vertical; lean forward from the hips.",
    "Push through the legs, then open the hips and draw the handle toward the lower ribs. Keep your wrists straight.",
    "Straighten the arms, hinge forward, then bend the knees to return. Make the recovery smooth rather than rushing into the next stroke.",
  ], "Bending the knees before the handle has cleared them. Send the hands forward first, then let the seat roll toward the flywheel.",
  [{ title: "Concept2 · Rowing technique", url: "https://www.concept2.com/training/rowing-technique" }], undefined, ["Set your position", "Legs, body, arms", "Arms, body, legs"]),
  ski_erg: reviewed([
    "Stand with feet about shoulder width, knees soft and hands just above eye level. Start with the elbows bent.",
    "Lead with your upper body and trunk as you pull down. Bend at the hips and knees; finish with the handles beside your thighs.",
    "Stand up as the hands travel forward and upward. Return smoothly to your starting position.",
  ], "Pulling only with the arms. Let the trunk and lower body contribute while the arms finish the pull.",
  [{ title: "Concept2 · SkiErg technique", url: "https://www.concept2.com/training/skierg-technique" },
   { title: "Concept2 · Common SkiErg technique faults", url: "https://www.concept2.com/blog/skierg-technique-part-one" }], undefined, ["Start tall", "Use the whole movement", "Recover smoothly"]),
  kb_swing: reviewed([
    "Stand with the bell in front of you. Hinge at the hips, brace your trunk and grip the handle with both hands.",
    "Hike the bell between your legs, then extend the hips to send it forward. Keep the arms long; let the bell float rather than lifting it with the shoulders.",
    "Let the bell fall back and hinge again as it returns between your legs. Keep the movement driven by the hips.",
  ], "Squatting under the bell or raising it with the shoulders. Practise the loaded hip hinge before adding ballistic swings.",
  [{ title: "ACE · Two-handed kettlebell swing and common mistakes", url: "https://www.acefitness.org/continuing-education/certified/january-2025/8788/the-ace-do-it-better-series-the-two-handed-kettlebell-swing/" }],
  "Drive with the hips and let the bell float. Do not hold it at the top.", ["Hinge and brace", "Drive with the hips", "Guide the return"]),
  goblet_squat: reviewed([
    "Hold one dumbbell at your chest with both hands. Stand with feet about hip to shoulder width and brace your trunk.",
    "Bend at the hips and knees, keeping the weight close and the chest lifted. Lower only as far as you can maintain your position.",
    "Press through your feet to stand, keeping the weight at your chest.",
  ], "Letting the knees collapse inward or the weight drift away from the chest. Keep the knees aligned with your feet and the load close.",
  [nasm("goblet-squat", "Goblet squat")], "Lower smoothly. Pause briefly at a depth you can hold without losing your position, then stand."),
  kb_goblet_squat: reviewed([
    "Hold the kettlebell close to your chest with both hands. Set your feet about hip to shoulder width and brace your trunk.",
    "Bend at the hips and knees, keeping your chest lifted and the bell close. Use a depth you can control.",
    "Push through your feet to stand without letting the bell pull you forward.",
  ], "Letting the chest drop and the bell pull away from you. Keep the load close throughout the movement.",
  [nasm("goblet-squat", "Goblet squat")], "Pause briefly at a depth you can own. Keep the bell close and the trunk steady."),
  push_up: reviewed([
    "Place your hands slightly wider than your shoulders. Brace your stomach and glutes so your head, hips and heels stay in line.",
    "Bend the elbows back and slightly out as you lower your chest toward the floor. Keep the body moving as one piece.",
    "Push the floor away to return. Use an elevated surface if you cannot keep the same body position throughout.",
  ], "Letting the hips sag or rise before the chest. Choose an easier version so you can move your whole body together.",
  [nasm("push-up", "Push-up"), nasm("incline-push-up", "Incline push-up")], "Pause with your chest just off the floor, keeping your whole body firm. Then press."),
  dead_hang: reviewed([
    "Use a secure bar you can reach from a step or bench. Take an overhand grip about shoulder width.",
    "Step off and hang with your arms straight. Draw the shoulder blades gently down so you are not slumped into the shoulders, and keep your trunk steady.",
    "Breathe while you hold. Step back onto the bench before you let go, rather than dropping.",
  ], "Jumping up into the hang or dropping off at the end. Get on and off from the step, under control.",
  [{ title: "Healthline · Dead hang: how to do it", url: "https://www.healthline.com/health/fitness-exercise/dead-hang" }],
  "Hang still, arms straight, and keep breathing. Step down before your grip gives."),
  plank: reviewed([
    "Place your forearms on the floor with elbows under shoulders. Step the feet back about hip width.",
    "Brace your trunk and glutes, keeping your head, hips and heels in one line.",
    "Breathe normally while you hold. Lower to the floor when you can no longer maintain that position.",
  ], "Letting the lower back sag or the hips lift. End the hold when your body position changes.",
  [nasm("plank", "Plank")], "Stay still and keep breathing. A shorter hold with a steady trunk is the goal."),
  side_plank: reviewed([
    "Lie on your side with the supporting elbow under your shoulder. Stack or stagger your feet.",
    "Lift your hips until your body forms a straight line. Keep the chest facing forward.",
    "Breathe while holding that line, then lower under control and repeat on the other side.",
  ], "Letting the hips drop or rolling the trunk forward. Keep your hips lifted and your shoulders stacked.",
  [nasm("side-plank", "Side plank")], "Hold the straight line without twisting. Keep breathing."),
  db_rdl: reviewed([
    "Stand with a dumbbell in each hand, knees slightly bent. Brace your trunk and keep the weights near your legs.",
    "Send your hips backward while the dumbbells travel down close to your legs. Stop before you need to round your back.",
    "Bring the hips forward to stand tall. Keep the weights close and avoid leaning backward at the top.",
  ], "Rounding the lower back or letting the weights drift forward. Use a shorter range and lighter weights if needed to keep your position.",
  [nasm("dumbbell-romanian-deadlift", "Dumbbell Romanian deadlift")], "Lower slowly. Pause briefly in a controlled hamstring stretch, then stand without jerking the weights."),
  wall_push_up: reviewed([
    "Face a wall at about arm’s length. Place your palms against it at chest height with fingers pointing up.",
    "Keep your body straight as you bend the elbows beside you and bring your chest toward the wall.",
    "Press away slowly, keeping your hips and shoulders moving together.",
  ], "Bending at the waist instead of moving your straight body toward the wall.",
  [{ title: "NHS · Strength exercises: wall press-up", url: "https://www.nhs.uk/live-well/exercise/strength-exercises/" }],
  "Pause close to the wall, keeping your body straight, then press away.", undefined, "Pause for {s} close to the wall, body straight."),
  incline_push_up: reviewed([
    "Put your hands on a stable bench slightly wider than your shoulders. Walk your feet back until your body is straight.",
    "Brace your stomach and lower the chest toward the bench, elbows pointing back and slightly out.",
    "Press away as one piece. A higher surface makes the movement easier.",
  ], "Letting the hips sag or elbows flare wide. Keep the trunk firm and use a higher support if needed.",
  [nasm("incline-push-up", "Incline push-up")], "Pause just above the bench without resting your chest on it.", undefined, "Pause for {s} with your chest just above the bench."),
  knee_push_up: reviewed([
    "Start on hands and knees, then move the knees back until your trunk and thighs form one straight line.",
    "Brace your stomach. Bend the elbows close to your sides or slightly outward as you lower the chest.",
    "Press the floor away without folding at the hips. Keep your head aligned with the spine.",
  ], "Folding at the hips or letting the lower back sag. Move from the knees as one firm unit.",
  [{ title: "ACE · Bent-knee push-up", url: "https://www.acefitness.org/resources/everyone/exercise-library/13/bent-knee-push-up/" }],
  "Pause just off the floor with your trunk and thighs in line.", undefined, "Pause for {s} with your chest just off the floor, hips straight."),
  decline_push_up: reviewed([
    "Place the feet on a stable low bench and hands on the floor slightly wider than shoulder width.",
    "Brace your trunk. Lower the chest toward the floor with elbows pointing back and slightly out.",
    "Press up without letting the hips sag. Return to a floor push-up if the raised feet make your position difficult to control.",
  ], "Letting the lower back sag as the chest drops. Keep your body in line and choose a lower foot support if needed.",
  [nasm("decline-push-up", "Decline push-up")], "Pause just off the floor, keeping the shoulders and hips moving together.", undefined, "Pause for {s} with your chest just off the floor, body straight."),
  sit_to_stand: reviewed([
    "Sit near the front of a stable chair without wheels. Place your feet flat, about hip width apart.",
    "Lean forward a little and push through your feet to stand. Use your hands for support if needed.",
    "Sit back down slowly, keeping your feet planted. Use a chair height you can manage.",
  ], "Using a chair that slides or tips. Check that it is stable before you begin.",
  [{ title: "NHS · Strength exercises: sit-to-stand", url: "https://www.nhs.uk/live-well/exercise/strength-exercises/" }],
  "Lower slowly and pause just above the chair before sitting softly. Keep support available if needed.", undefined, "Pause for {s} just above the chair before sitting softly."),
  supported_squat: reviewed([
    "Stand behind a stable chair, hands on its back for balance and feet about hip width apart.",
    "Bend the hips and knees a little, keeping the back steady and knees facing the same direction as the feet.",
    "Press through your feet to stand. Use only a comfortable depth.",
  ], "Letting the knees turn inward. Keep them pointing in line with your feet.",
  [{ title: "NHS · Strength exercises: mini-squats", url: "https://www.nhs.uk/live-well/exercise/strength-exercises/" }],
  "Pause at a comfortable depth while keeping support available.", undefined, "Pause for {s} at a comfortable squat depth, hands on the support."),
  dead_bug: reviewed([
    "Lie on your back with arms pointing up and hips and knees bent to right angles. Gently brace your stomach.",
    "Reach one arm overhead and the opposite leg away, only as far as you can keep your lower back against the floor.",
    "Return slowly, then change sides. Breathe as you move; each side is one repetition.",
  ], "Arching the lower back as you reach. Shorten the reach rather than letting your back lift.",
  [nasm("dead-bug", "Dead bug")], "Pause briefly with the opposite arm and leg extended, lower back still down.", undefined, "Pause for {s} in the extended position without letting your lower back lift."),
  bird_dog: reviewed([
    "Start with hands under shoulders and knees under hips. Brace gently and keep the back still.",
    "Reach one arm forward and the opposite leg backward, keeping the hips level rather than lifting the leg high.",
    "Return slowly and change sides. Keep breathing; each side is one repetition.",
  ], "Twisting the trunk or shifting the hips as the limbs move. Reach a little less and keep the pelvis level.",
  [nasm("bird-dog", "Bird dog")], "Pause with the opposite arm and leg reaching long, without moving the trunk.", undefined, "Hold the extended arm and opposite leg for {s}, hips level."),
  db_front_squat: reviewed([
    "Hold one dumbbell at each shoulder with feet about shoulder width and toes slightly out. Brace your trunk.",
    "Bend the hips and knees while keeping the weights steady at shoulder height. Lower through a range you can control.",
    "Push through your feet to stand. Keep the chest lifted and elbows from dropping.",
  ], "Dropping the elbows and letting the weights pull you forward. Keep the load supported at your shoulders.",
  [nasm("dumbbell-front-squat", "Dumbbell front squat")], "Lower smoothly and pause at a stable depth before standing."),
  kb_deadlift: reviewed([
    "Set the bell between your feet. Bend at the hips and knees to grip it with both hands, keeping your back steady.",
    "Brace your trunk and press through your feet to stand tall with the bell hanging below you.",
    "Move the hips back and bend the knees to return the bell to the floor under control.",
  ], "Rounding the back or jerking the bell from the floor. Use a lighter bell and set your position before lifting.",
  [nasm("kettlebell-deadlift", "Kettlebell deadlift")], "Stand tall without leaning back, then lower smoothly and reset on the floor."),
  ball_hamstring_curl: reviewed([
    "Lie on your back with heels and lower legs on a stability ball, arms out for balance. Brace your stomach.",
    "Lift the hips so your legs and trunk form a line. Bend the knees to roll the ball toward you, keeping the hips lifted.",
    "Roll the ball away slowly without arching the lower back. Lower the hips when you need to reset.",
  ], "Pushing the hips so high that the lower back arches. Keep the trunk steady as the knees bend.",
  [{ title: "ACE · Stability ball hamstring curl", url: "https://www.acefitness.org/resources/everyone/exercise-library/59/stability-ball-hamstring-curl/" }],
  "Briefly hold the curl with your hips supported by the working muscles, then roll out slowly.", undefined, "Hold the curled position for {s}, hips lifted without arching your back."),
  suspension_row: reviewed([
    "Check that the straps are securely anchored. Hold the handles facing the anchor with feet staggered, then lean back with arms long.",
    "Keep the body firm and pull your chest toward the handles, elbows moving beside the ribs. Keep wrists straight.",
    "Straighten the arms slowly without letting your shoulders roll forward or your hips sag.",
  ], "Letting the lower back sag during the pull. Keep the trunk braced and use a more upright position if needed.",
  [{ title: "ACE · Suspension back row", url: "https://www.acefitness.org/resources/everyone/exercise-library/84/trx-reg-back-row/" }],
  "Pause at the top with your trunk steady, then control the return.", undefined, "Pause for {s} at the top of the row, body firm."),
  farmer_carry: reviewed([
    "Pick up one dumbbell in each hand and stand upright, arms hanging beside you. Choose a clear walking route.",
    "Walk steadily with a firm grip and a tall, steady trunk. Keep the weights beside your hips.",
    "Continue for the target time, then stop walking before lowering the weights under control.",
  ], "Losing the upright back position as you walk. Reduce the load when you cannot keep your trunk steady.",
  [{ title: "ACE · Farmer’s carry", url: "https://www.acefitness.org/resources/everyone/exercise-library/359/farmer-s-carry/" }],
  "Own a steady walk and firm grip. The target is seconds of carrying; no pause is needed in each step."),
  suitcase_carry: reviewed([
    "Hold one dumbbell beside your hip and stand upright. Choose a clear route before you start.",
    "Walk steadily, keeping your trunk upright rather than leaning with the load.",
    "Walk for the target time, set the weight down under control, then repeat for the same time on the other side. Log the shorter side’s time.",
  ], "Losing the upright back position under the one-sided load. Use a lighter dumbbell if you cannot stay steady.",
  [{ title: "ACE · Suitcase carry", url: "https://www.acefitness.org/resources/everyone/exercise-library/358/suitcase-carry/" }],
  "Keep the trunk steady as you walk. Complete both sides before logging the set; no pause is needed in each step."),
  db_bench: reviewed([
    "Lie on a bench with feet planted and a dumbbell in each hand. Keep your head, shoulders and hips supported; ask for help getting the weights into position if needed.",
    "Inhale as you lower the weights toward chest level with wrists straight. Keep the descent controlled rather than dropping into a stretch.",
    "Exhale and press the weights up. Keep your feet planted and your body supported as you finish the set.",
  ], "Bouncing the weights or bending the wrists backward. Keep the wrists aligned with the forearms and lower smoothly.",
  [{ title: "ACE · Dumbbell chest press", url: "https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/" }],
  "Pause briefly in a lower position you can control, without relaxing the shoulders. Then press smoothly."),
  db_shoulder: reviewed([
    "Stand tall or sit with your back supported, feet flat. Bring a dumbbell to each shoulder, with elbows under wrists and slightly in front of the body.",
    "Brace your trunk and press overhead without leaning back or lifting your ribs.",
    "Lower slowly toward shoulder level through a comfortable range. Keep the torso steady.",
  ], "Using weights that make you lose trunk control or force the arms too far out to the sides. Reduce the load and keep the arms slightly forward.",
  [{ title: "PureGym · Seated shoulder press", url: "https://www.puregym.com/exercises/arms-and-shoulders/shoulder-press/seated-shoulder-press/" },
   { title: "PureGym · Dumbbell shoulder press technique", url: "https://www.puregym.com/exercises/arms-and-shoulders/shoulder-press/dumbbell-shoulder-press/" }],
  "Pause briefly at shoulder level with the trunk steady, then press without a bounce."),
  pushdown: reviewed([
    "Face a high cable with a straight-bar handle. Brace your trunk and bring your elbows beside your body, wrists straight.",
    "Exhale as you straighten the elbows to press the bar down. Keep the upper arms and torso still.",
    "Let the elbows bend slowly to return. Stop the return before the elbows drift forward.",
  ], "Letting the elbows move forward and the body help move the weight. Keep the upper arms beside you.",
  [{ title: "ACE · Triceps pushdowns", url: "https://www.acefitness.org/resources/everyone/exercise-library/185/triceps-pushdowns/" }],
  "Briefly squeeze the triceps near the bottom without forcing the elbows backward. Return slowly."),
  rope_pushdown: reviewed([
    "Attach a rope to a high cable and face the machine. Brace your trunk with elbows beside you and wrists straight.",
    "Straighten the elbows to press the rope down, keeping your torso and upper arms steady.",
    "Return slowly by bending the elbows. Keep them beside you rather than letting them drift forward.",
  ], "Moving the elbows and torso to shift a load that is too heavy. Keep the upper arms steady and use a manageable weight.",
  [{ title: "ACE · Triceps pushdowns with bar or rope", url: "https://www.acefitness.org/resources/everyone/exercise-library/185/triceps-pushdowns/" }],
  "Briefly squeeze the triceps with your arms straight, without forcing the elbows back."),
  lat_pulldown: reviewed([
    "Set the thigh pads snugly above your legs. Grip the bar just wider than your shoulders, sit down and plant your feet.",
    "Brace your trunk with a small, steady backward lean. Bring the elbows down as the bar travels toward your upper chest.",
    "Stop when the bar passes below chin level, then straighten the arms slowly. Keep the torso still.",
  ], "Yanking the bar down with a body swing. Use less weight so the trunk stays steady and the return stays controlled.",
  [{ title: "PureGym · Lat pulldown technique", url: "https://www.puregym.com/exercises/back/lat-exercises/lat-pulldown/" }],
  "Pause briefly with the bar in front of the upper chest, then control the return without swinging."),
  cable_row: reviewed([
    "Sit with knees slightly bent and grip the cable handle. Let the arms reach forward until you feel a mild stretch, keeping your back steady.",
    "Pull the handle toward your waist as the elbows bend and travel behind you.",
    "Return the handle slowly. Keep the movement smooth rather than leaning forward to reach farther.",
  ], "Leaning too far forward at the start. Use only a mild stretch and keep the movement smooth.",
  [{ title: "Mayo Clinic · Seated cable row", url: "https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/seated-row/vid-20084688" }],
  "Pause with the handle near the waist and feel the back working. Return without rocking the torso."),
  face_pull: reviewed([
    "Attach a rope at about eye height. Face the cable, hold both ends and step back to take up the slack.",
    "Brace your trunk and pull the rope toward your face, letting the elbows travel backward.",
    "Straighten the arms slowly to return. Keep the neck relaxed and the movement controlled.",
  ], "Shrugging the shoulders or jerking a weight that is too heavy. Use a load you can move smoothly.",
  [nasm("face-pull", "Face pull")], "Pause briefly with the rope beside your face. Feel the upper back work without shrugging."),
  db_curl: reviewed([
    "Stand tall with a dumbbell in each hand, palms forward and arms beside you. Keep the shoulders relaxed.",
    "Bend the elbows to bring the dumbbells toward the shoulders. Keep the elbows beside your body.",
    "Lower slowly until the arms are straight again, without swinging the weights.",
  ], "Swinging the body and moving the shoulders to lift the weights. Reduce the load so the elbows can stay still.",
  [{ title: "PureGym · Dumbbell biceps curl and common mistakes", url: "https://www.puregym.com/exercises/arms-and-shoulders/bicep-curl/dumbbell-bicep-curls/" }],
  "Pause briefly during the curl and feel the biceps working, elbows still. Control the lowering half too."),
  split_squat: reviewed([
    "Hold dumbbells beside you and take a split stance, feet about hip width apart from side to side. Keep the rear heel lifted.",
    "Bend both knees to lower, keeping your torso steady. Use enough space between the feet to lower the back knee toward the floor without hitting it.",
    "Press through your feet to rise without stepping. Finish the repetitions on one side, then switch; log the lower side’s count.",
  ], "Placing the feet on one narrow line like a tightrope. Keep some side-to-side space so you can balance.",
  [{ title: "Lyle McDonald · Split squat technique and common errors", url: "https://bodyrecomposition.com/training/split-squat-technique" }],
  "Pause with the back knee just above the floor and the front foot planted. Stand without bouncing."),
  bw_split_squat: reviewed([
    "Stand with one foot forward and one back, keeping the feet about hip width apart from side to side. Lift the rear heel.",
    "Bend both knees to lower the back knee toward the floor. Keep the trunk steady and stop before the knee touches down.",
    "Stand back up without stepping. Complete both sides and log the lower side’s count.",
  ], "Putting the feet too close together from front to back or side to side. Give yourself room to lower and balance.",
  [{ title: "Lyle McDonald · Split squat technique and common errors", url: "https://bodyrecomposition.com/training/split-squat-technique" }],
  "Pause at a stable depth with the front foot planted, then stand without bouncing.", undefined, "Pause for {s} with the back knee just off the floor."),
  leg_curl: reviewed([
    "Lie face down on the machine with the roller above your heels and hips supported by the pad. Follow the machine’s adjustment labels.",
    "Bend the knees to bring the heels toward your hips, keeping the hips on the support.",
    "Straighten the knees slowly to return. Control both directions rather than letting the stack pull you back.",
  ], "Moving the hips or jerking the weight to complete the curl. Use a lighter load and keep the hips supported.",
  [nasm("lying-leg-curl", "Lying leg curl")], "Briefly squeeze the back of the thighs in the curled position, then return slowly."),
  seated_leg_curl: reviewed([
    "Sit against the backrest and adjust the machine so the lower roller rests above your heels. Secure the thigh restraint as the machine directs.",
    "Bend the knees to bring the lower legs down and back, keeping your hips steady.",
    "Return slowly toward straight legs without letting the stack pull you out of position.",
  ], "Using a load that makes the hips shift or the movement jerk. Keep the hips steady and control the return.",
  [nasm("seated-leg-curl", "Seated leg curl")], "Pause briefly in the curled position and feel the hamstrings working."),
  bw_squat: reviewed([
    "Stand with feet a little wider than hip width and toes slightly out. Brace your stomach and keep your feet planted.",
    "Bend the hips and knees together, keeping the knees aligned with the feet. Stop at a depth you can reach without your heels lifting or your trunk collapsing.",
    "Exhale and press through your feet to stand, bringing hips and shoulders up together.",
  ], "Letting the heels lift or the knees collapse inward. Use a depth at which your feet and knees stay steady.",
  [{ title: "ACE · Bodyweight squat", url: "https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/" }],
  "Lower smoothly and pause briefly at a stable depth before standing.", undefined, "Pause for {s} at a stable depth, feet planted."),
  pullup: reviewed([
    "Take an overhand grip on a secure bar, hands a little wider than shoulder width. Start with long arms and a steady trunk.",
    "Bring the elbows down as you lift until your chin clears the bar, without throwing your head forward.",
    "Lower under control to long arms again. Use assistance if you cannot move without swinging.",
  ], "Kipping or swinging to get above the bar, then dropping down. Choose assistance and control the full repetition.",
  [nasm("pull-up", "Pull-up")], "Pause briefly above the bar, then lower smoothly without swinging."),
  scap_pullup: reviewed([
    "Hang from a secure bar with an overhand grip about shoulder width, arms straight.",
    "Keeping the elbows straight, pull your shoulders down away from your ears so your body rises a little.",
    "Let the shoulders rise back up slowly to the hang, then repeat.",
  ], "Bending the elbows to help. Only the shoulders move; the arms stay long.",
  [{ title: "StrengthLog · Scap pull-up", url: "https://www.strengthlog.com/scap-pull-up" }],
  "Hold the top for a second, shoulders down, before you lower."),
  pullup_negative: reviewed([
    "Use a step or a small jump to get your chin over the bar, hands about shoulder width.",
    "Lower yourself slowly, taking about five seconds to reach straight arms.",
    "Step back up to the top, rather than pulling, and repeat.",
  ], "Dropping quickly through the bottom half. Keep the whole way down slow and even.",
  [{ title: "MasterClass · Negative pull-ups", url: "https://www.masterclass.com/articles/negative-pull-ups" }],
  "Take a full five seconds on every lowering, top to bottom."),
  deadlift: reviewed([
    "Stand with the bar over the middle of your feet. Bend the hips and knees to grip just outside the legs, then brace and take up the slack.",
    "Push through your feet and extend the hips and knees to stand, keeping the bar close.",
    "Move the hips back and bend the knees to return the bar to the floor under control. Reset before the next repetition.",
  ], "Jerking the bar away from the floor or letting it drift forward. Set your position and keep the bar close.",
  [nasm("barbell-deadlift", "Barbell deadlift")], "Stand tall without leaning backward. Lower under control and let the bar settle before the next lift."),
  glute_bridge: reviewed([
    "Lie on your back with knees bent and feet flat about hip width apart. Brace your stomach gently.",
    "Push through your feet and lift the hips until shoulders, hips and knees form a line.",
    "Lower the hips slowly, keeping the movement in your hips rather than arching through the lower back.",
  ], "Lifting so high that the lower back arches. Finish when the body forms a straight line.",
  [nasm("floor-bridge", "Floor bridge")], "Pause at the top and gently squeeze the glutes, keeping the ribs down."),
  elliptical: reviewed([
    "Hold the fixed rails as you step onto the pedals; they may move under your weight.",
    "Pedal forward with an upright trunk and a light grip. Begin with the fixed rails until you feel balanced.",
    "Adjust resistance to keep the movement smooth. Let the legs do the work rather than leaning on the handles.",
  ], "Leaning forward or hanging your weight on the rails. Stay upright and use a light grip for balance.",
  [{ title: "ACE · Using an elliptical machine", url: "https://contentcdn.eacefitness.com/continuingeducation/resources/4a5wy7yz/fss/Chapter5.pdf" }], undefined,
  ["Get on with support", "Find your balance", "Move smoothly"]),
  bike: reviewed([
    "Adjust the saddle and handlebars before riding. With the foot in its riding position, the knee should stay slightly bent at the bottom of the pedal stroke.",
    "Keep your back steady, elbows soft and shoulders relaxed. Let the knees track in line with your feet.",
    "Pedal smoothly at a resistance you can control. Recheck the setup if you cannot maintain a comfortable position.",
  ], "A saddle that is too high or too low. Adjust it rather than forcing the knees to work from an awkward position.",
  [{ title: "HSS · Exercise bike setup and body position", url: "https://www.hss.edu/health-library/move-better/set-up-exercise-bike" }], undefined,
  ["Fit the bike", "Settle your posture", "Pedal smoothly"]),
  assault_bike: reviewed([
    "Adjust the seat so the knee stays slightly bent at the bottom of the pedal stroke. Check that the seat adjustments are secured.",
    "Pedal while pushing and pulling the handles. Keep your trunk steady as the arms and legs work together.",
    "Use a rhythm you can control; faster movement increases the fan resistance. Keep your shoulders relaxed rather than forcing the pace.",
  ], "Using a seat height that leaves the knee locked or overly bent. Adjust the fit before increasing your effort.",
  [{ title: "HSS · Bike fit", url: "https://www.hss.edu/health-library/move-better/set-up-exercise-bike" },
   { title: "Assault Fitness · AssaultBike operation and resistance", url: "https://www.assaultfitness.com/bikes/assault-bike-classic/" }], undefined,
  ["Adjust the seat", "Use arms and legs", "Find a steady rhythm"]),
  stair: reviewed([
    "Find the speed and stop controls before starting. Hold the rails while getting into position.",
    "Stand upright and step at a pace you can manage. Use the rails for balance.",
    "Keep your weight supported by your legs rather than hanging on your arms. Reduce the speed if you cannot stay upright.",
  ], "Leaning heavily on the handrails. Use them for balance instead of supporting your body weight.",
  [{ title: "StairMaster · Handrail use and stepping resistance", url: "https://corehandf.my.site.com/support/s/article/What-do-I-do-if-my-Stairmaster-8G-stepmill-is-having-resistance-issues" }], undefined,
  ["Find the controls", "Step steadily", "Let the legs work"]),
  tripod_knees_elbows: reviewedHandstand([
    "Kneel. Put your hands down shoulder-width apart and the top of your head in front of them, so head and hands make a triangle. Forearms upright.",
    "Lift your knees off the floor and walk your feet in. Rest one knee, then the other, on the backs of your elbows.",
    "Hold, breathing slowly, pressing through your hands. Come down one foot at a time.",
  ], "Letting the head and neck carry you. Press through your hands so the weight is shared, and keep the neck firm.",
  [aloHeadstand, tripodHeadstand],
  "Hold still and breathe. Come down before you tip.", ["Make the triangle", "Knees on the elbows", "Hold and breathe"]),
  tripod_headstand: reviewedHandstand([
    "Set up as for knees to elbows: head and hands in a triangle, knees resting on the elbows.",
    "When you feel steady, lift the knees off the elbows to hip height, then slowly straighten your legs up.",
    "Hold, the weight in your hands. Bend the knees and come down the way you went up. Practise on a soft, clear floor.",
  ], "Straightening the legs before you are steady with the knees up. Find the balance first, then extend.",
  [aloHeadstand, tripodHeadstand],
  "Legs still, weight in the hands. Breathe.", ["Knees on the elbows", "Lift slowly", "Come down slowly"]),
  wall_walk: reviewedHandstand([
    "Start in a push-up, your feet touching a wall behind you.",
    "Walk your feet up the wall while you walk your hands back toward it, a little at a time.",
    "Stop as close to the wall as you control, then walk the hands out and the feet down.",
  ], "Starting so far out that your back arches to keep the feet on the wall. Walk in only as far as your body stays straight.",
  [{ title: "StrengthLog · Wall walk", url: "https://www.strengthlog.com/wall-walk/" }, lifeTimeHandstand],
  "Hold at the closest point you control.", ["Push-up at the wall", "Walk up", "Walk back down"],
  "Hold for {s} at the closest point you control."),
  wall_handstand: reviewedHandstand([
    "Walk up the wall as in a wall walk, until your hands are close to it and your chest faces it.",
    "Arms straight, push the floor away. Stay strong through the arms and shoulders, body in one straight line.",
    "Hold, breathing. Walk back down before your arms tire.",
  ], "Arching the back to reach the wall with your feet. Keep your body straight; move your hands instead.",
  [lifeTimeHandstand],
  "Push the floor away and breathe.", ["Walk up", "Push the floor away", "Walk down"]),
  handstand: reviewedHandstand([
    "Stand facing open floor with space around you. Reach forward and put your hands down shoulder-width apart.",
    "Kick one leg up, then bring the other to it over your hips. Press the fingers into the floor to balance.",
    "To come down, lower the feet the way you came up, or turn out to the side like a cartwheel.",
  ], "Bending the elbows to drop out of it. Keep the arms strong until a foot is on the floor.",
  [lifeTimeHandstand],
  "Fingers do the balancing. Step down any time.", ["Hands down", "Kick up", "Come down safely"]),
};
