#!/bin/bash
# ============================================
# GAIO Validation Lab — Bot Detection & Header Test
# ============================================
# Tests that the middleware correctly detects AI bots
# and sets the right X-Test-Group / X-AI-Bot-Detected headers
# for ALL 8 test variants.
#
# Usage:
#   ./scripts/test-bots.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:4321

set -euo pipefail

BASE_URL="${1:-http://localhost:4321}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# All test variants
VARIANTS=(
  "control"
  "combined"
  "test-jsonld-only"
  "test-semantic-only"
  "test-noscript-only"
  "test-aria-only"
  "test-dsd"
  "test-microdata-only"
)

# Bot user agents: "User-Agent|ExpectedBotName"
declare -a BOTS=(
  "GPTBot|ChatGPT"
  "OAI-SearchBot|ChatGPT"
  "Claude-Web|Claude"
  "Google-Extended|Gemini"
  "PerplexityBot|Perplexity"
  "CCBot|CommonCrawl"
  "Mozilla/5.0 (Chrome)|false"
)

PASS=0
FAIL=0

echo -e "${GREEN}============================================${NC}"
echo "GAIO Middleware & Header Validation"
echo "Base URL: $BASE_URL"
echo "Variants: ${#VARIANTS[@]}  |  Bot UAs: ${#BOTS[@]}"
echo -e "${GREEN}============================================${NC}"
echo ""

for variant in "${VARIANTS[@]}"; do
  url="$BASE_URL/$variant"
  echo -e "${YELLOW}--- $variant ---${NC}"

  for entry in "${BOTS[@]}"; do
    IFS="|" read -r UA EXPECTED <<< "$entry"

    RESPONSE_HEADERS=$(curl -I -s -H "User-Agent: $UA" "$url" 2>/dev/null || echo "")

    if [ -z "$RESPONSE_HEADERS" ]; then
      echo -e "  $UA → ${RED}[CONN ERROR]${NC}"
      ((FAIL++))
      continue
    fi

    ACTUAL_BOT=$(echo "$RESPONSE_HEADERS" | grep -i "X-AI-Bot-Detected" | awk '{print $2}' | tr -d '\r')
    ACTUAL_GROUP=$(echo "$RESPONSE_HEADERS" | grep -i "X-Test-Group" | awk '{print $2}' | tr -d '\r')
    HTTP_STATUS=$(echo "$RESPONSE_HEADERS" | head -1 | awk '{print $2}')

    # Validate bot detection
    if [[ "$ACTUAL_BOT" == *"$EXPECTED"* ]]; then
      echo -e "  $UA → ${GREEN}[OK]${NC} Bot=$ACTUAL_BOT Group=$ACTUAL_GROUP HTTP=$HTTP_STATUS"
      ((PASS++))
    else
      echo -e "  $UA → ${RED}[FAIL]${NC} Expected=$EXPECTED Got=$ACTUAL_BOT HTTP=$HTTP_STATUS"
      ((FAIL++))
    fi
  done
  echo ""
done

TOTAL=$((PASS + FAIL))
echo "============================================"
echo -e "Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC} / $TOTAL total"
echo ""
echo "Next steps:"
echo "  1. Check the Astro dev server terminal for GAIO_LOG_SUCCESS entries"
echo "  2. If SUPABASE_URL is set, check bot_logs table in Supabase"
echo "============================================"