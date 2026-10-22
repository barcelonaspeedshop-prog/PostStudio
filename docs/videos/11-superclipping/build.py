"""F1 Explained: Superclipping -> PostDrive/Stories/Omnira F1/02 Superclipping/video/F1 Explained - Superclipping.mp4

    ~/.venvs/poststudio/bin/python build.py            # full render (+ review 720p)
    ~/.venvs/poststudio/bin/python build.py 95 125     # preview slice (video seconds)
    ~/.venvs/poststudio/bin/python build.py check      # shot check: every picture, its time, the words said over it

script.md (approved by Mike 21 Oct, "script perfect"; section 6 line changed 21 Oct to "far more energy to deploy",
see the fact notes), AI narration (Kirk, eleven_multilingual_v2, stability 0.6 style 0.1) in audio/v4/. Omnira F1 = series "f1": the gold badge open and
end card. Pictures follow the narration line by line; every technical idea is shown as a graphic (PLAYBOOK).
AI stills are Mike's (ChatGPT, ai_prompts.md); the four AI clips were drafted, passed the 10-fps check, then 1080p.
"""
import math, os, sys
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import episode as E
E.init("/Volumes/PostDrive/Omnira F1/Videos/Superclipping/", series="f1", narration="audio/v4/")   # v4 = Kirk, eleven_multilingual_v2 (Mike 21 Oct: v2 only; voiced in two halves, cut at pauses)
from episode import *
from factcard import FactCard
E.AI_RATE = 0.6                                                               # AI clips at 60% speed (Mike 20 Oct)

FINAL = "F1 Explained - Superclipping v5.mp4"
# Mike 21 Oct: an F1 engine sound under the engine-note graphic. Runway SFX (audio/sfx): rises for 1.5 s, full revs to
# ~3.6 s, then the note drops away by ~5.5 s, so the drop lands on "If it drops away".
ENGINE, ENGINE_DROP = E.STORY + "audio/sfx/engine_note_fade.mp3", 3.6
CYAN, RED_E = (70, 200, 230), (226, 60, 60)              # electric / harvesting
PETROL = (232, 150, 60)

def cm(f): return f.replace(" ", "_")
# photos (Wikimedia Commons)
ALONSO, ALONSO_CAR = cm("2026 Chinese GP - Fernando Alonso.jpg"), cm("F1 2026, Aston Martin F1 Team, Aston Martin AMR26, Fernando Alonso, Spa Francorchamps (55425688703).jpg")
W17, RUSSELL = cm("2026 Chinese GP - Mercedes - W17.jpg"), cm("2026 Chinese GP - Mercedes - George Russell - Qualifying.jpg")
HAM_BAH, HAM_SUZ = cm("2026 Bahrain GP - Ferrari - Lewis Hamilton - Qualifying.jpg"), cm("Ferrari SF-26 - Lewis Hamilton exits the final chicane at Suzuka during the 2026 Japanese GP (55195432409).jpg")
PIA_BRAKE, PIA_CAR = cm("Mclaren MCL40 - Oscar Piastri enters the Nissin Brake Hairpin at Suzuka during the 2026 Japanese GP (55195174246).jpg"), cm("2026 Chinese GP - McLaren - Oscar Piastri - Qualifying.jpg")
PIASTRI = cm("Oscar Piastri at the Melbourne Walk during the 2026 Australian Grand Prix (028A8596).jpg")
VER, VER_CAR = cm("Max Verstappen at the Red Bull Fan Zone – Crown Riverwalk, Melbourne (028A7657).jpg"), cm("2026 Chinese GP - Red Bull - Max Verstappen - Qualifying.jpg")
BEARMAN, HAAS = cm("Oliver Bearman at the Melbourne Walk during the 2026 Australian Grand Prix (028A7963).jpg"), cm("2026 Chinese GP - Haas - Oliver Bearman - Qualifying.jpg")
COLAPINTO, ALPINE, ALPINE_REAR = (cm("Franco Colapinto at the Melbourne Walk during the 2026 Australian Grand Prix (028A8694).jpg"),
                                  cm("2026 Chinese GP - Alpine - Franco Colapinto - Qualifying.jpg"), cm("Alpine A526 of Franco Colapinto (028A8063).jpg"))
SPOON_ANT, SPOON_NOR = cm("Mercedes W17 - Kimi Antonelli approaches Spoon Curve at Suzuka during the 2026 Japanese GP (55194289192).jpg"), cm("Mclaren MCL40 - Lando Norris approaches Spoon Curve at Suzuka during the 2026 Japanese GP (55195326398).jpg")
SPOON_LEC = cm("Ferrari SF-26 - Charles Leclerc approaches Spoon Curve at Suzuka during the 2026 Japanese GP (55194289242) (cropped).jpg")
MIAMI = "F1sprint2026.png"
BAH_MAP, ALB_MAP = "Bahrain_International_Circuit--Grand_Prix_Layout.png", "Albert_Park_Circuit_2021.png"
# AI stills (Mike, ChatGPT)
TURN12, CHEF, PITLANE, FLATOUT = "ai_bahrain_turn12.png", "ai_chef_cartoon.png", "ai_bahrain_pitlane.png", "ai_straight_flatout.png"
CLOSING, AFTERMATH, MEETING, GRID = "ai_suzuka_closing.png", "ai_suzuka_aftermath.png", "ai_fia_meeting.png", "ai_miami_start.png"

def T(v, sc):
    """A time inside a scene: a number (local seconds), (snippet, offset) or (snippet, offset, fraction)."""
    if isinstance(v, tuple):
        return (atf(v[0], v[2], sc) if len(v) > 2 else at(v[0], sc)) + v[1]
    return v
def lt(snip, sc, off=0.0): return at(snip, sc) + off
def FC(snip, path, name, role, facts=(), off=-0.15, start=None, **kw):
    full = next((d + path for d in (C, M, AI) if os.path.exists(d + path)), path)
    fs = [((lambda sc, v=f[0]: T(v, sc)),) + tuple(f[1:]) for f in facts]
    return FactCard(S(snip, off) if start is None else start, full, name, role, facts=fs, **kw)
def AF(snip, frac, ai, **kw):
    p = AS(snip, ai, **kw); p.start = SF(snip, frac); return p
def FCF(snip, frac, path, name, role, facts=(), **kw): return FC(snip, path, name, role, facts, start=SF(snip, frac), **kw)
def bgp(f, amt=0.8): return bg_of(C + f, amt)
def bga(f, amt=0.8): return bg_of(AI + f, amt)
def rel(snip, sc_start, off=-0.15): return S(snip) - sc_start + off + 0.15  # caption time inside a scene that starts at sc_start
def tag(d, xy, text, a, colour=GOLD, size=40):
    if a <= 0: return
    x, y = xy; f = cond(size, 8); tw = sum(f.getlength(ch) for ch in text) + 6 * (len(text) - 1)
    bb = f.getbbox("H"); cap = bb[3] - bb[1]; pad = max(10, size * 0.32)
    d.rounded_rectangle((x - tw / 2 - 22, y - pad, x + tw / 2 + 22, y + cap + pad), 10, fill=rgba(NAVY_D, 0.86 * a), outline=rgba(colour, a), width=3)
    tracked(d, (x, y), text, f, rgba(colour, a), 6, "center")
def big(d, y, text, a, col=GOLD, size=200, x=W / 2):
    if a > 0: text_top(d, (x, y), text, pf(size, 900), rgba(col, a), "center")
def num(d, xy, text, a, col=CREAM, size=220, align="center"):
    """Readout digits (condensed, like a timing screen)."""
    if a > 0: text_top(d, xy, text, cond(size, 8), rgba(col, a), align)
def paste_box(L, path, x0, y0, w, h, a=1.0, fy=0.35, fx=0.5):
    key = ("box", path, w, h, fx, fy); boxes = E.__dict__.setdefault("_boxes", {})
    if key not in boxes:
        im = load(path); s_ = max(w / im.width, h / im.height); im = im.resize((int(im.width * s_) + 1, int(im.height * s_) + 1), Image.LANCZOS)
        cx = min(max(fx * im.width - w / 2, 0), im.width - w); cy = min(max(fy * im.height - h / 2, 0), im.height - h)
        boxes[key] = im.crop((int(cx), int(cy), int(cx) + w, int(cy) + h)).convert("RGBA")
    im = boxes[key]
    if a < 1: im = im.copy(); im.putalpha(int(255 * a))
    L.alpha_composite(im, (int(x0), int(y0)))
def chip(L, path, box, x, y, w, a=1.0):
    """A car cut from a photo (crop box in source pixels), w wide, centred on (x, y); feathered edges."""
    key = ("chip", path, box, w); boxes = E.__dict__.setdefault("_boxes", {})
    if key not in boxes:
        im = load(path).crop(box); h = int(im.height * w / im.width); im = im.resize((w, h), Image.LANCZOS).convert("RGBA")
        m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((8, 8, w - 8, h - 8), 30, fill=255)
        im.putalpha(m.filter(ImageFilter.GaussianBlur(8))); boxes[key] = im
    im = boxes[key]
    if a < 1: im = im.copy(); im.putalpha(im.getchannel("A").point(lambda v: int(v * a)))
    L.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2)))
def bar(d, x0, y0, x1, y1, frac, a, col, vertical=False, back=NAVY_D):
    d.rounded_rectangle((x0, y0, x1, y1), 10, fill=rgba(back, 0.9 * a), outline=rgba(CREAM, 0.6 * a), width=3)
    frac = max(0.0, min(1.0, frac))
    if frac > 0.005:
        if vertical: d.rounded_rectangle((x0 + 6, y1 - 6 - (y1 - y0 - 12) * frac, x1 - 6, y1 - 6), 7, fill=rgba(col, a))
        else: d.rounded_rectangle((x0 + 6, y0 + 6, x0 + 6 + (x1 - x0 - 12) * frac, y1 - 6), 7, fill=rgba(col, a))
def battery(d, cx, cy, w, h, frac, a, col=CYAN):
    if a <= 0: return
    d.rounded_rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), 18, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(CREAM, a), width=6)
    d.rounded_rectangle((cx + w / 2, cy - h * 0.18, cx + w / 2 + w * 0.06, cy + h * 0.18), 6, fill=rgba(CREAM, a))
    frac = max(0.0, min(1.0, frac)); c = col if frac > 0.2 else RED_E
    if frac > 0.01: d.rounded_rectangle((cx - w / 2 + 14, cy - h / 2 + 14, cx - w / 2 + 14 + (w - 28) * frac, cy + h / 2 - 14), 10, fill=rgba(c, a))
def pulse(d, xy, t, a, col=GOLD, r=34):
    if a <= 0: return
    x, y = xy; k = (t * 1.3) % 1
    d.ellipse((x - r, y - r, x + r, y + r), outline=rgba(col, a), width=6)
    rr = r + 50 * k; d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=rgba(col, a * (1 - k)), width=4)
def label_box(d, xy, title, sub, a, col=GOLD, align="left"):
    if a <= 0: return
    x, y = xy; f1, f2 = cond(50, 8), cond(34, 6)
    w = max(f1.getlength(title) + 6 * len(title), f2.getlength(sub) + 4 * len(sub)) + 50
    x0 = x if align == "left" else x - w
    d.rounded_rectangle((x0, y, x0 + w, y + 136), 12, fill=rgba(NAVY_D, 0.9 * a), outline=rgba(col, a), width=3)
    tracked(d, (x0 + 25, y + 18), title, f1, rgba(col, a), 6); tracked(d, (x0 + 25, y + 84), sub, f2, rgba(CREAM, a), 4)
def lerp(a, b, u): return a + (b - a) * max(0.0, min(1.0, u))
def strike(d, x0, y, x1, a, col=RED_E):
    if a > 0: d.line((x0, y, x0 + (x1 - x0) * a, y), fill=rgba(col, 1.0), width=10)

def catmull(pts, n=10):
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        for k in range(n):
            u = k / n
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u ** 3) for j in (0, 1)))
    return out + [pts[-1]]
def fit_pts(pts, box, src=(1920, 1356)):
    x0, y0, x1, y1 = box; s = min((x1 - x0) / src[0], (y1 - y0) / src[1])
    ox = x0 + ((x1 - x0) - src[0] * s) / 2; oy = y0 + ((y1 - y0) - src[1] * s) / 2
    return [(ox + x * s, oy + y * s) for x, y in pts]

# Track lines traced from the Commons maps (Will Pittenger, Bahrain; AEPA Racing, Albert Park), in map pixels, race direction.
BAH = [(760, 1290), (400, 1292), (60, 1290), (30, 1265), (60, 1230), (110, 1170), (115, 1120), (75, 1010), (60, 960), (65, 900), (95, 600),
       (160, 140), (185, 100), (230, 95), (280, 120), (320, 180), (370, 240), (510, 370), (600, 395), (645, 430), (660, 500), (645, 580),
       (660, 640), (720, 700), (930, 840), (940, 875), (905, 890), (850, 885), (420, 835), (360, 850), (290, 950), (300, 975), (500, 995),
       (1360, 993), (1410, 960), (1420, 880), (1380, 780), (1300, 720), (1170, 680), (1090, 630), (1045, 540), (1050, 450), (1110, 290),
       (1170, 215), (1230, 190), (1280, 215), (1320, 260), (1880, 1200), (1875, 1240), (1770, 1285), (1300, 1290), (760, 1290)]
BAH_T12 = (1048, 520)
ALB = [(1050, 1075), (710, 1015), (700, 960), (640, 915), (500, 893), (300, 835), (190, 775), (185, 745), (220, 660), (195, 600), (140, 520),
       (150, 420), (200, 320), (290, 185), (330, 180), (420, 140), (510, 130), (640, 165), (740, 310), (765, 400), (860, 600), (1000, 700),
       (1200, 730), (1240, 690), (1280, 660), (1480, 700), (1820, 900), (1760, 980), (1650, 1075), (1580, 1060), (1470, 1000), (1450, 1020),
       (1445, 1120), (1400, 1140), (1050, 1075)]
ALB_ZONES = [(0, 1), (17, 19), (20, 22), (25, 26)]          # end of the pit straight, the run to 9/10, the lake straight, the run to 13

def track(d, pts, box, a, src, width=16, col=CREAM, draw=1.0):
    p = catmull(fit_pts(pts, box, src)); n = max(2, int(len(p) * draw))
    d.line(p[:n], fill=rgba((10, 14, 26), 0.9 * a), width=width + 12, joint="curve")
    d.line(p[:n], fill=rgba(col, 0.85 * a), width=width, joint="curve")
    return p
def track_zone(d, pts, i, j, box, a, src, col=GOLD, width=22):
    p = catmull(fit_pts(pts[i:j + 1], box, src))
    d.line(p, fill=rgba(col, 0.35 * a), width=width + 22, joint="curve")
    d.line(p, fill=rgba(col, a), width=width, joint="curve")

# ---------------------------------------------------------------- cold open
def speedo(d, L, t, sc):
    """Flat out, and the car slows: throttle stays at 100% while the speed falls 267 -> 233."""
    a = ramp(t, 0, 0.4); k1, k2 = lt("And the car is slowing down.", sc), lt("Thirty kilometres an hour, gone.", sc)
    k3, k4 = lt("Not because he lifted.", sc), lt("Because the car decided to.", sc)
    tracked(d, (420, 175), "THROTTLE", cond(36, 8), rgba(GOLD, a), 8, "center")
    bar(d, 360, 230, 480, 800, ramp(t, 0.1, 0.7), a, (90, 200, 110), vertical=True)
    num(d, (420, 820), "100%", a * ramp(t, 0.5, 0.8), (110, 220, 130), 80)
    v = lerp(248, 267, t / max(k1, 0.1)) if t < k1 else lerp(267, 233, (t - k1) / 2.6)
    num(d, (1040, 180), f"{v:.0f}", a, RED_E if t > k1 + 0.2 else CREAM, 300)
    tracked(d, (1040, 520), "KM/H", cond(44, 8), rgba(CREAM, a), 10, "center")
    # the speed trace being drawn
    x0, x1, y0, y1 = 700, 1680, 640, 860; d.rectangle((x0, y0, x1, y1), outline=rgba(CREAM, 0.35 * a), width=2)
    tt = [i * 0.05 for i in range(int(min(t, k1 + 4.5) / 0.05))]
    if len(tt) > 1:
        sp = [lerp(248, 267, u / max(k1, 0.1)) if u < k1 else lerp(267, 233, (u - k1) / 2.6) for u in tt]
        pts = [(x0 + (x1 - x0) * u / (k1 + 4.5), y1 - (y1 - y0) * (s - 225) / 50) for u, s in zip(tt, sp)]
        d.line(pts, fill=rgba(GOLD, a), width=6, joint="curve")
    tracked(d, (x0, y1 + 16), "SPEED", cond(28, 6), rgba(CREAM, 0.7 * a), 6)
    b = ramp(t, k2, k2 + 0.25)
    if b > 0: place_stamp(L, 1570, 330, b, text="−30 KM/H", size=90, color=RED_E, rot=-7)
    tag(d, (420, 940), "DRIVER: FLAT OUT", ramp(t, k3, k3 + 0.3), (110, 220, 130), 38)
    tag(d, (1190, 940), "CAR: HARVESTING ENERGY", ramp(t, k4, k4 + 0.3), RED_E, 38)

def rulebook(d, L, t, sc):
    """'Within three months, Formula One had to change its own brand-new rules.'"""
    a = ramp(t, 0.1, 0.5); y = 160 + 30 * (1 - a)
    if a > 0:
        d.rounded_rectangle((560, y, 1360, y + 760), 14, fill=rgba(CREAM, a), outline=rgba(GOLD, a), width=4)
        tracked(d, (960, y + 50), "FIA FORMULA 1", cond(40, 8), rgba(NAVY_D, a), 8, "center")
        text_top(d, (960, y + 110), "2026 Regulations", pf(64, 800), rgba(NAVY_D, a), "center")
        for i in range(9):
            w_ = 560 - 90 * (i % 3); d.rounded_rectangle((960 - w_ / 2, y + 260 + i * 46, 960 + w_ / 2, y + 278 + i * 46), 6, fill=rgba((150, 150, 160), 0.8 * a))
    tag(d, (960, 90), "FEBRUARY TO MAY 2026", ramp(t, 0.6, 1.0), GOLD, 40)
    b = ramp(t, atf("Within three months", 0.62, sc), atf("Within three months", 0.62, sc) + 0.25)
    if b > 0: place_stamp(L, 960, 560, b, text="CHANGED", size=150, color=RED_E, rot=-9)

def title(d, L, t, sc):
    a = ramp(t, 0.1, 0.5)
    tracked(d, (W / 2, 330), "F1 EXPLAINED", cond(46, 8), rgba(GOLD, a), 14, "center")
    big(d, 400, "Superclipping", ramp(t, 0.3, 0.8), CREAM, 190)
    w = 700 * ramp(t, 0.8, 1.6); d.line((W / 2 - w / 2, 680, W / 2 + w / 2, 680), fill=rgba(GOLD, 1), width=4)
    tracked(d, (W / 2, 720), "FULL THROTTLE  ·  GETTING SLOWER", cond(38, 8), rgba(CREAM, ramp(t, 1.4, 1.9)), 10, "center")

# ---------------------------------------------------------------- I. the new cars
def power_split(d, L, t, sc):
    k = lt("The new ones get about half", sc); k2 = atf("The new ones get about half", 0.55, sc)
    a = ramp(t, 0, 0.4)
    paste_box(L, C + W17, 710, 120, 500, 280, a, 0.55, 0.5); d.rectangle((705, 115, 1215, 405), outline=rgba(GOLD, a), width=4)
    tag(d, (960, 460), "THE OLD POWER UNITS  ·  2014–2025", ramp(t, 0.2, 0.6) * (1 - ramp(t, k - 0.4, k)), CREAM, 40)
    strike(d, 600, 485, 1320, ramp(t, 1.2, 1.7) * (1 - ramp(t, k - 0.4, k)))
    if t > k - 0.3:
        b = ramp(t, k - 0.3, k + 0.2); x0, x1, y0, y1 = 260, 1660, 560, 720; xm = (x0 + x1) / 2
        d.rounded_rectangle((x0, y0, x1, y1), 14, fill=rgba(NAVY_D, 0.9 * b), outline=rgba(CREAM, 0.6 * b), width=3)
        p1 = ramp(t, k, k + 0.9); p2 = ramp(t, k2, k2 + 0.9)
        if p1 > 0: d.rectangle((x0 + 8, y0 + 8, x0 + 8 + (xm - x0 - 10) * p1, y1 - 8), fill=rgba(PETROL, b))
        if p2 > 0: d.rectangle((xm + 2, y0 + 8, xm + 2 + (x1 - xm - 10) * p2, y1 - 8), fill=rgba(CYAN, b))
        tracked(d, ((x0 + xm) / 2, 600), "PETROL ENGINE", cond(44, 8), rgba(NAVY_D, p1), 6, "center")
        tracked(d, ((xm + x1) / 2, 600), "ELECTRIC MOTOR + BATTERY", cond(44, 8), rgba(NAVY_D, p2), 6, "center")
        num(d, ((x0 + xm) / 2, 760), "≈ 50%", p1, PETROL, 110); num(d, ((xm + x1) / 2, 760), "≈ 50%", p2, CYAN, 110)
        tracked(d, (960, 40), "2026", cond(44, 8), rgba(GOLD, b), 14, "center")

def kw_counter(d, L, t, sc):
    a = ramp(t, 0, 0.4); p = ramp(t, 0.3, 2.0); k = lt("Close to five hundred horsepower", sc)
    cx, cy, r = 700, 560, 300
    d.arc((cx - r, cy - r, cx + r, cy + r), 140, 400, fill=rgba(CREAM, 0.25 * a), width=34)
    if p > 0: d.arc((cx - r, cy - r, cx + r, cy + r), 140, 140 + 260 * p, fill=rgba(CYAN, a), width=34)
    num(d, (cx, cy - 170), f"{350 * p:.0f}", a, CREAM, 230)
    tracked(d, (cx, cy + 110), "KILOWATTS", cond(44, 8), rgba(CYAN, a), 10, "center")
    tracked(d, (cx, cy + 190), "THE ELECTRIC MOTOR", cond(32, 6), rgba(CREAM, a), 8, "center")
    b = ramp(t, k, k + 0.4)
    if b > 0:
        num(d, (1380, 300), "≈ 470", b, GOLD, 200)
        tracked(d, (1380, 560), "HORSEPOWER", cond(48, 8), rgba(GOLD, b), 10, "center")
        tag(d, (1380, 680), "FROM ELECTRICITY ALONE", ramp(t, k + 0.6, k + 1.0), CYAN, 38)

def battery_story(d, L, t, sc):
    a = ramp(t, 0, 0.4); k1, k2, k3 = lt("It only holds enough energy", sc), lt("So it has to be refilled.", sc), lt("Again and again", sc)
    tag(d, (W / 2, 140), "THE BATTERY IS SMALL", a, GOLD, 46)
    if t < k1: lvl = 1.0
    elif t < k2: lvl = 1 - ramp(t, k1 + 0.4, k1 + 3.4)
    elif t < k3: lvl = ramp(t, k2, k2 + 1.6)
    else: u = (t - k3) % 2.0; lvl = 1 - u / 1.2 if u < 1.2 else (u - 1.2) / 0.8
    battery(d, W / 2, 470, 760, 300, lvl, a)
    if k1 <= t < k2:
        tag(d, (W / 2, 720), "FULL POWER: EMPTY IN A FEW SECONDS", ramp(t, k1 + 0.3, k1 + 0.7), RED_E, 40)
        num(d, (W / 2, 790), f"{min(t - k1 - 0.4, 3.0) if t > k1 + 0.4 else 0:.1f} s", ramp(t, k1 + 0.4, k1 + 0.7), CREAM, 120)
    if t >= k2:
        tag(d, (W / 2, 720), "REFILL", ramp(t, k2, k2 + 0.3) * (1 - ramp(t, k3 - 0.2, k3)), (110, 220, 130), 46)
        for i in range(3):                                  # charge arrows
            y = 470 + (i - 1) * 70; xo = ((t * 300 + i * 90) % 260)
            d.polygon([(560 - 160 + xo, y - 20), (560 - 120 + xo, y), (560 - 160 + xo, y + 20)], fill=rgba((110, 220, 130), ramp(t, k2, k2 + 0.3)))
    if t >= k3:
        lap = int((t - k3) / 2.0) + 1
        tag(d, (W / 2, 720), f"LAP {lap}  ·  LAP {lap + 1}  ·  LAP {lap + 2}  ·  …", ramp(t, k3, k3 + 0.3), GOLD, 46)
        tracked(d, (W / 2, 830), "EMPTY · REFILL · EMPTY · REFILL", cond(36, 8), rgba(CREAM, ramp(t, k3 + 0.5, k3 + 0.9)), 10, "center")

# ---------------------------------------------------------------- II. refilling (on George Russell's 2026 Mercedes, side on, 1:1 with the frame)
MGUK, MGUH, WHEEL_R, BATT = (1340, 640), (1250, 470), (1635, 650), (1000, 655)
def photo_layer(path, amt):
    return bg_of(C + path, amt)
def two_generators(d, L, t, sc):
    s2 = "One from the brakes, and one from the hot exhaust"
    k1, k2 = lt(s2, sc), atf(s2, 0.42, sc)
    tag(d, (W / 2, 190), "TWO WAYS TO MAKE ELECTRICITY  ·  2014–2025", ramp(t, 0.1, 0.5), GOLD, 40)
    pulse(d, MGUK, t, ramp(t, k1, k1 + 0.3), CYAN); label_box(d, (960, 800), "1 · BRAKING", "THE MOTOR ON THE REAR AXLE (MGU-K)", ramp(t, k1 + 0.2, k1 + 0.6), CYAN)
    pulse(d, MGUH, t, ramp(t, k2, k2 + 0.3), PETROL); label_box(d, (420, 290), "2 · EXHAUST GASES", "SPINNING A TURBO (MGU-H)", ramp(t, k2 + 0.2, k2 + 0.6), PETROL)

def motor_backwards(d, L, t, sc):
    k1 = lt("The motor on the rear axle can run backwards", sc); k2 = atf("The motor on the rear axle can run backwards", 0.55, sc)
    k3 = lt("When it does, it slows the car down", sc); k4 = atf("When it does, it slows the car down", 0.6, sc)
    tag(d, (W / 2, 190), "2026: ONE WAY LEFT", ramp(t, 0.1, 0.5), GOLD, 40)
    pulse(d, MGUK, t, ramp(t, k1, k1 + 0.3), CYAN)
    rev = t > k2; col = RED_E if rev else (110, 220, 130)
    a = ramp(t, k1 + 0.3, k1 + 0.7)
    if a > 0:
        # Mike 21 Oct: the arrows turned the wrong way. The car faces left, so a forward-rolling wheel turns anticlockwise on
        # screen, and it keeps doing so as a generator: only the ENERGY changes direction (shown by the flow arrows).
        x, y = WHEEL_R; r = 175; base = -t * 220
        for i in range(3):
            st = base + i * 120; d.arc((x - r, y - r, x + r, y + r), st, st + 70, fill=rgba(col, a), width=12)
            th = math.radians(st); px, py = x + r * math.cos(th), y + r * math.sin(th)       # arrowhead on the leading end
            tx, ty = math.sin(th), -math.cos(th); nx, ny = math.cos(th), math.sin(th)
            d.polygon([(px + tx * 30, py + ty * 30), (px + nx * 18, py + ny * 18), (px - nx * 18, py - ny * 18)], fill=rgba(col, a))
        if not rev: flow(d, [BATT, MGUK, WHEEL_R], t, a, (110, 220, 130), n=10, speed=0.5, r=8)   # battery drives the wheels
        label_box(d, (1880, 860), "GENERATOR" if rev else "MOTOR", "THE WHEELS NOW DRIVE THE MOTOR" if rev else "THE BATTERY DRIVES THE WHEELS", a, col, "right")
    b = ramp(t, k3, k3 + 0.3)
    if b > 0:
        tag(d, (1640, 420), "SLOWS THE CAR", b, RED_E, 38)
        flow(d, [WHEEL_R, MGUK, BATT], t, ramp(t, k4, k4 + 0.4), CYAN, n=14, speed=0.5, r=9)
        battery(d, BATT[0], BATT[1] + 210, 240, 100, ramp(t, k4, k4 + 4.0) * 0.9 + 0.1, ramp(t, k4, k4 + 0.4))
        tag(d, (BATT[0], BATT[1] + 320), "ELECTRICITY", ramp(t, k4 + 0.2, k4 + 0.6), CYAN, 38)

def lap_ribbon(d, L, t, sc):
    """A lap laid out as a ribbon: short red braking zones, long gold straights and fast corners."""
    k1, k2 = lt("But on many tracks", sc), lt("Long straights, fast corners", sc); k3 = atf("Long straights, fast corners", 0.6, sc)
    a = ramp(t, 0, 0.4); x0, x1, y0, y1 = 160, 1760, 400, 560
    tracked(d, (W / 2, 330), "ONE LAP", cond(46, 8), rgba(GOLD, a), 14, "center")
    segs = [(0, 0.17, "S"), (0.17, 0.2, "B"), (0.2, 0.3, "F"), (0.3, 0.46, "S"), (0.46, 0.49, "B"), (0.49, 0.62, "F"), (0.62, 0.8, "S"), (0.8, 0.83, "B"), (0.83, 1.0, "F")]
    dr = ramp(t, 0.1, 1.2)
    for u0, u1, k in segs:
        if u0 > dr: continue
        u1_ = min(u1, dr); xa, xb = x0 + (x1 - x0) * u0, x0 + (x1 - x0) * u1_
        if k == "B": col, al = RED_E, a * (0.5 + 0.5 * ramp(t, k1, k1 + 0.3) * (0.6 + 0.4 * math.sin(t * 9)))
        else: col, al = GOLD if k == "S" else (230, 200, 130), a * (0.45 + 0.55 * ramp(t, k2, k2 + 0.4))
        d.rectangle((xa, y0, xb, y1), fill=rgba(col, al))
    for i, (lab, col) in enumerate([("STRAIGHT", GOLD), ("FAST CORNER", (230, 200, 130)), ("HEAVY BRAKING", RED_E)]):   # legend
        lx = W / 2 - 520 + i * 360; d.rectangle((lx, y1 + 30, lx + 40, y1 + 60), fill=rgba(col, a))
        tracked(d, (lx + 56, y1 + 30), lab, cond(30, 8), rgba(CREAM, a), 6)
    mk = ((t * 0.18) % 1) if dr >= 1 else dr                          # a car going round the lap
    mx = x0 + (x1 - x0) * mk; d.polygon([(mx, y0 - 14), (mx - 18, y0 - 46), (mx + 18, y0 - 46)], fill=rgba(CREAM, a))
    tag(d, (x0 + (x1 - x0) * 0.47, 660), "HEAVY BRAKING: ONLY A FEW SECONDS", ramp(t, k1 + 0.2, k1 + 0.6), RED_E, 38)
    tag(d, (W / 2, 190), "STRAIGHTS + FAST CORNERS: MOST OF THE LAP", ramp(t, k2, k2 + 0.4), GOLD, 38)
    b = ramp(t, k3, k3 + 0.4)
    if b > 0:
        battery(d, W / 2 - 220, 800, 560, 200, 0.22 + 0.08 * math.sin(t * 3), b)
        tag(d, (W / 2 + 330, 780), "NOT ENOUGH TO REFILL", b, RED_E, 44)

# ---------------------------------------------------------------- III. the problem
def two_ways(d, L, t, sc):
    k = lt("There are two ways.", sc)
    tag(d, (W / 2, 220), "THE ENERGY HAS TO COME FROM SOMEWHERE ELSE", ramp(t, 0.1, 0.5), GOLD, 42)
    for i, (n_, txt) in enumerate([("1", "LIFT AND COAST"), ("2", "?")]):
        b = ramp(t, k + 0.2 + 0.5 * i, k + 0.6 + 0.5 * i); x = W / 2 + (i - 0.5) * 640
        if b <= 0: continue
        d.rounded_rectangle((x - 280, 400 + 30 * (1 - b), x + 280, 760 + 30 * (1 - b)), 22, fill=rgba(NAVY_D, 0.92 * b), outline=rgba(GOLD, b), width=5)
        num(d, (x, 420 + 30 * (1 - b)), n_, b, GOLD, 170)
        tracked(d, (x, 650 + 30 * (1 - b)), txt, cond(50 if len(txt) > 2 else 90, 8), rgba(CREAM, b), 8, "center")

STR0, STR1, BRAKE = 200, 1720, 1500                                    # the straight in the trace graphics
def axes(d, a, title_=None):
    d.line((STR0, 900, STR1, 900), fill=rgba(CREAM, 0.6 * a), width=3)
    for y_ in range(260, 900, 30): d.line((BRAKE, y_, BRAKE, y_ + 15), fill=rgba(RED_E, 0.9 * a), width=4)
    tracked(d, (BRAKE, 915), "BRAKING POINT", cond(30, 8), rgba(RED_E, a), 6, "center")
    tracked(d, (STR0, 915), "THE STRAIGHT  ›", cond(30, 8), rgba(CREAM, 0.8 * a), 6)
    if title_: tag(d, (W / 2, 120), title_, a, GOLD, 44)
def lift_coast(d, L, t, sc):
    a = ramp(t, 0, 0.4); k = lt("The driver lifts off the throttle", sc); p = ramp(t, k - 0.3, k + 4.5)
    axes(d, a, "1 · LIFT AND COAST")
    LIFT = 1180; xe = STR0 + (STR1 - STR0) * max(p, 0.02)
    tracked(d, (STR0, 260), "THROTTLE", cond(30, 8), rgba(GOLD, a), 6)
    th = [(x, 330 if x < LIFT else 470) for x in range(STR0, int(xe), 6)]
    if len(th) > 1: d.line(th, fill=rgba(GOLD, a), width=7)
    tracked(d, (STR0, 560), "SPEED", cond(30, 8), rgba(CREAM, a), 6)
    sp = [(x, 820 - 230 * (x - STR0) / (LIFT - STR0) if x < LIFT else 590 + 0.18 * (x - LIFT) if x < BRAKE else 648 + 1.2 * (x - BRAKE)) for x in range(STR0, int(xe), 6)]
    if len(sp) > 1: d.line(sp, fill=rgba(CREAM, a), width=7)
    if xe > LIFT:
        b = ramp(t, k + 2.6, k + 3.2)
        d.rectangle((LIFT, 260, min(xe, BRAKE), 880), fill=rgba(CYAN, 0.18 * b))
        tag(d, ((LIFT + BRAKE) / 2, 780), "COASTING", b, CYAN, 34)
        tag(d, ((LIFT + BRAKE) / 2, 840), "MOTOR HARVESTS", ramp(t, k + 3.6, k + 4.0), CYAN, 30)
        tag(d, (LIFT, 400), "LIFT", b, GOLD, 34)

def wing_poly(cx, cy, chord, thick, ang):
    """An upside-down aerofoil outline (curved underside: it pushes the car down), rotated by ang degrees about its leading edge (cx, cy)."""
    pts = []
    for i in range(21):
        u = i / 20; pts.append((u * chord, -thick * 0.4 * 4 * u * (1 - u)))
    for i in range(20, -1, -1):
        u = i / 20; pts.append((u * chord, thick * 4 * u * (1 - u) * (1 - 0.3 * u)))
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in pts]
def wings(d, L, t, sc):
    """Active aero: the flap flattens on the straight, snaps back up when the driver lifts."""
    a = ramp(t, 0, 0.4); k1, k2, k3 = lt("On the straights, they flatten out", sc), lt("Lift off the throttle, and they flip", sc), lt("That costs speed", sc)
    paste_box(L, C + ALPINE_REAR, 120, 110, 420, 260, a, 0.42, 0.13); d.rectangle((115, 105, 545, 375), outline=rgba(GOLD, a), width=4)
    tracked(d, (330, 390), "THE REAR WING", cond(28, 8), rgba(GOLD, a), 6, "center")
    tag(d, (1150, 120), "2026: MOVING WINGS", ramp(t, 0.2, 0.6), GOLD, 44)
    flat = ramp(t, k1, k1 + 0.6) * (1 - ramp(t, k2 + 0.6, k2 + 0.8))
    ang = lerp(-32, -6, flat)
    d.polygon(wing_poly(760, 600, 520, 70, -6), fill=rgba(CREAM, a))                    # main plane
    d.polygon(wing_poly(1270, 560, 360, 60, ang), fill=rgba(GOLD, a))                   # the moving flap
    mode = "STRAIGHT MODE  ·  LOW DRAG" if flat > 0.5 else "CORNER MODE  ·  HIGH DOWNFORCE"
    tag(d, (1150, 860), mode, ramp(t, 0.4, 0.8), CYAN if flat > 0.5 else GOLD, 40)
    for i in range(5):                                                                     # airflow
        y = 430 + i * 70; off = (t * 600 + i * 130) % 1500
        bend = (1 - flat) * (40 if i < 3 else -20)
        d.line([(200 + off * 0.2, y), (700 + off * 0.2, y), (1300, y - bend), (1750, y - bend * 2.2)], fill=rgba(CREAM, 0.25 * a), width=3, joint="curve")
    tracked(d, (1720, 260), "THROTTLE", cond(28, 8), rgba(GOLD, a), 6, "center")
    bar(d, 1670, 300, 1770, 760, 1 - ramp(t, k2, k2 + 0.25) if t > k1 - 1 else 0.3, a, (90, 200, 110), vertical=True)
    b = ramp(t, k3, k3 + 0.3)
    if b > 0:
        d.line((1500, 700, 1500 - 300 * b, 700), fill=rgba(RED_E, 1), width=16)
        d.polygon([(1500 - 300 * b - 40, 700), (1500 - 300 * b, 670), (1500 - 300 * b, 730)], fill=rgba(RED_E, 1))
        tag(d, (1330, 770), "DRAG  =  LOST SPEED", b, RED_E, 36)

def hud_flat(d, L, t, sc):
    s = "Keep your foot flat to the floor"; k1, k2, k3 = lt(s, sc), atf(s, 0.3, sc), atf(s, 0.62, sc)
    a = ramp(t, 0, 0.4); tag(d, (W / 2, 120), "2 · KEEP YOUR FOOT DOWN", a, GOLD, 44)
    d.rounded_rectangle((300, 300, 1620, 820), 24, fill=rgba(NAVY_D, 0.85 * a), outline=rgba(GOLD, a), width=4)
    rows = [(k1, "THROTTLE", "100%  ·  FLAT OUT", (110, 220, 130)), (k2, "WINGS", "FLAT  ·  STRAIGHT MODE", CYAN), (k3, "MOTOR", "HARVESTING", RED_E)]
    for i, (kk, l_, v_, col) in enumerate(rows):
        b = ramp(t, kk, kk + 0.35); y = 360 + i * 150
        tracked(d, (360, y + 20), l_, cond(44, 8), rgba(CREAM, b), 8)
        tracked(d, (760, y + 20), v_, cond(50, 8), rgba(col, b), 8)
    b = ramp(t, k3, k3 + 0.4)
    battery(d, 1450, 690, 220, 90, ramp(t, k3, k3 + 3) * 0.7 + 0.2, b)

def traces(d, L, t, sc):
    """Lift-and-coast v superclipping: both slow before the brakes; one with the throttle still at 100%."""
    a = ramp(t, 0, 0.4); k1, k2 = lt("That's clipping.", sc), lt("And when the motor harvests hard", sc)
    axes(d, a)
    big(d, 60, "CLIPPING", ramp(t, k1, k1 + 0.3) * (1 - ramp(t, k2 - 0.2, k2)), CREAM, 120)
    big(d, 40, "SUPERCLIPPING", ramp(t, k2, k2 + 0.4), GOLD, 140)
    LIFT, CLIP = 1180, 1050
    xs = range(STR0, BRAKE + 160, 6)
    lc = [(x, 820 - 230 * (x - STR0) / (LIFT - STR0) if x < LIFT else 590 + 0.18 * (x - LIFT) if x < BRAKE else 648 + 1.2 * (x - BRAKE)) for x in xs]
    d.line(lc, fill=rgba(CREAM, 0.55 * a), width=6); tracked(d, (STR0 + 20, 860), "LIFT AND COAST", cond(30, 8), rgba(CREAM, 0.7 * a), 6)
    p = ramp(t, k2, k2 + 3.5); xe = STR0 + (BRAKE + 160 - STR0) * p
    sc_ = [(x, 820 - 260 * (x - STR0) / (CLIP - STR0) if x < CLIP else 560 + 0.17 * (x - CLIP) if x < BRAKE else 636 + 1.2 * (x - BRAKE)) for x in xs if x < xe]
    if len(sc_) > 1: d.line(sc_, fill=rgba(GOLD, a), width=9)
    tracked(d, (STR0, 260), "THROTTLE", cond(30, 8), rgba(GOLD, ramp(t, k2, k2 + 0.4)), 6)
    th = [(x, 330) for x in xs if x < min(xe, BRAKE)]
    if len(th) > 1: d.line(th, fill=rgba((110, 220, 130), a), width=7)
    b = ramp(t, k2 + 2.2, k2 + 2.7)
    if b > 0:
        d.rectangle((CLIP, 260, BRAKE, 880), fill=rgba(RED_E, 0.14 * b))
        tag(d, ((CLIP + BRAKE) / 2, 420), "THROTTLE STILL 100%", b, (110, 220, 130), 32)
        tag(d, ((CLIP + BRAKE) / 2, 700), "SLOWING ANYWAY", ramp(t, k2 + 3.0, k2 + 3.4), RED_E, 32)

# ---------------------------------------------------------------- IV. what it looked like
def bahrain_map(d, L, t, sc):
    a = ramp(t, 0, 0.4); s = "At Bahrain's fastest corner"; k1, k2 = lt(s, sc), atf(s, 0.45, sc); k3 = lt("With the driver flat out.", sc)
    box = (100, 160, 1060, 980); src = (1920, 1356)
    track(d, BAH, box, a, src, 14, CREAM, ramp(t, 0, 1.4))
    t12 = fit_pts([BAH_T12], box, src)[0]
    pulse(d, t12, t, ramp(t, k1, k1 + 0.4), GOLD, 30)
    label_box(d, (t12[0] + 60, t12[1] - 150), "TURN 12", "THE FASTEST CORNER", ramp(t, k1 + 0.2, k1 + 0.6), GOLD)
    tracked(d, (W / 2, 60), "BAHRAIN  ·  FEBRUARY 2026 TESTING", cond(38, 8), rgba(GOLD, a), 10, "center")
    b = ramp(t, k2 - 0.3, k2)
    v = lerp(267, 233, (t - k2) / 3.0)
    num(d, (1480, 250), f"{v:.0f}", b, RED_E if t > k2 + 0.3 else CREAM, 260)
    tracked(d, (1480, 560), "KM/H", cond(44, 8), rgba(CREAM, b), 10, "center")
    tag(d, (1480, 680), "267 TO 233", ramp(t, k2 + 3.0, k2 + 3.4), GOLD, 44)
    tag(d, (1480, 800), "THROTTLE: 100%", ramp(t, k3, k3 + 0.3), (110, 220, 130), 40)

def melbourne(d, L, t, sc):
    a = ramp(t, 0, 0.4); k = lt("Sixteen seconds a lap", sc)
    box = (90, 150, 1150, 980); src = (1920, 1326)
    track(d, ALB, box, a, src, 14, CREAM, ramp(t, 0, 1.4))
    for i, (u, v) in enumerate(ALB_ZONES):
        b = ramp(t, 1.6 + 0.6 * i, 2.0 + 0.6 * i) * (0.75 + 0.25 * math.sin(t * 5 + i))
        if b > 0: track_zone(d, ALB, u, v, box, b, src, GOLD, 18)
    tracked(d, (W / 2, 60), "MELBOURNE  ·  ALBERT PARK", cond(38, 8), rgba(GOLD, a), 10, "center")
    tag(d, (620, 1010), "GOLD: WHERE CARS WERE EXPECTED TO SUPERCLIP", ramp(t, 2.0, 2.4), GOLD, 30)
    c = ramp(t, 3.0, 6.0); b = ramp(t, 2.8, 3.2)
    num(d, (1520, 220), f"{16 * c:.0f}", b, GOLD, 300)
    tracked(d, (1520, 560), "SECONDS A LAP", cond(46, 8), rgba(CREAM, b), 10, "center")
    tracked(d, (1520, 630), "(ONE ANALYSIS, AT 250 kW)", cond(28, 6), rgba(CREAM, 0.7 * b), 6, "center")
    tag(d, (1520, 780), "FULL THROTTLE  ·  GETTING SLOWER", ramp(t, k, k + 0.4), RED_E, 36)

# ---------------------------------------------------------------- V. the danger
HAAS_BOX, ALP_BOX = (80, 290, 1820, 810), (150, 360, 1770, 850)
def two_cars(d, L, t, sc):
    """Same straight, one car deploying (Haas), one holding back (Alpine): the gap closes fast."""
    a = ramp(t, 0, 0.4); k1, k2 = lt("One car can have far more energy", sc), lt("One pushing hard, one holding back", sc)
    d.rectangle((0, 560, W, 860), fill=rgba((40, 44, 56), 0.9 * a))
    for i in range(12):
        x = (i * 200 + t * 420) % (W + 200) - 100; d.rectangle((x, 706, x + 100, 714), fill=rgba(CREAM, 0.5 * a))
    m = ramp(t, k2, k2 + 4.0)
    xa, xh = 500 - 30 * m, 1520 - 330 * m                         # closes from ~1000 px to ~700 px apart: never touching
    chip(L, C + ALPINE, ALP_BOX, xa, 710, 600, a)
    chip(L, C + HAAS, HAAS_BOX, xh, 710, 600, a)
    tracked(d, (W / 2, 120), "SAME STRAIGHT  ·  DIFFERENT ENERGY", cond(44, 8), rgba(GOLD, a), 10, "center")
    b = ramp(t, k1, k1 + 0.4)
    battery(d, xh, 450, 200, 80, 0.95, b); battery(d, xa, 450, 200, 80, 0.12, b)
    tag(d, (xh, 330), "DEPLOYING", ramp(t, k2, k2 + 0.3), (110, 220, 130), 36)
    tag(d, (xa, 330), "HOLDING BACK", ramp(t, k2 + 0.5, k2 + 0.8), RED_E, 36)
    g = ramp(t, k2 + 0.8, k2 + 1.2)
    if g > 0:
        gx0, gx1 = xa + 310, xh - 310
        if gx1 > gx0:
            d.line((gx0, 940, gx1, 940), fill=rgba(GOLD, g), width=6)
            for x_ in (gx0, gx1): d.line((x_, 915, x_, 965), fill=rgba(GOLD, g), width=6)
        tracked(d, ((xa + xh) / 2, 980), "THE GAP", cond(32, 8), rgba(GOLD, g), 8, "center")

# ---------------------------------------------------------------- VI. the fix
def rule_card(d, L, t, sc):
    a = ramp(t, 0, 0.4); k1, k2 = lt("All the teams agreed.", sc), lt("The superclipping limit went up", sc)
    d.rounded_rectangle((300, 180, 1620, 900), 24, fill=rgba(NAVY_D, 0.92 * a), outline=rgba(GOLD, a), width=5)
    tracked(d, (960, 230), "RULE CHANGE  ·  FROM THE MIAMI GRAND PRIX", cond(44, 8), rgba(GOLD, a), 8, "center")
    ph = a * (1 - ramp(t, k2 - 0.4, k2))
    if ph > 0:
        paste_box(L, C + MIAMI, 600, 310, 720, 405, ph, 0.5, 0.5); d.rectangle((596, 306, 1324, 719), outline=rgba(GOLD, ph), width=3)
        tracked(d, (960, 740), "MIAMI  ·  MAY 2026", cond(34, 8), rgba(CREAM, ph), 8, "center")
    tag(d, (960, 845), "ALL TEAMS AGREED", ramp(t, k1, k1 + 0.3), (110, 220, 130), 42)
    b = ramp(t, k2, k2 + 0.4); u = ramp(t, k2 + 1.5, k2 + 3.0)
    tracked(d, (960, 480), "SUPERCLIPPING LIMIT", cond(46, 8), rgba(CREAM, b), 10, "center")
    num(d, (700, 560), "250", b * (1 - 0.5 * u), CREAM, 200); tracked(d, (700, 770), "kW", cond(40, 8), rgba(CREAM, b), 6, "center")
    if b * u > 0: arrow(d, (900, 680), (1020, 680), b * u, GOLD, 10, 30)
    num(d, (1220, 560), "350", b * u, GOLD, 200); tracked(d, (1220, 770), "kW", cond(40, 8), rgba(GOLD, b * u), 6, "center")
    strike(d, 600, 680, 800, ramp(t, k2 + 1.2, k2 + 1.6))

def burst(d, L, t, sc):
    """'Harvest harder?' A long slow fade becomes a short, sharp dip."""
    a = ramp(t, 0, 0.4); k0 = lt("Harvest harder?", sc); k1, k2 = lt("But it means the car fills", sc), lt("Less time slowing", sc)
    tag(d, (W / 2, 110), "THAT SOUNDS BACKWARDS", a * (1 - ramp(t, k0 - 0.2, k0)), CREAM, 44)
    big(d, 60, "Harvest harder?", ramp(t, k0, k0 + 0.3), GOLD, 120)
    axes(d, ramp(t, k1 - 0.5, k1))
    xs = range(STR0, BRAKE + 1, 6)
    old = [(x, 420 + 220 * ramp(x, 700, BRAKE)) for x in xs]
    new = [(x, 420 + 220 * ramp(x, 1250, 1420)) for x in xs]
    p1 = ramp(t, k1, k1 + 1.8); p2 = ramp(t, atf("But it means the car fills", 0.6, sc), atf("But it means the car fills", 0.6, sc) + 1.8)
    def part(pts, p): return pts[:max(2, int(len(pts) * p))]
    if p1 > 0: d.line(part(old, p1), fill=rgba(CREAM, 0.7), width=7); tag(d, (820, 700), "250 kW: A LONG, SLOW FADE", ramp(t, k1 + 0.8, k1 + 1.2), CREAM, 32)
    if p2 > 0: d.line(part(new, p2), fill=rgba(GOLD, 1), width=10); tag(d, (1330, 300), "350 kW: A SHORT BURST", p2, GOLD, 32)
    b = ramp(t, k2, k2 + 0.4)
    if b > 0:
        d.rectangle((700, 950, BRAKE, 980), fill=rgba(CREAM, 0.6 * b)); d.rectangle((1250, 1000, 1420, 1030), fill=rgba(GOLD, b))
        tracked(d, (STR0, 950), "TIME SLOWING", cond(30, 8), rgba(CREAM, b), 6)

def quali(d, L, t, sc):
    a = ramp(t, 0, 0.4); k = lt("So drivers could push harder", sc); s = "And in qualifying"
    tracked(d, (W / 2, 140), "QUALIFYING  ·  ENERGY RECHARGED PER LAP", cond(44, 8), rgba(GOLD, a), 10, "center")
    u = ramp(t, atf(s, 0.75, sc), atf(s, 0.75, sc) + 0.8)
    for i, (lab, fr, col, al) in enumerate([("BEFORE", 8 / 9, CREAM, a), ("FROM MIAMI", 7 / 9, GOLD, u)]):
        y = 300 + i * 200; tracked(d, (300, y + 30), lab, cond(40, 8), rgba(col, al), 8)
        bar(d, 650, y, 1500, y + 110, fr, al, CYAN); num(d, (1600, y - 10), "8 MJ" if i == 0 else "7 MJ", al, col, 110, "left")
    b = ramp(t, k, k + 0.4)
    if b > 0:
        tracked(d, (W / 2, 760), "LESS TO RECHARGE  =  MORE OF THE LAP FLAT OUT", cond(44, 8), rgba(CREAM, b), 8, "center")
        bar(d, 400, 840, 1520, 900, ramp(t, k + 0.3, k + 1.8) * 0.85 + 0.05, b, (110, 220, 130))

# ---------------------------------------------------------------- VIII. how to spot it
def hud_spot(d, L, t, sc):
    """Onboard-style: throttle 100%, the speed falling, the engine note fading, SUPERCLIPPING."""
    a = ramp(t, 0, 0.4); s = "If it drops away before the braking zone"; k1 = lt("Listen to the engine note.", sc); k2, k3 = lt(s, sc), atf(s, 0.82, sc)
    d.rounded_rectangle((260, 200, 1660, 900), 30, fill=rgba(NAVY_D, 0.85 * a), outline=rgba(CREAM, 0.5 * a), width=3)
    tracked(d, (380, 250), "THROTTLE", cond(32, 8), rgba(GOLD, a), 6, "center")
    bar(d, 330, 300, 430, 840, 1.0, a, (90, 200, 110), vertical=True)
    v = 318 - 28 * ramp(t, k2 + 0.3, k2 + 4.0)
    num(d, (900, 260), f"{v:.0f}", a, RED_E if t > k2 + 0.6 else CREAM, 240); tracked(d, (900, 560), "KM/H", cond(40, 8), rgba(CREAM, a), 8, "center")
    amp = 1 - 0.75 * ramp(t, k2 + 0.1, k2 + 2.0); b = ramp(t, k1, k1 + 0.4)            # follows ENGINE: full revs, dropping on k2
    tracked(d, (1380, 300), "ENGINE NOTE", cond(32, 8), rgba(GOLD, b), 6, "center")
    for i in range(24):
        h = (60 + 50 * math.sin(t * 13 + i * 0.9) ** 2) * amp; x = 1170 + i * 18
        d.rectangle((x, 520 - h, x + 10, 520 + h), fill=rgba(CREAM, b))
    if t > k3:
        c = ramp(t, k3, k3 + 0.25) * (0.75 + 0.25 * math.sin(t * 10))
        d.rounded_rectangle((560, 700, 1360, 840), 16, fill=rgba(RED_E, c))
        tracked(d, (960, 733), "SUPERCLIPPING", cond(70, 8), rgba(CREAM, c), 14, "center")

# ---------------------------------------------------------------- the video
s6 = "At the Japanese Grand Prix, at Suzuka"
scenes = [
    opening(AI + TURN12, "Superclipping.", "F1 EXPLAINED  ·  THE RULE F1 HAD TO FIX", credit="AI illustration", focus=((0.5, 0.55), (0.5, 0.6))),
    # cold open
    VS("Bahrain, February 2026.", "ai_bahrain_clip.mp4", strap=("Bahrain", "PRE-SEASON TESTING  ·  FEBRUARY 2026", 0.6),
       fallback=AS("Bahrain, February 2026.", TURN12, zoom=(1.0, 1.15), focus=((0.5, 0.55), (0.5, 0.6)), strap=("Bahrain", "PRE-SEASON TESTING  ·  FEBRUARY 2026", 0.6))),
    CuS("The driver's foot is pinned to the floor.", speedo, bg=bga(TURN12, 0.84)),
    FC("Fernando Alonso joked", ALONSO, "Fernando Alonso", "ASTON MARTIN", focus=(0.5, 0.3), facts=[(0.5, "Two-time world champion")]),
    AF("Fernando Alonso joked", 0.5, CHEF, zoom=(1.0, 1.12), focus=((0.5, 0.45), (0.5, 0.4)), texts=[(1.0, "“Even the team chef could drive it”", "mid")]),
    CuS("Within three months", rulebook, bg=bga(PITLANE, 0.86)),
    CuS("This is superclipping, explained.", title, bg=bga(TURN12, 0.82)),
    # I. the new cars
    PS("To understand superclipping", W17, zoom=(1.0, 1.1), focus=((0.5, 0.55), (0.5, 0.55)), chapter=CH("I", "THE NEW CARS"),
       strap=("Mercedes W17", "A 2026 FORMULA ONE CAR", 1.6)),
    CuS("Formula One threw out its old engines.", power_split, bg=bgp(W17, 0.9)),
    CuS("That electric motor is huge", kw_counter, bg=bgp(VER_CAR, 0.9)),
    CuS("But the battery is small.", battery_story, bg=bgp(PIA_CAR, 0.9)),
    # II. how the battery gets refilled
    CuS("The old cars had two ways", two_generators, bg=bgp(RUSSELL, 0.35), chapter=CH("II", "HOW THE BATTERY GETS REFILLED")),
    PS("For 2026, the exhaust one was scrapped.", HAM_BAH, zoom=(1.0, 1.1), focus=((0.45, 0.6), (0.5, 0.6)),
       texts=[(0.4, "The exhaust generator: scrapped.", "mid"), (rel("Too expensive, too complicated.", S("For 2026, the exhaust one was scrapped.", -0.15)), "Too expensive. Too complicated.", "mid")]),
    CuS("That left one.", motor_backwards, bg=bgp(RUSSELL, 0.35)),
    PS("Under braking, that's perfect.", PIA_BRAKE, zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.5, 0.55)), strap=("Suzuka", "BRAKING FOR THE HAIRPIN", 0.4),
       texts=[(1.2, "Braking: free energy.", "mid")]),
    CuS("But on many tracks, there isn't enough braking.", lap_ribbon, bg=bgp(ALONSO_CAR, 0.88)),
    # III. the problem
    CuS("So the cars have to find energy", two_ways, bg=bgp(W17, 0.9), chapter=CH("III", "THE PROBLEM")),
    CuS("The first is lift and coast.", lift_coast, bg=bgp(VER_CAR, 0.92)),
    PS("But in 2026, that has a catch.", ALPINE_REAR, zoom=(1.0, 1.12), focus=((0.3, 0.45), (0.25, 0.45)), texts=[(0.6, "But there's a catch.", "mid")]),
    CuS("The new cars have moving wings.", wings, bg=bgp(ALPINE_REAR, 0.9)),
    CuS("So there's a second way.", hud_flat, bg=bgp(VER_CAR, 0.55)),
    CuS("That's clipping.", traces, bg=bgp(HAAS, 0.92)),
    PS("The car runs out of push", SPOON_NOR, zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.55, 0.55)), texts=[(0.8, "Out of push, before the brakes.", "mid")]),
    # IV. what it looked like
    AS("At the first tests", PITLANE, zoom=(1.0, 1.12), focus=((0.45, 0.5), (0.5, 0.5)), chapter=CH("IV", "WHAT IT LOOKED LIKE"),
       strap=("Pre-season testing", "BAHRAIN  ·  FEBRUARY 2026", 0.4), texts=[(2.2, "The limit: 250 kW", "mid")]),
    CuS("At Bahrain's fastest corner", bahrain_map),
    VS("On television, it looked strange.", "ai_straight_clip.mp4", skip=0.5,
       texts=[(rel("A car at full throttle, getting slower.", S("On television, it looked strange.", -0.15)), "Full throttle. Getting slower.", "mid")],
       fallback=AS("On television, it looked strange.", FLATOUT, zoom=(1.0, 1.1), texts=[(2.9, "Full throttle. Getting slower.", "mid")])),
    CuS("And in Melbourne", melbourne),
    # V. the danger
    PS("That was strange.", SPOON_ANT, zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.55, 0.55)), chapter=CH("V", "THE DANGER"),
       texts=[(rel("But then it became dangerous.", S("That was strange.", -0.15)), "Then it became dangerous.", "mid")]),
    CuS("Because not every car uses its energy", two_cars, bg=lambda t: navy_bg()),
    FC(s6, BEARMAN, "Oliver Bearman", "HAAS", focus=(0.5, 0.3), facts=[(0.8, "Second full season in F1")]),
    FCF(s6, 0.55, COLAPINTO, "Franco Colapinto", "ALPINE", focus=(0.5, 0.3), facts=[(0.6, "The car in front")]),
    # Mike 21 Oct: from behind with a moving camera the cars "went backwards". Fixed camera now, both cars drive away and
    # the Haas closes in; good to 2.3 s (then the cars look merged), played at 45%. The aftermath takes over on "nowhere to go".
    VS("Bearman was using his battery.", "ai_closing_clip.mp4", end=2.3, min_rate=0.45, max_rate=0.45,
       texts=[(rel("The difference in speed", S("Bearman was using his battery.", -0.15)), "About 50 km/h faster", "big")],
       fallback=AS("Bearman was using his battery.", CLOSING, zoom=(1.0, 1.15), texts=[(1.6, "About 50 km/h faster", "big")])),
    AS("He had nowhere to go.", AFTERMATH, zoom=(1.0, 1.12), focus=((0.55, 0.5), (0.6, 0.5)),
       texts=[(rel("The impact was measured at fifty G.", S("He had nowhere to go.", -0.15)), "Impact: 50G", "big")]),
    PS("Bearman walked away with bruising.", HAAS, zoom=(1.0, 1.1), focus=((0.5, 0.55), (0.5, 0.55)),
       texts=[(0.3, "Bruising. No fractures.", "mid"), (rel("But drivers said they had seen it coming.", S("Bearman walked away with bruising.", -0.15)), "Drivers had seen it coming.", "mid")]),
    # VI. the fix
    AS("The FIA, the teams and the engine makers", MEETING, zoom=(1.0, 1.1), focus=((0.5, 0.5), (0.5, 0.45)), chapter=CH("VI", "THE FIX"),
       strap=("April 2026", "THE FIA  ·  THE TEAMS  ·  THE ENGINE MAKERS", 0.4)),
    CuS("And before the Miami Grand Prix", rule_card, bg=bgp(MIAMI, 0.86)),
    CuS("That sounds backwards.", burst, bg=bgp(SPOON_ANT, 0.92)),
    CuS("And in qualifying", quali, bg=bga(PITLANE, 0.9)),
    # VII. did it work?
    PS("The answer depends on who you ask.", MIAMI, zoom=(1.0, 1.1), chapter=CH("VII", "DID IT WORK?"), strap=("Miami", "MAY 2026", 0.3)),
    FC("Max Verstappen called the changes", VER, "Max Verstappen", "RED BULL", focus=(0.55, 0.35),
       facts=[(0.9, "“More of a tickle”"), (("Not what was needed", 0.0), "Not enough to make the cars flat out")]),
    FC("Lewis Hamilton said", HAM_SUZ, "Lewis Hamilton", "FERRARI", focus=(0.5, 0.5), facts=[(1.0, "Sunday racing: the best of his career")]),
    FC("And Oscar Piastri warned", PIASTRI, "Oscar Piastri", "McLAREN", focus=(0.5, 0.35), facts=[(1.4, "Closing speeds can still be huge")]),
    PS("What everyone agrees on is this.", PIA_CAR, zoom=(1.0, 1.1), focus=((0.5, 0.55), (0.5, 0.55))),
    VS("In 2026, the fastest driver", "ai_grid_clip.mp4",
       texts=[(rel("It's the one who spends his energy best.", S("In 2026, the fastest driver", -0.15)), "Whoever spends their energy best.", "mid")],
       fallback=AS("In 2026, the fastest driver", GRID, zoom=(1.0, 1.1), texts=[(7.0, "Whoever spends their energy best.", "mid")])),
    # VIII. how to spot it
    PS("So next time you watch a race", ALONSO_CAR, zoom=(1.0, 1.25), focus=((0.5, 0.55), (0.52, 0.55)), chapter=CH("VIII", "HOW TO SPOT IT"),
       texts=[(rel("Watch a car at the end of a long straight.", S("So next time you watch a race", -0.15)), "Watch the end of a long straight.", "mid")]),
    CuS("Listen to the engine note.", hud_spot, bg=bgp(W17, 0.6)),
    PS("You're watching a car refill its battery", SPOON_LEC, zoom=(1.0, 1.12), focus=((0.5, 0.55), (0.55, 0.55)), texts=[(1.0, "Refilling at 300 km/h.", "mid")]),
    # IX. what do you think?
    CuS("So here's the question.", what_if("Clever engineering?", "Is superclipping clever engineering", "Or a step too far?", "Or a sign the rules went too far"),
        bg=bga(GRID, 0.86)),
    CuS("This was F1 Explained", f1_end(), bg=bga(TURN12, 0.86)),
]
scenes = [s for s in scenes if s is not None]

if __name__ == "__main__":
    if sys.argv[1:] == ["check"]: print(shot_check(scenes, OUT.replace("video/", "sheets/") + "check.jpg"))
    else: main(scenes, FINAL, effects=[(S("If it drops away before the braking zone") - ENGINE_DROP, ENGINE, -10)])
