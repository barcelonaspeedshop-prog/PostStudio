"""vshort: standalone vertical Shorts (1080x1920), each cut from one section of a narration recording.

Mike 10-16: Shorts that aren't part of a long video, for every channel. Same rules as the long videos: something moves
on screen all the time, every idea is shown (a photo, then a drawing), and a hook is on screen from the first frame.

A Short is a list of scenes plus overlays, all timed in the Short's own seconds (0 = the first word):
    VPhoto(t, path, focus=((x, y), (x, y)), zoom=(1.0, 1.12))  photo, full-bleed if it is big enough, else a window
                                                                 on its own blurred copy (never blown up past `maxup`)
    VWide(t, frame16, crop)                                       a 1920x1080 animated scene (e.g. the airflow drawing)
    VGraphic(t, fn)                                               fn(t, dur) -> 1080x1920 RGBA, a full-frame drawing
    Pop(t, lines, dur)                                            big title lines in the top zone, slam in, fade out
    Tag(t, text, y, dur)                                          a gold label chip (names, places, years)
    Stamp(t, text, (x, y), dur)                                   the rubber stamp, with its sound
Captions (word chunks, timed from the recording, spelled from the script), a progress bar, the channel line and the
end slate are added by render().
"""
import json, math, os, subprocess
import numpy as np
from difflib import SequenceMatcher
from PIL import Image, ImageDraw, ImageFilter
from storykit import (pf, cond, ramp, ease, rgba, tracked, wrap, load, rubber_stamp, stamp_sfx, music_bed,
                      NAVY_D, GOLD, CREAM, RED)
import narration as N

SW, SH, FPS = 1080, 1920, 25
XF = 0.35                     # dissolve between scenes
WIN_CY = 1000                # centre of a photo window (pops above, captions below)
SLATE = 2.8

def stroke_text(d, xy, text, font, fill, align="center", sw=6):
    x, y = xy; w = font.getlength(text)
    if align == "center": x -= w / 2
    elif align == "right": x -= w
    d.text((x, y - font.getbbox("H")[1]), text, font=font, fill=fill, stroke_width=sw, stroke_fill=(0, 0, 0, int(fill[3] * 0.9) if len(fill) > 3 else 230))
    return w

_cache = {}
def blur_cover(path, dark=0.6):
    k = ("blur", path, dark)
    if k not in _cache:
        im = load(path); s = max(SW / im.width, SH / im.height) / 8
        sm = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4))
        sm = sm.resize((int(sm.width * 8) + 2, int(sm.height * 8) + 2), Image.BILINEAR)
        x0, y0 = (sm.width - SW) // 2, (sm.height - SH) // 2
        _cache[k] = Image.blend(sm.crop((x0, y0, x0 + SW, y0 + SH)), Image.new("RGB", (SW, SH), NAVY_D), dark).convert("RGBA")
    return _cache[k]

def shadow(w, h, r=30):
    k = ("sh", w, h)
    if k not in _cache:
        m = Image.new("L", (w + 4 * r, h + 4 * r), 0); ImageDraw.Draw(m).rectangle((2 * r, 2 * r, 2 * r + w, 2 * r + h), fill=210)
        _cache[k] = m.filter(ImageFilter.GaussianBlur(r))
    return _cache[k]

def grad(top=True, h=560, a=0.75):
    k = ("grad", top, h, a)
    if k not in _cache:
        g = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); px = np.zeros((SH, SW, 4), np.uint8); px[..., :3] = NAVY_D
        ys = np.arange(SH)
        al = np.clip(1 - ys / h, 0, 1) if top else np.clip((ys - (SH - h)) / h, 0, 1)
        px[..., 3] = (255 * a * al ** 1.3)[:, None]
        _cache[k] = Image.fromarray(px, "RGBA")
    return _cache[k]

# ---------------------------------------------------------------- scenes
class VScene:
    def __init__(self, start): self.start, self.dur = start, None

class VPhoto(VScene):
    """A photo that keeps moving (sub-pixel pan/zoom). Full-bleed when the picture is big enough for 9:16 without being
    blown up past `maxup`; otherwise a window as tall as the picture allows, on its own blurred copy; tiny pictures
    become a framed card."""
    def __init__(self, start, path, focus=((0.5, 0.5), (0.5, 0.5)), zoom=(1.0, 1.10), maxup=1.4, cy=WIN_CY, window=False):
        super().__init__(start); self.path, self.focus, self.zoom, self.maxup, self.cy = path, focus, zoom, maxup, cy
        im = load(path); w, h = im.size; zm = max(zoom)
        if max(SW / w, SH / h) * zm <= maxup and not window: self.mode, self.win = "full", (SW, SH)
        elif SW / w * zm <= maxup and maxup * h / zm >= 640: self.mode, self.win = "window", (SW, int(min(SH, maxup * h / zm, 1000)))
        else:
            s = min(maxup / zm, 940 / w, 1000 / h); self.mode, self.win = "card", (int(w * s), int(h * s))
        self.upscale = max(self.win[0] / w, self.win[1] / h) * zm

    def frame(self, t):
        im = load(self.path); w, h = im.size; ww, wh = self.win; a = ww / wh
        p = ease(min(1, max(0, t / max(self.dur or 1, 0.1))))
        z = self.zoom[0] + (self.zoom[1] - self.zoom[0]) * p
        fx = self.focus[0][0] + (self.focus[1][0] - self.focus[0][0]) * p
        fy = self.focus[0][1] + (self.focus[1][1] - self.focus[0][1]) * p
        bw, bh = (h * a, h) if w / h > a else (w, w / a)
        bw, bh = bw / z, bh / z
        x0 = min(max(fx * w - bw / 2, 0), w - bw); y0 = min(max(fy * h - bh / 2, 0), h - bh)
        pic = im.transform((ww, wh), Image.EXTENT, (x0, y0, x0 + bw, y0 + bh), Image.BICUBIC)
        if self.mode == "full":
            out = pic.convert("RGBA"); out.alpha_composite(grad(True)); out.alpha_composite(grad(False, 640, 0.85)); return out
        out = blur_cover(self.path).copy()
        x, y = (SW - ww) // 2, int(self.cy - wh / 2)
        sh = shadow(ww, wh); out.alpha_composite(Image.merge("RGBA", (*[Image.new("L", sh.size, 0)] * 3, sh)), (x - 60, y - 60 + 14))
        out.paste(pic, (x, y))
        if self.mode == "card": ImageDraw.Draw(out).rectangle((x - 1, y - 1, x + ww, y + wh), outline=rgba(CREAM, 0.55), width=3)
        return out

class VWide(VScene):
    """A 1920x1080 animated scene, cropped and scaled into a window over its own blurred copy."""
    def __init__(self, start, fn, crop=(0, 0, 1920, 1080), cy=WIN_CY):
        super().__init__(start); self.fn, self.crop, self.cy = fn, crop, cy
    def frame(self, t):
        f = self.fn(t); c = f.crop(self.crop); s = SW / c.width; pic = c.resize((SW, int(c.height * s)), Image.LANCZOS)
        bg = f.resize((48, 27), Image.BILINEAR).resize((3413, 1920), Image.BILINEAR).crop((1166, 0, 1166 + SW, SH))
        out = Image.blend(bg, Image.new("RGB", (SW, SH), NAVY_D), 0.55).convert("RGBA")
        out.paste(pic, (0, int(self.cy - pic.height / 2))); return out

class VGraphic(VScene):
    def __init__(self, start, fn): super().__init__(start); self.fn = fn
    def frame(self, t): return self.fn(t, self.dur or 5)

# ---------------------------------------------------------------- overlays
class Pop:
    """Big title lines in the top zone. First line cream, the rest gold. Slams in, fades out."""
    def __init__(self, t, lines, dur=3.0, y=300, size=96, colors=None):
        self.t, self.lines, self.dur, self.y, self.size, self.colors = t, lines, dur, y, size, colors
    def draw(self, L, T):
        lt = T - self.t
        if lt < 0 or lt > self.dur: return
        a = min(ramp(lt, 0, 0.18), 1 - ramp(lt, self.dur - 0.3, self.dur)); s = 1 + 0.25 * (1 - ease(lt / 0.22))
        f = pf(int(self.size * s), 800); d = ImageDraw.Draw(L)
        for i, ln in enumerate(self.lines):
            c = (self.colors or [CREAM] + [GOLD] * 9)[i]
            stroke_text(d, (SW / 2, self.y + i * self.size * 1.12 * s - (s - 1) * 60), ln, f, rgba(c, a), sw=5)

class Tag:
    """A label chip: navy, gold edge, condensed caps. Slides in from the left."""
    def __init__(self, t, text, y=1290, dur=3.0, sub=None, color=GOLD):
        self.t, self.text, self.y, self.dur, self.sub, self.color = t, text, y, dur, sub, color
    def draw(self, L, T):
        lt = T - self.t
        if lt < 0 or lt > self.dur: return
        a = min(ramp(lt, 0, 0.3), 1 - ramp(lt, self.dur - 0.3, self.dur)); d = ImageDraw.Draw(L)
        f = cond(58, 8); fs = cond(36, 2); w = max(f.getlength(self.text) + 8 * len(self.text), fs.getlength(self.sub or "") + 3 * len(self.sub or "")) + 70
        x = 60 - 120 * (1 - ease(ramp(lt, 0, 0.35))); h = 92 + (54 if self.sub else 0)
        d.rounded_rectangle((x, self.y, x + w, self.y + h), 10, fill=rgba(NAVY_D, 0.9 * a))
        d.rectangle((x, self.y, x + 8, self.y + h), fill=rgba(self.color, a))
        tracked(d, (x + 34, self.y + 22), self.text, f, rgba(CREAM, a), 8)
        if self.sub: tracked(d, (x + 34, self.y + 100), self.sub, fs, rgba(self.color, a), 3)

class Stamp:
    """The rubber stamp slamming on (its thump is mixed in by render)."""
    def __init__(self, t, text, xy=(SW / 2, 820), dur=2.5, size=120, rot=-9, color=RED):
        self.t, self.text, self.xy, self.dur, self.size, self.rot, self.color = t, text, xy, dur, size, rot, color
        self.img = None
    def draw(self, L, T):
        lt = T - self.t
        if lt < 0 or lt > self.dur: return
        if self.img is None: self.img = rubber_stamp(self.text, self.size, self.color, self.rot)
        a = min(ramp(lt, 0, 0.08), 1 - ramp(lt, self.dur - 0.3, self.dur)); s = 1 + 0.9 * (1 - ease(lt / 0.16))
        m = self.img.resize((int(self.img.width * s), int(self.img.height * s)), Image.BICUBIC)
        m = Image.fromarray((np.asarray(m) * np.array([1, 1, 1, a])).astype(np.uint8))
        L.alpha_composite(m, (int(self.xy[0] - m.width / 2), int(self.xy[1] - m.height / 2)))

# ---------------------------------------------------------------- captions
def caption_words(narr_dir, sents):
    """Every script word of these sentences with its time in the narration (Whisper times, script spelling)."""
    src = narr_dir + "narration.wav"; cache = narr_dir + "caption_words.json"
    if os.path.exists(cache) and json.load(open(cache))["mtime"] == os.path.getmtime(src):
        heard = json.load(open(cache))["words"]
    else:
        N.to_wav16(src, "/tmp/_vs_n16.wav"); total = N.duration("/tmp/_vs_n16.wav"); heard, a = [], 0.0
        while a < total:
            b = min(a + 35, total); r = N.transcribe("/tmp/_vs_n16.wav", a, b)
            for sg in r["segments"]:
                for w in sg["words"]:
                    st = a + w["start"]
                    if (a == 0 or st >= a + 2.5) and st < a + 32.5: heard.append([st, a + w["end"], w["word"]])
            a += 30
        heard.sort(); json.dump({"mtime": os.path.getmtime(src), "words": heard}, open(cache, "w"))
    out = []
    for e in sents:
        words = e["text"].replace("—", " ").split()
        hw = [h for h in heard if e["out_start"] - 0.15 <= h[0] <= e["out_end"] + 0.1]
        st = [N.norm(w)[:1] or [""] for w in words]; ht = [N.norm(h[2])[:1] or [""] for h in hw]
        times = [None] * len(words)
        for blk in SequenceMatcher(None, [x[0] for x in st], [x[0] for x in ht], autojunk=False).get_matching_blocks():
            for k in range(blk.size): times[blk.a + k] = hw[blk.b + k][0]
        known = [(i, t) for i, t in enumerate(times) if t is not None]
        anchors = [(-1, e["out_start"])] + known + [(len(words), e["out_end"])]
        for (i0, t0), (i1, t1) in zip(anchors, anchors[1:]):
            for i in range(i0 + 1, i1): times[i] = t0 + (t1 - t0) * (i - i0) / (i1 - i0)
        out += list(zip(times, words))
    return out

def chunks(words):
    res, cur = [], []
    for t, w in words:
        cur.append((t, w))
        initial = len(w.strip(".,")) == 1                                   # "H. H. Stephenson": an initial doesn't end a caption
        if len(cur) == 3 or (w[-1] in ".,?!:" and not initial) or sum(len(x[1]) for x in cur) > 14: res.append(cur); cur = []
    if cur: res.append(cur)
    out = []
    for i, c in enumerate(res):
        end = res[i + 1][0][0] if i + 1 < len(res) else c[-1][0] + 0.7
        out.append((c[0][0], min(end, c[-1][0] + 1.2), [w.strip(".,:;—?!").upper() for _, w in c], [t for t, _ in c]))
    return out

def draw_caption(L, caps, T):
    cap = next((c for c in caps if c[0] <= T < c[1]), None)
    if not cap: return
    d = ImageDraw.Draw(L); f = cond(86, 8); text = " ".join(cap[2])
    lines = wrap(text, f, 960); y0 = 1500
    k = 0                                                     # the word being spoken is gold, the rest white
    for i, ln in enumerate(lines):
        x = SW / 2 - f.getlength(ln) / 2
        for wd in ln.split():
            spoken = cap[3][min(k, len(cap[3]) - 1)] <= T
            col = (255, 214, 90, 255) if spoken and (k + 1 >= len(cap[3]) or cap[3][k + 1] > T) else (255, 255, 255, 255)
            d.text((x, y0 + i * 100 - f.getbbox("H")[1]), wd, font=f, fill=col, stroke_width=7, stroke_fill=(0, 0, 0, 235))
            x += f.getlength(wd + " "); k += 1

# ---------------------------------------------------------------- render
def frame_at(scenes, T):
    cur = [s for s in scenes if s.start <= T]; sc = cur[-1] if cur else scenes[0]
    im = sc.frame(T - sc.start)
    i = scenes.index(sc)
    if i + 1 < len(scenes) and T > scenes[i + 1].start - XF:            # dissolve into the next scene
        nx = scenes[i + 1]; a = ease((T - (nx.start - XF)) / XF)
        im = Image.blend(im.convert("RGBA"), nx.frame(T - nx.start).convert("RGBA"), a)
    return im.convert("RGBA")

def render(out, narr_dir, sents, scenes, overlays, channel_line, slate, music, music_gain=0.30, lead=0.25, tail=0.45):
    """sents: this Short's sentences (sentences.json entries). Scene/overlay times are seconds from the first word.
    slate = (question, small line). Writes out (mp4) and returns its length."""
    a0 = sents[0]["out_start"] - lead; a1 = sents[-1]["out_end"] + tail; body = a1 - a0; dur = body + SLATE
    words = [(t - a0 - lead, w) for t, w in caption_words(narr_dir, sents)]; caps = chunks(words)
    scenes = sorted(scenes, key=lambda s: s.start); scenes[0].start = min(scenes[0].start, -lead)
    for s, n in zip(scenes, scenes[1:]): s.dur = n.start - s.start
    scenes[-1].dur = body - lead - scenes[-1].start
    stamps = [o for o in overlays if isinstance(o, Stamp)]
    sfx = stamp_sfx("/tmp/_vs_sfx.wav", length=1.2, hit=0.30) if stamps else None
    bed, _ = music_bed(music, dur, f"/tmp/_vs_bed_{os.path.basename(out)}.wav", level=-20)
    ins = ["-ss", f"{a0:.3f}", "-t", f"{body:.3f}", "-i", narr_dir + "narration.wav", "-i", bed]
    fc = [f"[1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,afade=t=in:d=0.08,apad=pad_dur={SLATE + 1}[v]",
          f"[2:a]volume={music_gain * 1.6}[mus]", "[v]asplit=2[v1][key]",
          "[mus][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=600[duck]"]
    mix = ["[v1]", "[duck]"]
    for k, s in enumerate(stamps):
        ins += ["-i", sfx]; ms = int(max(0, s.t + lead - 0.30) * 1000)
        fc.append(f"[{3 + k}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.7,adelay={ms}|{ms}[s{k}]"); mix.append(f"[s{k}]")
    fc.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,atrim=0:{dur:.3f},"
              f"afade=t=out:st={dur - 1.2:.2f}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]")
    wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{SW}x{SH}", "-r", str(FPS), "-i", "-",
                           *ins, "-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-crf", "18",
                           "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.3f}",
                           "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for fno in range(int(round(dur * FPS))):
        wr.stdin.write(compose(scenes, overlays, caps, channel_line, slate, fno / FPS - lead, body - lead, dur - lead).convert("RGB").tobytes())
    wr.stdin.close(); wr.wait()
    return dur

def compose(scenes, overlays, caps, channel_line, slate, T, body, end):
    im = frame_at(scenes, min(T, body - 0.04)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, SW * min(1, max(0, T / body)), 10), fill=rgba(GOLD, 0.95))                   # progress bar
    tracked(d, (SW / 2, 74), channel_line, cond(34, 8), rgba(CREAM, 0.85), 7, "center")
    L = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    for o in overlays: o.draw(L, T)
    if T < body: draw_caption(L, caps, T)
    im.alpha_composite(L)
    s = ramp(T, body, body + 0.35)
    if s > 0:                                                                                    # end slate
        im.alpha_composite(Image.new("RGBA", (SW, SH), NAVY_D + (int(240 * s),))); d = ImageDraw.Draw(im)
        q, small = slate; f = pf(86, 800); lines = wrap(q, f, 940)
        y = 820 - len(lines) * 52 + 40 * (1 - ease(s))
        for i, ln in enumerate(lines): stroke_text(d, (SW / 2, y + i * 104), ln, f, rgba(CREAM, s), sw=0)
        tracked(d, (SW / 2, y + len(lines) * 104 + 70), "TELL ME IN THE COMMENTS", cond(46, 8), rgba(GOLD, s), 8, "center")
        if small: tracked(d, (SW / 2, y + len(lines) * 104 + 150), small, cond(36, 2), rgba(CREAM, 0.75 * s), 5, "center")
        sb = ramp(T, body + 0.6, body + 0.9)                                                    # Mike 10-19: ask for the subscribe
        if sb:
            yy = y + len(lines) * 104 + 240; d.rounded_rectangle((SW / 2 - 230, yy, SW / 2 + 230, yy + 96), 18, fill=rgba(RED, sb))
            tracked(d, (SW / 2, yy + 26), "SUBSCRIBE", cond(52, 8), rgba(CREAM, sb), 10, "center")
    return im
