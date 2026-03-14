#!/bin/bash
# Запуск на сервере после git pull. Из корня репозитория: bash scripts/deploy_from_git.sh
# Требует: .env в корне, docker, nginx, certbot (если ещё нет сертов).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Deploy from git @ $ROOT ==="

# Frontend/admin dist (если нет — собираем через node)
for name in frontend admin; do
  if [ ! -f "$ROOT/$name/dist/index.html" ]; then
    echo "Build $name..."
    if command -v npm >/dev/null 2>&1; then
      (cd "$ROOT/$name" && npm ci --silent 2>/dev/null || npm install --silent && npm run build)
    else
      docker run --rm -v "$ROOT/$name:/app" -w /app node:20-alpine sh -c "npm install --silent && npm run build"
    fi
  fi
done

# Docker
export COMPOSE_FILE="$ROOT/production/docker-compose.yml"
if [ -n "$(command -v docker-compose 2>/dev/null)" ]; then
  docker-compose -f "$ROOT/production/docker-compose.yml" up -d --build
else
  docker compose -f "$ROOT/production/docker-compose.yml" up -d --build
fi

# Ждём backend
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:8001/api/settings/public | grep -q 200; then
    echo "Backend OK."
    break
  fi
  sleep 2
done

# Миграции
docker exec taskcash-backend-1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || \
  docker exec taskcash_backend_1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || true

# Webhook сброс для ботов (long polling)
if [ -f "$ROOT/.env" ]; then
  BOT_TOKEN=$(grep -E '^BOT_TOKEN=' "$ROOT/.env" | cut -d= -f2-)
  ADMIN_BOT_TOKEN=$(grep -E '^ADMIN_BOT_TOKEN=' "$ROOT/.env" | cut -d= -f2-)
  [ -n "$BOT_TOKEN" ] && curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true" >/dev/null || true
  [ -n "$ADMIN_BOT_TOKEN" ] && curl -s "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true" >/dev/null || true
fi
docker restart taskcash-user_bot-1 taskcash-admin_bot-1 2>/dev/null || docker restart taskcash_user_bot_1 taskcash_admin_bot_1 2>/dev/null || true

# Nginx: статика
mkdir -p /var/www/taskcash
cp -r "$ROOT/frontend/dist" /var/www/taskcash/frontend 2>/dev/null || true
cp -r "$ROOT/admin/dist" /var/www/taskcash/admin 2>/dev/null || true
chown -R www-data:www-data /var/www/taskcash 2>/dev/null || true

# Конфиги nginx (production)
for f in "$ROOT/production/nginx/"*.conf; do
  [ -f "$f" ] && cp "$f" /etc/nginx/sites-enabled/ && echo "Copied $(basename "$f")"
done
nginx -t 2>/dev/null && (nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null) || true

echo "=== Deploy done ==="
