"""IMPOSSIBLE 02 v2 thumbnails: A = the save (AI still), B = Gerrard (Mike's photo), for YouTube's Test & Compare.
    ~/.venvs/poststudio/bin/python thumbnails_v2.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "05-brawn-gp"))
import thumbnails as T

STORY = "/Volumes/PostDrive/Stories/IMPOSSIBLE series/02 Istanbul/"
OUT = STORY + "thumbnails/"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    T.classic(STORY + "media/ai/ai_save.png", "3–0 down.", "Champions.",
              OUT + "IMPOSSIBLE 02 v2 - thumbnail A save.jpg", focus=(0.35, 0.4), zoom=1.2, mk=(960, 110, 96))
    T.classic(STORY + "media/mike/gerrard_2005.jpg", "3–0 at half-time.", "Champions.",
              OUT + "IMPOSSIBLE 02 v2 - thumbnail B Gerrard.jpg", focus=(0.5, 0.35), zoom=1.05, mk=(960, 110, 96))
