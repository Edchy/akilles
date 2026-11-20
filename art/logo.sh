#!/bin/sh
# Klay's clay K, start to finish: the pictures, the logo with no background,
# and the five-second film.
#
#   sh art/logo.sh            everything
#   sh art/logo.sh cut        only cut out and render again (pictures already made)
#
# Makes art/logo/k.png and stage-0…3.png (Codex), then
#   art/logo/klay-k.png             the logo: the K alone, no background, 1024 square
#   video/public/logo/*.png         the film's frames, cut out the same way
#   video/out/klay-logo.mp4         the film, voiced "Klay. Get in shape."
set -e
cd "$(dirname "$0")/.."

if [ "$1" != "cut" ]; then
  node art/logo.mjs k
  # The stages are edits of the finished K, so they can be made side by side.
  for n in 0 1 2 3; do node art/logo.mjs $n & done
  wait
fi

PY=art/.venv/bin/python
[ -x "$PY" ] || { arch -arm64 /usr/bin/python3 -m venv art/.venv && art/.venv/bin/pip install -q pillow; }
$PY art/cutout.py art/logo/k.png art/logo/klay-k.png --crop --size 1024
mkdir -p video/public/logo
# The film's frames keep their place in the picture, so the camera never jumps.
for f in k stage-0 stage-1 stage-2 stage-3; do
  $PY art/cutout.py art/logo/$f.png video/public/logo/$f.png
done
[ -f video/public/voice/logo.mp3 ] || (cd video && npm run voice -- --logo)
(cd video && npm run logo)
