"""episode: the shared parts of a BANNED episode build (ep 3 onwards; ep 1-2 keep their own copies).

    import episode as E; E.init("/Volumes/PostDrive/Stories/03 Group B/")
    from episode import *          # after init: S, at, PS, AS, OPT, CaS, CuS, CH, ...
    scenes = [opening(...), ..., CuS("So here's the question", what_if(...)), CuS("This was Banned", banned_end)]
    if __name__ == "__main__": main(scenes, FINAL)

Every scene is anchored to a sentence of the edited narration with S("words from the sentence").
Layout: STORY/media/{commons,mike,ai}, STORY/audio/{narration.wav, sentences.json, *.mp3 music}, STORY/video/.
"""
import glob, json, math, os, subprocess, sys
from storykit import *

INTRO = 5.0                                   # wordless open: stamp + title over footage, music from frame 0
STORY = C = M = A = AI = OUT = None; SENTS = []; _cr = {}

def init(story):
    global STORY, C, M, A, AI, OUT, SENTS, _cr
    STORY = story; C, M, A, AI = (story + p for p in ("media/commons/", "media/mike/", "audio/", "media/ai/")); OUT = story + "video/"
    SENTS = json.load(open(A + "sentences.json"))
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
    """The series open: the stamp slams down over moving footage, the episode title fades in under it."""
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

# ---------------------------------------------------------------- render + mix
def main(scenes, final, music_gain=0.35):
    scenes = [x for x in scenes if x is not None]
    os.makedirs(OUT, exist_ok=True)
    nd = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", A + "narration.wav"]))
    total = INTRO + nd + 3.0
    voice, audio = OUT + "voice.wav", OUT + "audio_mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", A + "narration.wav", "-filter_complex",
                    f"anullsrc=r=48000:cl=mono,atrim=0:{INTRO}[i];anullsrc=r=48000:cl=mono,atrim=0:3[e];[i][0:a][e]concat=n=3:v=0:a=1[o]",
                    "-map", "[o]", voice], check=True)
    tracks = sorted(glob.glob(A + "*.mp3"))
    bed, order = music_bed(tracks, total, OUT + "music_bed.wav"); print("music:", " -> ".join(order))
    sfx = stamp_sfx(OUT + "sting_sfx.wav")
    fc = (f"[1:a]volume={music_gain * 1.6}[mus];"
          f"[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[v1][key];[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck];"
          f"[2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.8[fx];[v1][duck][fx]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voice, "-i", bed, "-i", sfx, "-filter_complex", fc, "-map", "[o]", "-ar", "48000", audio], check=True)
    only = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else None
    out = OUT + ("preview.mp4" if only else final)
    render(scenes, total, audio, out, workers=9, only=only)
    for f in (audio, voice, sfx, bed): os.remove(f)
    import shutil; shutil.rmtree(out.replace(".mp4", "_parts"), ignore_errors=True)
    if not only:                                                              # small copy for review
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "26", "-preset", "fast",
                        "-c:a", "aac", "-b:a", "160k", out.replace(".mp4", "").rsplit(" - ", 1)[0] + " - review 720p.mp4"], check=True)
    print(out)
