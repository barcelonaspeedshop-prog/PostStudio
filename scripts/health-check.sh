#!/usr/bin/env bash
# PostStudio R2 health check + alerting script.
# Runs every 15 minutes via cron. Alerts on first failure, then rate-limits to
# one reminder per 4 hours while R2 stays down. Sends a recovery email when R2 comes back.
#
# Config lives in /etc/poststudio-health.env — see docs/health-monitoring.md
# Logs go to /var/log/poststudio-health.log (rotated weekly, kept 7 days)

set -euo pipefail

CONFIG_FILE="/etc/poststudio-health.env"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
fi

APP_URL="${POSTSTUDIO_APP_URL:-https://app.premirafirst.com}"
HEALTH_TOKEN="${PREVIEW_TOKEN:-}"
LOG_FILE="${HEALTH_LOG_FILE:-/var/log/poststudio-health.log}"
STATE_FILE="${HEALTH_STATE_FILE:-/var/log/poststudio-health-state.json}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
FROM_EMAIL="${ALERT_FROM_EMAIL:-alerts@premirafirst.com}"
COOLDOWN_SECONDS="${ALERT_COOLDOWN_SECONDS:-14400}"  # 4 hours default

log() {
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [poststudio-health] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  local subject="$1"
  local body_text="$2"

  if [[ -z "$ALERT_EMAIL" || -z "$RESEND_API_KEY" ]]; then
    log "ALERT skipped — ALERT_EMAIL or RESEND_API_KEY not configured"
    return 0
  fi

  local payload
  payload=$(cat <<JSON
{
  "from": "${FROM_EMAIL}",
  "to": ["${ALERT_EMAIL}"],
  "subject": "${subject}",
  "text": "${body_text}"
}
JSON
)

  curl -sf --max-time 10 \
    -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null \
    && log "Alert sent to ${ALERT_EMAIL}: ${subject}" \
    || log "WARNING: Failed to send alert email"
}

# ── Read previous state ───────────────────────────────────────────────────────
last_status="ok"
last_alerted=0

if [[ -f "$STATE_FILE" ]]; then
  last_status=$(jq -r '.last_status // "ok"' "$STATE_FILE" 2>/dev/null || echo "ok")
  last_alerted=$(jq -r '.last_alerted // 0' "$STATE_FILE" 2>/dev/null || echo 0)
fi

now=$(date +%s)

# ── Call health endpoint ──────────────────────────────────────────────────────
log "Running health check → ${APP_URL}/api/health/r2"

http_code=""
response=""
if ! response=$(curl -sf --max-time 20 \
  -w '\n__HTTP_CODE__%{http_code}' \
  -H "Authorization: Bearer ${HEALTH_TOKEN}" \
  "${APP_URL}/api/health/r2" 2>&1); then
  log "ERROR: curl failed to reach health endpoint"
  elapsed=$(( now - last_alerted ))
  if [[ "$last_status" == "ok" ]] || (( elapsed >= COOLDOWN_SECONDS )); then
    send_alert \
      "[PostStudio] R2 health check UNREACHABLE" \
      "PostStudio R2 health endpoint is unreachable.

URL: ${APP_URL}/api/health/r2
Time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')

This may mean PostStudio itself is down, not just R2.

--- Recovery checklist ---
1. Check PostStudio container: ssh root@187.124.42.108 'docker ps'
2. Check R2 public access toggle: https://dash.cloudflare.com (R2 → poststudio-media → Settings)
3. Check R2 credentials haven't expired
4. Restart if needed: ssh root@187.124.42.108 'cd /docker/poststudio && docker compose up -d'"
    last_alerted=$now
  else
    log "Alert suppressed (cooldown: ${elapsed}s / ${COOLDOWN_SECONDS}s)"
  fi
  last_status="fail"
  echo "{\"last_status\":\"${last_status}\",\"last_alerted\":${last_alerted},\"updated\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" > "$STATE_FILE"
  exit 1
fi

# Split body and HTTP code
http_code=$(echo "$response" | grep '__HTTP_CODE__' | sed 's/__HTTP_CODE__//')
response=$(echo "$response" | grep -v '__HTTP_CODE__')

ok=$(echo "$response" | jq -r '.ok' 2>/dev/null || echo "false")
log "ok=${ok} http=${http_code}"

# ── Process result ────────────────────────────────────────────────────────────
elapsed=$(( now - last_alerted ))

if [[ "$ok" != "true" ]]; then
  # Identify which checks failed
  failed_checks=$(echo "$response" | jq -r '
    [.checks | to_entries[] | select(.value.ok == false) | .key] | join(", ")
  ' 2>/dev/null || echo "unknown")

  errors=$(echo "$response" | jq -r '
    [.checks | to_entries[] | select(.value.ok == false) |
      .key + ": " + (.value.error // "failed")] | join("\n")
  ' 2>/dev/null || echo "")

  log "FAIL — failed checks: ${failed_checks}"

  if [[ "$last_status" == "ok" ]] || (( elapsed >= COOLDOWN_SECONDS )); then
    reminder_note=""
    if [[ "$last_status" == "fail" ]]; then
      hours=$(( elapsed / 3600 ))
      reminder_note="(R2 has been down for ~${hours}h — this is a reminder)"
    fi

    send_alert \
      "[PostStudio] R2 health check FAILED — ${failed_checks}" \
      "PostStudio R2 health check has FAILED. ${reminder_note}

Failed checks: ${failed_checks}
Time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')

Errors:
${errors}

--- What this means ---
publicRead failure     → Public R2 URL is broken. Images missing from Premira First website.
authedWriteDelete fail → R2 credentials have expired or bucket permissions changed.
                         Instagram publishing will fail at next approval.
envVarsPresent failure → A required env var is missing from the PostStudio container.

--- Recovery checklist ---
1. R2 dashboard:     https://dash.cloudflare.com (R2 → poststudio-media → Settings)
   → Check 'Allow public access' is ON
   → Verify bucket exists and hasn't been deleted
2. Credentials:      Check R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY haven't expired
   → Generate new token at: https://dash.cloudflare.com/profile/api-tokens
   → Update /docker/poststudio/docker-compose.yml and restart
3. Restart:          ssh root@187.124.42.108 'cd /docker/poststudio && docker compose up -d --remove-orphans'
4. Re-run check:     ${APP_URL}/api/health/r2 (with Authorization: Bearer \$PREVIEW_TOKEN)"

    last_alerted=$now
  else
    log "Alert suppressed — cooldown active (${elapsed}s elapsed, need ${COOLDOWN_SECONDS}s)"
  fi

  last_status="fail"

else
  log "OK — all checks passed"

  if [[ "$last_status" == "fail" ]]; then
    # Send recovery notification
    send_alert \
      "[PostStudio] R2 health check RECOVERED" \
      "PostStudio R2 health check is now PASSING. All systems normal.

Time: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
Public read: OK
Authenticated write/delete: OK
Env vars: OK

No further action needed."
    last_alerted=0
  fi

  last_status="ok"
fi

# ── Save state ────────────────────────────────────────────────────────────────
echo "{\"last_status\":\"${last_status}\",\"last_alerted\":${last_alerted},\"updated\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" > "$STATE_FILE"
