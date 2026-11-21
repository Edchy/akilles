# Review notes — pictures to redraw

Rejected originals are in old/rejected/. lifts.json already has the fix in
words; `node art/clay-batch.mjs lifts` redraws whatever is missing.

| Lift | Who | What was wrong | Fix |
|---|---|---|---|
| cable_fly | ingrid | finish: arms sharply bent, hands pulled to the chest | arms nearly straight, hands meet far out in front of the upper chest |
| chinup | kenji | start: mixed / overhand grip | underhand grip, both palms facing the face, in both pictures |
| close_grip_pulldown | arne | sat with his back to the machine | sits facing the machine, thighs under the pad |
| kb_swing | arne | bell held to one side with one hand | both hands on the handle, swung back between the legs |
| machine_chest | kofi | machine built backwards: stack and lever in front of him, he pushes towards the stack | frame and stack behind the seat, handles beside the chest, presses forward into open space |
| machine_row | kofi | sat with his back to the machine, handles from nowhere | faces the machine, chest on the pad, handles on levers in front |
| smith_squat | noor | bar drawn flat across while she's in profile; bar at the neck | three-quarter view, bar across the upper back behind the neck |
| bb_row | rosa | bar seen from the front, body from the side | three-quarter view, bar on a diagonal — now the rule for every barbell lift not yet drawn |
| elliptical | kenji | a hand behind his back on a stub handle | both hands on the two tall handles in front of the body |
| face_pull | klay | finish turned to a back view, looked bad | exact side view in both; rope to the forehead, hands either side of the head |
| hammer_curl | kofi | dumbbells held oddly | three-quarter view, gripped by the middle of the handle, palms in |
| incline_db_press | kenji | very long neck | every cast prompt now asks for the sheet's short neck |
| band_pull_apart (stretch) | klay | band appears out of his palms | fists wrapped round the band's looped ends; redo frames and faces |

Stretches: `node art/clay-batch.mjs stretches`, then `node art/clay-batch.mjs breaths`. Until then the old pictures keep showing in the app from art/clay/standin/.
| chest_opener (stretch) | klay | the stick barely moves: front view can't show it going back | side three-quarter view; stick carried over and back to rest behind the body |
| downward_dog (stretch) | klay | head twisted to face the camera, upside down | head between the arms, in profile, looking to the feet |
| figure_four (stretch) | klay | could be clearer | ankle on the far thigh, knee wide open, hands clasped behind the far thigh |
| knee_circles (stretch) | klay | the two positions look alike | knee straight forward, then straight out to the side; three-quarter view |
| leg_swing (stretch) | klay | hand reaching back to the wall | stands side-on, hand flat on the wall beside the shoulder |
| prone_y_raise (stretch) | klay | face drawn on the back of the head | back of the head only, no face; no breathing faces for it |
| thread_needle (stretch) | klay | the wrong arm threads under | the arm that reached up is the one that threads under; the other hand stays planted |
| worlds_greatest (stretch) | klay | wrong pose (my description had the wrong arm too); the raised arm looks tiny | hand down on the inside, front-side elbow to the instep, then that same arm up full length |

Pose references (pilot): face_pull, machine_row, machine_chest and worlds_greatest (start) now attach a photo from free-exercise-db (public domain, art/clay/refs/) via "refs" in the JSON. Compare with the text-only ones. Still wanted from the user: photos of thread_needle and figure_four (and the world greatest arm-up moment).
| db_row | kofi | head and neck tilted up | head in line with the spine, eyes on the floor; every prompt now asks for optimal form and a neutral neck |

Round 2 (2026-11-20): passed — db_row, incline_db_press, bb_row, elliptical, machine_chest (photo), chinup, machine_row (photo), smith_squat, kb_swing, face_pull (photo). Failed again, now with photos: cable_fly (elbows still bent), close_grip_pulldown (still facing away), hammer_curl (start dumbbells sideways), back_squat@maeve (flat bar in profile).
Round 3: cable_fly, hammer_curl, back_squat passed with photos; close_grip_pulldown passed with our own lat_pulldown as the reference (photos alone did not turn him round).

Batch 4 form check (rating-4 lifts, 2026-11-21): 22 of 27 pass. Redrawing: cable_curl (faced away from the column), ez_bar_curl (flat bar in profile), glute_bridge (hips barely up), hip_adduction (both pictures alike), rear_delt_fly (head up).

Round 5 (user review of redo-check, 2026-11-21). Kept old: chest_opener, figure_four (new ones worse). Redrawing: back_squat (straight front view), close_grip_pulldown (proper V-handle), incline_db_press (head may hide behind the dumbbells, no long neck), face_pull (photo + the photo's camera), machine_row (photo + camera, nothing floating), kb_swing (front view, bell between the legs, photo), downward_dog (face upside down: eyes low, smile above), worlds_greatest (photo + camera for the start), thread_needle (left/right spelled out), knee_circles (straight front, only the leg moves). Batch 4: cable_curl, ez_bar_curl, glute_bridge, hip_adduction pass on redraw; rear_delt_fly redrawn again from the front.
New: "refCamera": true in the JSON makes the picture use the reference photo's camera instead of THE VIEW.
Round 6: user-supplied references (art/clay/refs/user-*.png, cut into incline-top/bottom, needle-up/under, pulldown-up/down) for thread_needle, incline_db_press, close_grip_pulldown; machine_row simplified to one lever and a seat.
Round 7: thread_needle from the user's yoga chart (panels 2 and 4; needle2-*.png). The anatomy panel tripped the safety filter for frame 1, so frame 1 is drawn from frame 0 and the words only.
Round 8: thread_needle = front view (variant B, user picked); the face in frame 1 smoothed out by hand with ffmpeg delogo (Codex blocked every edit). No breathing faces for it.
Round 9: worlds_greatest finish to keep the start's legs (left knee down, right foot planted) with only the arms threading; queued for when Codex is back.
Batch 3 check (first 18): 16 pass; close_grip_bench redrawn with our bench as reference (flat bar on a diagonal bench).
