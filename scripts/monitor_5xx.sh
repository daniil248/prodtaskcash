#!/usr/bin/env bash
# Мониторинг 5xx в backend-логах. Запускается по cron раз в 5 минут.
# Если за интервал > THRESHOLD ошибок — отправляет алерт в Telegram через админского бота.
#
# Установка:
#   * добавить в /etc/cron.d/taskcash-monitor:
#       */5 * * * * root /root/taskcash/scripts/monitor_5xx.sh
#   * задать ADMIN_CHAT_ID в .env (telegram_id администратора, куда слать алерты)
#     можно взять из таблицы users у админ-аккаунта
set -euo pipefail

REPO_DIR="/root/taskcash"
INTERVAL="5m"       # окно в которое смотрим
THRESHOLD=5         # алерт, если 5xx > этого порога за окно
STATE_FILE="/tmp/taskcash-5xx-last-alert"
COOLDOWN_SEC=1800   # не слать чаще чем раз в 30 минут

# Читаем .env
# shellcheck disable=SC1091
set +u
source <(grep -E '^(ADMIN_BOT_TOKEN|ADMIN_CHAT_ID|ADMIN_TG_IDS)=' "$REPO_DIR/.env" | sed 's/^/export /')
set -u

# Чат-id берём из ADMIN_CHAT_ID (если задан), иначе — первый id из ADMIN_TG_IDS (comma-separated).
CHAT_ID="${ADMIN_CHAT_ID:-}"
if [ -z "$CHAT_ID" ] && [ -n "${ADMIN_TG_IDS:-}" ]; then
    CHAT_ID="${ADMIN_TG_IDS%%,*}"
fi

if [ -z "${ADMIN_BOT_TOKEN:-}" ] || [ -z "$CHAT_ID" ]; then
    echo "ADMIN_BOT_TOKEN или ADMIN_CHAT_ID/ADMIN_TG_IDS не заданы в .env — алерт отключён" >&2
    exit 0
fi

# Считаем 5xx за окно
COUNT=$(docker logs --since "$INTERVAL" taskcash-backend-1 2>&1 | grep -cE 'HTTP/1\.1" 5[0-9]{2}' || true)

if [ "$COUNT" -le "$THRESHOLD" ]; then
    exit 0
fi

# Cooldown
NOW=$(date +%s)
LAST=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
if [ $((NOW - LAST)) -lt "$COOLDOWN_SEC" ]; then
    exit 0
fi
echo "$NOW" > "$STATE_FILE"

# Берём пример стек-трейса
SAMPLE=$(docker logs --since "$INTERVAL" taskcash-backend-1 2>&1 | grep -B1 -A5 'Traceback' | head -20 | sed 's/"/\\"/g' | tr '\n' ' ' | cut -c1-400 || true)

TEXT="⚠️ TaskCash backend: ${COUNT} × 5xx за ${INTERVAL}
$SAMPLE"

curl -sS "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage" \
    -d chat_id="${CHAT_ID}" \
    -d text="$TEXT" \
    --max-time 10 > /dev/null || true
