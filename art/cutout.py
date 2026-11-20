"""Lift clay off a plain white background: a PNG with no background at all.

    python3 art/cutout.py art/logo/k.png out.png [--crop] [--size 1024]

The background is whatever near-white is connected to the picture's edge, so
a pale highlight on the clay itself is kept. Its rim fades with how white it
is, and the white is taken back out of those rim colours, so the K sits
cleanly on dark ground as well as light. --crop trims to the clay with a
little room round it, square. Needs only Pillow.
"""

from __future__ import annotations

import sys
from collections import deque

from PIL import Image

# How far from pure white still counts as background (0–255), fully and partly.
SOLID, EDGE = 10, 46


def cutout(src: str, out: str, crop: bool, size: int | None) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    px = img.load()
    away = [[0] * w for _ in range(h)]
    for y in range(h):
        row = away[y]
        for x in range(w):
            r, g, b = px[x, y]
            row[x] = 255 - min(r, g, b)

    # The background: near-white reached from the edge without crossing clay.
    back = [[False] * w for _ in range(h)]
    todo = deque()
    for x in range(w):
        todo.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        todo.extend([(0, y), (w - 1, y)])
    while todo:
        x, y = todo.popleft()
        if back[y][x] or away[y][x] >= EDGE:
            continue
        back[y][x] = True
        if x > 0: todo.append((x - 1, y))
        if x < w - 1: todo.append((x + 1, y))
        if y > 0: todo.append((x, y - 1))
        if y < h - 1: todo.append((x, y + 1))

    result = Image.new("RGBA", (w, h))
    put = result.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if not back[y][x]:
                put[x, y] = (r, g, b, 255)
                continue
            t = max(0.0, min(1.0, (away[y][x] - SOLID) / (EDGE - SOLID)))
            a = t * t * (3 - 2 * t)
            if a <= 0:
                put[x, y] = (0, 0, 0, 0)
                continue
            # The colour under the white that was mixed in.
            un = lambda c: max(0, min(255, round((c - (1 - a) * 255) / a)))
            put[x, y] = (un(r), un(g), un(b), round(a * 255))

    if crop:
        box = result.getbbox()
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
