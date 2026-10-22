"""F1 Short: Antonelli's title maths before Austin (script.md, Malachi AI narration) -> PostDrive/Shorts/f1_austin/video/

    ~/.venvs/poststudio/bin/python docs/shorts/f1_austin/build.py          # render
    ~/.venvs/poststudio/bin/python docs/shorts/f1_austin/build.py sheet    # contact sheet instead
"""
import importlib.util, json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..", "..")
sys.path.insert(0, os.path.join(ROOT, "studio"))
from PIL import Image, ImageDraw
import vshort as V
from vshort import VPhoto, VGraphic, Pop, Tag, SW, SH, stroke_text, blur_cover
from storykit import pf, cond, ramp, ease, rgba, tracked, NAVY_D, GOLD, CREAM, RED
_spec = importlib.util.spec_from_file_location("b1", os.path.join(HERE, "..", "batch01", "build.py"))
B1 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B1)
chip, title, tick = B1.chip, B1.title, B1.tick

R = "/Volumes/PostDrive/Shorts/f1_austin/"; NA = R + "audio/"; C = R + "commons/"; OUT = R + "video/"
MUS = "/Volumes/PostDrive/Audio/Music/"
CELEB = C + "2026 Chinese GP - Mercedes - Kimi Antonelli - Post Race Celebration.jpg"
CAR = C + "2026 Chinese GP - Mercedes - Kimi Antonelli - Qualifying.jpg"
FACE = C + "Kimi Antonelli at the Melbourne Walk during the 2026 Australian Grand Prix (028A7923) cropped.jpg"
ASCARI = C + "Alberto Ascari - El Gráfico 1544.jpg"
TOWER = C + "Tower at Circuit of the Americas.jpg"
COTA = C + "2018 US Grand Prix at the Circuit of the Americas.jpg"
TEAL, FERRARI, GREEN = (0, 200, 180), (220, 30, 40), (70, 190, 110)

S = json.load(open(NA + "sentences.json")); T0 = S[0]["out_start"]
def T(snip, off=0.0):
    e = next(x for x in S if snip.lower() in x["text"].lower()); return round(e["out_start"] - T0 + off, 3)

class Canvas:
    def __init__(self, path, dark=0.72):
        self.bg = blur_cover(path, dark).copy(); self.L = Image.new("RGBA", self.bg.size, (0, 0, 0, 0))
    def done(self): self.bg.alpha_composite(self.L); return self.bg

# ---------------------------------------------------------------- the points ladder
def ladder(t0):
    rows = [("ANTONELLI", "MERCEDES", 340, TEAL, T("He's on") - t0),
            ("RUSSELL", "MERCEDES", 238, TEAL, T("His Mercedes", 1.2) - t0),
            ("HAMILTON", "FERRARI", 229, FERRARI, T("Lewis Hamilton", 0.3) - t0)]
    def fn(t, dur):
        cv = Canvas(CAR); d = ImageDraw.Draw(cv.L)
        title(d, 600, "DRIVERS' CHAMPIONSHIP  ·  AFTER SINGAPORE", ramp(t, 0, 0.4), 36, CREAM)
        for i, (n, team, pts, col, k) in enumerate(rows):
            p = ramp(t, k, k + 0.3)
            if not p: continue
            y = 720 + i * 210; grow = ease(ramp(t, k, k + 1.2)); w = 820 * pts / 340 * grow
            d.rounded_rectangle((130, y, 130 + max(w, 12), y + 120), 14, fill=rgba(col, 0.92 * p))
            tracked(d, (150, y - 52), n, cond(50, 8), rgba(CREAM, p), 8)
            tracked(d, (150 + cond(50, 8).getlength(n) + 8 * len(n) + 24, y - 44), team, cond(34, 8), rgba(col, p), 6)
            stroke_text(d, (130 + max(w, 12) - 24, y + 10), str(int(pts * grow)), pf(90, 900), rgba(NAVY_D, p), "right", sw=0)
        g = ramp(t, rows[1][4] + 1.4, rows[1][4] + 1.8)
        if g: chip(d, (SW / 2, 1360), "GAP: 102 POINTS", g, GOLD, 56)
        return cv.done()
    return fn

# ---------------------------------------------------------------- the gap he needs
def gap_bar(t0):
    kw = T("And there's only one way") - t0; kw2 = kw + 2.2
    def fn(t, dur):
        cv = Canvas(COTA); d = ImageDraw.Draw(cv.L); x0, x1, y = 100, 980, 880; sc = (x1 - x0) / 140
        title(d, 640, "ANTONELLI'S LEAD", ramp(t, 0, 0.3), 46)
        a = ramp(t, 0.1, 0.5); now = 102 * ease(ramp(t, 0.1, 1.2))
        d.rounded_rectangle((x0, y, x1, y + 170), 16, fill=rgba(NAVY_D, 0.85 * a), outline=rgba(CREAM, 0.5 * a), width=3)
        d.rounded_rectangle((x0, y, x0 + now * sc, y + 170), 16, fill=rgba(TEAL, 0.95 * a))
        stroke_text(d, (x0 + now * sc - 20, y + 26), str(int(now)), pf(100, 900), rgba(NAVY_D, a), "right", sw=0)
        m = ramp(t, 1.0, 1.4); xm = x0 + 125 * sc                                    # the line to beat
        if m:
            for yy in range(y - 70, y + 200, 24): d.line([(xm, yy), (xm, yy + 12)], fill=rgba(GOLD, m), width=6)
            tracked(d, (xm, y - 130), "125 TO BEAT", cond(44, 8), rgba(GOLD, m), 6, "center")
        w = ramp(t, kw, kw + 0.8)                                                    # a win adds up to 25
        if w:
            d.rounded_rectangle((x0 + 102 * sc, y, x0 + (102 + 25 * ease(w)) * sc, y + 170), 0, fill=rgba(GREEN, 0.9 * w))
            chip(d, (SW / 2, 1180), "A WIN: +25", w, GREEN, 60)
            if ramp(t, kw2, kw2 + 0.4): chip(d, (SW / 2, 1300), "ANYTHING LESS: NOT ENOUGH", ramp(t, kw2, kw2 + 0.4), RED, 44)
        return cv.done()
    return fn

# ---------------------------------------------------------------- the three things that must happen
def checklist(t0):
    rows = [("ANTONELLI WINS", T("Then Russell", -0.6) - t0),
            ("RUSSELL 9TH OR LOWER", T("Then Russell", 0.9) - t0),
            ("HAMILTON 5TH OR LOWER", T("Then Russell", 3.4) - t0)]
    def fn(t, dur):
        cv = Canvas(CELEB); d = ImageDraw.Draw(cv.L)
        title(d, 620, "CHAMPION IN AUSTIN IF:", ramp(t, 0, 0.3), 50)
        for i, (txt, k) in enumerate(rows):
            p = ramp(t, max(k, 0.1), max(k, 0.1) + 0.35)
            if not p: continue
            y = 760 + i * 200
            d.rounded_rectangle((90, y, 990, y + 150), 18, fill=rgba(NAVY_D, 0.9 * p), outline=rgba(GOLD, 0.7 * p), width=3)
            tick(d, (180, y + 75), 46, p, True)
            f = cond(50, 8); b = f.getbbox("H"); tracked(d, (260, y + 75 - (b[3] - b[1]) / 2), txt, f, rgba(CREAM, p), 6)
        return cv.done()
    return fn

def countback(t0):
    k2 = T("Even if he won") - t0
    def fn(t, dur):
        cv = Canvas(CAR); d = ImageDraw.Draw(cv.L)
        title(d, 620, "IF RUSSELL IS 9TH", ramp(t, 0, 0.3), 50)
        a = ramp(t, 0.3, 0.7)
        d.rounded_rectangle((190, 720, 890, 1000), 24, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(GOLD, a), width=4)
        stroke_text(d, (SW / 2, 740), "125", pf(190, 900), rgba(GOLD, a), sw=0)
        tracked(d, (SW / 2, 950), "POINTS BEHIND, EXACTLY", cond(38, 8), rgba(CREAM, a), 6, "center")
        b = ramp(t, k2, k2 + 0.4)
        if b: chip(d, (SW / 2, 1080), "WINS ALL 5 LEFT? LEVEL ON POINTS", b, CREAM, 44)
        c = ramp(t, k2 + 2.6, k2 + 3.0)
        if c:
            chip(d, (SW / 2, 1210), "MORE RACE WINS TAKES IT", c, GREEN, 50)
            tracked(d, (SW / 2, 1330), "ANTONELLI 9  ·  RUSSELL 8 AT MOST", cond(40, 8), rgba(CREAM, c), 6, "center")
        return cv.done()
    return fn

# ---------------------------------------------------------------- the Short
def short():
    t_lad, t_aus, t_gap, t_chk, t_cb = T("He's on"), T("After Austin"), T("So Antonelli has"), T("Then Russell", -0.9), T("Ninth would")
    t_yng, t_asc, t_end = T("If it happens"), T("And the first Italian"), T("Will he do it")
    scenes = [VPhoto(0, CELEB, ((0.45, 0.35), (0.48, 0.3)), (1.05, 1.2)),
              VGraphic(t_lad - 0.1, ladder(t_lad - 0.1)),
              VPhoto(t_aus, TOWER, ((0.5, 0.45), (0.5, 0.35)), (1.0, 1.12)),
              VGraphic(t_gap - 0.1, gap_bar(t_gap - 0.1)),
              VGraphic(t_chk, checklist(t_chk)),
              VGraphic(t_cb - 0.1, countback(t_cb - 0.1)),
              VPhoto(t_yng, FACE, ((0.5, 0.45), (0.5, 0.4)), (1.0, 1.1)),
              VPhoto(t_asc, ASCARI, ((0.55, 0.5), (0.6, 0.5)), (1.15, 1.28)),
              VPhoto(t_end, COTA, ((0.35, 0.6), (0.6, 0.6)), (1.0, 1.12))]
    ov = [Pop(0, ["CHAMPION", "ON SUNDAY?"], t_lad - 0.3, y=270, size=110),
          Tag(T("Kimi Antonelli", 0.4), "KIMI ANTONELLI", sub="MERCEDES  ·  AGE 20", dur=3.6),
          Pop(t_aus, ["5 RACES LEFT", "AFTER AUSTIN"], T("That's a hundred") - t_aus, size=90, y=290),
          Pop(T("That's a hundred"), ["125 POINTS", "AT MOST"], t_gap - T("That's a hundred"), size=100, y=290),
          Pop(t_yng, ["YOUNGEST", "CHAMPION EVER"], t_asc - t_yng, size=96, y=280),
          Tag(t_asc + 0.3, "ALBERTO ASCARI", sub="LAST ITALIAN CHAMPION  ·  1953", dur=t_end - t_asc - 0.5),
          Pop(t_end, ["WILL HE DO IT", "IN AUSTIN?"], 99, size=96, y=280)]
    return S, scenes, ov

LINE = "OMNIRA F1  ·  TITLE MATHS"
SLATE = ("Will Antonelli do it in Austin?", "FOLLOW FOR MORE F1, EXPLAINED")
MUSIC = [MUS + "Energetic/ANBR - Seasons.mp3"]

def sheet():
    s, scenes, ov = short(); body = s[-1]["out_end"] - T0
    scenes = sorted(scenes, key=lambda x: x.start)
    for a, b in zip(scenes, scenes[1:]): a.dur = b.start - a.start
    scenes[-1].dur = body - scenes[-1].start
    ts = [x.start + f * x.dur for x in scenes for f in (0.15, 0.5, 0.85)] + [body + 1.0]
    caps = V.chunks([(t - T0, w) for t, w in V.caption_words(NA, s)])
    ims = [V.compose(scenes, ov, caps, LINE, SLATE, t, body, body + V.SLATE).convert("RGB").resize((270, 480)) for t in ts]
    g = Image.new("RGB", (270 * 7, 480 * math.ceil(len(ims) / 7)))
    for i, im in enumerate(ims):
        ImageDraw.Draw(im).text((4, 4), f"{ts[i]:.1f}", fill=(255, 255, 0)); g.paste(im, ((i % 7) * 270, (i // 7) * 480))
    os.makedirs(R + "sheets", exist_ok=True); g.save(R + "sheets/austin.jpg", quality=82); return R + "sheets/austin.jpg"

if __name__ == "__main__":
    if sys.argv[1:] == ["sheet"]: print(sheet())
    else:
        s, scenes, ov = short(); os.makedirs(OUT, exist_ok=True); out = OUT + "F1 - Antonelli title maths Austin.mp4"
        print(out, round(V.render(out, NA, s, scenes, ov, LINE, SLATE, MUSIC), 1))
