"""F1 Explained: Superclipping thumbnails for YouTube's Test & Compare: A = flat out in Bahrain, B = the Haas closing at Suzuka,
C = the crash aftermath. Classic layout (photo full-bleed, two-line hook bottom-left) with the Omnira F1 gold mark top right.
    ~/.venvs/poststudio/bin/python thumbnails.py
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "studio"))
from PIL import Image, ImageDraw, ImageFilter
from thumbs import cover, grade, big, TW, TH
from storykit import pf, NAVY_D, GOLD, CREAM
import episode as E
E.SERIES = "f1"

STORY = "/Volumes/PostDrive/Omnira F1/Videos/Superclipping/"
AI, OUT = STORY + "media/ai/", STORY + "thumbnails/"

def mark(im, cx, cy, h):
    m = E.gof_mark(h)
    sh = Image.new("L", im.size, 0); w, hh = m.width * 1.3, m.height * 1.5
    ImageDraw.Draw(sh).ellipse((cx - w / 2, cy - hh / 2, cx + w / 2, cy + hh / 2), fill=210)
    dark = Image.new("RGBA", im.size, NAVY_D + (0,)); dark.putalpha(sh.filter(ImageFilter.GaussianBlur(h * 0.4))); im.alpha_composite(dark)
    im.alpha_composite(m, (int(cx - m.width / 2), int(cy - m.height / 2)))

def classic(photo, l1, l2, out, focus=(0.5, 0.5), zoom=1.1, mk=(1110, 95, 120)):
    im = grade(cover(photo, (TW, TH), focus, zoom)).convert("RGBA")
    g = Image.new("RGBA", (TW, TH)); d = ImageDraw.Draw(g)
    for y in range(TH): d.line((0, y, TW, y), fill=NAVY_D + (int(225 * max(0, (y - TH * 0.42) / (TH * 0.58))),))
    im.alpha_composite(g)
    big(im, (56, 470), l1, pf(120, 900), CREAM); big(im, (56, 590), l2, pf(120, 900), GOLD)
    mark(im, *mk); im.convert("RGB").save(out, quality=92); print(out)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    classic(AI + "ai_bahrain_turn12.png", "Flat out.", "And slowing down.", OUT + "Superclipping - thumbnail A flat out.jpg", focus=(0.5, 0.55), zoom=1.15)
    classic(AI + "ai_suzuka_closing.png", "50 km/h faster.", "Nowhere to go.", OUT + "Superclipping - thumbnail B Suzuka.jpg", focus=(0.5, 0.5), zoom=1.1)
    classic(AI + "ai_suzuka_aftermath.png", "The rule F1", "had to fix.", OUT + "Superclipping - thumbnail C crash.jpg", focus=(0.55, 0.45), zoom=1.05)
