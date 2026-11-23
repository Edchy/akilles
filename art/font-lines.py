"""
How tall a line each font loaded in src/app/_layout.tsx needs, so iOS never
cuts the tops off its letters (see `LINE` in src/constants/font-lines.ts).

iOS keeps the foot of a line that is too short for its font: the baseline
sits the font's descent above the bottom, and anything rising higher than
the line is cut off. So a font needs its descent plus its tallest letter or
figure, and a hair more. Run from the repo root after adding a font:

  python3 art/font-lines.py > /tmp/lines && edit the table in font-lines.ts
"""
import re, glob, os, sys, string
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
root = sys.argv[1] if len(sys.argv) > 1 else "."
layout = open(os.path.join(root, "src/app/_layout.tsx")).read()
names = sorted(set(re.findall(r"\b([A-Z][A-Za-z0-9]+_[0-9]{3}[A-Za-z_]*)\b", layout)))
files = {}
for f in glob.glob(os.path.join(root, "node_modules/@expo-google-fonts/*/*/*.ttf")) + glob.glob(os.path.join(root, "node_modules/@expo-google-fonts/*/*.ttf")):
    files[os.path.splitext(os.path.basename(f))[0]] = f
for n in names:
    t = TTFont(files[n])
    upm = t["head"].unitsPerEm; desc = -t["hhea"].descent
    cmap = t.getBestCmap(); gs = t.getGlyphSet()
    top = 0
    for ch in string.digits + string.ascii_letters:
        g = cmap.get(ord(ch))
        if not g: continue
        p = BoundsPen(gs); gs[g].draw(p)
        if p.bounds: top = max(top, p.bounds[3])
    print(f"  {n}: {round((desc + top) / upm + 0.02, 3)},")
