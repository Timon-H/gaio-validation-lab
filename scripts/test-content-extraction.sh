#!/usr/bin/env bash
# ============================================
# GAIO Validation Lab — Content Extraction Test
# ============================================
# Simulates what a no-JS crawler sees on each test variant.
# Uses curl (no JS execution) to fetch rendered HTML, then
# extracts text content and structural markers.
#
# Modes:
#   --dry-run   Print results to terminal only (default)
#   --persist   Also POST results to Supabase extraction_results table
#
# Usage:
#   ./scripts/test-content-extraction.sh [--dry-run|--persist] [BASE_URL]
#
# Examples:
#   ./scripts/test-content-extraction.sh                           # dry run, localhost
#   ./scripts/test-content-extraction.sh --persist                 # persist to Supabase, localhost
#   ./scripts/test-content-extraction.sh --persist https://my.app  # persist, custom URL
#
# Requires: SUPABASE_URL and SUPABASE_ANON_KEY env vars for --persist mode.
# You can set these in a .env file and source it before running:
#   source .env && ./scripts/test-content-extraction.sh --persist

set -euo pipefail

# ---- Parse arguments ----
MODE="dry-run"
BASE_URL="http://localhost:4321"

for arg in "$@"; do
  case "$arg" in
    --persist) MODE="persist" ;;
    --dry-run) MODE="dry-run" ;;
    http*) BASE_URL="$arg" ;;
  esac
done

# ---- Supabase config check (for persist mode) ----
if [ "$MODE" = "persist" ]; then
  if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
    echo "ERROR: --persist mode requires SUPABASE_URL and SUPABASE_ANON_KEY env vars."
    echo "Set them in your shell or source a .env file first:"
    echo "  export SUPABASE_URL=https://xxx.supabase.co"
    echo "  export SUPABASE_ANON_KEY=eyJ..."
    exit 1
  fi
  echo "Supabase: $SUPABASE_URL (persist mode)"
fi

# All test variants
VARIANTS=(
  "control"
  "combined"
  "test-jsonld-only"
  "test-semantic-only"
  "test-noscript-only"
  "test-aria-only"
  "test-dsd"
)

# Bot user agents for simulation (parallel arrays for bash 3.2 compatibility)
BOT_NAMES=(GPTBot ClaudeBot GoogleBot curl)
BOT_UAS=(
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)"
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-Web/1.0; +https://anthropic.com)"
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  "curl/8.0"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo "============================================"
echo "GAIO Content Extraction Test"
echo "Base URL: $BASE_URL"
echo "Mode:     $MODE"
echo "Variants: ${#VARIANTS[@]}  |  Bots: ${BOT_NAMES[*]}"
echo "============================================"
echo ""

# Results table header
printf "%-22s | %-10s | %6s | %5s | %5s | %5s | %5s | %5s | %5s | %5s | %s\n" \
  "VARIANT" "BOT" "WORDS" "HEADS" "LINKS" "LD" "ARIA" "SEM" "NOSC" "DSD" "DB"
printf "%s\n" "-------------------------------------------------------------------------------------------------------------"

PERSISTED=0
FAILED=0

for variant in "${VARIANTS[@]}"; do
  for i in $(seq 0 $((${#BOT_NAMES[@]} - 1))); do
    bot_name="${BOT_NAMES[$i]}"
    ua="${BOT_UAS[$i]}"
    url="$BASE_URL/$variant"

    # Fetch page HTML to temp file (no JS, just like a crawler)
    tmpfile=$(mktemp)
    curl -s -A "$ua" "$url" > "$tmpfile" 2>/dev/null || true

    if [ ! -s "$tmpfile" ]; then
      printf "%-22s | %-10s | %6s | %5s | %5s | %5s | %5s | %5s | %5s | %5s | %s\n" \
        "$variant" "$bot_name" "ERR" "-" "-" "-" "-" "-" "-" "-" "-"
      rm -f "$tmpfile"
      ((FAILED++))
      continue
    fi

    # Strip HTML tags to get text, count words
    text=$(sed 's/<[^>]*>//g' "$tmpfile" | tr -s '[:space:]' ' ')
    word_count=$(echo "$text" | wc -w | tr -d ' ')

    # Count structural elements
    heading_count=$(grep -oi '<h[1-6][^>]*>' "$tmpfile" | wc -l | tr -d ' ')
    link_count=$(grep -oi '<a ' "$tmpfile" | wc -l | tr -d ' ')

    # Check markers (boolean flags) — grep file directly to avoid pipe/SIGPIPE issues
    has_jsonld=$(grep -q 'application/ld+json' "$tmpfile" && echo "true" || echo "false")
    has_aria=$(grep -q 'aria-label' "$tmpfile" && echo "true" || echo "false")
    has_semantic=$(grep -qE '<(section|article|address|aside|nav|main) ' "$tmpfile" && echo "true" || echo "false")
    has_noscript=$(grep -q '<noscript>' "$tmpfile" && echo "true" || echo "false")
    has_dsd=$(grep -q 'shadowrootmode' "$tmpfile" && echo "true" || echo "false")

    # Display labels
    ld_label=$( [ "$has_jsonld" = "true" ] && echo "YES" || echo "no")
    aria_label=$( [ "$has_aria" = "true" ] && echo "YES" || echo "no")
    sem_label=$( [ "$has_semantic" = "true" ] && echo "YES" || echo "no")
    nosc_label=$( [ "$has_noscript" = "true" ] && echo "YES" || echo "no")
    dsd_label=$( [ "$has_dsd" = "true" ] && echo "YES" || echo "no")

    db_status="-"

    # ---- Persist to Supabase ----
    if [ "$MODE" = "persist" ]; then
      # Extract JSON-LD content (if any)
      jsonld_content=$(grep -o '<script type="application/ld+json">[^<]*</script>' "$tmpfile" 2>/dev/null | sed 's/<script type="application\/ld+json">//;s/<\/script>//' | head -1 || echo "null")
      [ -z "$jsonld_content" ] && jsonld_content="null"

      # Content hash for deduplication
      content_hash=$(echo "$text" | shasum -a 256 | awk '{print $1}')

      # Truncate text_content to 10000 chars to avoid huge payloads
      truncated_text=$(echo "$text" | head -c 10000)

      # Build JSON payload matching extraction_results schema
      payload=$(cat <<JSONEOF
{
  "test_group": "$variant",
  "extractor": "$bot_name",
  "content_hash": "$content_hash",
  "text_content": $(echo "$truncated_text" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '""'),
  "json_ld": $( [ "$jsonld_content" = "null" ] && echo "null" || echo "$jsonld_content" ),
  "heading_count": $heading_count,
  "link_count": $link_count,
  "word_count": $word_count,
  "has_noscript": $has_noscript,
  "has_aria": $has_aria,
  "has_semantic": $has_semantic,
  "has_jsonld": $has_jsonld,
  "has_dsd": $has_dsd
}
JSONEOF
)

      # POST to Supabase
      http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${SUPABASE_URL}/rest/v1/extraction_results" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$payload" 2>/dev/null || echo "000")

      if [ "$http_code" = "201" ]; then
        db_status="${GREEN}OK${NC}"
        ((PERSISTED++))
      else
        db_status="${RED}$http_code${NC}"
        ((FAILED++))
      fi
    fi

    printf "%-22s | %-10s | %6s | %5s | %5s | %5s | %5s | %5s | %5s | %5s | $(echo -e "$db_status")\n" \
      "$variant" "$bot_name" "$word_count" "$heading_count" "$link_count" \
      "$ld_label" "$aria_label" "$sem_label" "$nosc_label" "$dsd_label"

    rm -f "$tmpfile"
  done
  echo ""
done

echo "============================================"
echo "Legend: LD=JSON-LD, ARIA=aria-label, SEM=semantic HTML, NOSC=<noscript>, DSD=Declarative Shadow DOM, DB=database status"
echo ""
echo "Expected GAIO variable pattern (LD / ARIA / SEM / NOSC / DSD):"
echo "  control           → no  / no  / no  / no  / no"
echo "  test-jsonld-only  → YES / no  / no  / no  / no"
echo "  test-semantic-only→ no  / no  / YES / no  / no"
echo "  test-noscript-only→ no  / no  / no  / YES / no"
echo "  test-aria-only    → no  / YES / no  / no  / no"
echo "  test-dsd          → no  / no  / no  / no  / YES"
echo "  combined          → YES / YES / YES / no  / YES (DSD supersedes noscript)"
echo ""
echo "NOTE: SEM/ARIA may show infrastructure positives (BaseLayout <nav>, DSD"
echo "      template internals). These are constant across all pages and cancel"
echo "      out in comparisons. Focus on the unique GAIO variable per arm."

if [ "$MODE" = "persist" ]; then
  echo ""
  echo -e "Database: ${GREEN}$PERSISTED persisted${NC} / ${RED}$FAILED failed${NC}"
  echo "Query your results: SELECT * FROM extraction_results ORDER BY created_at DESC;"
  echo "Or use the gaio_comparison view for aggregated stats."
fi
echo "============================================"
