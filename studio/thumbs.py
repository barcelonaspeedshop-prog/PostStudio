"""thumbs: BANNED thumbnail styles (1280x720).

classic(...)   photo full-bleed, two-line hook bottom-left, the stamp on a soft shadow (eps 1-2 look)
casefile(...)  a manila case file on a dark desk: the photo clipped inside, the stamp across it, hook on the left
"""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from storykit import pf, cond, tracked, text_top, place_stamp, NAVY_D, GOLD, CREAM, STAMP_RED
TW, TH = 1280, 720

def cover(path, size, focus=(0.5, 0.5), zoom=1.0):
    w, h = size; im = Image.open(path).convert("RGB"); s = max(w / im.width, h / im.height) * zoom
    im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
    x = int((im.width - w) * focus[0]); y = int((im.height - h) * focus[1]); return im.crop((x, y, x + w, y + h))

def grade(im): return ImageEnhance.Color(ImageEnhance.Contrast(im).enhance(1.12)).enhance(1.1)

def big(base, xy, text, font, fill, align="left"):
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0)); text_top(ImageDraw.Draw(sh), (xy[0] + 4, xy[1] + 5), text, font, (0, 0, 0, 210), align)
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6))); text_top(ImageDraw.Draw(base), xy, text, font, fill, align)

def stamp(base, cx, cy, size=130, rot=-10, text="BANNED", shadow=True):
    if shadow:
        sh = Image.new("L", base.size, 0); w, h = size * 3.6, size * 1.9
        ImageDraw.Draw(sh).ellipse((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=235)
        dark = Image.new("RGBA", base.size, NAVY_D + (0,)); dark.putalpha(sh.filter(ImageFilter.GaussianBlur(size * 0.32))); base.alpha_composite(dark)
    place_stamp(base, cx, cy, text=text, size=size, rot=rot)

def classic(photo, l1, l2, out, focus=(0.5, 0.5), zoom=1.1, st=(930, 210, 130, -12)):
    im = grade(cover(photo, (TW, TH), focus, zoom)).convert("RGBA")
    g = Image.new("RGBA", (TW, TH)); d = ImageDraw.Draw(g)
    for y in range(TH): d.line((0, y, TW, y), fill=NAVY_D + (int(220 * max(0, (y - TH * 0.45) / (TH * 0.55))),))
    im.alpha_composite(g)
    big(im, (56, 470), l1, pf(120, 900), CREAM); big(im, (56, 590), l2, pf(120, 900), GOLD)
    stamp(im, *st); im.convert("RGB").save(out, quality=92)

def casefile(photo, l1, l2, label, out, focus=(0.5, 0.5), zoom=1.0):
    im = Image.new("RGBA", (TW, TH), (14, 16, 22, 255))
    v = Image.new("L", (TW, TH), 0); ImageDraw.Draw(v).ellipse((-200, -260, TW + 200, TH + 260), fill=255)
    lit = Image.new("RGBA", (TW, TH), (40, 44, 54, 255)); lit.putalpha(v.filter(ImageFilter.GaussianBlur(160))); im.alpha_composite(lit)
    # the folder, tilted, on the right
    F = Image.new("RGBA", (760, 600), (0, 0, 0, 0)); d = ImageDraw.Draw(F)
    d.rounded_rectangle((0, 40, 760, 600), 18, fill=(196, 160, 104, 255)); d.rounded_rectangle((40, 0, 440, 70), 14, fill=(196, 160, 104, 255))
    tracked(d, (62, 16), label, cond(30, 8), (70, 48, 24, 255), 4)
    d.rectangle((0, 78, 760, 82), fill=(170, 136, 86, 255))
    ph = grade(cover(photo, (640, 420), focus, zoom)).convert("RGBA")
    P = Image.new("RGBA", (664, 444), (245, 242, 232, 255)); P.paste(ph, (12, 12))
    F.alpha_composite(P.rotate(2.0, expand=True, resample=Image.BICUBIC), (40, 112))
    d = ImageDraw.Draw(F)                                                       # paper clip
    d.rounded_rectangle((520, 92, 560, 190), 18, outline=(190, 194, 200, 255), width=6); d.rounded_rectangle((530, 104, 552, 170), 10, outline=(190, 194, 200, 255), width=5)
    F = F.resize((620, 490), Image.LANCZOS)
    Fs = F.rotate(-4, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", (TW, TH), (0, 0, 0, 0)); m = Fs.getchannel("A").point(lambda a: int(a * 0.7))
    blk = Image.new("RGBA", Fs.size, (0, 0, 0, 255)); blk.putalpha(m); sh.alpha_composite(blk, (610, 140)); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    im.alpha_composite(Fs, (590, 110))
    stamp(im, 930, 520, 105, -12, shadow=False)
    big(im, (44, 260), l1, pf(74, 900), CREAM); big(im, (44, 350), l2, pf(74, 900), GOLD)
    im.convert("RGB").save(out, quality=92)
