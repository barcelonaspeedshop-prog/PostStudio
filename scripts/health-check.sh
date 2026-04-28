#!/usr/bin/env bash
# PostStudio R2 health check + alerting script.
# Runs every 15 minutes via cron. Alerts on first failure, then rate-limits to
# one reminder per 4 hours while R2 stays down. Sends a recovery email when R2 comes back.
#
# Config lives in /etc/poststudio-health.env — see docs/health-monitoring.md
# Logs go to /var/log/poststudio-health.log (rotated daily, kept 7 days)

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
ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-}"
ALERT_EMAIL_FROM="${ALERT_EMAIL_FROM:-onboarding@resend.dev}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
COOLDOWN_SECONDS="${ALERT_COOLDOWN_SECONDS:-14400}"  # 4 hours default

log() {
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [poststudio-health] $*" | tee -a "$LOG_FILE"
}

# Send an HTML email via Resend. Uses jq to safely build the JSON payload so
# error messages with quotes or special chars can't break the request body.
send_email() {
  local subject="$1"
  local html_body="$2"

  if [[ -z "$ALERT_EMAIL_TO" || -z "$RESEND_API_KEY" ]]; then
    log "ALERT skipped — ALERT_EMAIL_TO or RESEND_API_KEY not configured"
    return 0
  fi

  local payload
  payload=$(jq -n \
    --arg from   "$ALERT_EMAIL_FROM" \
    --argjson to "$(jq -n --arg e "$ALERT_EMAIL_TO" '[$e]')" \
    --arg subj   "$subject" \
    --arg html   "$html_body" \
    '{from: $from, to: $to, subject: $subj, html: $html}')

  local http_status
  http_status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
    -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  if [[ "$http_status" == "200" ]]; then
    log "Email sent → ${ALERT_EMAIL_TO} (${http_status}): ${subject}"
  else
    log "WARNING: Resend returned HTTP ${http_status} for: ${subject}"
  fi
}

send_failure_email() {
  local failed_checks="$1"   # e.g. "publicRead, authedWriteDelete"
  local errors_json="$2"     # raw JSON array of {key, error} strings
  local reminder_note="$3"   # e.g. "(R2 has been down for ~2h — this is a reminder)" or ""
  local ts
  ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

  # Build per-check error rows from errors_json (plain text lines, one per failed check)
  local error_rows=""
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    error_rows="${error_rows}<tr><td style='padding:6px 12px;color:#ef4444;font-family:monospace;white-space:pre-wrap;word-break:break-all;'>${line}</td></tr>"
  done <<< "$errors_json"

  local reminder_html=""
  if [[ -n "$reminder_note" ]]; then
    reminder_html="<p style='margin:0 0 16px;padding:10px 14px;background:#fef3c7;border-left:3px solid #f59e0b;color:#92400e;font-size:13px;'>⏰ ${reminder_note}</p>"
  fi

  local html
  html=$(cat <<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;border:1px solid #2a2a2a;">

  <!-- Header -->
  <tr><td style="background:#7f1d1d;padding:20px 28px;">
    <p style="margin:0;color:#fca5a5;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">PostStudio Alert</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">R2 Health Check Failed</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 28px;">
    ${reminder_html}
    <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">Timestamp: ${ts}</p>
    <p style="margin:0 0 20px;color:#d1d5db;font-size:14px;">Failed checks: <strong style="color:#f87171;">${failed_checks}</strong></p>

    <!-- Error detail -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border-radius:4px;margin-bottom:24px;overflow:hidden;">
      <tr><td style="padding:8px 12px;background:#1f1f1f;color:#6b7280;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Error details</td></tr>
      ${error_rows}
    </table>

    <!-- What this means -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding-bottom:8px;color:#6b7280;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">What this means</td></tr>
      <tr><td style="padding:4px 0;color:#d1d5db;font-size:13px;"><strong style="color:#f87171;">publicRead</strong> failure → Premira First website has <strong>no images</strong>. Visitors see broken image slots.</td></tr>
      <tr><td style="padding:4px 0;color:#d1d5db;font-size:13px;"><strong style="color:#f87171;">authedWriteDelete</strong> failure → R2 credentials expired or permissions changed. <strong>Instagram publishing will fail</strong> at next approval.</td></tr>
      <tr><td style="padding:4px 0;color:#d1d5db;font-size:13px;"><strong style="color:#f87171;">envVarsPresent</strong> failure → A required R2 env var is missing from the PostStudio container. Restart required.</td></tr>
    </table>

    <!-- Recovery checklist -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:6px;padding:16px;margin-bottom:24px;">
      <tr><td style="padding-bottom:12px;color:#94a3b8;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Recovery checklist</td></tr>
      <tr><td style="padding:4px 0;color:#e2e8f0;font-size:13px;">1. <a href="https://dash.cloudflare.com/?to=/:account/r2/overview" style="color:#60a5fa;">Open Cloudflare R2 dashboard</a> → check <em>Allow public access</em> is ON and bucket exists</td></tr>
      <tr><td style="padding:4px 0;color:#e2e8f0;font-size:13px;">2. Check R2 credentials haven't expired → R2 → Manage API Tokens → verify token is active</td></tr>
      <tr><td style="padding:4px 0;color:#e2e8f0;font-size:13px;">3. If creds expired: generate new token, update <code style="background:#1e293b;padding:1px 4px;border-radius:2px;">/docker/poststudio/docker-compose.yml</code>, restart</td></tr>
      <tr><td style="padding:4px 0;color:#e2e8f0;font-size:13px;">4. Restart: <code style="background:#1e293b;padding:1px 4px;border-radius:2px;">ssh root@187.124.42.108 'cd /var/www/poststudio && docker compose up -d --remove-orphans'</code></td></tr>
    </table>

    <p style="margin:0;text-align:center;">
      <a href="https://dash.cloudflare.com/?to=/:account/r2/overview"
         style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">
        Open R2 Dashboard →
      </a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 28px;border-top:1px solid #2a2a2a;color:#4b5563;font-size:11px;text-align:center;">
    PostStudio health monitor · alerts rate-limited to once per 4 hours
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
HTML
)

  send_email "[PostStudio] R2 health check FAILED — ${failed_checks}" "$html"
}

send_recovery_email() {
  local ts
  ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

  local html
  html=$(cat <<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;overflow:hidden;border:1px solid #2a2a2a;">

  <!-- Header -->
  <tr><td style="background:#14532d;padding:20px 28px;">
    <p style="margin:0;color:#86efac;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">PostStudio Alert</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">R2 Health Check Recovered ✓</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">Recovered at: ${ts}</p>
    <p style="margin:0 0 24px;color:#d1d5db;font-size:15px;">All R2 health checks are now <strong style="color:#4ade80;">passing</strong>. No further action needed.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#052e16;border-radius:6px;padding:16px;margin-bottom:8px;">
      <tr><td style="padding:4px 0;color:#bbf7d0;font-size:13px;">✓ &nbsp;Public read (canary.jpg) — OK</td></tr>
      <tr><td style="padding:4px 0;color:#bbf7d0;font-size:13px;">✓ &nbsp;Authenticated write/delete — OK</td></tr>
      <tr><td style="padding:4px 0;color:#bbf7d0;font-size:13px;">✓ &nbsp;All env vars present — OK</td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 28px;border-top:1px solid #2a2a2a;color:#4b5563;font-size:11px;text-align:center;">
    PostStudio health monitor · next check in ≤15 minutes
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
HTML
)

  send_email "[PostStudio] R2 health check RECOVERED" "$html"
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

response=""
if ! response=$(curl -sf --max-time 20 \
  -w '\n__HTTP_CODE__%{http_code}' \
  -H "Authorization: Bearer ${HEALTH_TOKEN}" \
  "${APP_URL}/api/health/r2" 2>&1); then

  log "ERROR: curl failed to reach health endpoint"
  elapsed=$(( now - last_alerted ))

  if [[ "$last_status" == "ok" ]] || (( elapsed >= COOLDOWN_SECONDS )); then
    send_failure_email \
      "endpoint unreachable" \
      "Could not reach ${APP_URL}/api/health/r2 — PostStudio itself may be down" \
      ""
    last_alerted=$now
  else
    log "Alert suppressed (cooldown: ${elapsed}s / ${COOLDOWN_SECONDS}s)"
  fi

  last_status="fail"
  echo "{\"last_status\":\"${last_status}\",\"last_alerted\":${last_alerted},\"updated\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" > "$STATE_FILE"
  exit 1
fi

# Split HTTP code from body
http_code=$(echo "$response" | grep '__HTTP_CODE__' | sed 's/__HTTP_CODE__//')
response=$(echo "$response" | grep -v '__HTTP_CODE__')

ok=$(echo "$response" | jq -r '.ok' 2>/dev/null || echo "false")
log "ok=${ok} http=${http_code}"

# ── Process result ────────────────────────────────────────────────────────────
elapsed=$(( now - last_alerted ))

if [[ "$ok" != "true" ]]; then
  failed_checks=$(echo "$response" | jq -r '
    [.checks | to_entries[] | select(.value.ok == false) | .key] | join(", ")
  ' 2>/dev/null || echo "unknown")

  # Plain-text error lines for HTML table rows (one line per failed check)
  errors_text=$(echo "$response" | jq -r '
    .checks | to_entries[] | select(.value.ok == false) |
    .key + ": " + (.value.error // "failed")
  ' 2>/dev/null || echo "unknown error")

  log "FAIL — failed checks: ${failed_checks}"

  if [[ "$last_status" == "ok" ]] || (( elapsed >= COOLDOWN_SECONDS )); then
    reminder_note=""
    if [[ "$last_status" == "fail" ]]; then
      hours=$(( elapsed / 3600 ))
      reminder_note="R2 has been down for ~${hours}h — this is a reminder alert"
    fi

    send_failure_email "$failed_checks" "$errors_text" "$reminder_note"
    last_alerted=$now
  else
    log "Alert suppressed — cooldown active (${elapsed}s elapsed, need ${COOLDOWN_SECONDS}s)"
  fi

  last_status="fail"

else
  log "OK — all checks passed"

  if [[ "$last_status" == "fail" ]]; then
    send_recovery_email
    last_alerted=0
  fi

  last_status="ok"
fi

# ── Save state ────────────────────────────────────────────────────────────────
echo "{\"last_status\":\"${last_status}\",\"last_alerted\":${last_alerted},\"updated\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" > "$STATE_FILE"
