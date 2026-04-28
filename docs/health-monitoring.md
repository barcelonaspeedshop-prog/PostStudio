# R2 Health Monitoring

PostStudio runs a cron-based health check against Cloudflare R2 every 15 minutes. If R2 goes down, an email alert fires within 15 minutes. A recovery email fires when R2 comes back.

---

## What is checked

The endpoint `GET /api/health/r2` runs three checks on every call:

| Check | What it tests |
|---|---|
| `envVarsPresent` | All five R2 env vars are set in the container |
| `publicRead` | Fetches `health/canary.jpg` from the public R2 CDN URL; expects HTTP 200 |
| `authedWriteDelete` | Uploads then deletes a small timestamped object using the R2 SDK; catches credential expiry |

The endpoint returns HTTP 200 with `{ "ok": true }` when all checks pass, or HTTP 503 with `{ "ok": false }` and per-check details when any fail.

---

## Architecture

```
cron (every 15 min)
  └─▶ scripts/health-check.sh
        ├─ curl https://app.premirafirst.com/api/health/r2
        ├─ parse JSON with jq
        ├─ write result to /var/log/poststudio-health.log
        ├─ track state in /var/log/poststudio-health-state.json
        └─ send email via Resend API (rate-limited, 4h cooldown)
```

---

## Files

| File | Purpose |
|---|---|
| `app/api/health/r2/route.ts` | Next.js health check endpoint |
| `scripts/health-check.sh` | Cron script — calls endpoint, alerts on failure |
| `scripts/upload-canary.js` | One-time setup: uploads `health/canary.jpg` to R2 |
| `/etc/poststudio-health.env` | VPS config file (secrets, email, URLs) — not in git |
| `/etc/logrotate.d/poststudio-health` | Log rotation config |
| `/var/log/poststudio-health.log` | Rolling health check log |
| `/var/log/poststudio-health-state.json` | Alert state (last failure, last alerted timestamp) |

---

## VPS setup (how to reproduce from scratch)

### 1. Config file

Create `/etc/poststudio-health.env`:

```bash
POSTSTUDIO_APP_URL=https://app.premirafirst.com
PREVIEW_TOKEN=<value from /var/www/poststudio/docker-compose.yml>
ALERT_EMAIL_TO=<alert recipient email>
ALERT_EMAIL_FROM=onboarding@resend.dev
RESEND_API_KEY=<resend.com API key>
ALERT_COOLDOWN_SECONDS=14400
HEALTH_LOG_FILE=/var/log/poststudio-health.log
HEALTH_STATE_FILE=/var/log/poststudio-health-state.json
```

```bash
chmod 600 /etc/poststudio-health.env
```

### 2. Install the script

```bash
cp /path/to/repo/scripts/health-check.sh /usr/local/bin/poststudio-health-check
chmod +x /usr/local/bin/poststudio-health-check
```

### 3. Cron entry

Add to root's crontab (`crontab -e`):

```cron
*/15 * * * * /usr/local/bin/poststudio-health-check >> /var/log/poststudio-health.log 2>&1
```

Verify it's installed:
```bash
crontab -l | grep poststudio
```

### 4. Log rotation

Create `/etc/logrotate.d/poststudio-health`:

```
/var/log/poststudio-health.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
```

### 5. Canary image (one-time upload)

The public read check fetches `health/canary.jpg` from R2. Upload it once:

```bash
cd /docker/poststudio
docker exec -e R2_ENDPOINT="$R2_ENDPOINT" \
  -e R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  -e R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  -e R2_BUCKET="$R2_BUCKET" \
  -e R2_PUBLIC_URL="$R2_PUBLIC_URL" \
  poststudio-app-1 node /app/scripts/upload-canary.js
```

Canary URL: `https://pub-05204aab4f2d4cbeb3d786b0f03d35c0.r2.dev/health/canary.jpg`

**Never delete `health/canary.jpg` from the R2 bucket.**

### 6. Resend email setup

Email alerts are sent via [Resend](https://resend.com) (free tier: 3,000 emails/month — well above our usage of ~96/month at 15-min intervals).

**Account:** Sign in at https://resend.com with the barcelonaspeedshop Gmail account.

**Sender address:** `onboarding@resend.dev` — Resend's shared sandbox address, no domain verification needed. Works immediately.

**API key location:** The live key is stored in `/etc/poststudio-health.env` on the VPS as `RESEND_API_KEY`. It is not in this repository (the file is on the VPS only, not committed to git).

**If the API key is compromised:**
1. Go to https://resend.com → API Keys
2. Delete the compromised key
3. Create a new key
4. Update on VPS: `nano /etc/poststudio-health.env` → replace `RESEND_API_KEY=...`
5. The cron script reads the file on each run, so no restart needed

**Free tier limits:** 3,000 emails/month, 100/day. At 15-minute intervals and a 4-hour cooldown, worst-case usage is 6 alert emails per outage + 1 recovery = well within limits.

---

## Testing

### Manual health check
```bash
TOKEN=$(grep PREVIEW_TOKEN /etc/poststudio-health.env | cut -d= -f2)
curl -s -H "Authorization: Bearer $TOKEN" https://app.premirafirst.com/api/health/r2 | jq .
```

### Force a failure (test alerting)
Temporarily swap in a bad token so the endpoint returns 401 and curl fails:
```bash
cp /etc/poststudio-health.env /etc/poststudio-health.env.bak
sed -i 's/PREVIEW_TOKEN=.*/PREVIEW_TOKEN=wrongtoken/' /etc/poststudio-health.env
/usr/local/bin/poststudio-health-check || true
cp /etc/poststudio-health.env.bak /etc/poststudio-health.env
# Reset state to ok after testing
echo '{"last_status":"ok","last_alerted":0,"updated":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' \
  > /var/log/poststudio-health-state.json
```

### Check logs
```bash
tail -f /var/log/poststudio-health.log
cat /var/log/poststudio-health-state.json
```

### Reset alert state (after testing)
```bash
echo '{"last_status":"ok","last_alerted":0,"updated":"2026-01-01T00:00:00Z"}' \
  > /var/log/poststudio-health-state.json
```

---

## Alert rate limiting

| Situation | Behaviour |
|---|---|
| First failure | Alert fires immediately |
| Subsequent failures within 4 hours | Silent (no spam) |
| Still failing after 4 hours | Reminder alert fires |
| Recovery | Recovery email fires once |

The state is stored in `/var/log/poststudio-health-state.json`. If this file is missing or corrupt, the script treats it as a fresh start (status=ok, last_alerted=0).

---

## R2 env vars reference

| Var | Where to find it |
|---|---|
| `R2_ENDPOINT` | Cloudflare dashboard → R2 → Overview → S3 API endpoint |
| `R2_ACCESS_KEY_ID` | Cloudflare dashboard → R2 → Manage API Tokens |
| `R2_SECRET_ACCESS_KEY` | Shown once at token creation time; store safely |
| `R2_BUCKET` | `poststudio-media` |
| `R2_PUBLIC_URL` | Cloudflare dashboard → R2 → poststudio-media → Settings → Public R2.dev subdomain |
