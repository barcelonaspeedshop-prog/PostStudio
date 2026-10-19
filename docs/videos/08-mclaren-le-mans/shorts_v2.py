"""Vertical Shorts cut from the finished v2 episode -> PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/shorts/v2/

    ~/.venvs/poststudio/bin/python shorts_v2.py            # all
    ~/.venvs/poststudio/bin/python shorts_v2.py 2          # just short 2
Each Short: the 16:9 episode in the middle over a blurred copy of itself, a hook + the IMPOSSIBLE mark
on top, word-by-word captions below (timed from the recording, spelled from the script), and an
end slate with a question the full episode answers (Mike 10-14: Shorts lead to the long video).
"""
import json, os, subprocess, sys, multiprocessing as mp
from difflib import SequenceMatcher
VDIR = os.path.dirname(os.path.abspath(__file__)); sys.argv_saved = sys.argv; sys.argv = ["build"]
sys.path.insert(0, VDIR); sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio"))
import build_v2 as B
import episode as E
import narration as N
from storykit import pf, cond, text_top, tracked, wrap, ramp, stamp_sfx, impossible_mark, NAVY_D, GOLD, CREAM
import math
from PIL import Image, ImageDraw
import numpy as np
sys.argv = sys.argv_saved

SRC = B.OUT + B.FINAL; OUTD = B.STORY + "shorts/v2/"; SW, SH, FPS = 1080, 1920, 25
SLATE = 3.0
SLATE_LINE = "IMPOSSIBLE  ·  EPISODE THREE  ·  LE MANS 1995"
SHORTS = [   # (file name, hook lines, first sentence, last sentence, end-slate question)
    ("1_road_car", ["A road car", "won Le Mans."], "June 1995.", "This is the story of the McLaren F1", "So how did it do it?"),
    ("2_three_seats", ["The driver sits", "in the middle."], "So what made the McLaren F1", "You got a perfect view", "And then there was the gold..."),
    ("3_gold", ["Real gold.", "In the engine bay."], "Third, the engine", "For seven years, no production car", "So why did they race it?"),
    ("4_aquaplaning", ["Why the rain", "changed everything."], "Here's why that changed", "And now it came to the front", "Then Lehto went to work."),
    ("5_lehto", ["20 seconds a lap", "faster. In the rain."], "JJ Lehto was on another level", "The grey car was chasing", "Who won it? The full story."),
    ("6_last_hours", ["One missed gear", "and it was over."], "Then, in the final hours", "It had won the Le Mans 24 Hours", "A road car. At the first attempt."),
    ("7_record", ["$34.7 million.", "A record."], "Only one hundred and six", "And number fifty-nine, the grey", "Was it the car, or Lehto?"),
]

def vt(t): return B.vt(t)   # narration time -> video time

# ---------------------------------------------------------------- caption words: times from Whisper, spelling from the script
def caption_words():
    cache = E.NA + "narration_words_final.json"
    src = E.NA + "narration.wav"
    if os.path.exists(cache) and json.load(open(cache))["mtime"] == os.path.getmtime(src):
        heard = json.load(open(cache))["words"]
    else:
        N.to_wav16(src, "/tmp/_mcl_n16.wav"); total = N.duration("/tmp/_mcl_n16.wav"); heard, a = [], 0.0
        while a < total:                                  # final cut has no retakes: long windows are fine
            b = min(a + 35, total); r = N.transcribe("/tmp/_mcl_n16.wav", a, b)
            for sg in r["segments"]:
                for w in sg["words"]:
                    st = a + w["start"]
                    if (a == 0 or st >= a + 2.5) and st < a + 32.5: heard.append([st, a + w["end"], w["word"]])
            a += 30
        heard.sort(); json.dump({"mtime": os.path.getmtime(src), "words": heard}, open(cache, "w"))
    out = []
    for e in E.SENTS:
        words = e["text"].replace("—", " ").split()
        hw = [h for h in heard if e["out_start"] - 0.15 <= h[0] <= e["out_end"] + 0.1]
        st = [N.norm(w)[:1] or [""] for w in words]; ht = [N.norm(h[2])[:1] or [""] for h in hw]
        times = [None] * len(words)
        for blk in SequenceMatcher(None, [x[0] for x in st], [x[0] for x in ht], autojunk=False).get_matching_blocks():
            for k in range(blk.size): times[blk.a + k] = hw[blk.b + k][0]
        known = [(i, t) for i, t in enumerate(times) if t is not None]
        anchors = [(-1, e["out_start"])] + known + [(len(words), e["out_end"])]
        for (i0, t0), (i1, t1) in zip(anchors, anchors[1:]):      # spread unmatched words evenly between anchors
            for i in range(i0 + 1, i1): times[i] = t0 + (t1 - t0) * (i - i0) / (i1 - i0)
        for w, t in zip(words, times): out.append((vt(t), w))
    return out

def chunks(words, t0, t1):
    """Group words into 1-3 word captions, breaking at punctuation."""
    sel = [(t, w) for t, w in words if t0 - 0.05 <= t < t1]; res, cur = [], []
    for t, w in sel:
        cur.append((t, w))
        if len(cur) == 3 or w[-1] in ".,?!:" or sum(len(x[1]) for x in cur) > 15: res.append(cur); cur = []
    if cur: res.append(cur)
    out = []
    for i, c in enumerate(res):
        end = res[i + 1][0][0] if i + 1 < len(res) else c[-1][0] + 0.6
        out.append((c[0][0], min(end, c[-1][0] + 1.2), " ".join(w.strip(".,:;—") for _, w in c).upper()))
    return out

_marks = {}
def mark(im, cx, cy, a, size, strike=1.0):
    """The IMPOSSIBLE mark ("IM" struck out) dropping in, in place of the BANNED stamp."""
    if a <= 0: return
    k = (size, round(strike, 2))
    if k not in _marks: _marks[k] = impossible_mark(size, strike=strike, dim=strike)
    m = _marks[k]; sc = 1.6 - 0.6 * a; m = m.resize((int(m.width * sc), int(m.height * sc)), Image.BICUBIC)
    m = Image.fromarray((np.asarray(m) * np.array([1, 1, 1, min(1, a)])).astype(np.uint8))
    im.alpha_composite(m, (int(cx - m.width / 2), int(cy - m.height / 2)))

# ---------------------------------------------------------------- render one Short
def render_short(job):
    name, hook, a_snip, z_snip, question, words = job
    t0 = B.S(a_snip, -0.25); t1 = vt(B.sent(z_snip)["out_end"]) + 0.35; dur = t1 - t0 + SLATE
    caps = chunks(words, t0, t1); os.makedirs(OUTD, exist_ok=True); out = OUTD + f"short_{name}.mp4"
    sfx = stamp_sfx(f"/tmp/_sfx_{name}.wav", length=1.2, hit=0.30)
    rd = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{t0:.3f}", "-i", SRC, "-t", f"{t1 - t0:.3f}", "-f", "rawvideo",
                           "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{SW}x{SH}", "-r", str(FPS), "-i", "-",
                           "-ss", f"{t0:.3f}", "-t", f"{t1 - t0:.3f}", "-i", SRC, "-i", sfx,
                           "-filter_complex", f"[1:a]afade=t=in:d=0.15,apad=pad_dur={SLATE},afade=t=out:st={dur - 1.6:.2f}:d=1.6[v];"
                                              f"[2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.7[fx];[v][fx]amix=inputs=2:normalize=0:duration=first[a]",
                           "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.3f}", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    hf = pf(92, 900); cf = cond(84, 8); last = None
    hook_layer = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(hook_layer)
    SLAM = 0.30                                              # the hook stamp slams on at the very start
    for i, ln in enumerate(hook): text_top(d, (SW / 2, 380 + i * 112), ln, hf, CREAM if i == 0 else GOLD, "center")
    for f in range(int(round(dur * FPS))):
        t = f / FPS; T = t0 + t
        if T < t1:
            b = rd.stdout.read(1920 * 1080 * 3)
            if len(b) == 1920 * 1080 * 3: last = Image.frombytes("RGB", (1920, 1080), b)
        src = last
        bg = src.resize((96, 54), Image.BILINEAR).resize((3413, 1920), Image.BILINEAR).crop((1166, 0, 1166 + SW, SH))
        im = Image.blend(bg, Image.new("RGB", (SW, SH), NAVY_D), 0.55).convert("RGBA")
        im.paste(src.resize((SW, 608), Image.LANCZOS), (0, 700))
        im.alpha_composite(hook_layer)
        mark(im, SW / 2, 230, ramp(t, 0.05, SLAM), 64, strike=ramp(t, SLAM, SLAM + 0.35))
        if SLAM <= t < SLAM + 0.4:                           # a short shake on impact
            k = 12 * math.exp(-(t - SLAM) / 0.07); dx, dy = k * math.sin(t * 97), k * math.cos(t * 83)
            im = im.transform((SW, SH), Image.AFFINE, (1, 0, -dx, 0, 1, -dy), Image.BICUBIC)
        d = ImageDraw.Draw(im)
        cap = next((c for c in caps if c[0] <= T < c[1]), None)
        if cap and T < t1:
            lines = wrap(cap[2], cf, 960)
            for i, ln in enumerate(lines):
                text_top(d, (SW / 2, 1420 + i * 100), ln, cf, (255, 255, 255, 255), "center")
        s = ramp(t, dur - SLATE, dur - SLATE + 0.4)          # end slate
        if s > 0:
            ov = Image.new("RGBA", (SW, SH), NAVY_D + (int(255 * s),)); im.alpha_composite(ov); d = ImageDraw.Draw(im)
            mark(im, SW / 2, 760, ramp(t, dur - SLATE + 0.2, dur - SLATE + 0.45), 110, strike=1.0)
            for i, ln in enumerate(wrap(question, pf(84, 900), 940)):
                text_top(d, (SW / 2, 930 + i * 104), ln, pf(84, 900), CREAM + (int(255 * s),), "center")
            tracked(d, (SW / 2, 1200), "FULL EPISODE ON THE CHANNEL", cond(44, 8), GOLD + (int(255 * s),), 8, "center")
            tracked(d, (SW / 2, 1270), SLATE_LINE, cond(34, 2), CREAM + (int(170 * s),), 6, "center")
        wr.stdin.write(im.convert("RGB").tobytes())
    rd.stdout.close(); rd.wait(); wr.stdin.close(); wr.wait()
    return out, round(dur, 1)

def _stroke_text():          # captions get a dark outline: patch text_top for this module only
    import storykit
    orig = storykit.text_top
    def text_top_stroke(d, xy, text, font, fill, align="left"):
        x, y = xy; w = font.getlength(text)
        if align == "center": x -= w / 2
        d.text((x, y - font.getbbox("H")[1]), text, font=font, fill=fill, stroke_width=6, stroke_fill=(0, 0, 0, 230))
        return w
    return text_top_stroke

if __name__ == "__main__":
    text_top = _stroke_text()
    words = caption_words()
    pick = [int(x) for x in sys.argv[1:]] or range(1, len(SHORTS) + 1)
    jobs = [(*SHORTS[i - 1], words) for i in pick]
    with mp.get_context("fork").Pool(len(jobs)) as pool:
        for out, dur in pool.map(render_short, jobs): print(f"{dur:5.1f}s  {out}")
