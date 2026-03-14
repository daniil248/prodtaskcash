#!/bin/bash
# Только nginx + боты. Контейнеры уже должны быть запущены. Из корня репо: bash scripts/setup_nginx_and_bots.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Nginx + боты ==="

# SSL — один сертификат на ОБА домена (иначе Chrome: ERR_CERT_COMMON_NAME_INVALID на admin)
if [ ! -d /etc/letsencrypt/live/user.taskcashbot.ru ]; then
  echo "Getting SSL cert (both domains)..."
  systemctl stop nginx 2>/dev/null || true
  certbot certonly --standalone -d user.taskcashbot.ru -d admin.taskcashbot.ru --non-interactive --agree-tos -m admin@taskcashbot.ru 2>/dev/null || true
  systemctl start nginx 2>/dev/null || true
else
  echo "Expanding cert to include admin.taskcashbot.ru if needed..."
  systemctl stop nginx 2>/dev/null || true
  certbot certonly --standalone -d user.taskcashbot.ru -d admin.taskcashbot.ru --expand --non-interactive -m admin@taskcashbot.ru 2>/dev/null || true
  systemctl start nginx 2>/dev/null || true
fi
ufw allow 80 2>/dev/null; ufw allow 443 2>/dev/null; ufw --force enable 2>/dev/null || true

# Статика (собрать если нет)
for name in frontend admin; do
  if [ ! -f "$ROOT/$name/dist/index.html" ]; then
    echo "Building $name..."
    (cd "$ROOT/$name" && npm ci --silent 2>/dev/null || npm install --silent; npm run build) 2>/dev/null || \
    docker run --rm -v "$ROOT/$name:/app" -w /app node:20-alpine sh -c "npm install --silent && npm run build" 2>/dev/null || true
  fi
done
# Статика: index.html и assets прямо в frontend/ и admin/
mkdir -p /var/www/taskcash/frontend /var/www/taskcash/admin
rm -rf /var/www/taskcash/frontend/* /var/www/taskcash/admin/*
[ -f "$ROOT/frontend/dist/index.html" ] && cp -r "$ROOT/frontend/dist/"* /var/www/taskcash/frontend/ || true
[ -f "$ROOT/admin/dist/index.html" ] && cp -r "$ROOT/admin/dist/"* /var/www/taskcash/admin/ || true
chown -R www-data:www-data /var/www/taskcash 2>/dev/null || true

# Конфиги nginx (оба домена на сертификат user.taskcashbot.ru)
rm -f /etc/nginx/sites-enabled/default
# Удаляем старые конфиги этих доменов, иначе nginx: conflicting server name
rm -f /etc/nginx/sites-enabled/host-user.taskcashbot.ru.conf \
      /etc/nginx/sites-enabled/host-admin.taskcashbot.ru.conf \
      /etc/nginx/sites-enabled/user.taskcashbot.ru.conf \
      /etc/nginx/sites-enabled/admin.taskcashbot.ru.conf
for f in "$ROOT/production/nginx/"*.conf; do
  [ -f "$f" ] && cp "$f" /etc/nginx/sites-enabled/ && echo "Copied $(basename "$f")"
done
nginx -t && (nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null)
echo "Nginx reloaded."

# Webhook сброс + перезапуск ботов (long polling)
if [ -f "$ROOT/.env" ]; then
  BOT_TOKEN=$(grep -E '^BOT_TOKEN=' "$ROOT/.env" | cut -d= -f2-)
  ADMIN_BOT_TOKEN=$(grep -E '^ADMIN_BOT_TOKEN=' "$ROOT/.env" | cut -d= -f2-)
  [ -n "$BOT_TOKEN" ] && curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true" && echo " User webhook deleted."
  [ -n "$ADMIN_BOT_TOKEN" ] && curl -s "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true" && echo " Admin webhook deleted."
fi
docker restart production-user_bot-1 production-admin_bot-1 2>/dev/null || docker restart taskcash-user_bot-1 taskcash-admin_bot-1 2>/dev/null || true
echo "Bots restarted."
echo "=== Done. Check https://user.taskcashbot.ru and https://admin.taskcashbot.ru ==="
