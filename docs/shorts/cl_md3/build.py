"""Omnira Football Shorts for Champions League matchday 3 (Wed 21 Oct): Como v Man United, Bayern v Arsenal.
script.md + Malachi AI narration -> PostDrive/Shorts/cl_md3/video/

    ~/.venvs/poststudio/bin/python docs/shorts/cl_md3/build.py            # both
    ~/.venvs/poststudio/bin/python docs/shorts/cl_md3/build.py 2          # just Bayern
    ~/.venvs/poststudio/bin/python docs/shorts/cl_md3/build.py sheet      # contact sheets instead
"""
import importlib.util, json, math, os, sys, multiprocessing as mp
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..", "..")
sys.path.insert(0, os.path.join(ROOT, "studio"))
from PIL import Image, ImageDraw
import vshort as V
from vshort import VPhoto, VGraphic, Pop, Tag, Stamp, SW, SH, stroke_text, blur_cover
from storykit import pf, cond, ramp, ease, rgba, tracked, NAVY_D, GOLD, CREAM, RED
_spec = importlib.util.spec_from_file_location("b1", os.path.join(HERE, "..", "batch01", "build.py"))
B1 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B1)
chip, title = B1.chip, B1.title

R = "/Volumes/PostDrive/Shorts/cl_md3/"; NA = R + "audio/"; C = R + "commons/"; OUT = R + "video/"
MUS = "/Volumes/PostDrive/Music/"
LAKE = C + "The Stadio Sinigaglia with Lago di Como in the background during a Serie B match between Como and Reggina in 1914 (2022).jpg"
GATE = C + "Estadio Giuseppe Sinigaglia 2026.jpg"
SERIEA = C + "Como 1907-Lazio Serie A 24 agosto 2025.jpg"
CESC = C + "2023 - Cesc Fabregas (cropped).jpg"
AERIAL = C + "StadioSinigaglia3bWiki.JPG"
OT = C + "Manchester United Old Trafford.jpg"
DERBY = C + "Harry Kane scores! North London is ours... -coys.jpg"
KANE_B = C + "FC Red Bull Salzburg gegen Bayern München (2025-01-06 Testspiel) 17.jpg"
KANE_B2 = C + "FC Red Bull Salzburg gegen Bayern München (2025-01-06 Testspiel) 29.jpg"
KANE_E = C + "Harry Kane 9 England v Ghana at 2026 Fifa World Cup by YantsImages 04.jpg"
ALLI_N = C + "Allianz arena at night Richard Bartz.jpg"
ALLI_S = C + "20201229 Allianz Arena 03.jpg"
EMI = C + "London Emirates Stadium arsenal.jpg"
COMO_BLUE, ARS_RED, BAY_RED, GREEN = (40, 110, 200), (220, 30, 40), (200, 16, 46), (70, 190, 110)

SENTS = json.load(open(NA + "sentences.json"))
def section(k): return [s for s in SENTS if s["section"] == k]
def T(s, snip, off=0.0):
    e = next(x for x in s if snip.lower() in x["text"].lower()); return round(e["out_start"] - s[0]["out_start"] + off, 3)

class Canvas:
    def __init__(self, path, dark=0.72):
        self.bg = blur_cover(path, dark).copy(); self.L = Image.new("RGBA", self.bg.size, (0, 0, 0, 0))
    def done(self): self.bg.alpha_composite(self.L); return self.bg

def centred(d, xy, text, f, fill, track=6):                                  # cap-height centred on y
    b = f.getbbox("H"); tracked(d, (xy[0], xy[1] - (b[3] - b[1]) / 2), text, f, fill, track, "center")

# ---------------------------------------------------------------- Como: the climb, Serie D to Europe
TIERS = [("SERIE D", "2017", "AMATEUR"), ("SERIE C", "2019", ""), ("SERIE B", "2021", ""), ("SERIE A", "2024", "4TH IN 2025–26"),
         ("CHAMPIONS LEAGUE", "2026", "FIRST TIME IN 119 YEARS")]
def climb(bg, upto, lead=0.4, step=0.55):
    """The five tiers as a staircase; a gold dot climbs to tier `upto` (0-4), one step every `step` seconds."""
    def fn(t, dur):
        cv = Canvas(bg); d = ImageDraw.Draw(cv.L); a = ramp(t, 0, 0.3)
        title(d, 560, "COMO 1907  ·  THE CLIMB", a, 44)
        lvl = min(upto, max(0, (t - lead) / step)) if upto else 0
        for i, (name, yr, sub) in enumerate(TIERS):
            y = 1160 - i * 130; x0 = 110 + i * 45; on = lvl >= i - 0.01
            col = GOLD if on else (120, 128, 150)
            d.rounded_rectangle((x0, y, 990, y + 110), 14, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(col, a), width=4 if on else 2)
            f = cond(48 if i < 4 else 42, 8); b = f.getbbox("H")
            tracked(d, (x0 + 34, y + 55 - (b[3] - b[1]) / 2), name, f, rgba(CREAM if on else (150, 156, 175), a), 6)
            tracked(d, (966, y + 55 - (b[3] - b[1]) / 2), yr, f, rgba(col, a), 6, "right")
        k = int(lvl); fr = lvl - k                                              # the dot
        y = 1160 - (k + fr) * 130 + 55; x = 110 + (k + fr) * 45 - 34
        d.ellipse((x - 26, y - 26, x + 26, y + 26), fill=rgba(GOLD, a), outline=rgba(CREAM, a), width=4)
        sub = TIERS[min(4, round(lvl))][2]
        if sub and ramp(t, lead + upto * step, lead + upto * step + 0.4): chip(d, (SW / 2, 1340), sub, ramp(t, lead + upto * step, lead + upto * step + 0.4), GREEN, 46)
        return cv.done()
    return fn

def grounds(t0):
    def fn(t, dur):
        cv = Canvas(AERIAL, 0.7); d = ImageDraw.Draw(cv.L)
        title(d, 600, "HOW MANY FANS FIT IN", ramp(t, 0, 0.3), 44)
        for i, (n, cap, col, txt) in enumerate((("SINIGAGLIA  ·  COMO", 13602, COMO_BLUE, "13,602"), ("OLD TRAFFORD", 74000, ARS_RED, "ABOUT 74,000"))):
            k = 0.3 + i * 1.2; p = ramp(t, k, k + 0.3); g = ease(ramp(t, k, k + 1.2))
            if not p: continue
            y = 760 + i * 300; w = 840 * cap / 74000 * g
            tracked(d, (120, y - 60), n, cond(50, 8), rgba(CREAM, p), 8)
            d.rounded_rectangle((120, y, 120 + max(w, 14), y + 150), 14, fill=rgba(col, 0.95 * p))
            f = cond(56, 8); b = f.getbbox("H")
            x = 120 + max(w, 14) + 24 if w < 500 else 120 + w - 24
            tracked(d, (x, y + 75 - (b[3] - b[1]) / 2), txt, f, rgba(CREAM if w < 500 else NAVY_D, p), 6, "left" if w < 500 else "right")
        c = ramp(t, 3.4, 3.8)
        if c: chip(d, (SW / 2, 1340), "ON THE SHORE OF LAKE COMO", c, GOLD, 48)
        return cv.done()
    return fn

def short_como():
    s = section(0)
    t_utd, t_bk, t_ref, t_har, t_fab, t_24, t_eur, t_tn, t_end = (T(s, x) for x in ("Tonight, they play", "Como went bankrupt", "The club was refounded",
        "In 2019", "Then came", "In 2024", "So for the first", "Tonight, Manchester", "Can the fairytale"))
    scenes = [VPhoto(0, LAKE, ((0.5, 0.45), (0.55, 0.45)), (1.05, 1.18)),
              VPhoto(t_utd, OT, ((0.45, 0.45), (0.5, 0.5)), (1.0, 1.15)),
              VPhoto(t_bk, GATE, ((0.5, 0.35), (0.5, 0.4)), (1.0, 1.1)),
              VGraphic(t_ref - 0.1, climb(GATE, 0)),
              VPhoto(t_har, AERIAL, ((0.4, 0.5), (0.55, 0.5)), (1.05, 1.2)),
              VPhoto(t_fab, CESC, ((0.5, 0.35), (0.5, 0.3)), (1.0, 1.08)),
              VGraphic(t_24 - 0.1, climb(SERIEA, 3, lead=0.3, step=0.7)),
              VGraphic(t_eur - 0.1, climb(SERIEA, 4, lead=0.0, step=0.01)),
              VGraphic(t_tn - 0.1, grounds(t_tn - 0.1)),
              VPhoto(t_end, LAKE, ((0.6, 0.4), (0.5, 0.45)), (1.1, 1.22))]
    ov = [Pop(0, ["SERIE D", "IN 2017"], t_utd - 0.2, y=280, size=120, colors=[CREAM, GOLD]),
          Pop(t_utd, ["TONIGHT:", "MAN UNITED"], t_bk - t_utd - 0.1, y=280, size=110),
          Stamp(T(s, "Como went bankrupt", 1.2), "BANKRUPT 2004", (SW / 2, 820), 2.4, 96),
          Stamp(T(s, "And again in 2016", 0.3), "AND AGAIN: 2016", (SW / 2, 1080), t_ref - T(s, "And again in 2016", 0.3) - 0.1, 90, rot=7),
          Tag(t_har + 0.3, "THE HARTONO BROTHERS", sub="NEW OWNERS  ·  2019", dur=t_fab - t_har - 0.5),
          Tag(t_fab + 0.2, "CESC FÀBREGAS", sub="PLAYER  ·  PART-OWNER  ·  MANAGER", dur=t_24 - t_fab - 0.4),
          Pop(t_eur, ["FIRST TIME", "IN EUROPE"], t_tn - t_eur - 0.1, y=270, size=100),
          Pop(t_end, ["CAN THE FAIRYTALE", "BEAT UNITED?"], 99, y=280, size=92)]
    return dict(n=1, name="Como v Man United", tag=" (Kirk)", s=s, scenes=scenes, ov=ov, line="OMNIRA FOOTBALL  ·  CHAMPIONS LEAGUE",
                slate=("Can Como beat United?", "FOLLOW FOR MORE FOOTBALL STORIES"), music=[MUS + "Energetic/ANBR - Seasons.mp3"])

# ---------------------------------------------------------------- Bayern v Arsenal
def derby_count(t0):
    def fn(t, dur):
        cv = Canvas(DERBY, 0.74); d = ImageDraw.Draw(cv.L)
        n = int(14 * ease(min(1, max(0, t - 0.2) / 2.0)))
        for i in range(14):                                                    # a ball for each derby goal
            c, r = i % 7, i // 7; x, y = 150 + c * 130, 1150 + r * 140; on = i < n
            d.ellipse((x - 48, y - 48, x + 48, y + 48), fill=rgba(CREAM if on else (70, 76, 100), 1 if on else 0.5), outline=rgba(NAVY_D, 1), width=4)
            if on: d.regular_polygon((x, y, 18), 5, fill=rgba(NAVY_D, 1))
        d.rounded_rectangle((300, 640, 780, 960), 26, fill=rgba(NAVY_D, 0.92), outline=rgba(GOLD, 1), width=4)
        stroke_text(d, (SW / 2, 650), str(n), pf(190, 900), rgba(GOLD if n >= 14 else CREAM, 1), sw=0)
        centred(d, (SW / 2, 920), "NORTH LONDON DERBY GOALS", cond(36, 8), rgba(CREAM, 1))
        if n >= 14: chip(d, (SW / 2, 1385), "THE ALL-TIME RECORD", ramp(t, 2.3, 2.7), GOLD, 50)
        return cv.done()
    return fn

def table(t0):
    def fn(t, dur):
        cv = Canvas(ALLI_N, 0.72); d = ImageDraw.Draw(cv.L)
        title(d, 620, "CHAMPIONS LEAGUE  ·  BEFORE TONIGHT", ramp(t, 0, 0.3), 40, CREAM)
        for i, (n, w, pts, col, k) in enumerate((("ARSENAL", "2 PLAYED  ·  2 WON", 6, ARS_RED, 0.2), ("BAYERN MUNICH", "2 PLAYED  ·  1 WON  ·  1 DRAWN", 4, BAY_RED, T(section(1), "Bayern have four") - t0))):
            p = ramp(t, k, k + 0.35)
            if not p: continue
            y = 740 + i * 280
            d.rounded_rectangle((90, y, 990, y + 220), 20, fill=rgba(NAVY_D, 0.92 * p), outline=rgba(col, p), width=4)
            d.rectangle((90, y, 104, y + 220), fill=rgba(col, p))
            tracked(d, (140, y + 40), n, cond(64, 8), rgba(CREAM, p), 8)
            tracked(d, (140, y + 140), w, cond(36, 4), rgba(GOLD, p), 4)
            stroke_text(d, (950, y + 30), str(pts), pf(150, 900), rgba(GOLD, p), "right", sw=0)
            tracked(d, (950, y + 180), "PTS", cond(30, 6), rgba(CREAM, 0.7 * p), 6, "right")
        return cv.done()
    return fn

def score(bg, rows, t0, agg_at=None):
    def fn(t, dur):
        cv = Canvas(bg, 0.72); d = ImageDraw.Draw(cv.L)
        title(d, 620, "2017  ·  LAST 16", ramp(t, 0, 0.3), 46)
        for i, (home, hs, aw, as_, where, k) in enumerate(rows):
            p = ramp(t, k, k + 0.35)
            if not p: continue
            y = 720 + i * 300
            d.rounded_rectangle((90, y, 990, y + 240), 20, fill=rgba(NAVY_D, 0.92 * p), outline=rgba(GOLD, 0.7 * p), width=3)
            f = cond(56, 8); b = f.getbbox("H")
            tracked(d, (130, y + 90 - (b[3] - b[1]) / 2), home, f, rgba(CREAM, p), 6)
            tracked(d, (950, y + 90 - (b[3] - b[1]) / 2), aw, f, rgba(CREAM, p), 6, "right")
            stroke_text(d, (SW / 2, y + 30), f"{hs}–{as_}", pf(110, 900), rgba(GOLD, p), sw=0)
            centred(d, (SW / 2, y + 200), where, cond(34, 6), rgba(CREAM, 0.75 * p))
        if agg_at is not None:
            c = ramp(t, agg_at, agg_at + 0.4)
            if c: chip(d, (SW / 2, 1350), "10–2 ON AGGREGATE", c, RED, 64)
        return cv.done()
    return fn

def short_bayern():
    s = section(1)
    t_14, t_now, t_tn, t_tab, t_17, t_h, t_agg, t_bal, t_5d, t_end = (T(s, x) for x in ("Fourteen goals", "Now he plays", "And tonight, Arsenal",
        "Arsenal have won", "The last time", "Then five-one", "Ten-two", "And Kane is", "A night against", "Who wins"))
    scenes = [VPhoto(0, DERBY, ((0.5, 0.5), (0.35, 0.6)), (1.0, 1.15)),
              VGraphic(t_14 - 0.6, derby_count(t_14 - 0.6)),
              VPhoto(t_now, KANE_B, ((0.4, 0.3), (0.4, 0.25)), (1.0, 1.1)),
              VPhoto(t_tn, ALLI_N, ((0.45, 0.5), (0.55, 0.5)), (1.0, 1.15)),
              VGraphic(t_tab - 0.1, table(t_tab - 0.1)),
              VGraphic(t_17 - 0.1, score(ALLI_S, [("BAYERN", 5, "ARSENAL", 1, "MUNICH  ·  15 FEB 2017", 0.6)], t_17)),
              VGraphic(t_h - 0.1, score(EMI, [("BAYERN", 5, "ARSENAL", 1, "MUNICH", 0.0), ("ARSENAL", 1, "BAYERN", 5, "LONDON  ·  7 MAR 2017", 0.3)], t_h, agg_at=t_agg - t_h)),
              VPhoto(t_bal, KANE_E, ((0.5, 0.3), (0.5, 0.25)), (1.0, 1.1)),
              VPhoto(t_5d, KANE_B2, ((0.45, 0.35), (0.45, 0.3)), (1.0, 1.1)),
              VPhoto(t_end, ALLI_N, ((0.55, 0.5), (0.45, 0.5)), (1.1, 1.22))]
    ov = [Pop(0, ["KANE", "V ARSENAL"], t_14 - 0.8, y=280, size=120),
          Tag(t_now + 0.2, "HARRY KANE", sub="BAYERN MUNICH  ·  SINCE 2023", dur=t_tn - t_now - 0.3),
          Pop(t_tn, ["TONIGHT: ARSENAL", "IN MUNICH"], t_tab - t_tn - 0.1, y=280, size=88),
          Pop(t_bal, ["BALLON D'OR", "FAVOURITE"], t_5d - t_bal - 0.1, y=270, size=100),
          Tag(t_bal + 0.6, "CEREMONY: MONDAY", sub="LONDON  ·  26 OCTOBER", dur=t_5d - t_bal - 0.8),
          Pop(t_5d, ["5 DAYS", "TO GO"], t_end - t_5d - 0.1, y=280, size=120),
          Pop(t_end, ["WHO WINS", "IN MUNICH?"], 99, y=280, size=100)]
    return dict(n=2, name="Bayern v Arsenal", s=s, scenes=scenes, ov=ov, line="OMNIRA FOOTBALL  ·  CHAMPIONS LEAGUE",
                slate=("Does Kane score against Arsenal again?", "FOLLOW FOR MORE FOOTBALL STORIES"), music=[MUS + "Energetic/LaFaye - Hidden.mp3"])

ALL = [short_como, short_bayern]

def job(k):
    j = ALL[k - 1](); os.makedirs(OUT, exist_ok=True); out = OUT + f"Football - {j['name']}{j.get('tag', '')}.mp4"
    return out, round(V.render(out, NA, j["s"], j["scenes"], j["ov"], j["line"], j["slate"], j["music"]), 1)

def sheet(k):
    j = ALL[k - 1](); s = j["s"]; body = s[-1]["out_end"] - s[0]["out_start"]
    scenes = sorted(j["scenes"], key=lambda x: x.start)
    for a, b in zip(scenes, scenes[1:]): a.dur = b.start - a.start
    scenes[-1].dur = body - scenes[-1].start
    ts = [x.start + f * x.dur for x in scenes for f in (0.15, 0.5, 0.9)] + [body + 1.0]
    caps = V.chunks([(t - s[0]["out_start"], w) for t, w in V.caption_words(NA, s)])
    ims = [V.compose(scenes, j["ov"], caps, j["line"], j["slate"], t, body, body + V.SLATE).convert("RGB").resize((270, 480)) for t in ts]
    g = Image.new("RGB", (270 * 8, 480 * math.ceil(len(ims) / 8)))
    for i, im in enumerate(ims):
        ImageDraw.Draw(im).text((4, 4), f"{ts[i]:.1f}", fill=(255, 255, 0)); g.paste(im, ((i % 8) * 270, (i // 8) * 480))
    os.makedirs(R + "sheets", exist_ok=True); g.save(R + f"sheets/short{k}.jpg", quality=82); return R + f"sheets/short{k}.jpg"

if __name__ == "__main__":
    args = sys.argv[1:]; mode = "sheet" if args and args[0] == "sheet" else "render"
    pick = [int(x) for x in args if x.isdigit()] or range(1, len(ALL) + 1)
    V.caption_words(NA, SENTS)          # Whisper (MLX) hangs inside forked workers: fill the cache here first
    with mp.get_context("fork").Pool(len(pick)) as pool:
        for r in pool.map(sheet if mode == "sheet" else job, pick): print(r)
