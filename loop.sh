#!/bin/bash
# loop.sh — Autonomous build loop
# Usage: ./loop.sh [iterations]
# Default: 1 iteration
#
# Each iteration spawns a fresh Claude session with no shared context.
# To stop early, create a STOP file in the project root:
#   touch STOP

set -euo pipefail

ITERATIONS=${1:-1}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/loopprompt.md"
LOOPLOG="$SCRIPT_DIR/looplog.md"
COOLDOWN=60  # seconds between iterations

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: loopprompt.md not found at $PROMPT_FILE"
  exit 1
fi

# Bookend: batch start
BATCH_START="$(date '+%Y-%m-%d %H:%M:%S')"
echo "" >> "$LOOPLOG"
echo "🔵 BATCH START — iterations=$ITERATIONS — $BATCH_START" >> "$LOOPLOG"

echo "Starting batch: $ITERATIONS iteration(s)"
echo ""

for i in $(seq 1 "$ITERATIONS"); do
  # Check for STOP file before each iteration
  if [ -f "$SCRIPT_DIR/STOP" ]; then
    echo "STOP file detected. Halting batch."
    echo "🔵 BATCH END — stopped by STOP file — $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOOPLOG"
    exit 0
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Iteration $i of $ITERATIONS — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  claude --enable-auto-mode --verbose -p "$(cat "$PROMPT_FILE")"

  echo ""

  # Cooldown between iterations (skip after last)
  if [ "$i" -lt "$ITERATIONS" ]; then
    echo "Cooldown: ${COOLDOWN}s before next iteration..."
    sleep "$COOLDOWN"
  fi
done

# Bookend: batch end
BATCH_END="$(date '+%Y-%m-%d %H:%M:%S')"
echo "🔵 BATCH END — $ITERATIONS iteration(s) completed — $BATCH_END" >> "$LOOPLOG"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Batch complete: $ITERATIONS iteration(s)"
echo "  Started: $BATCH_START"
echo "  Ended:   $BATCH_END"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
