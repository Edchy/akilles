#!/bin/bash
# shoot.sh name state route shot  — one still from the video simulator.
D=FFF8D713-375D-4F99-906F-BB6D379240F6
V=/Users/eddietovebeppearonelsa/.claude/jobs/a2984155/tmp/v
C=/Users/eddietovebeppearonelsa/.claude/jobs/a2984155/tmp/capture
S="$(xcrun simctl get_app_container $D host.exp.Exponent data)/Documents/ExponentExperienceData/@edch/akilles/RCTAsyncLocalStorage"
xcrun simctl terminate $D host.exp.Exponent 2>/dev/null
sleep 1
cp $V/states/$2.json "$S/d2cf97978994b5d1eba7b5de03ab59c4"
printf '{"achilles\\/state":null}' > "$S/manifest.json"
xcrun simctl openurl $D "exp://127.0.0.1:8082/--$3?shot=$4"
# Wait until the screen holds still (the loading spinner never does), at least 10 s.
sleep 10
prev=""
for i in $(seq 1 30); do
  xcrun simctl io $D screenshot --type=png $V/shots/$1.png >/dev/null 2>&1
  h=$(md5 -q $V/shots/$1.png)
  [ "$h" = "$prev" ] && break
  prev=$h
  sleep 2.5
done
echo "shot $1"
