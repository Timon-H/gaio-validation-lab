#!/usr/bin/env bash
# ============================================
# GAIO Validation Lab — Content Extraction Test
# ============================================
# Simulates what a no-JS crawler sees on each test variant.
# Uses curl (no JS execution) to fetch rendered HTML, then
# extracts text content and structural markers.
#
# Usage:
#   ./scripts/test-content-extraction.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:4321

set -euo pipefail

BASE_URL="${1:-http://localhost:4321}"

# All test variants
VARIANTS=(
  "control-group-a"
  "test-group-b"
  "test-jsonld-only"
  "test-semantic-only"
  "test-noscript-only"
  "test-aria-only"
  "test-dsd"
)

# Bot user agents for simulation
declare -A BOTS
BOTS[GPTBot]="Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)"
BOTS[ClaudeBot]="Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-Web/1.0; +https://anthropic.com)"
BOTS[GoogleBot]="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
BOTS[curl]="curl/8.0"

echo "============================================"
echo "GAIO Content Extraction Test"
echo "Base URL: $BASE_URL"
echo "Variants: ${#VARIANTS[@]}"
echo "Bots: ${!BOTS[@]}"
echo "============================================"
echo ""

# Results table header
printf "%-22s | %-10s | %6s | %5s | %5s | %5s | %5s | %5s | %5s\n" \
  "VARIANT" "BOT" "WORDS" "HEADS" "LINKS" "LD" "ARIA" "SEM" "NOSC"
printf "%s\n" "--------------------------------------------------------------------------------------------"

for variant in "${VARIANTS[@]}"; do
  for bot_name in "${!BOTS[@]}"; do
    ua="${BOTS[$bot_name]}"
    url="$BASE_URL/$variant"

    # Fetch page HTML (no JS, just like a crawler)
    html=$(curl -s -A "$ua" "$url" 2>/dev/null || echo "")

    if [ -z "$html" ]; then
      printf "%-22s | %-10s | %6s | %5s | %5s | %5s | %5s | %5s | %5s\n" \
        "$variant" "$bot_name" "ERR" "-" "-" "-" "-" "-" "-"
      continue
    fi

    # Strip HTML tags to get text, count words
    text=$(echo "$html" | sed 's/<[^>]*>//g' | tr -s '[:space:]' ' ')
    word_count=$(echo "$text" | wc -w | tr -d ' ')

    # Count structural elements
    heading_count=$(echo "$html" | grep -oi '<h[1-6][^>]*>' | wc -l | tr -d ' ')
    link_count=$(echo "$html" | grep -oi '<a ' | wc -l | tr -d ' ')

    # Check markers
    has_jsonld=$(echo "$html" | grep -q 'application/ld+json' && echo "YES" || echo "no")
    has_aria=$(echo "$html" | grep -q 'aria-label' && echo "YES" || echo "no")
    has_semantic=$(echo "$html" | grep -qE '<(section|article|address|aside|nav|main) ' && echo "YES" || echo "no")
    has_noscript=$(echo "$html" | grep -q '<noscript>' && echo "YES" || echo "no")

    printf "%-22s | %-10s | %6s | %5s | %5s | %5s | %5s | %5s | %5s\n" \
      "$variant" "$bot_name" "$word_count" "$heading_count" "$link_count" \
      "$has_jsonld" "$has_aria" "$has_semantic" "$has_noscript"
  done
  echo ""
done

echo "============================================"
echo "Legend: LD=JSON-LD, ARIA=aria-label, SEM=semantic HTML, NOSC=<noscript>"
echo ""
echo "Expected pattern for isolated variables:"
echo "  control-group-a   → no  / no  / no  / no"
echo "  test-jsonld-only  → YES / no  / no  / no"
echo "  test-semantic-only→ no  / no  / YES / no"
echo "  test-noscript-only→ no  / no  / no  / YES"
echo "  test-aria-only    → no  / YES / no  / no"
echo "  test-dsd          → no  / no  / no  / no  (but shadow content in HTML)"
echo "  test-group-b      → YES / YES / YES / YES"
echo "============================================"
