"""Klay's logo, icons, favicons and splash screens, from the two clay Ks.

    art/.venv/bin/python art/icons.py

Reads art/logo/k-black.png (black K on paper) and art/logo/k-white.png (white
K on black), both made by art/logo.mjs. Their backgrounds are shifted to
exactly the app's colours, so a picture's edge never shows against the screen
around it, then each is cut to size with the K centred:

    assets/icon.png                        the app icon (iOS, Expo)
    assets/adaptive-icon.png               Android's icon, K inside the safe circle
    assets/splash.png, splash-dark.png     the splash screen
    public/icon-180.png                    Apple's "Add to Home Screen" icon
    public/icon-192.png, icon-512.png      the web app's icons (manifest)
    public/icon-maskable-512.png           Android's home-screen icon, K inside the safe circle
    public/favicon.ico, favicon-*.png      the browser tab, light and dark
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PAPER = (0xFC, 0xFC, 0xFA)  # the app's paper white
INK = (0x0B, 0x0B, 0x0B)  # the white K's black set


def load(name, bg):
    """The picture with its background moved to exactly `bg`, and the K's box."""
    img = np.asarray(Image.open(ROOT / "art/logo" / name).convert("RGB")).astype(np.float32)
    corners = np.concatenate([img[:24, :24], img[:24, -24:], img[-24:, :24], img[-24:, -24:]])
    was = np.median(corners.reshape(-1, 3), axis=0)
    # Lift the background to the target and carry the rest of the picture with it,
    # in proportion to how close each pixel is to the background.
    dist = np.abs(img - was).sum(2, keepdims=True)
    weight = np.clip(1 - dist / 120, 0, 1)
    img = np.clip(img + (np.array(bg) - was) * weight, 0, 255)
    k = np.abs(img - np.array(bg)).sum(2) > 150
    ys, xs = np.where(k)
    return Image.fromarray(img.astype(np.uint8)), (xs.min(), ys.min(), xs.max(), ys.max())


def frame(src, size, k_height, bg):
    """A `size` square with the K `k_height` of it tall, centred."""
    img, (x0, y0, x1, y1) = src
    side = (y1 - y0) / k_height
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box = (cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2)
    # Any part of the box past the picture's edge is filled with the background.
    pad = int(max(0, -box[0], -box[1], box[2] - img.width, box[3] - img.height)) + 2
    canvas = Image.new("RGB", (img.width + 2 * pad, img.height + 2 * pad), bg)
    canvas.paste(img, (pad, pad))
    box = tuple(v + pad for v in box)
    return canvas.resize((size, size), Image.LANCZOS, box=box)


def png(img, path, colors=256):
    """A small PNG: a 256-colour palette, dithered so the clay keeps its grain."""
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    img.quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(
        path, optimize=True
    )
    print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


black = load("k-black.png", PAPER)
white = load("k-white.png", INK)

png(frame(black, 1024, 0.68, PAPER), "assets/icon.png")
png(frame(black, 1024, 0.44, PAPER), "assets/adaptive-icon.png")
png(frame(black, 600, 0.9, PAPER), "assets/splash.png")
png(frame(white, 600, 0.9, INK), "assets/splash-dark.png")

png(frame(black, 180, 0.68, PAPER), "public/icon-180.png")
png(frame(black, 192, 0.68, PAPER), "public/icon-192.png")
png(frame(black, 512, 0.68, PAPER), "public/icon-512.png")
png(frame(black, 512, 0.44, PAPER), "public/icon-maskable-512.png")

# The tab icon: the K nearly fills it, so it still reads at 16 pixels.
png(frame(black, 64, 0.9, PAPER), "public/favicon-light.png")
png(frame(white, 64, 0.9, INK), "public/favicon-dark.png")
ico = frame(black, 48, 0.9, PAPER)
ico.save(ROOT / "public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print(f"public/favicon.ico  {(ROOT / 'public/favicon.ico').stat().st_size // 1024} KB")
