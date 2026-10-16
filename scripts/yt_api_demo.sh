#!/bin/zsh
# Screencast for the YouTube API compliance review (Google asked 15 Oct 2026 for a recording of the client uploading).
# Start a screen recording first (Cmd+Shift+5 > Record Entire Screen), then run:  zsh scripts/yt_api_demo.sh
cd "$(dirname "$0")/.."
PY=~/.venvs/poststudio/bin/python
VIDEO="/Volumes/PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/shorts/v2/short_7_one_season.mp4"
step() { echo; echo "==> $1"; sleep 2; }
clear
echo "PostStudio uploader: YouTube Data API v3 demo (project premira-first, 959337337500)"
echo "Our own videos, uploaded to our own channels with videos.insert, private + scheduled."
step "1. The uploader script (studio/yt_upload.py): what it does"
sed -n 1,16p studio/yt_upload.py; sleep 6
step "2. The channel this sign-in uploads to (channels.list, mine=true)"
$PY studio/yt_upload.py whoami "Omnira F1" 2>/dev/null
step "3. Uploading a video we made (videos.insert, resumable upload, private)"
$PY studio/yt_upload.py upload "Omnira F1" "$VIDEO" --title "PostStudio API demo upload (private test)" \
  --desc "Test upload recorded for the YouTube API compliance review." --tags PostStudio 2>/dev/null
step "4. The video in YouTube Studio"
open "https://studio.youtube.com/channel/UCpJHo_MnHVZ2cCydZVAND2Q/videos/upload"
echo "Done. Stop the recording."
