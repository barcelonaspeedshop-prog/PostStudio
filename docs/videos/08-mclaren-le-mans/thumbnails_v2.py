"""IMPOSSIBLE 03 v2 thumbnails for YouTube's Test & Compare: A = No. 59 (1995 photo), B = the rain at night, C = the finish.
    ~/.venvs/poststudio/bin/python thumbnails_v2.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "05-brawn-gp"))
import thumbnails as T

STORY = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/03 McLaren Le Mans/"
OUT = STORY + "thumbnails/"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    T.classic(STORY + "media/commons/no59_ford_b.jpg", "A road car.", "Won Le Mans.", OUT + "IMPOSSIBLE 03 v2 - thumbnail A No59.jpg", focus=(0.5, 0.45), zoom=1.1, mk=(960, 110, 96))
    T.classic(STORY + "media/ai/ai_rain_night.png", "Never run 24 hours.", "Won Le Mans.", OUT + "IMPOSSIBLE 03 v2 - thumbnail B rain.jpg", focus=(0.45, 0.5), zoom=1.15, mk=(960, 110, 96))
    T.classic(STORY + "media/ai/ai_finish.png", "The road car", "that won Le Mans.", OUT + "IMPOSSIBLE 03 v2 - thumbnail C finish.jpg", focus=(0.5, 0.5), zoom=1.1, mk=(960, 110, 96))
