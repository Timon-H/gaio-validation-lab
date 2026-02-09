#!/bin/bash

# Die URL deiner lokalen Astro-Instanz (evtl. Port anpassen)
TARGET_URL="http://localhost:4321/test-group-b/start"

# Liste der zu testenden User-Agents
declare -a BOTS=(
  "GPTBot" 
  "OAI-SearchBot" 
  "Claude-Web" 
  "Google-Extended" 
  "PerplexityBot" 
  "CCBot" 
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" # Normaler Nutzer
)

echo "--- GAIO Middleware Test-Lauf ---"

for BOT in "${BOTS[@]}"
do
  echo "Teste User-Agent: $BOT"
  # Sendet Request und filtert nur den relevanten Header heraus
  curl -I -s -H "User-Agent: $BOT" "$TARGET_URL" | grep -i "X-AI-Bot-Detected"
  echo "--------------------------------"
done
