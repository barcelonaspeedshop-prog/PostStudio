"""factcard: a person (or thing) with a few short facts that land one by one while the narration runs.

Mike 10-16: framed photos "look just pasted onto the screen"; there must always be something happening on screen,
and viewers who know the story should still learn something ("DID YOU KNOW?").

    FactCard(start, path, "Paolo Maldini", "MILAN CAPTAIN", facts=[(0.8, "36 years old in Istanbul"),
             (3.0, "His father captained Milan to the 1963 European Cup", True)])     # True = a DID YOU KNOW fact

The photo sits on its own blurred, darkened copy (never a stock background), tilted a little with a shadow, and keeps
moving inside its frame (sub-pixel push-in). Facts slide in on the right, at most three, kept short enough to read.
Fact times are local seconds, or callables (sc) -> seconds so builds can anchor them to sentences.
"""
import math
from PIL import Image, ImageDraw, ImageFilter
from storykit import Scene, W, H, NAVY_D, GOLD, CREAM, RED, load, ramp, ease, rgba, tracked, cond, text_top, pf, wrap

_cache = {}

def _bg(path):
    k = ("bg", path)
    if k not in _cache:
        im = load(path); s = max(W / im.width, H / im.height) * 1.08
        im = im.resize((int(im.width * s) + 2, int(im.height * s) + 2), Image.BILINEAR)
        im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
        im = im.filter(ImageFilter.GaussianBlur(28))
        _cache[k] = Image.blend(im, Image.new("RGB", (W, H), NAVY_D), 0.62)
    return _cache[k]

def _shadow(w, h, r=36):
    k = ("sh", w, h)
    if k not in _cache:
        m = Image.new("L", (w + 4 * r, h + 4 * r), 0); ImageDraw.Draw(m).rectangle((2 * r, 2 * r, 2 * r + w, 2 * r + h), fill=200)
        _cache[k] = m.filter(ImageFilter.GaussianBlur(r))
    return _cache[k]

class FactCard(Scene):
    def __init__(self, start, path, name, role, facts=(), crop=None, focus=(0.5, 0.4), tilt=-2.0, **kw):
        super().__init__(start, **kw)
        self.path, self.name, self.role, self.facts, self.crop, self.focus, self.tilt = path, name, role, list(facts), crop, focus, tilt

    def _t(self, v): return v(self) if callable(v) else v

    def base(self, t):
        im = _bg(self.path).copy()
        # slow drift of the blurred background so the frame is never still
        dx = 18 * math.sin(t * 0.35); im = im.transform((W, H), Image.AFFINE, (1, 0, -dx, 0, 1, 0), Image.BILINEAR)
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
        src = load(self.path)
        if self.crop:
            x0, y0, x1, y1 = self.crop; src = src.crop((int(x0 * src.width), int(y0 * src.height), int(x1 * src.width), int(y1 * src.height)))
        # photo frame: about 52% of the width, never blown up much past the source size
        fw = min(880, int(src.width * 1.25)); fh = int(fw * 1.15) if src.height > src.width else int(fw * 0.72)
        fh = min(fh, 820); fw = min(fw, int(fh / 1.15) if src.height > src.width else fw)
        enter = ease(min(1.0, t / 0.6))
        portrait = src.height > src.width
        cx = (640 if portrait else 540) - 120 * (1 - enter); cy = H / 2 + 10
        # inside the frame: a slow sub-pixel push-in towards the focus point
        z = 1.0 + 0.06 * min(1.0, max(0.0, t) / max(self.dur or 6.0, 1.0))
        sw, sh = src.width, src.height; ar = fw / fh
        vw = min(sw, sh * ar) / z; vh = vw / ar
        fx, fy = self.focus; x0 = min(max(fx * sw - vw / 2, 0), sw - vw); y0 = min(max(fy * sh - vh / 2, 0), sh - vh)
        ph = src.transform((fw, fh), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC).convert("RGBA")
        frame = Image.new("RGBA", (fw + 24, fh + 24), rgba(CREAM, 1)); frame.alpha_composite(ph, (12, 12))
        frame = frame.rotate(self.tilt * enter, resample=Image.BICUBIC, expand=True)
        sh_ = _shadow(frame.width, frame.height); shadow = Image.new("RGBA", sh_.size, (0, 0, 0, 0)); shadow.putalpha(sh_.point(lambda v: int(v * 0.8 * enter)))
        L.alpha_composite(shadow, (int(cx - shadow.width / 2 + 14), int(cy - shadow.height / 2 + 22)))
        if enter < 1: frame.putalpha(frame.getchannel("A").point(lambda v: int(v * enter)))
        L.alpha_composite(frame, (int(cx - frame.width / 2), int(cy - frame.height / 2)))
        # name and role
        x = int((640 if portrait else 540) + fw / 2 + 110); b = ramp(t, 0.25, 0.7)              # text sits right next to the photo
        text_top(d, (x + 30 * (1 - b), 200), self.name, pf(76 if len(self.name) < 18 else 62, 900), rgba(CREAM, b), "left")
        tracked(d, (x + 4, 312), self.role, cond(32, 8), rgba(GOLD, b), 6)
        d.line((x + 4, 362, x + 4 + 560 * ease(ramp(t, 0.5, 1.2)), 362), fill=rgba(GOLD, 0.8 * b), width=3)
        # facts, one by one
        y = 400
        for f in self.facts:
            at, txt = self._t(f[0]), f[1]; dyk = len(f) > 2 and f[2]
            a = ramp(t, at, at + 0.4)
            if a <= 0: continue
            off = 60 * (1 - ease(a))
            if dyk:
                d.rounded_rectangle((x - 18 + off, y - 6, x + 18 + cond(30, 8).getlength("DID YOU KNOW?") + 6 * 13 + off, y + 38), 8, fill=rgba(RED, a))
                tracked(d, (x + off, y), "DID YOU KNOW?", cond(30, 8), rgba(CREAM, a), 6); y += 50
            lines = wrap(txt, pf(44, 700), min(760, W - 100 - x))
            d.rounded_rectangle((x - 18 + off, y - 10, min(W - 60, x + 790) + off, y + 58 * len(lines) + 8), 10, fill=rgba(NAVY_D, 0.72 * a))
            d.rectangle((x - 18 + off, y - 10, x - 12 + off, y + 58 * len(lines) + 8), fill=rgba(RED if dyk else GOLD, a))
            for ln in lines:
                text_top(d, (x + off, y), ln, pf(44, 700), rgba(CREAM, a), "left"); y += 58
            y += 34
        im = im.convert("RGBA"); im.alpha_composite(L); return im.convert("RGB")
