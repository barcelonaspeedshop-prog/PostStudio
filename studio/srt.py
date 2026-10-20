"""srt: YouTube captions (.en.srt) from a cut's sentences.json, spelled from the script, timed from the narration.

    ~/.venvs/poststudio/bin/python studio/srt.py "<story>/audio/v2/sentences.json" "<story>/video/<name>.en.srt" [intro_seconds=5]

Long sentences are split into the fewest even cues of at most two 42-character lines, timed by word share.
"""
import json, sys, textwrap

def stamp(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def cues(sents, intro):
    for e in sents:
        a, b, words = e["out_start"] + intro, e["out_end"] + intro, e["text"].split()
        for m in range(1, len(words) + 1):                                # fewest even cues of at most two lines each
            parts = [words[round(i * len(words) / m):round((i + 1) * len(words) / m)] for i in range(m)]
            if all(len(textwrap.wrap(" ".join(p), 42)) <= 2 for p in parts): break
        n = len(words); k = 0
        for p in parts:
            t0 = a + (b - a) * k / n; k += len(p); t1 = a + (b - a) * k / n
            yield t0, t1, "\n".join(textwrap.wrap(" ".join(p), 42))

if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]; intro = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
    with open(out, "w") as f:
        for i, (a, b, txt) in enumerate(cues(json.load(open(src)), intro), 1): f.write(f"{i}\n{stamp(a)} --> {stamp(b)}\n{txt}\n\n")
    print(out)
