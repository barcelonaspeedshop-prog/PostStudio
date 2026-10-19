"""narration_check: transcribe every line of a finished narration on its own and compare it with the script.

    ~/.venvs/poststudio/bin/python studio/narration_check.py ".../audio/v2/"

Prints every line; lines that match under 0.85 are marked <<< with the script line under them. Whisper mishears
short clips and names, so listen to (or re-transcribe in context) anything marked before changing it.
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mlx_whisper
from narration import norm, ratio

d = sys.argv[1]; S = json.load(open(d + "sentences.json"))
for i, s in enumerate(S):
    a, b = s["out_start"], s["out_end"]
    if b - a < 0.15: print(f"{i:3d} {a:6.2f}-{b:6.2f}  EMPTY  <<<\n              script: {s['text']}"); continue
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(max(0, a - 0.05)), "-to", str(b + 0.05), "-i", d + "narration.wav",
                    "-ar", "16000", "-ac", "1", "/tmp/_nc.wav"], check=True)
    t = mlx_whisper.transcribe("/tmp/_nc.wav", path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="en")["text"].strip()
    r = ratio(norm(t), norm(s["text"])); flag = "  <<<" if r < 0.85 else ""
    print(f"{i:3d} {a:6.2f}-{b:6.2f} {r:.2f} | {t}{flag}" + (f"\n              script: {s['text']}" if flag else ""))
