#!/usr/bin/env bash
# Render the Open Graph cards (1200x630 PNG, the site's dark theme) into public/og/ with headless Chromium.
# Usage: scripts/build-og.sh   (needs chromium or google-chrome on PATH; set CHROME to override)
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME=${CHROME:-$(command -v chromium || command -v google-chrome || command -v chrome || true)}
# Fall back to Playwright's Chromium (npx playwright install chromium).
if [ -z "$CHROME" ]; then
  for candidate in "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac*/"Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome; do
    [ -x "$candidate" ] && CHROME=$candidate
  done
fi
[ -n "$CHROME" ] || { echo "No Chrome or Chromium found; set CHROME"; exit 1; }
mkdir -p public/og
port=18778
python3 -m http.server $port --directory scripts/og >/dev/null 2>&1 &
srv=$!
trap 'kill $srv' EXIT
sleep 1

card() { # card name title sub [stats: value~label|value~label]
  local qs
  qs=$(python3 -c 'import sys, urllib.parse as u; print(u.urlencode({"title": sys.argv[1], "sub": sys.argv[2], "stats": sys.argv[3]}))' "$2" "$3" "${4:-}")
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=4000 \
    --screenshot="public/og/$1.png" "http://127.0.0.1:$port/card.html?$qs" 2>/dev/null
  echo "public/og/$1.png"
}

card index "Quaedra Research" "Compact models, AI tools and agent harnesses."
card welp "Welp-35B-A3B" "Qwen3.6-35B-A3B with the full 262k context on a 16 GB GPU." "95.7%~HumanEval|262k~context on 16 GB|13.21 GB~GGUF"
card jet "Jet" "Typed decision models: choices, scores and calibrated probabilities instead of text."
card megacode "megacode" "A minimal coding agent for the terminal. Anthropic, OpenAI, Gemini and any OpenAI-compatible model."
card nodd "Nodd" "Tiny, calibrated text classifiers that run in the browser, offline, in about 20 MB." "18–24 MB~model download|12 ms~browser p95|MIT~source license"
