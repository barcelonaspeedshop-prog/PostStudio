"""Preview of the diffuser explainer (sections 6-7) with a temporary Mac voice for timing only.

    ~/.venvs/poststudio/bin/python preview_airflow.py   -> 01 Brawn GP/video/preview_diffuser.mp4
"""
import os, re, subprocess, sys, tempfile
VDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(VDIR, "..", "..", "..", "studio")); sys.path.insert(0, VDIR)
from storykit import *
import airflow as AF

STORY = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/"
IMG = STORY + "media/ai/ai_cutaway_side.png"
GAP = 0.45

def lines(section_from, section_to):
    txt = open(os.path.join(VDIR, "script_v2.md")).read()
    body = txt.split(section_from, 1)[1].split(section_to, 1)[0]
    out = []
    for para in body.split("\n"):
        p = para.strip()
        if not p or p.startswith("[") or p.startswith("#"): continue
        out += [s for s in re.split(r"(?<=[.?!])\s+(?=[A-Z\"'])", p) if s]
    return out

def voice(sents, tmp):
    t, cues, files = 0.0, [], []
    for i, s in enumerate(sents):
        f = f"{tmp}/l{i:03d}.wav"
        subprocess.run(["say", "-v", "Daniel", "-r", "172", "-o", f, "--data-format=LEI16@48000", s.replace('"', "")], check=True)
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
        cues.append((t, s)); files.append((f, dur)); t += dur + GAP
    lst = f"{tmp}/a.txt"; sil = f"{tmp}/sil.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(GAP), "-c:a", "pcm_s16le", sil], check=True)
    open(lst, "w").write("".join(f"file '{f}'\nfile '{sil}'\n" for f, _ in files))
    return cues, t, lst

class FrameScene(Scene):
    def __init__(self, start, fn, cues, **kw): super().__init__(start, **kw); self.fn, self.cues = fn, cues
    def base(self, t): return self.fn(t)
    def frame(self, t):
        im = super().frame(t).convert("RGBA"); L = layer(); d = ImageDraw.Draw(L)
        said = [s for c, s in self.cues if c <= t + self.start]
        if said:
            d.rectangle((0, H - 120, W, H), fill=(0, 0, 0, 170))
            text_top(d, (W / 2, H - 98), "“" + said[-1] + "”", pf(38, 500), rgba(CREAM, 0.95), "center")
            tracked(d, (40, 30), "PREVIEW  ·  TEMPORARY COMPUTER VOICE, FOR TIMING ONLY", cond(26, 8), rgba(CREAM, 0.7), 5)
        im.alpha_composite(L); return im.convert("RGB")

if __name__ == "__main__":
    s6 = lines("## 6. The secret: what is a diffuser?", "## 7. The double diffuser")
    s7 = lines("## 7. The double diffuser", "And there was one more thing.")
    tmp = tempfile.mkdtemp()
    cues, total, lst = voice(s6 + s7, tmp)
    audio = f"{tmp}/voice.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-af", "apad=pad_dur=2", audio], check=True)
    def cue_in(start):
        def cue(snip):
            for c, s in cues:
                if s.startswith(snip) or snip in s: return c - start
            raise KeyError(snip)
        return cue
    t7 = [c for c, s in cues if s.startswith("Now remember those")][0] - 0.2
    scenes = [FrameScene(0, AF.diffuser_scene(IMG, cue_in(0)), cues),
              FrameScene(t7, AF.double_diffuser_scene(IMG, cue_in(t7)), cues)]
    out = STORY + "video/preview_diffuser.mp4"
    render(scenes, total + 2, audio, out, tmp=tmp + "/parts")
    print(out, round(total, 1), "s")
