"""episode: the shared parts of a BANNED or IMPOSSIBLE episode build (BANNED ep 3 onwards; ep 1-2 keep their own copies).

    IMPOSSIBLE: E.init(".../IMPOSSIBLE series/01 Brawn GP/", series="impossible") — opening() then strikes out "IM"
    instead of stamping, main() mixes the marker sound, and the end card is impossible_end(this).

    import episode as E; E.init("/Volumes/PostDrive/Gentlemen of Fuel/Videos/Group B (BANNED)/")
    from episode import *          # after init: S, at, PS, AS, OPT, CaS, CuS, CH, ...
    scenes = [opening(...), ..., CuS("So here's the question", what_if(...)), CuS("This was Banned", banned_end)]
    if __name__ == "__main__": main(scenes, FINAL)

Every scene is anchored to a sentence of the edited narration with S("words from the sentence").
Layout: STORY/media/{commons,mike,ai}, STORY/audio/{narration.wav, sentences.json, *.mp3 music}, STORY/video/.
"""
import glob, json, math, os, subprocess, sys
from storykit import *

INTRO = 5.0                                   # wordless open: stamp + title over footage, music from frame 0
STORY = C = M = A = NA = AI = OUT = None; SENTS = []; _cr = {}; SERIES = "banned"

def init(story, series="banned", narration="audio/"):
    """narration = the folder (inside the story) holding this cut's narration.wav + sentences.json; music stays in audio/."""
    global STORY, C, M, A, NA, AI, OUT, SENTS, _cr, SERIES
    STORY = story; SERIES = series; C, M, A, AI = (story + p for p in ("media/commons/", "media/mike/", "audio/", "media/ai/")); OUT = story + "video/"
    NA = story + narration
    SENTS = json.load(open(NA + "sentences.json"))
    _cr = {c["file"]: c for c in json.load(open(C + "credits.json"))} if os.path.exists(C + "credits.json") else {}

def sent(snip):
    for e in SENTS:                                                           # an exact line wins ("Banned.")
        if snip.lower() == e["text"].lower(): return e
    for e in SENTS:
        if snip.lower() in e["text"].lower(): return e
    raise KeyError(snip)
def vt(t): return t + INTRO                                                   # narration time -> video time
def S(snip, off=0.0): return vt(sent(snip)["out_start"] + off)
def SF(snip, f): e = sent(snip); return vt(e["out_start"] + f * (e["out_end"] - e["out_start"]))   # part-way through a sentence
def at(snip, sc): return S(snip) - sc.start                                   # a sentence's time inside a scene
def atf(snip, f, sc): return SF(snip, f) - sc.start

def cc(f):
    c = _cr[f]; a = c["author"].split(" / ")[0].split("(")[0].strip() or "Unknown"
    return f"Photo: {a[:40]} · {c['licence']}"
def PS(snip, f, off=-0.15, **kw):
    """A photo: Wikimedia (credited) if it's in commons/, otherwise one of Mike's finds."""
    if os.path.exists(C + f): return Photo(S(snip, off), C + f, credit=cc(f), **kw)
    return Photo(S(snip, off), M + f, **kw)
def PF(snip, frac, f, **kw):                                                  # a photo that starts part-way through a sentence
    p = PS(snip, f, **kw); p.start = SF(snip, frac); return p
def has(ai): return os.path.exists(AI + ai)
def AS(snip, ai, fallback=None, off=-0.15, **kw):
    if has(ai): return Photo(S(snip, off), AI + ai, credit="AI illustration", **kw)
    return fallback
OPT = AS
AI_RATE = 1.0                                                                 # a build sets 0.6 for calm AI clips (PLAYBOOK)
def VS(snip, clip, fallback=None, off=-0.15, **kw):                          # an AI video clip (media/ai/*.mp4)
    if has(clip): return Clip(S(snip, off), AI + clip, credit="AI illustration", **({"max_rate": AI_RATE} | kw))
    return fallback
def CaS(snip, items, off=-0.15, **kw):
    t0 = S(snip, off)
    for it in items:
        if isinstance(it.get("at"), str): it["at"] = S(it["at"]) - t0
    return Card(t0, items, **kw)
def CuS(snip, fn, off=-0.15, **kw): return Custom(S(snip, off), fn, **kw)
CH = lambda n, s: f"{n}  ·  {s}"

_bgs = {}
def dim_bg(path, amount):
    key = (path, amount)
    if key not in _bgs:
        im = load(path); s_ = max(W / im.width, H / im.height); im = im.resize((int(im.width * s_) + 1, int(im.height * s_) + 1), Image.BICUBIC)
        im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
        _bgs[key] = Image.blend(im, Image.new("RGB", (W, H), NAVY_D), amount)
    return _bgs[key]
def bg_of(path, amount=0.8): return lambda t: dim_bg(path, amount)

# ---------------------------------------------------------------- shared graphics
def opening(bg_path, title, kicker, credit=None, **photo):
    """The series open: the stamp slams down (BANNED) or "IM" is struck out (IMPOSSIBLE) over moving footage,
    then the episode title fades in under it. series="gof": the Gentlemen of Fuel mark glows in instead (GofSting)."""
    if SERIES in ("gof", "f1"):                                           # Omnira F1 wears the same gold badge style
        return GofSting(0.0, bg=Photo(0, bg_path, credit=credit, **({"zoom": (1.0, 1.18)} | photo)), length=INTRO,
                        items=[{"k": "title", "text": title, "y": 655, "size": 100, "at": 2.2},
                               {"k": "rule", "y": 830, "w": 560, "at": 2.6},
                               {"k": "kicker", "text": kicker, "y": 868, "at": 2.8}])
    if SERIES == "impossible":
        return ImpossibleSting(0.0, bg=Photo(0, bg_path, credit=credit, **({"zoom": (1.0, 1.18)} | photo)), cy=380, length=INTRO,
                               items=[{"k": "title", "text": title, "y": 655, "size": 130, "at": 2.5},
                                      {"k": "rule", "y": 830, "w": 560, "at": 2.9},
                                      {"k": "kicker", "text": kicker, "y": 868, "at": 3.1}])
    return Sting(0.0, bg=Photo(0, bg_path, credit=credit, **({"zoom": (1.0, 1.18)} | photo)), cy=395, size=290, length=INTRO,
                 items=[{"k": "title", "text": title, "y": 655, "size": 130, "at": 1.0},
                        {"k": "rule", "y": 830, "w": 560, "at": 1.4},
                        {"k": "kicker", "text": kicker, "y": 868, "at": 1.6}])

def score_card(kicker, left, sl, sr, right, sub=None, sub_at=None):
    def draw(d, L, t, sc):
        tracked(d, (W / 2, 250), kicker, cond(34, 2), rgba(GOLD, ramp(t, 0, 0.4)), 8, "center")
        a = ramp(t, 0.2, 0.7)
        text_top(d, (W / 2 - 200, 400), left, pf(84, 800), rgba(CREAM, a), "right")
        text_top(d, (W / 2, 370), f"{sl}–{sr}", pf(150, 900), rgba(GOLD, a), "center")
        text_top(d, (W / 2 + 200, 400), right, pf(84, 800), rgba(CREAM, a), "left")
        if sub:
            b0 = at(sub_at, sc) if sub_at else 1.0
            tracked(d, (W / 2, 640), sub, cond(40, 8), rgba(CREAM, ramp(t, b0, b0 + 0.4)), 7, "center")
    return draw

def memorial(lines, kicker=None):
    """Plain, quiet card for the people who died: no stamps, no movement."""
    def draw(d, L, t, sc):
        a = ramp(t, 0.2, 1.0)
        if kicker: tracked(d, (W / 2, 330), kicker, cond(32, 2), rgba(GOLD, a * 0.8), 8, "center")
        for i, ln in enumerate(lines):
            text_top(d, (W / 2, 420 + i * 120), ln, pf(84 if i == 0 else 56, 700 if i == 0 else 500), rgba(CREAM, a * (1 if i == 0 else 0.8)), "center")
    return draw

def what_if(fact, fact_at, question, question_at, tell_at="Tell me what you think"):
    def draw(d, L, t, sc):
        tracked(d, (W / 2, 220), "WHAT DO YOU THINK?", cond(40, 8), rgba(GOLD, ramp(t, 0, 0.5)), 8, "center")
        text_top(d, (W / 2, 330), fact, pf(80, 700), rgba(CREAM, ramp(t, at(fact_at, sc), at(fact_at, sc) + 0.5)), "center")
        text_top(d, (W / 2, 470), question, pf(110, 900), rgba(GOLD, ramp(t, at(question_at, sc), at(question_at, sc) + 0.5)), "center")
        place_stamp(L, W / 2, 760, ramp(t, at(tell_at, sc), at(tell_at, sc) + 0.25), text="YOU DECIDE", size=110, color=GOLD, rot=-5)
    return draw

EPISODES = [("The Fan Car.", "TOO GOOD TO RACE"), ("The Disgrace of Gijón.", "THE MATCH NOBODY TRIED TO WIN"),
            ("Group B.", "TOO FAST TO SURVIVE"), ("The Back-Pass.", "THE RULE THAT SAVED FOOTBALL")]
def banned_end(this):
    """Series end card: stamp, tagline, three other episodes, then the subscribe button on 'Make sure you're here'."""
    others = [e for e in EPISODES if e[0] != this][:3]
    def draw(d, L, t, sc):
        place_stamp(L, W / 2, 200, ramp(t, 0.1, 0.35), size=140, rot=-6)
        tracked(d, (W / 2, 350), "THE IDEAS THAT WENT TOO FAR  ·  AND THE RULES WRITTEN TO STOP THEM", cond(30), rgba(GOLD, ramp(t, 1.0, 1.5)), 6, "center")
        tracked(d, (W / 2, 470), "MORE ON BANNED", cond(30), rgba(CREAM, ramp(t, 2.0, 2.5)), 8, "center")
        for i, (a_, b_) in enumerate(others):
            al = ramp(t, 2.4 + 0.4 * i, 2.9 + 0.4 * i); x = 360 + i * 600; y = 540
            if al <= 0: continue
            d.rectangle((x - 270, y, x + 270, y + 190), fill=rgba(NAVY_D, 0.9 * al), outline=rgba(GOLD, al), width=3)
            d.rectangle((x - 270, y, x + 270, y + 8), fill=rgba(RED, al))
            text_top(d, (x, y + 52), a_, pf(54 if len(a_) < 16 else 42, 700), rgba(CREAM, al), "center")
            tracked(d, (x, y + 132), b_, cond(24), rgba(GOLD, al), 4, "center")
        s_ = ramp(t, at("Make sure you're here", sc), at("Make sure you're here", sc) + 0.4)
        if s_ > 0:
            d.rounded_rectangle((W / 2 - 220, 830, W / 2 + 220, 920), 14, fill=rgba(RED, s_))
            tracked(d, (W / 2, 858), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")
    return draw

IMP_EPISODES = [("Brawn GP.", "THE TEAM BOUGHT FOR £1"), ("Istanbul.", "3–0 DOWN AT HALF-TIME"), ("McLaren F1.", "THE ROAD CAR THAT WON LE MANS"), ("Leicester.", "5000–1")]
def impossible_end(this):
    """IMPOSSIBLE end card: the mark, the tagline, the other episodes, then the subscribe button."""
    others = [e for e in IMP_EPISODES if e[0] != this][:3]
    def draw(d, L, t, sc):
        a, b = ramp(t, 0.1, 0.5), ramp(t, 0.6, 1.0)
        if a > 0:
            mk = impossible_mark(130, strike=b, dim=ramp(t, 1.0, 1.4))
            mk = Image.fromarray((np.asarray(mk) * np.array([1, 1, 1, a])).astype(np.uint8))
            L.alpha_composite(mk, (int(W / 2 - mk.width / 2), int(200 - mk.height / 2)))
        tracked(d, (W / 2, 350), "THE DAYS THE ODDS GOT IT WRONG", cond(30), rgba(GOLD, ramp(t, 1.2, 1.7)), 6, "center")
        if others:
            tracked(d, (W / 2, 470), "MORE ON IMPOSSIBLE", cond(30), rgba(CREAM, ramp(t, 2.0, 2.5)), 8, "center")
            x0 = W / 2 - (len(others) - 1) * 300
            for i, (a_, b_) in enumerate(others):
                al = ramp(t, 2.4 + 0.4 * i, 2.9 + 0.4 * i); x = x0 + i * 600; y = 540
                if al <= 0: continue
                d.rectangle((x - 270, y, x + 270, y + 190), fill=rgba(NAVY_D, 0.9 * al), outline=rgba(GOLD, al), width=3)
                d.rectangle((x - 270, y, x + 270, y + 8), fill=rgba(RED, al))
                text_top(d, (x, y + 52), a_, pf(54 if len(a_) < 16 else 42, 700), rgba(CREAM, al), "center")
                tracked(d, (x, y + 132), b_, cond(24), rgba(GOLD, al), 4, "center")
        s_ = ramp(t, at("Make sure you're here", sc), at("Make sure you're here", sc) + 0.4)
        if s_ > 0:
            d.rounded_rectangle((W / 2 - 220, 830, W / 2 + 220, 920), 14, fill=rgba(RED, s_))
            tracked(d, (W / 2, 858), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")
    return draw

# ---------------------------------------------------------------- Gentlemen of Fuel (one-off stories, no series)
GOF_LOGO = "/Volumes/PostDrive/Gentlemen of Fuel/Brand and media/Logos/GOF Profile.png"
LOGOS = {"gof": (GOF_LOGO, 0.425), "f1": ("/Volumes/PostDrive/Omnira F1/Brand and media/Logos/F1 Profile.png", 0.365)}   # badge, mask radius (inside its ring)
_gof = {}
def gof_mark(h):
    """The Omnira / Gentlemen of Fuel mark (emblem, wordmark, tagline) lifted off its black badge, h pixels high.
    series="f1" uses the Omnira F1 badge (same layout, a tighter ring)."""
    logo, rr = LOGOS.get(SERIES, LOGOS["gof"])
    if (logo, h) not in _gof:
        im = Image.open(logo).convert("RGB"); cx = cy = im.width / 2; R = im.width * rr   # inside the outer ring
        box = (120, 270, 1134, 830); c = im.crop(box)
        a = np.asarray(c, np.float32).max(axis=2)
        a = np.clip((a - 70) * 2.4, 0, 255)                                   # gold stays, the dark marble goes
        yy, xx = np.mgrid[box[1]:box[3], box[0]:box[2]]
        a[(xx - cx) ** 2 + (yy - cy) ** 2 > R * R] = 0
        m = Image.fromarray(np.dstack([np.asarray(c), a.astype(np.uint8)]), "RGBA")
        _gof[(logo, h)] = m.resize((int(m.width * h / m.height), h), Image.LANCZOS)
    return _gof[(logo, h)]

def _sweep(mark, s):
    """A soft band of light across the gold, s = 0..1."""
    if not 0 < s < 1: return mark
    band = Image.new("L", mark.size, 0); bx = -200 + (mark.width + 400) * s
    ImageDraw.Draw(band).polygon([(bx, 0), (bx + 110, 0), (bx + 40, mark.height), (bx - 70, mark.height)], fill=170)
    band = Image.fromarray((np.asarray(band.filter(ImageFilter.GaussianBlur(18)), np.float32) * np.asarray(mark)[..., 3] / 255).astype(np.uint8))
    lit = Image.new("RGBA", mark.size, (255, 246, 220, 0)); lit.putalpha(band); out = mark.copy(); out.alpha_composite(lit); return out

class GofSting(Scene):
    """The GoF open: over moving footage the gold mark settles in (slight scale, soft glow), a light sweeps across it,
    then the episode title fades in below. Quiet and classy: no stamps."""
    def __init__(self, start=0.0, bg=None, items=None, length=5.0, cy=330, h=360, **kw):
        super().__init__(start, **kw); self.bgsc, self.length, self.cy, self.h = bg, length, cy, h
        self.card = Card(0, items, align="center") if items else None
        if bg: bg.dur = length + XFADE
        if self.card: self.card.dur = length
    def base(self, t):
        bg = self.bgsc.frame(t) if self.bgsc else navy_bg()
        im = Image.blend(bg, Image.new("RGB", (W, H), (6, 6, 8)), 0.5 + 0.2 * ramp(t, 0.2, 1.4)).convert("RGBA")
        a = ramp(t, 0.25, 1.3)
        if a > 0:
            mk = _sweep(gof_mark(self.h), ramp(t, 1.2, 2.2))
            z = 1.06 - 0.06 * ease(min(1, t / 2.0))                          # settles in, sub-pixel
            w_, h_ = mk.width * z, mk.height * z
            glow = mk.filter(ImageFilter.GaussianBlur(22))
            for layer_, k in ((glow, 0.55 * a), (mk, a)):
                big = Image.new("RGBA", (W, H), (0, 0, 0, 0)); big.alpha_composite(layer_, (0, 0))
                big = big.transform((W, H), Image.AFFINE, (1 / z, 0, -(W / 2 - w_ / 2) / z, 0, 1 / z, -(self.cy - h_ / 2) / z), Image.BICUBIC)
                if k < 1: big = Image.fromarray((np.asarray(big) * np.array([1, 1, 1, k])).astype(np.uint8))
                im.alpha_composite(big)
        if self.card: im = self.card.draw_items(im, t)
        return im

def gof_end(cue="If you liked this one"):
    """GoF end card: the mark, what the channel is, then the subscribe button on the cue line."""
    def draw(d, L, t, sc):
        a = ramp(t, 0.1, 0.9)
        if a > 0:
            mk = _sweep(gof_mark(300), ramp(t, 0.9, 1.9))
            if a < 1: mk = Image.fromarray((np.asarray(mk) * np.array([1, 1, 1, a])).astype(np.uint8))
            L.alpha_composite(mk, (int(W / 2 - mk.width / 2), 120))
        tracked(d, (W / 2, 520), "UNUSUAL CARS  ·  PEOPLE  ·  IDEAS  ·  AND THE STORIES BEHIND THEM", cond(32), rgba(CREAM, ramp(t, 1.4, 1.9)), 6, "center")
        tracked(d, (W / 2, 600), "A NEW STORY EVERY WEEK", cond(36), rgba(GOLD, ramp(t, 2.2, 2.7)), 8, "center")
        s_ = ramp(t, at(cue, sc), at(cue, sc) + 0.4)
        if s_ > 0:
            d.rounded_rectangle((W / 2 - 220, 760, W / 2 + 220, 850), 14, fill=rgba(RED, s_))
            tracked(d, (W / 2, 788), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")
    return draw

def f1_end(cue="If you want to know how something"):
    """Omnira F1 end card (F1 Explained): the gold mark, the series line, then the subscribe button on the cue line."""
    def draw(d, L, t, sc):
        a = ramp(t, 0.1, 0.9)
        if a > 0:
            mk = _sweep(gof_mark(300), ramp(t, 0.9, 1.9))
            if a < 1: mk = Image.fromarray((np.asarray(mk) * np.array([1, 1, 1, a])).astype(np.uint8))
            L.alpha_composite(mk, (int(W / 2 - mk.width / 2), 120))
        tracked(d, (W / 2, 520), "F1 EXPLAINED  ·  HOW FORMULA ONE REALLY WORKS", cond(34), rgba(CREAM, ramp(t, 1.4, 1.9)), 6, "center")
        tracked(d, (W / 2, 600), "RACING  ·  HISTORY  ·  ENGINEERING", cond(32), rgba(GOLD, ramp(t, 2.2, 2.7)), 8, "center")
        s_ = ramp(t, at(cue, sc), at(cue, sc) + 0.4)
        if s_ > 0:
            d.rounded_rectangle((W / 2 - 220, 760, W / 2 + 220, 850), 14, fill=rgba(RED, s_))
            tracked(d, (W / 2, 788), "SUBSCRIBE", cond(44, 3), rgba(CREAM, s_), 8, "center")
    return draw

def gof_sfx(path, length=5.0, sr=48000):
    """A soft rising whoosh into a warm low swell as the mark settles, and a light shimmer with the sweep. Mono WAV."""
    import wave
    n = int(length * sr); t = np.arange(n) / sr; rng = np.random.default_rng(7); noise = rng.standard_normal(n)
    lp = lambda x, k: np.convolve(x, np.ones(k) / k, mode="same")
    env = lambda t0, dec: np.where(t >= t0, np.exp(-np.maximum(t - t0, 0) / dec), 0)
    out = 0.22 * np.clip(t / 1.0, 0, 1) ** 2 * (t < 1.1) * lp(noise, 10)                              # whoosh in
    out += 0.6 * np.sin(2 * np.pi * 55 * t) * np.clip((t - 0.6) / 0.6, 0, 1) * env(1.2, 1.4)        # low swell
    out += 0.25 * np.sin(2 * np.pi * 110 * t) * np.clip((t - 0.6) / 0.6, 0, 1) * env(1.2, 1.0)
    sh = np.clip((t - 1.2) / 0.5, 0, 1) * env(1.7, 0.9) * (t >= 1.2)                                 # shimmer with the sweep
    out += 0.10 * sh * sum(np.sin(2 * np.pi * f * t) for f in (660, 990, 1320))
    out = out / np.max(np.abs(out)) * 0.7
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes())
    return path

# ---------------------------------------------------------------- render + mix
MIN_SHOT = 1.5          # Mike 10-21: a picture up for less than this reads as a glitch

def shot_check(scenes, out):
    """The picture-to-narration check for a long video (Mike 10-21), like vshort.shot_check: one row per scene with a frame
    from its middle, its time in the video, how long it's up, the words said over it, flagged red under MIN_SHOT.
    Word times are spread evenly across each sentence (good to a word or two). Returns the flagged rows."""
    scenes = sorted([s for s in scenes if s is not None], key=lambda s: s.start)
    end = vt(SENTS[-1]["out_end"]) + 3.0
    for a, b in zip(scenes, scenes[1:]): a.dur = b.start - a.start
    scenes[-1].dur = end - scenes[-1].start
    words = []
    for e in SENTS:
        ws = e["text"].split(); a, b = vt(e["out_start"]), vt(e["out_end"])
        words += [(a + (b - a) * i / max(1, len(ws)), w) for i, w in enumerate(ws)]
    def name(s):
        p = getattr(s, "path", None) or getattr(getattr(s, "bgfn", None), "__name__", "")
        if p: return os.path.splitext(os.path.basename(p))[0].replace("_", " ")[:80]
        fn = getattr(s, "draw", None) or getattr(s, "fn", None)
        return "graphic: " + (getattr(fn, "__qualname__", "?").split(".")[0] if fn else type(s).__name__)
    def mmss(t): return f"{int(t // 60)}:{t % 60:04.1f}"
    Wd, Hr = 1500, 230; rows, flagged = [], []
    for k, s in enumerate(scenes):
        a, b = s.start, s.start + s.dur
        said = " ".join(w for t, w in words if a - XFADE / 2 <= t < b - XFADE / 2)
        short = s.dur < MIN_SHOT
        th = frame_at(scenes, a + s.dur / 2).convert("RGB").resize((320, 180))
        rows.append((k + 1, mmss(a), mmss(b), s.dur, name(s), said, short, th))
        if short: flagged.append(f"#{k + 1} {mmss(a)} {s.dur:.1f}s {name(s)}")
    sheet = Image.new("RGB", (Wd, Hr * len(rows) + 80), (245, 242, 235)); d = ImageDraw.Draw(sheet)
    d.text((20, 22), f"SHOT CHECK  ·  {os.path.basename(STORY.rstrip('/'))}  ·  red = under {MIN_SHOT}s on screen", font=cond(38, 8), fill=NAVY_D)
    for i, (n, ta, tb, du, nm, said, short, th) in enumerate(rows):
        y = 80 + i * Hr
        if short: d.rectangle((0, y, Wd, y + Hr - 6), fill=(250, 214, 214))
        sheet.paste(th, (16, y + 20))
        x = 360; d.text((x, y + 14), f"#{n}   {ta} – {tb}   ({du:.1f} s){'   TOO SHORT' if short else ''}", font=cond(36, 8), fill=RED if short else NAVY_D)
        d.text((x, y + 62), nm, font=cond(28, 2), fill=(70, 70, 70))
        for j, ln in enumerate(wrap("SAID: " + (said or "(nothing)"), cond(30, 2), Wd - x - 30)[:3]):
            d.text((x, y + 104 + j * 38), ln, font=cond(30, 2), fill=(20, 20, 20))
    os.makedirs(os.path.dirname(out), exist_ok=True); sheet.save(out, quality=82)
    return flagged

def sfx_track(sting, events, length, out):
    """The opening sting plus timed effects, one mono WAV: events = [(video_time, path, gain_db)] (Mike 21 Oct: an engine
    note under the 'listen to the engine note' graphic)."""
    ins, fl = ["-i", sting], ["[0:a]aresample=48000[s0]"]
    for i, (at_, path, gain) in enumerate(events, 1):
        ins += ["-i", path]
        fl.append(f"[{i}:a]aresample=48000,pan=mono|c0=0.5*c0+0.5*c1,volume={gain}dB,adelay={int(at_ * 1000)}:all=1[s{i}]")
    fl.append("".join(f"[s{i}]" for i in range(len(events) + 1)) + f"amix=inputs={len(events) + 1}:normalize=0:duration=longest,apad,atrim=0:{length}[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fl), "-map", "[o]", "-ac", "1", out], check=True)
    return out

def main(scenes, final, music_gain=0.35, effects=()):
    """effects = [(video_time, path, gain_db)]: timed sound effects mixed in with the opening sting (sfx_track)."""
    scenes = [x for x in scenes if x is not None]
    os.makedirs(OUT, exist_ok=True)
    nd = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", NA + "narration.wav"]))
    total = INTRO + nd + 3.0
    voice, audio = OUT + "voice.wav", OUT + "audio_mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", NA + "narration.wav", "-filter_complex",
                    f"anullsrc=r=48000:cl=mono,atrim=0:{INTRO}[i];anullsrc=r=48000:cl=mono,atrim=0:3[e];[i][0:a][e]concat=n=3:v=0:a=1[o]",
                    "-map", "[o]", voice], check=True)
    tracks = sorted(t for t in glob.glob(A + "*.mp3") if not os.path.basename(t).startswith(("narration", "voice_test")))
    bed, order = music_bed(tracks, total, OUT + "music_bed.wav"); print("music:", " -> ".join(order))
    sfx = (impossible_sfx(OUT + "sting_sfx.wav", INTRO) if SERIES == "impossible" else gof_sfx(OUT + "sting_sfx.wav", INTRO) if SERIES in ("gof", "f1")
           else stamp_sfx(OUT + "sting_sfx.wav"))
    sting = sfx
    if effects: sfx = sfx_track(sting, effects, total, OUT + "sfx_mix.wav")
    fc = (f"[1:a]volume={music_gain * 1.6}[mus];"
          f"[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[v1][key];[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck];"
          f"[2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.8[fx];[v1][duck][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voice, "-i", bed, "-i", sfx, "-filter_complex", fc, "-map", "[o]", "-ar", "48000", audio], check=True)
    only = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else None
    out = OUT + ("preview.mp4" if only else final)
    render(scenes, total, audio, out, workers=9, only=only)
    for f in {audio, voice, sfx, sting, bed}: os.remove(f)
    import shutil; shutil.rmtree(out.replace(".mp4", "_parts"), ignore_errors=True)
    if not only:                                                              # small copy for review
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "26", "-preset", "fast",
                        "-c:a", "aac", "-b:a", "160k", out.replace(".mp4", "").rsplit(" - ", 1)[0] + " - review 720p.mp4"], check=True)
    print(out)
