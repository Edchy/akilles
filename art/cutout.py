"""Lift clay off a plain white background: a PNG with no background at all.

    art/.venv/bin/python art/cutout.py art/logo/k.png out.png [--crop] [--size 1024]

The background is whatever near-white is connected to the picture's edge, so
a pale highlight on the clay itself is kept. The clay's outline is then taken
in by a hair and softened, and the pixels along it are given the clay's own
colour from just inside, so no white from the old background is left in the
rim: the K sits cleanly on dark ground as well as light. --crop trims to the
clay with a little room round it, square. Needs Pillow and numpy.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# How far from pure white (0–255) still counts as background.
EDGE = 46
# How far the outline is taken in, and how soft it is, in pixels.
TRIM, SOFT = 2, 1.1
# How deep the rim whose colour is replaced from inside the clay goes.
RIM = 6


def grow(mask: Image.Image, px: int, shrink: bool) -> Image.Image:
    size = 2 * px + 1
    return mask.filter(ImageFilter.MinFilter(size) if shrink else ImageFilter.MaxFilter(size))


def cutout(src: str, out: str, crop: bool, size: int | None) -> None:
    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img).astype(np.float32)
    w, h = img.size

    # Near-white reached from the edge without crossing clay is the background.
    near = (255 - rgb.min(axis=2)) < EDGE
    fill = Image.fromarray(np.where(near, 255, 0).astype(np.uint8))
    draw = ImageDraw.Draw(fill)
    edge = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    edge += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for xy in edge:
        if fill.getpixel(xy) == 255:
            ImageDraw.floodfill(fill, xy, 128)
    clay = Image.fromarray(np.where(np.asarray(fill) == 128, 0, 255).astype(np.uint8))
    # Specks of clay-coloured noise out in the white are not clay.
    clay = clay.filter(ImageFilter.MedianFilter(5))

    alpha = grow(clay, TRIM, shrink=True).filter(ImageFilter.GaussianBlur(SOFT))

    # The rim's colour, from the clay just inside it.
    inner = np.asarray(grow(clay, TRIM + RIM, shrink=True)).astype(np.float32) / 255
    blur = lambda a: np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(RIM * 1.5))).astype(np.float32)
    weight = blur((inner * 255).astype(np.uint8)) / 255
    spread = np.stack(
        [blur((rgb[..., c] * inner).astype(np.uint8)) / np.maximum(weight, 1e-3) for c in range(3)], axis=2
    )
    keep = inner[..., None]
    colour = rgb * keep + np.clip(spread, 0, 255) * (1 - keep)

    result = Image.fromarray(
        np.dstack([colour, np.asarray(alpha).astype(np.float32)]).round().astype(np.uint8)
    )

    if crop:
        box = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
        if box:
            left, top, right, bottom = box
            side = round(max(right - left, bottom - top) * 1.08)
            square = Image.new("RGBA", (side, side))
            square.paste(result.crop(box), ((side - (right - left)) // 2, (side - (bottom - top)) // 2))
            result = square
    if size:
        result = result.resize((size, size), Image.LANCZOS)
    result.save(out)
    print(out)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    size = None
    if "--size" in sys.argv:
        size = int(sys.argv[sys.argv.index("--size") + 1])
        args = [a for a in args if a != str(size)]
    cutout(args[0], args[1], "--crop" in sys.argv, size)
