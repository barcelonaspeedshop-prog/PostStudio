"""Thumbnail for BANNED ep.1 (Mike chose the fan close-up, 2026-10-08) -> PostDrive/Stories/BANNED series/01 Fan Car/thumbnails/"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
from storykit import pf, cond, tracked, text_top, place_stamp, NAVY, NAVY_D, RED, GOLD, CREAM
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
S = "/Volumes/PostDrive/Stories/BANNED series/01 Fan Car/"; O = S + "thumbnails/"; TW, TH = 1280, 720

def cover(path, focus=(0.5, 0.5), zoom=1.0):
    im = Image.open(path).convert("RGB"); s = max(TW / im.width, TH / im.height) * zoom
    im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
    x = int((im.width - TW) * focus[0]); y = int((im.height - TH) * focus[1]); return im.crop((x, y, x + TW, y + TH))

def stamp(base, text, cx, cy, size=130, rot=-10):
    """The series mark: the inked BANNED rubber stamp from storykit, on a soft shadow so it reads on busy photos."""
    sh = Image.new("L", base.size, 0); w, h = size * 3.6, size * 1.9
    ImageDraw.Draw(sh).ellipse((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=235)
    sh = sh.filter(ImageFilter.GaussianBlur(size * 0.32)); dark = Image.new("RGBA", base.size, NAVY_D + (0,)); dark.putalpha(sh)
    base.alpha_composite(dark); place_stamp(base, cx, cy, text=text, size=size, rot=rot)

def grade(im, dark=0.0):
    im = ImageEnhance.Contrast(im).enhance(1.12); im = ImageEnhance.Color(im).enhance(1.1)
    return Image.blend(im, Image.new("RGB", im.size, NAVY_D), dark) if dark else im

def bottom_fade(im, start=0.45, strength=220):
    g = Image.new("RGBA", (TW, TH)); d = ImageDraw.Draw(g)
    for y in range(TH): d.line((0, y, TW, y), fill=NAVY_D + (int(strength * max(0, (y - TH * start) / (TH * (1 - start)))),))
    im.alpha_composite(g)

def big(base, xy, text, font, fill):
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0)); text_top(ImageDraw.Draw(sh), (xy[0] + 4, xy[1] + 5), text, font, (0, 0, 0, 210))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6))); text_top(ImageDraw.Draw(base), xy, text, font, fill)

# the fan, huge
im = grade(cover(S + "media/mike/02_fan_rear_closeup.webp", (0.5, 0.4), 1.15)).convert("RGBA"); bottom_fade(im)
big(im, (56, 470), "Too good", pf(120, 900), CREAM); big(im, (56, 590), "to race.", pf(120, 900), GOLD)
stamp(im, "BANNED", 915, 320, 140, -12); im.convert("RGB").save(O + "BANNED 01 - The Fan Car - thumbnail.jpg", quality=92)

print("saved to", O)
