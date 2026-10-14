"""narration: turn a raw one-file narration (with stops and retakes) into a clean voice track.

    ~/.venvs/poststudio/bin/python studio/narration.py docs/videos/01-fan-car/script.md raw.m4a "/Volumes/PostDrive/Stories/BANNED series/01 Fan Car/audio"

1. Split the script into sentences (headings, [edit notes] and the intro lines are skipped).
2. Transcribe the raw file with word timings (local Whisper, in overlapping windows, because
   Whisper silently drops repeated text on long files).
3. For each script sentence pick the LAST complete take, keeping the order of the script.
4. Restart check: if a take contains a pause, transcribe the audio after the pause on its own;
   if that alone is the whole sentence, the part before it was a false start, so cut it.
5. Join the takes with fixed gaps (sentence / paragraph / section), clean and level the voice.
Writes narration.wav, sentences.json (output start/end of every sentence) and edit_report.txt.
"""
import json, os, re, subprocess, sys
from difflib import SequenceMatcher

PY_MODEL = "mlx-community/whisper-large-v3-turbo"
GAP_SENT, GAP_PARA, GAP_SECT = 0.18, 0.40, 1.00
MATCH = 0.78            # how closely a take must match the script sentence to count as complete

# ---------------------------------------------------------------- script
def script_sentences(md_path):
    out, sect, para = [], -1, 0
    started = False
    for raw in open(md_path).read().split("\n\n"):
        block = raw.strip()
        if block.lower().startswith("## fact notes"): break                   # notes for us, never read out
        if block.startswith("## "): sect += 1; started = True; continue
        if not started or not block or block.startswith(("#", "---", "**[", ">", "[")): continue
        text = re.sub(r"\*\*\[.*?\]\*\*|\[[^\]]*\]", "", block).replace("*", "").strip()
        if not text: continue
        para += 1
        for s in re.split(r"(?<=[.?!])\s+(?=[A-Z0-9\"'“])", text):
            if s.strip(): out.append({"text": s.strip(), "section": sect, "para": para})
    return out

CUE = "stop"            # Mike says "stop" after a fluff, then restarts the sentence
_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
def say(n):
    n = int(n)
    if n < 20: return _ONES[n]
    if n < 100: return _TENS[n // 10] + ("" if n % 10 == 0 else " " + _ONES[n % 10])
    return _ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + say(n % 100))

def say_year(y):
    """1966 -> nineteen sixty six, 2009 -> two thousand nine, 2014 -> twenty fourteen (how years are read)."""
    y = int(y)
    if 2000 <= y <= 2009: return "two thousand" + ("" if y == 2000 else " " + _ONES[y - 2000])
    hi, lo = divmod(y, 100)
    return say(hi) + " " + ("hundred" if lo == 0 else ("oh " + _ONES[lo] if lo < 10 else say(lo)))

def norm(s):
    """Lower-case word tokens; numbers and years spelled out so the script ("2009") and the speech
    (Whisper writes "2009" or "two thousand nine") compare the same. "two thousand and nine" -> drop the "and"."""
    s = s.lower().replace("—", " ").replace("-", " ").replace("%", " per cent").replace("formula 1", "formula one")
    s = re.sub(r"\bf1\b", "formula one", s)
    s = re.sub(r"\b(1[89]\d\d|20\d\d)\b", lambda m: say_year(m.group()), s)
    s = re.sub(r"\bthousand and\b", "thousand", s)
    s = re.sub(r"\b\d{1,3}\b", lambda m: say(m.group()), s)
    return re.sub(r"[^a-z0-9 ]", " ", s).split()

# ---------------------------------------------------------------- audio helpers
def run(*a): subprocess.run(a, check=True)
def to_wav16(src, dst): run("ffmpeg", "-v", "error", "-y", "-i", src, "-ar", "16000", "-ac", "1", dst)
def duration(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))

def auto_threshold(wav):
    """Pause threshold from this recording's own levels: 40% of the way from room tone to speech."""
    import numpy as np
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                                     capture_output=True).stdout, np.int16).astype(np.float32) / 32768
    w = 800; r = 20 * np.log10(np.sqrt(np.mean(x[:len(x) // w * w].reshape(-1, w) ** 2, 1)) + 1e-9)
    lo, hi = np.percentile(r, 10), np.percentile(r, 90)
    return float(min(-30, max(-56, lo + 0.4 * (hi - lo))))

def silences(wav, db=None, d=0.12):
    db = auto_threshold(wav) if db is None else db
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", f"silencedetect=noise={db}dB:d={d}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)]
    en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]
    out = []
    for s, e in zip(st, en):                  # back-to-back detections are one pause
        if out and s - out[-1][1] < 0.02: out[-1] = (out[-1][0], e)
        else: out.append((s, e))
    return out

_model_loaded = False
def transcribe(wav, a=None, b=None, words=True, tmp="/tmp/_narr_clip.wav"):
    import mlx_whisper
    if a is not None:
        run("ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", wav, tmp); wav = tmp
    return mlx_whisper.transcribe(wav, path_or_hf_repo=PY_MODEL, word_timestamps=words, language="en",
                                  condition_on_previous_text=False)

def words_of(wav, sil=None, split=0.45, max_len=14.0):
    """Word list [(start, end, word)]. Each spoken phrase (audio between pauses of at least
    `split` s) is transcribed on its own: on longer clips Whisper quietly drops repeated
    sentences, which is exactly what retakes are."""
    total = duration(wav); sil = sil if sil is not None else silences(wav)
    cuts = [(s + e) / 2 for s, e in sil if e - s >= split]
    edges = [0.0] + cuts + [total]; chunks = []
    for a, b in zip(edges, edges[1:]):
        if chunks and b - chunks[-1][0] <= max_len and a - chunks[-1][1] < 0.01 and chunks[-1][1] - chunks[-1][0] < 2.5:
            chunks[-1] = (chunks[-1][0], b)           # glue very short phrases to the next one
        else: chunks.append((a, b))
    out = []
    for a, b in chunks:
        if b - a < 0.35: continue
        r = transcribe(wav, a, b)
        for sg in r["segments"]:
            if sg.get("no_speech_prob", 0) > 0.8: continue
            for w in sg.get("words", []): out.append((round(a + w["start"], 2), round(a + w["end"], 2), w["word"].strip()))
    return sorted(out)

# ---------------------------------------------------------------- alignment
def ratio(a, b): return SequenceMatcher(None, a, b, autojunk=False).ratio()

def sim(a, b):
    """Word match plus letter match, so a misheard name ("Guillon" for "Gijon") still counts as close."""
    return max(ratio(a, b), 0.97 * SequenceMatcher(None, " ".join(a), " ".join(b), autojunk=False).ratio())

def head_ok(tok, heads): return tok in heads or any(SequenceMatcher(None, tok, h).ratio() >= 0.6 for h in heads)

def tokens(W):
    """Expand words into normalised tokens, each carrying its word's index."""
    out = []
    for i, w in enumerate(W):
        for t in norm(w[2]): out.append((t, i))
    return out

def candidates(sent_words, T, W, lo_t):
    """All (first_word, last_word, score) spans matching the sentence, starting after time lo_t."""
    n = len(sent_words); toks = [t for t, _ in T]; heads = set(sent_words[:3]); found = []
    for j in range(len(T)):
        if W[T[j][1]][0] < lo_t or not head_ok(toks[j], heads): continue
        best = None
        for L in range(max(1, int(n * 0.7)), int(n * 1.35) + 2):
            if j + L > len(T): break
            r = sim(sent_words, toks[j:j + L])
            if not best or r > best[2]: best = (T[j][1], T[j + L - 1][1], r)
        need = MATCH if n > 5 else 0.6     # short lines: one misheard word is a big share
        if best and best[2] >= need:
            span = [t for t, i in T if best[0] <= i <= best[1]]
            if CUE in sent_words or CUE not in span: found.append(best)   # a take containing "stop" was abandoned
    found.sort(); merged = []
    for c in found:                            # overlapping hits are one take: keep the best
        if merged and c[0] <= merged[-1][1]:
            if c[2] > merged[-1][2]: merged[-1] = c
        else: merged.append(c)
    return merged

def align(sents, W):
    """Pick one take per sentence for the whole script at once (dynamic programming):
    takes must stay in script order, every skipped sentence costs a lot, and among
    equally good choices the later take wins (Mike's last read of a line is the keeper)."""
    T = tokens(W)
    C = [candidates(norm(s["text"]), T, W, 0.0) for s in sents]
    SKIP, LATE = 1.5, 0.004                        # a take 10 s later beats a 0.04 better match; skips still dominate
    best = {}                                      # (i, k) -> (score, back)
    for i, cs in enumerate(C):
        for k, c in enumerate(cs):
            st = W[c[0]][0]; val = c[2] + LATE * st
            top = (val - SKIP * i, None)           # this is the first matched sentence
            for (j, m), (sc, _) in best.items():
                if j < i and W[C[j][m][1]][1] <= st + 0.05:
                    v = sc + val - SKIP * (i - j - 1)
                    if v > top[0]: top = (v, (j, m))
            best[(i, k)] = top
    if not best: return [None] * len(sents)
    end = max(best, key=lambda key: best[key][0] - SKIP * (len(sents) - 1 - key[0]))
    picks = [None] * len(sents); cur = end
    while cur: picks[cur[0]] = C[cur[0]][cur[1]]; cur = best[cur][1]
    return picks

def extend_tail(sent, pick, W, gap=0.7):
    """If the matched take stops short of the sentence's last words (usually a misheard name,
    "Nicky Lauder" for "Niki Lauda"), take in the following words when they sound alike."""
    target = norm(sent["text"]); i0, i1, sc = pick
    got = [t for w in W[i0:i1 + 1] for t in norm(w[2])]
    m = SequenceMatcher(None, target, got, autojunk=False).get_matching_blocks()
    last = max((b.a + b.size for b in m if b.size), default=0)
    missing = " ".join(target[last:])
    if not missing: return pick
    best, j = None, i1
    for k in range(1, len(target) - last + 2):
        if i1 + k >= len(W) or W[i1 + k][0] - W[i1 + k - 1][1] > gap: break
        heard = " ".join(t for w in W[i1 + 1:i1 + k + 1] for t in norm(w[2]))
        r = SequenceMatcher(None, missing, heard).ratio()
        # a badly misheard name ("Juha Kankkunen" -> "-York Ankening.") still belongs here when the run
        # ends the spoken sentence: it closes with a full stop right before a pause
        ends = W[i1 + k][2].rstrip().endswith((".", "?", "!")) and (i1 + k + 1 >= len(W) or W[i1 + k + 1][0] - W[i1 + k][1] > 0.3)
        if (r >= 0.6 or (r >= 0.25 and ends)) and (best is None or r > best): best, j = r, i1 + k
    return (i0, j, sc) if best else pick

# ---------------------------------------------------------------- restarts inside a take
def cue_cut(W, a, b, sil, report, text):
    """A take with "stop" in the middle: Mike fluffed and restarted part-way. Keep the words before the
    restart point and everything from the restart on, e.g. "this summer at the two | stop | at the 2026" ->
    "this summer" + "at the 2026"."""
    span = [w for w in W if a - 0.05 <= w[0] <= b]
    tw = norm(text)                                        # "stop" that belongs to the script ("stop them",
    legit = {tw[k + 1] for k in range(len(tw) - 1) if tw[k] == CUE}   # "stop time-wasting") is not a cue
    nxt = lambda i: (norm(span[i + 1][2])[:1] or [""])[0] if i + 1 < len(span) else ""
    idx = [i for i, w in enumerate(span) if w[2].strip(".,!?").lower() == CUE and not (nxt(i) and nxt(i) in legit)]
    if not idx: return [(a, b)]
    if tw[-1:] == [CUE] and len(idx) <= tw.count(CUE): return [(a, b)]   # the line itself ends "...didn't stop."
    c = idx[-1]; pre, post = span[:c], span[c + 1:]
    if not post: return [(a, b)]
    pt = [norm(w[2])[:1] or [""] for w in post[:2]]
    for i in range(len(pre)):
        pr = [norm(w[2])[:1] or [""] for w in pre[i:i + 2]]
        if pr and pr[0] == pt[0] and (len(pr) < 2 or len(pt) < 2 or pr[1] == pt[1]):
            cue_end = span[c][1]
            cut1 = max(snap(post[0][0], sil, "start"), cue_end + 0.05)     # never keep any of "stop"
            if i == 0:
                report.append(f"  stop cut: {a:7.2f}-{cut1:7.2f} dropped ({text[:50]})"); return [(cut1, b)]
            cut0 = min(snap(pre[i - 1][1], sil, "end"), pre[i][0])          # end of the last good word
            report.append(f"  stop cut: {cut0:7.2f}-{cut1:7.2f} dropped ({text[:50]})")
            return [(a, max(a + 0.1, cut0)), (cut1, b)]
    cut1 = max(snap(post[0][0], sil, "start"), span[c][1] + 0.05)   # restart from the top: keep only what follows
    report.append(f"  stop cut: {a:7.2f}-{cut1:7.2f} dropped ({text[:50]})")
    return [(cut1, b)]

def fix_restarts(raw16, sil, sent_text, a, b, report):
    pauses = [(s, e) for s, e in sil if s > a + 0.3 and e < b - 0.3 and e - s >= 0.35]
    target = norm(sent_text)
    for s, e in reversed(pauses):             # latest restart point that still holds the whole sentence
        r = transcribe(raw16, e - 0.08, b, words=False); heard = norm(r["text"])
        # a real restart begins with the sentence's own opening words (a dramatic pause doesn't)
        if ratio(target, heard) >= 0.85 and ratio(target[:3], heard[:3]) >= 0.65:
            report.append(f"  restart cut: {a:7.2f}-{e:7.2f} dropped ({sent_text[:50]})")
            return e - 0.08
    return a

def snap(t, sil, side, reach=1.0):
    """Move a cut out to the nearest pause (word timings can be ~0.5 s off), so nothing is clipped."""
    if side == "start":
        prev = [(s, e) for s, e in sil if s <= t + 0.05 and e >= t - reach]
        if prev: s, e = prev[-1]; return max(s, min(e, t) - 0.08)
        return t - 0.25
    nxt = [(s, e) for s, e in sil if e >= t - 0.05 and s <= t + reach]
    if nxt: s, e = nxt[0]; return min(e, max(s, t) + 0.14)
    return t + 0.3

# ---------------------------------------------------------------- build
def build(script_md, raw, outdir):
    os.makedirs(outdir, exist_ok=True); raw16 = os.path.join(outdir, "raw16.wav"); to_wav16(raw, raw16)
    sil = silences(raw16)
    wcache = os.path.join(outdir, "raw_words.json")
    if os.path.exists(wcache) and json.load(open(wcache)).get("src") == os.path.abspath(raw) + "#phrases":
        W = [tuple(w) for w in json.load(open(wcache))["words"]]
    else:
        W = words_of(raw16, sil); json.dump({"src": os.path.abspath(raw) + "#phrases", "words": W}, open(wcache, "w"))
    sents = script_sentences(script_md); picks = align(sents, W); report, edl = [], []
    # second pass: re-transcribe each stretch holding unrecognised sentences on its own, then re-align
    redo = False
    for k, p in enumerate(picks):
        if p is not None or (k and picks[k - 1] is None): continue
        prv = next((picks[i] for i in range(k - 1, -1, -1) if picks[i]), None)
        nxt = next((picks[i] for i in range(k + 1, len(picks)) if picks[i]), None)
        lo = W[prv[1]][1] if prv else 0.0; hi = W[nxt[0]][0] if nxt else duration(raw16)
        r = transcribe(raw16, lo, hi)
        new = [(round(lo + w["start"], 2), round(lo + w["end"], 2), w["word"].strip()) for sg in r["segments"] for w in sg.get("words", [])]
        W = sorted([w for w in W if not (lo < w[0] < hi)] + [w for w in new if lo < w[0] < hi]); redo = True
    if redo: picks = align(sents, W)
    picks = [extend_tail(s, p, W) if p else p for s, p in zip(sents, picks)]
    for k, (s, p) in enumerate(zip(sents, picks)):
        if p is None:                          # not recognised: take what was said between the neighbours
            prv = next((picks[i] for i in range(k - 1, -1, -1) if picks[i]), None)
            nxt = next((picks[i] for i in range(k + 1, len(picks)) if picks[i]), None)
            lo = W[prv[1]][1] if prv else 0.0; hi = W[nxt[0]][0] if nxt else lo + 6
            inside = [w for w in W if lo < w[0] and w[1] < hi and w[2].strip(".,!?").lower() != CUE]
            if not inside:                     # no words heard, but if there is speech in the gap, keep it
                speech = [(max(lo, e0), min(hi, s1)) for (s0, e0), (s1, e1) in zip(sil, sil[1:]) if e0 < hi and s1 > lo]
                speech = [(x, y) for x, y in speech if y - x > 0.2]
                if not speech or sum(y - x for x, y in speech) < 0.25: report.append(f"MISSING: {s['text']}"); continue
                a, b = speech[0][0] - 0.05, speech[-1][1] + 0.12
                if edl: a = max(a, edl[-1]["b"])
                edl.append({**s, "i": k, "a": round(a, 3), "b": round(b, 3), "score": 0.0, "segs": [[round(a, 3), round(b, 3)]]})
                report.append(f"  check (not recognised, kept the speech in the gap) @raw {a:.1f}s: {s['text'][:60]}"); continue
            # several unrecognised lines in a row share this stretch: split it by their word counts
            r0 = k
            while r0 > 0 and picks[r0 - 1] is None: r0 -= 1
            r1 = k
            while r1 + 1 < len(picks) and picks[r1 + 1] is None: r1 += 1
            sizes = [max(1, len(norm(sents[i]["text"]))) for i in range(r0, r1 + 1)]
            c0 = sum(sizes[:k - r0]) / sum(sizes); c1 = sum(sizes[:k - r0 + 1]) / sum(sizes)
            j0 = int(round(c0 * len(inside))); j1 = max(j0 + 1, int(round(c1 * len(inside))))
            part = inside[j0:j1] or inside[-1:]
            p = (W.index(part[0]), W.index(part[-1]), 0.0)
            report.append(f"  check (not recognised, used its share of the gap) @raw {part[0][0]:.1f}s: {s['text'][:60]}")
        a, b = snap(W[p[0]][0], sil, "start"), snap(W[p[1]][1], sil, "end")
        if edl: a = max(a, edl[-1]["b"])        # never reuse audio already in the previous cut
        segs = cue_cut(W, a, b, sil, report, s["text"])
        a2 = fix_restarts(raw16, sil, s["text"], a, b, report)
        if a2 != a: segs = [(a2, b)]; a = a2
        if len(segs) > 1: a = segs[-1][0]       # (restart check below only needs the final piece)
        edl.append({**s, "i": k, "a": round(segs[0][0], 3), "b": round(b, 3), "score": round(p[2], 2),
                    "segs": [[round(x, 3), round(y, 3)] for x, y in segs]})
        if 0 < p[2] < 0.9: report.append(f"  check (match {p[2]:.2f}) @raw {a:.1f}s: {s['text'][:60]}")
    # lines read straight on with no pause share one boundary, picked by word timing: move it to the quietest
    # 25 ms within 0.35 s so it never falls inside a word (Mike heard that as a jitter / a clipped word)
    import numpy as np
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", raw16, "-f", "s16le", "-"], capture_output=True).stdout,
                      np.int16).astype(np.float32) / 32768
    env = np.sqrt(np.convolve(x * x, np.ones(400) / 400, "same"))[::400]                     # 25 ms steps
    for p, n in zip(edl, edl[1:]):
        t = p["segs"][-1][1]
        if abs(n["segs"][0][0] - t) < 0.02:
            i0, i1 = max(0, int((t - 0.35) * 40)), min(len(env) - 1, int((t + 0.35) * 40))
            q = round((i0 + int(np.argmin(env[i0:i1 + 1]))) / 40, 3)
            if abs(q - t) > 0.02: report.append(f"  boundary {t:.2f} -> {q:.2f} (quietest point) before: {n['text'][:40]}")
            p["segs"][-1][1] = p["b"] = n["segs"][0][0] = n["a"] = q
    # manual cuts (stutters Mike points out): audio/manual_cuts.json = [[raw_start, raw_end, "note"], ...]
    mc_path = os.path.join(outdir, "manual_cuts.json")
    cuts = json.load(open(mc_path)) if os.path.exists(mc_path) else []
    # an entry {"line": "words from the sentence", "end": raw_time} moves where that line stops (a clipped last word);
    # {"line": ..., "segs": [[a, b], [c, d]]} replaces its pieces outright, e.g. to borrow a word Mike said cleanly elsewhere
    for c in [c for c in cuts if isinstance(c, dict)]:
        e = next(e for e in edl if c["line"].lower() in e["text"].lower())
        if "end" in c: e["segs"][-1][1] = c["end"]; e["b"] = c["end"]
        if "start" in c: e["segs"][0][0] = c["start"]; e["a"] = c["start"]
        if "segs" in c: e["segs"] = [list(x) for x in c["segs"]]; e["a"], e["b"] = c["segs"][0][0], c["segs"][-1][1]   # splice (a word from another take)
        report.append(f"  manual edge: {c}")
    cuts = [c for c in cuts if not isinstance(c, dict)]
    for e in edl:
        for c0, c1, *note in cuts:
            new = []
            for x, y in e["segs"]:
                if c1 <= x or c0 >= y: new.append([x, y]); continue
                if c0 > x: new.append([x, round(c0, 3)])
                if c1 < y: new.append([round(c1, 3), y])
                report.append(f"  manual cut: {c0:.2f}-{c1:.2f} ({note[0] if note else ''})")
            e["segs"] = new
    # assemble: takes + gaps
    fc, labels, t, prev = [], [], 0.0, None
    for k, e in enumerate(edl):
        flows = prev and abs(prev["segs"][-1][1] - e["segs"][0][0]) < 0.02    # read straight on: keep it as spoken
        if prev and not flows:
            g = GAP_SECT if e["section"] != prev["section"] else GAP_PARA if e["para"] != prev["para"] else GAP_SENT
            fc.append(f"anullsrc=r=48000:cl=mono,atrim=0:{g}[g{k}]"); labels.append(f"[g{k}]"); t += g
        e["out_start"] = round(t, 3)
        nxt = edl[k + 1] if k + 1 < len(edl) else None
        for q, (x, y) in enumerate(e["segs"]):
            d = y - x; t += d
            fin = "" if (q == 0 and flows) else "afade=t=in:d=0.02,"                       # no fades on a seamless join
            fout = "" if (q == len(e["segs"]) - 1 and nxt and abs(y - nxt["segs"][0][0]) < 0.02) else f",afade=t=out:st={max(d - 0.04, 0):.3f}:d=0.04"
            fc.append(f"[0:a]atrim={x}:{y},asetpts=PTS-STARTPTS,{fin}anull{fout}[s{k}_{q}]")
            labels.append(f"[s{k}_{q}]")
        e["out_end"] = round(t, 3); prev = e
    fc.append("".join(labels) + f"concat=n={len(labels)}:v=0:a=1[c]")
    # Voice F (Mike, 2026-10-14: "B it is, so much better"): the Rode had packaging left on it. Unwrapped, it is
    # clean, close and full of bass, so no DeepFilterNet and no low shelf, just a light touch-up. Voice E (full
    # DeepFilterNet + a +7 dB shelf at 140) made the unwrapped Rode boomy; VOICE_REPAIR=1 brings the repair back.
    fc.append("[c]anull[o]")
    out = os.path.join(outdir, "narration.wav"); cut, rep = out + ".cut.wav", out + ".dfn.wav"
    run("ffmpeg", "-v", "error", "-y", "-i", raw, "-filter_complex", ";".join(fc), "-map", "[o]", "-ar", "48000", "-ac", "1", cut)
    dfn = os.path.expanduser("~/.venvs/enhance/bin/python")
    if os.environ.get("VOICE_REPAIR") and os.path.exists(dfn):
        run(dfn, os.path.join(os.path.dirname(os.path.abspath(__file__)), "denoise.py"), cut, rep)
    else: os.replace(cut, rep)
    run("ffmpeg", "-v", "error", "-y", "-i", rep, "-af",
        # no gate, ever: measured 10-13, an agate turned 67% of word endings down ~11 dB on quieter takes
        "highpass=f=70,equalizer=f=200:t=q:w=1:g=-1.5,equalizer=f=550:t=q:w=0.9:g=-2,equalizer=f=3200:t=q:w=1:g=2,"
        "acompressor=threshold=-24dB:ratio=2:attack=10:release=150,loudnorm=I=-16:TP=-1.5:LRA=9",
        "-ar", "48000", "-ac", "1", out)
    for f in (cut, rep):
        if os.path.exists(f): os.remove(f)
    run("ffmpeg", "-v", "error", "-y", "-i", out, "-b:a", "160k", os.path.join(outdir, "narration_preview.mp3"))
    json.dump(edl, open(os.path.join(outdir, "sentences.json"), "w"), indent=1)
    open(os.path.join(outdir, "edit_report.txt"), "w").write(f"{len(edl)}/{len(sents)} sentences, {t:.1f}s\n" + "\n".join(report) + "\n")
    os.remove(raw16)
    return edl, report, t

if __name__ == "__main__":
    edl, report, t = build(*sys.argv[1:4])
    print(f"{len(edl)} sentences, {t:.1f}s"); print("\n".join(report))
