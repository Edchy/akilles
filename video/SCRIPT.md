# Intro film — script, draft 6 (Klay)

**Klay: Shape your life.** About a minute, one film start to finish: a short *why*, then *how a workout goes*, drawn as the app draws it but simplified, with a finger. Played in the app after the two onboarding questions, and from Settings (`assets/video/intro.mp4`, a 720p copy of `out/klay-onboarding.mp4`). Everything else is taught by first-time tips (`src/components/tips.tsx`).

| # | Picture | Said |
|---|---|---|
| 1 | Clay: breakfast | You eat every day. |
| 2 | Clay: asleep | You sleep every day. |
| 3 | Clay: walking to the gym | And your body needs to move every day, too. |
| 4 | Clay: in the gym, scratching his head | So you go to the gym. Now what? |
| 5 | Today's workout; the finger taps Start | Open Klay and tap Start. Your workout is ready, every weight worked out. |
| 6 | The lift card; two circles tapped | Each card is one exercise. Lift, rest, then tap a circle for each set. |
| 7 | The third circle tapped, then again: 8 → 7 | Got fewer? Tap again to count down. Klay writes down what you really did. |
| 8 | The journal: 20 kg, 22.5 (8 8 7), 22.5, **Next time 25 kg** | Next time, Klay asks for a little more. Came up short? You try the same again. |
| 9 | The deck: Bench swiped off, Shoulder press up, Bench swiped back | Swipe for the next exercise. Bench taken? Do the next one, and swipe back to it. |
| 10 | A stretch card thrown off upwards; the next comes in | Stretches move on by themselves. Done early? Swipe up. |
| 11 | The workout card pulled down: every card ticked, Finish tapped | Pull down to see every card. Then tap Finish. |
| 12 | Clay: hands on hips | Show up, do a little. Small days add up. |
| 13 | Waving; **Klay**, *Shape your life.* | Klay. Shape your life. |

To make a new copy for the app after a change: `npm run voice` (if lines changed), `npm run render`, then
`ffmpeg -i out/klay-onboarding.mp4 -vf scale=720:-2 -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -c:a aac -b:a 64k -movflags +faststart ../assets/video/intro.mp4`.

## Notes

- **"Do a little" means a short visit, never less weight or fewer days.** Never "lift less".
- **Cut on 2026-11-18 for length:** the stretch-up, the guessing, the sofa, the lift card and the slow curl. Their pictures stay in `art/clay/`.
- **Still to try:** a soft gym sound under scene 4 (ElevenLabs sound effects).
- The old Humbell script (screens of Plan, swipes, pausing) is in git history.
