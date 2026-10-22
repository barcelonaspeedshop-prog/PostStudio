"""BANNED 05 v2 thumbnails for YouTube's Test & Compare: A = the lamps at night, B = the scrutineers, C = Mäkinen 1966 (Mike's photo).
    ~/.venvs/poststudio/bin/python thumbnails_v2.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "studio"))
import thumbs as T

STORY = "/Volumes/PostDrive/Gentlemen of Fuel/Videos/Monte Carlo Minis (BANNED)/"
OUT = STORY + "thumbnails/"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    T.classic(STORY + "media/ai/ai_minis_lamps_night.png", "They won 1-2-3.", "Banned over a bulb.",
              OUT + "BANNED 05 v2 - thumbnail A lamps.jpg", focus=(0.5, 0.45), zoom=1.15)
    T.classic(STORY + "media/ai/ai_scrutineers.png", "They won 1-2-3.", "Then: disqualified.",
              OUT + "BANNED 05 v2 - thumbnail B scrutineers.jpg", focus=(0.4, 0.4), zoom=1.1)
    T.classic(STORY + "media/mike/classic_and_sports_car_MAKINEN_MONTE_carlo_66_LAT_3.jpg", "First, second, third.", "Disqualified.",
              OUT + "BANNED 05 v2 - thumbnail C Makinen.jpg", focus=(0.5, 0.5), zoom=1.05)
