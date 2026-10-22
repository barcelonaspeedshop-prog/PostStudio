"""ai_narration: turn AI voice files (one per script section, in order) into narration.wav + sentences.json.

    ~/.venvs/poststudio/bin/python studio/ai_narration.py docs/videos/10-chrysler-turbine/script_v2.md \
        "/Volumes/PostDrive/Omnira F1/Videos/.../audio/v2/parts" "/Volumes/PostDrive/Omnira F1/Videos/.../audio/v2"

An AI read has no retakes, so (unlike narration.py) nothing is cut: each section file is transcribed with word
timings and the script's sentences are mapped onto the words in order (difflib over normalised tokens, so "1963"
and "nineteen sixty-three" or "Gee-ah" and "Ghia" still line up). Sections are joined with a fixed gap and levelled.
Writes narration.wav, sentences.json (out_start/out_end per sentence, the format episode.py reads), narration_check.txt
(what Whisper heard for every sentence, with a match score; anything under 0.85 is listed first to listen to).
"""
import json, os, subprocess, sys
from difflib import SequenceMatcher
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import narration as N

GAP_SECT = 1.0

def section_words(path):
    r = N.transcribe(path)                                       # whole section at once: no retakes to lose
    return [(w["start"], w["end"], w["word"].strip()) for sg in r["segments"] for w in sg.get("words", [])]

def map_section(sents, words):
    """[(start, end, heard_text, score)] for each script sentence, from the section's words."""
    T = N.tokens(words); tt = [t for t, _ in T]
    st = []; owner = []                                           # script tokens and which sentence each belongs to
    for k, s in enumerate(sents):
        for tok in N.norm(s["text"]): st.append(tok); owner.append(k)
    first, last = {}, {}
    for a, b, n in SequenceMatcher(None, st, tt, autojunk=False).get_matching_blocks():
        for j in range(n):
            k, wi = owner[a + j], T[b + j][1]
            first.setdefault(k, wi); last[k] = wi
    out, prev = [], -1
    for k, s in enumerate(sents):
        if k not in first:                                        # nothing matched: sit between the neighbours
            out.append(None); continue
        f, l = max(first[k], prev + 1), max(last[k], first[k]); prev = l
        heard = " ".join(w[2] for w in words[f:l + 1])
        out.append((words[f][0], words[l][1], heard, SequenceMatcher(None, N.norm(s["text"]), N.norm(heard)).ratio()))
    for k, v in enumerate(out):                                   # fill gaps from the neighbours
        if v is None:
            a = out[k - 1][1] if k and out[k - 1] else 0.0
            b = next((x[0] for x in out[k + 1:] if x), a + 1.0)
            out[k] = (a, b, "", 0.0)
    return out

def build(script, parts_dir, outdir):
    sents = N.script_sentences(script)
    secs = sorted({s["section"] for s in sents})
    parts = sorted(f for f in os.listdir(parts_dir) if f.endswith(".mp3") and not f.startswith("._"))
    assert len(parts) == len(secs), f"{len(parts)} audio files for {len(secs)} sections"
    os.makedirs(outdir, exist_ok=True); t0 = 0.0; edl = []; report = []; ins = []
    for sec, f in zip(secs, parts):
        p = os.path.join(parts_dir, f); dur = N.duration(p); ss = [s for s in sents if s["section"] == sec]
        for s, (a, b, heard, score) in zip(ss, map_section(ss, section_words(p))):
            e = dict(s, a=round(t0 + a, 3), b=round(t0 + b, 3), score=round(score, 2), out_start=round(t0 + a, 3), out_end=round(t0 + b, 3))
            edl.append(e); report.append((score, f"{score:.2f}  {e['out_start']:7.2f}  {s['text']}\n            heard: {heard}"))
        ins.append(p); t0 += dur + GAP_SECT
    for i, e in enumerate(edl): e["i"] = i
    out = os.path.join(outdir, "narration.wav")
    fc = "".join(f"[{i}:a]aresample=48000,aformat=channel_layouts=mono,apad=pad_dur={GAP_SECT}[a{i}];" for i in range(len(ins)))
    fc += "".join(f"[a{i}]" for i in range(len(ins))) + f"concat=n={len(ins)}:v=0:a=1,highpass=f=60,loudnorm=I=-16:TP=-1.5:LRA=9[o]"
    N.run("ffmpeg", "-v", "error", "-y", *sum((["-i", p] for p in ins), []), "-filter_complex", fc, "-map", "[o]", "-ar", "48000", "-ac", "1", out)
    N.run("ffmpeg", "-v", "error", "-y", "-i", out, "-b:a", "160k", os.path.join(outdir, "narration_preview.mp3"))
    json.dump(edl, open(os.path.join(outdir, "sentences.json"), "w"), indent=1)
    low = [r for s, r in report if s < 0.85]
    open(os.path.join(outdir, "narration_check.txt"), "w").write(
        f"{len(edl)} sentences, {t0:.1f}s, {len(low)} to listen to\n\n" + "\n".join(low) + "\n\n--- all ---\n" + "\n".join(r for _, r in report) + "\n")
    return edl, low, t0

if __name__ == "__main__":
    edl, low, t = build(*sys.argv[1:4])
    print(f"{len(edl)} sentences, {t:.1f}s, {len(low)} under 0.85"); print("\n".join(low))
