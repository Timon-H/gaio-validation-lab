#!/bin/bash

# Farben für die Ausgabe
GREEN='\033[0:32m'
RED='\033[0:31m'
NC='\033[0m' # No Color

TARGET_URL="http://localhost:4321/test-group-b/start"

# Bot-Liste mit erwarteten Werten: "User-Agent|ErwarteterHeader"
declare -a BOTS=(
  "GPTBot|ChatGPT"
  "OAI-SearchBot|ChatGPT"
  "Claude-Web|Claude"
  "Google-Extended|Gemini"
  "PerplexityBot|Perplexity"
  "CCBot|CommonCrawl"
  "Mozilla/5.0 (Chrome)|false"
)

echo -e "${GREEN}=== GAIO Middleware & Header Validation ===${NC}"
echo "Test-URL: $TARGET_URL"
echo "--------------------------------------------"

for entry in "${BOTS[@]}"; do
    IFS="|" read -r UA EXPECTED <<< "$entry"
    
    echo -n "Teste: $UA ... "
    
    # Header abrufen und in Variable speichern
    RESPONSE_HEADERS=$(curl -I -s -H "User-Agent: $UA" "$TARGET_URL")
    
    # Spezifische Header extrahieren
    ACTUAL_BOT=$(echo "$RESPONSE_HEADERS" | grep -i "X-AI-Bot-Detected" | awk '{print $2}' | tr -d '\r')
    ACTUAL_GROUP=$(echo "$RESPONSE_HEADERS" | grep -i "X-Test-Group" | awk '{print $2}' | tr -d '\r')
    
    # Validierung
    if [[ "$ACTUAL_BOT" == *"$EXPECTED"* ]]; then
        echo -e "${GREEN}[OK]${NC} (Detected: $ACTUAL_BOT, Group: $ACTUAL_GROUP)"
    else
        echo -e "${RED}[FAIL]${NC} (Expected: $EXPECTED, Got: $ACTUAL_BOT)"
    fi
done

echo "--------------------------------------------"
echo "Check beendet. Prüfe nun dein Terminal (Astro-Logs),"
echo "ob die 'GAIO_METRIC_DATA' JSON-Logs dort erschienen sind."