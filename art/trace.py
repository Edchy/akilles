"""Turns the greyscale drawings in art/drawn into paths the app colours itself.

    python art/trace.py                 # every frame in frames.json that has a drawing
    python art/trace.py --preview FILE  # also a contact sheet in each family's colours

Needs numpy, pillow and potracer (pip install numpy pillow potracer).

Each drawing has three tones: white ground, black ink (the near side of the
body) and grey tint (the far limbs and all equipment). Some have a fourth: red,
the part of the body the movement works, traced as the frame's accent. Every pixel is snapped
to the nearest of the three, the thin grey halo antialiasing leaves around
black shapes is opened away, and each tone is traced with potrace into one SVG
path. The tint path covers everything that isn't ground, so the ink drawn over
it never leaves a hairline seam. The floor line is taken out and every frame
moved so its floor sits at FLOOR: the app draws the floor itself, edge to edge
at any width, and a lift's two frames never jump against each other. The
result is src/data/art.ts: for each movement, its frames as { tint, ink } path
strings on a 768 x 512 view box.
"""

import json
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageFilter

ART = Path(__file__).parent
OUT = ART.parent / "src" / "data" / "art.ts"
W, H = 768, 512

# Where one tone ends and the next begins, on the drawing's 0-255 grey scale.
INK_BELOW, GROUND_ABOVE = 75, 192
# Where every floor sits, and how thick the app draws it (90% down, as STYLE.md asks).
FLOOR, FLOOR_THICK = 461, 3


def masks(png: Path):
    image = Image.open(png).convert("RGB").resize((W, H), Image.LANCZOS)
    r, g, b = (np.asarray(image)[..., i].astype(int) for i in range(3))
    # The accent — where the movement works — is drawn red: far more red than
    # green or blue. It is part of the near side of the body, so of the ink too.
    accent = (r - np.maximum(g, b)) > 90
    a = Image.fromarray((accent * 255).astype(np.uint8))
    accent = np.asarray(a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 127
    v = np.asarray(image.convert("L"))
    ink = (v < INK_BELOW) | accent
    tint = (v >= INK_BELOW) & (v <= GROUND_ABOVE) & ~accent
    # Antialiasing between black and white passes through grey: a halo one or
    # two pixels wide. Opening the grey mask removes it and keeps real shapes.
    t = Image.fromarray((tint * 255).astype(np.uint8))
    t = t.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    tint = np.asarray(t) > 127
    # The floor: rows that are grey across most of the width.
    rows = np.where(tint.mean(axis=1) > 0.6)[0]
    if len(rows) == 0:
        raise ValueError(f"{png.name}: no floor line found")
    tint = tint.copy()
    tint[rows] = False
    shift = FLOOR - round(rows.mean())
    ink, tint, accent = (np.roll(m, shift, axis=0) for m in (ink, tint, accent))
    if shift > 0:
        ink[:shift] = tint[:shift] = accent[:shift] = False
    elif shift < 0:
        ink[shift:] = tint[shift:] = accent[shift:] = False
    return ink, tint | ink, accent


def trace(mask) -> str:
    # potracer reads True as white paper and traces the dark, so hand it the inverse.
    path = potrace.Bitmap(~mask).trace(turdsize=8, alphamax=1.0, opticurve=True, opttolerance=0.2)
    f = lambda p: f"{p.x:.1f} {p.y:.1f}"
    d = []
    for curve in path:
        d.append(f"M{f(curve.start_point)}")
        for seg in curve:
            if seg.is_corner:
                d.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                d.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        d.append("Z")
    return "".join(d).replace(".0 ", " ").replace(".0C", "C").replace(".0L", "L").replace(".0Z", "Z")


# The app's family fields and whether each carries white (dark) or navy, as in
# src/constants/theme.ts, and the share of ink in the tint, as in illustration.tsx.
NAVY, WHITE, TINT = "#13325B", "#FFFFFF", 0.42
FIELDS = {
    "push": ("#2277BB", True),
    "pull": ("#23864D", True),
    "legs": ("#F08A24", False),
    "core": ("#D6287E", True),
    "cardio": ("#3CC2CB", False),
    "mobility": ("#F6C12A", False),
}


def coloured(ink, tint, accent, family):
    field, dark = FIELDS[family]
    field, ink_rgb = hex_rgb(field), hex_rgb(WHITE if dark else NAVY)
    accent_rgb = hex_rgb(NAVY if dark else WHITE)
    tint_rgb = mix(ink_rgb, field, TINT)
    img = np.zeros((H, W, 3), np.uint8)
    img[:] = field
    img[FLOOR - FLOOR_THICK // 2 : FLOOR + FLOOR_THICK - FLOOR_THICK // 2] = tint_rgb
    img[tint] = tint_rgb
    img[ink] = ink_rgb
    img[accent] = accent_rgb
    return Image.fromarray(img)


def sheet(rows, out):
    """Each movement on a row, its frames side by side, half size."""
    w, h, gap = W // 2, H // 2, 8
    cols = max(len(r) for r in rows)
    img = Image.new("RGB", (cols * (w + gap) - gap, len(rows) * (h + gap) - gap), "white")
    for y, r in enumerate(rows):
        for x, frame in enumerate(r):
            img.paste(frame.resize((w, h), Image.LANCZOS), (x * (w + gap), y * (h + gap)))
    img.save(out)


def mix(a, b, t):
    return tuple(round(x * t + y * (1 - t)) for x, y in zip(a, b))


def hex_rgb(h):
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def main():
    frames = json.loads((ART / "frames.json").read_text())
    pv = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    entries, rows = [], []
    for id, movement in frames.items():
        # The figure sheet is a reference for drawing, not a movement.
        if movement.get("sheet"):
            continue
        specs = movement["frames"]
        traced, row = [], []
        for n in range(len(specs)):
            png = ART / "drawn" / f"{id}-{n}.png"
            if not png.exists():
                break
            ink, tint, accent = masks(png)
            frame = {"tint": trace(tint), "ink": trace(ink)}
            if accent.any():
                frame["accent"] = trace(accent)
            traced.append(frame)
            row.append(coloured(ink, tint, accent, movement["family"]))
        if len(traced) == len(specs):
            entries.append((id, traced))
            rows.append(row)
        elif traced:
            print(f"skipping {id}: {len(traced)} of {len(specs)} frames drawn")

    lines = [
        "/**",
        " * Humbell's own pictures of each movement, traced from the drawings in art/drawn",
        " * by art/trace.py. Don't edit by hand: redraw and retrace. Each frame is two",
        " * paths on a 768 x 512 view box: `tint` (the far limbs and the equipment, and",
        " * under everything) and `ink` (the near side of the body, drawn on top) —",
        " * and, where the drawing shows it, `accent`: the part of the body that works,",
        " * drawn over the ink.",
        " */",
        "",
        "export type ArtFrame = { tint: string; ink: string; accent?: string };",
        "",
        f"export const ART_BOX = {{ width: {W}, height: {H} }};",
        "",
        "/** The floor every frame stands on, in view-box units: drawn by the app, edge to edge. */",
        f"export const ART_FLOOR = {{ y: {FLOOR}, thickness: {FLOOR_THICK} }};",
        "",
        "export const ART: Record<string, ArtFrame[]> = {",
    ]
    for id, traced in entries:
        lines.append(f"  {id}: [")
        for fr in traced:
            accent = f"      accent: \"{fr['accent']}\",\n" if "accent" in fr else ""
            lines.append(f"    {{\n      tint: \"{fr['tint']}\",\n      ink: \"{fr['ink']}\",\n{accent}    }},")
        lines.append("  ],")
    lines.append("};")
    OUT.write_text("\n".join(lines) + "\n")
    if pv:
        sheet(rows, pv)
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, {len(entries)} movements)")


if __name__ == "__main__":
    main()
