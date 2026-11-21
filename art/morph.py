"""The in-between shapes of the logo film, so the clay flows instead of cutting.

    art/.venv/bin/python art/morph.py

Reads the cut-out stages in video/public/logo (stage-0…3, k) and, for each
pair, writes STEPS pictures to video/public/logo/morph/<pair>-<step>.png. The
outline is blended as a distance field: every in-between is a real solid
shape, the lump growing up into the upright and the arms pulling out, never
two pictures seen through each other. The surface is the two stages' clay
blended, spread outward so it covers whatever the in-between shape reaches.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import distance_transform_edt, gaussian_filter

STAGES = ["stage-0", "stage-1", "stage-2", "stage-3", "k"]
STEPS = 24
SIZE = 900
HERE = Path(__file__).resolve().parent
LOGO = HERE.parent / "video" / "public" / "logo"


def load(name: str):
    img = Image.open(LOGO / f"{name}.png").convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
    a = np.asarray(img).astype(np.float32)
    inside = a[..., 3] > 127
    # Signed distance to the outline: negative inside the clay.
    dist = distance_transform_edt(~inside) - distance_transform_edt(inside)
    # The clay's colour carried outward from the nearest clay, so a shape that
    # reaches past this stage's outline still has clay to show.
    core = a[..., 3] > 250
    _, (iy, ix) = distance_transform_edt(~core, return_indices=True)
    colour = a[..., :3][iy, ix]
    return dist, colour


def main() -> None:
    out = LOGO / "morph"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.png"):
        old.unlink()
    shapes = [load(s) for s in STAGES]
    for pair in range(len(STAGES) - 1):
        (da, ca), (db, cb) = shapes[pair], shapes[pair + 1]
        for step in range(STEPS):
            t = (step + 1) / (STEPS + 1)
            # Smoothed a little in between, so growing arms come out round, not pointed.
            d = gaussian_filter((1 - t) * da + t * db, 6 * np.sin(np.pi * t))
            colour = (1 - t) * ca + t * cb
            alpha = np.clip(0.5 - d, 0, 1) * 255
            frame = Image.fromarray(np.dstack([colour, alpha]).round().astype(np.uint8))
            # The same soft edge as the cut-out stages.
            r, g, b, a = frame.split()
            frame = Image.merge("RGBA", (r, g, b, a.filter(ImageFilter.GaussianBlur(0.8))))
            frame.save(out / f"{pair}-{step:02d}.png", optimize=False)
    print(out, (len(STAGES) - 1) * STEPS, "frames")


if __name__ == "__main__":
    main()
