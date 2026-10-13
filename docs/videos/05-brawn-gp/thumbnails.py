"""IMPOSSIBLE 01 thumbnails -> PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/thumbnails/
The classic BANNED layout (photo full-bleed, two-line hook bottom-left) with the IMPOSSIBLE mark in place of the stamp.
    ~/.venvs/poststudio/bin/python thumbnails.py
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
from PIL import Image, ImageDraw, ImageFilter
from thumbs import cover, grade, big, TW, TH
from storykit import pf, impossible_mark, NAVY_D, GOLD, CREAM

STORY = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/"
OUT = STORY + "thumbnails/"

def mark(im, cx, cy, size):
    m = impossible_mark(size)
    sh = Image.new("L", im.size, 0); w, h = m.width * 1.25, m.height * 2.4
    ImageDraw.Draw(sh).ellipse((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=230)
    dark = Image.new("RGBA", im.size, NAVY_D + (0,)); dark.putalpha(sh.filter(ImageFilter.GaussianBlur(size * 0.5))); im.alpha_composite(dark)
    im.alpha_composite(m, (int(cx - m.width / 2), int(cy - m.height / 2)))

def classic(photo, l1, l2, out, focus=(0.5, 0.5), zoom=1.1, mk=(960, 110, 96)):
    im = grade(cover(photo, (TW, TH), focus, zoom)).convert("RGBA")
    g = Image.new("RGBA", (TW, TH)); d = ImageDraw.Draw(g)
    for y in range(TH): d.line((0, y, TW, y), fill=NAVY_D + (int(225 * max(0, (y - TH * 0.42) / (TH * 0.58))),))
    im.alpha_composite(g)
    big(im, (56, 470), l1, pf(120, 900), CREAM); big(im, (56, 590), l2, pf(120, 900), GOLD)
    mark(im, *mk); im.convert("RGB").save(out, quality=92); print(out)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    classic(STORY + "media/mike/brawn_melbourne_2009.jpg", "Bought for £1.", "World champions.",
            OUT + "IMPOSSIBLE 01 - thumbnail A car.jpg", focus=(0.55, 0.45), zoom=1.15)
    classic(STORY + "media/ai/ai_empty_factory.png", "Bought for £1.", "World champions.",
            OUT + "IMPOSSIBLE 01 - thumbnail B factory.jpg", focus=(0.4, 0.55), zoom=1.15)
