"""Gentlemen of Fuel: Chrysler Turbine Car thumbnails for YouTube's Test & Compare.
A = the real car from behind (the jet-exhaust rear lights), B = the row of cars before the crusher, C = the crowd at the pump.
The classic layout (photo full-bleed, two-line hook bottom-left) with the gold GoF mark top-right.
    ~/.venvs/poststudio/bin/python thumbnails.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
from PIL import Image, ImageDraw, ImageFilter
from thumbs import cover, grade, big, TW, TH
from storykit import pf, NAVY_D, GOLD, CREAM
import episode as E

STORY = "/Volumes/PostDrive/Stories/Gentlemen of Fuel/01 Chrysler Turbine/"
OUT = STORY + "thumbnails/"

def mark(im, cx, cy, h):
    m = E.gof_mark(h)
    sh = Image.new("L", im.size, 0); w, hh = m.width * 1.3, m.height * 1.5
    ImageDraw.Draw(sh).ellipse((cx - w / 2, cy - hh / 2, cx + w / 2, cy + hh / 2), fill=200)
    dark = Image.new("RGBA", im.size, NAVY_D + (0,)); dark.putalpha(sh.filter(ImageFilter.GaussianBlur(h * 0.35))); im.alpha_composite(dark)
    im.alpha_composite(m, (int(cx - m.width / 2), int(cy - m.height / 2)))

def classic(photo, l1, l2, out, focus=(0.5, 0.5), zoom=1.1, mk=(1080, 105, 150)):
    im = grade(cover(photo, (TW, TH), focus, zoom)).convert("RGBA")
    g = Image.new("RGBA", (TW, TH)); d = ImageDraw.Draw(g)
    for y in range(TH): d.line((0, y, TW, y), fill=NAVY_D + (int(225 * max(0, (y - TH * 0.42) / (TH * 0.58))),))
    im.alpha_composite(g)
    big(im, (56, 470), l1, pf(120, 900), CREAM); big(im, (56, 590), l2, pf(120, 900), GOLD)
    mark(im, *mk); im.convert("RGB").save(out, quality=92); print(out)

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    classic(STORY + "media/mike/chrysler-turbine-car", "A jet-engined car.", "Then destroyed.",
            OUT + "GoF - Turbine - thumbnail A rear.jpg", focus=(0.5, 0.4), zoom=1.25)
    classic(STORY + "media/ai/ai_turbine_row.png", "Chrysler built 55.", "Then crushed 46.",
            OUT + "GoF - Turbine - thumbnail B row.jpg", focus=(0.35, 0.45), zoom=1.1)
    classic(STORY + "media/ai/ai_turbine_gas_station.png", "A jet engine", "in a family car.",
            OUT + "GoF - Turbine - thumbnail C pump.jpg", focus=(0.5, 0.45), zoom=1.1)
