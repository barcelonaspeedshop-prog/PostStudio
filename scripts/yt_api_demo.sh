#!/bin/zsh
# Screencast for the YouTube API compliance review (Google asked 15 Oct 2026 for a recording of the client uploading).
# Records itself: macOS screencapture saves "YouTube API demo.mov" on the Desktop (Terminal needs Screen Recording
# permission: System Settings > Privacy & Security > Screen Recording > Terminal on; the first run may ask).
cd "$(dirname "$0")/.."
PY=~/.venvs/poststudio/bin/python
VIDEO="/Volumes/PostDrive/Stories/IMPOSSIBLE series/01 Brawn GP/shorts/v2/short_7_one_season.mp4"
step() { echo; echo "==> $1"; sleep 2; }
OUT="$HOME/Desktop/YouTube API demo.mov"; rm -f "$OUT"
screencapture -v -V 60 "$OUT" &          # whole screen, 75 seconds
REC=$!
sleep 2
clear
echo "PostStudio uploader: YouTube Data API v3 demo (project premira-first, 959337337500)"
echo "Our own videos, uploaded to our own channels with videos.insert, private + scheduled."
step "1. The uploader script (studio/yt_upload.py): what it does"
sed -n 1,16p studio/yt_upload.py; sleep 6
step "2. The channel this sign-in uploads to (channels.list, mine=true)"
$PY studio/yt_upload.py whoami "Omnira F1" 2>/dev/null
step "3. Uploading a video we made (videos.insert, resumable upload, private)"
VID=$($PY studio/yt_upload.py upload "Omnira F1" "$VIDEO" --title "PostStudio API demo upload (screencast)" \
  --desc "Test upload recorded for the YouTube API compliance review." --tags PostStudio 2>/dev/null | tee /dev/tty | grep -o 'youtu.be/[A-Za-z0-9_-]*' | cut -d/ -f2)
step "4. Reading the upload back from YouTube (videos.list): it is on the channel, private, processed"
sleep 3
$PY studio/yt_upload.py show "Omnira F1" "$VID" 2>/dev/null
echo
echo "Channel: https://www.youtube.com/channel/UCpJHo_MnHVZ2cCydZVAND2Q"
sleep 8
echo "Recording stops on its own..."
wait $REC
if [ -s "$OUT" ]; then echo "Saved: $OUT"; open -R "$OUT"
else echo "No recording was saved. Turn on Terminal in System Settings > Privacy & Security > Screen Recording, then run this again."; fi
