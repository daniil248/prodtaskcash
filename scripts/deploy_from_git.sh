#!/bin/bash
# Запуск на сервере после git pull. Из корня репозитория: bash scripts/deploy_from_git.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Deploy from git @ $ROOT ==="

# nginx, certbot — ставим если нет
command -v nginx >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y nginx)
command -v certbot >/dev/null 2>&1 || (apt-get install -y certbot)
mkdir -p /etc/nginx/sites-enabled
# Убираем дефолтный сайт, чтобы работали наши server_name
rm -f /etc/nginx/sites-enabled/default
# SSL — один сертификат на оба домена (лежит в user.taskcashbot.ru)
[ ! -d /etc/letsencrypt/live/user.taskcashbot.ru ] && (systemctl stop nginx 2>/dev/null || true; certbot certonly --standalone -d user.taskcashbot.ru -d admin.taskcashbot.ru --non-interactive --agree-tos -m admin@taskcashbot.ru 2>/dev/null || true; systemctl start nginx 2>/dev/null || true)
systemctl start nginx 2>/dev/null || true
ufw allow 80 2>/dev/null; ufw allow 443 2>/dev/null; ufw --force enable 2>/dev/null || true

# Frontend/admin dist (если нет — собираем; падение сборки не останавливает деплой)
for name in frontend admin; do
  if [ ! -f "$ROOT/$name/dist/index.html" ]; then
    echo "Build $name..."
    if command -v npm >/dev/null 2>&1; then
      (cd "$ROOT/$name" && (npm ci --silent 2>/dev/null || npm install --silent) && npm run build) || true
    else
      docker run --rm -v "$ROOT/$name:/app" -w /app node:20-alpine sh -c "npm install --silent && npm run build" || true
    fi
  fi
done

# .env обязателен для compose (POSTGRES_PASSWORD и др.)
if [ ! -f "$ROOT/.env" ] || ! grep -q '^POSTGRES_PASSWORD=' "$ROOT/.env" 2>/dev/null; then
  bash "$ROOT/scripts/create_env.sh"
fi

# Docker: DNS в контейнерах для запущенных контейнеров
bash "$ROOT/scripts/ensure_docker_dns.sh" 2>/dev/null || true

# Сборка образов с сетью хоста (--network=host), иначе в build нет DNS и pip не резолвит pypi.org
echo "Building backend image (host network)..."
docker build --network=host -t taskcash_backend -f "$ROOT/backend/Dockerfile" "$ROOT/backend"
docker build --network=host -t taskcash_worker -f "$ROOT/backend/Dockerfile" "$ROOT/backend"
echo "Building bot images (host network)..."
docker build --network=host -t taskcash_user_bot -f "$ROOT/bot/Dockerfile" "$ROOT/bot"
docker build --network=host -t taskcash_admin_bot -f "$ROOT/bot/Dockerfile" "$ROOT/bot"

# Docker — только docker-compose (дефис), не "docker compose"
DC="docker-compose"
[ -x /usr/bin/docker-compose ] && DC="/usr/bin/docker-compose"
[ -x /usr/local/bin/docker-compose ] && DC="/usr/local/bin/docker-compose"
COMPOSE_CMD="$DC --env-file $ROOT/.env -f $ROOT/production/docker-compose.yml"
# Освобождаем 8001: останавливаем старый стек и любой контейнер на 8001
$COMPOSE_CMD down 2>/dev/null || true
docker stop production-backend-1 taskcash-backend-1 2>/dev/null || true
sleep 2
$COMPOSE_CMD up -d

# Ждём backend
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:8001/api/settings/public | grep -q 200; then
    echo "Backend OK."
    break
  fi
  sleep 2
done

# Миграции
docker exec production-backend-1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || \
  docker exec taskcash-backend-1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || \
  docker exec taskcash_backend_1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || true

# Webhook сброс для ботов (long polling)
if [ -f "$ROOT/.env" ]; then
  BOT_TOKEN=$(grep -E '^BOT_TOKEN=' "$ROOT/.env" | cut -d= -f2-)
  ADMIN_BOT_TOKEN=$(grep -E '^ADMIN_BOT_TOKEN=' "$ROOT/.env" | cut -d= -f2-)
  [ -n "$BOT_TOKEN" ] && curl -s "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true" >/dev/null || true
  [ -n "$ADMIN_BOT_TOKEN" ] && curl -s "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true" >/dev/null || true
fi
docker restart production-user_bot-1 production-admin_bot-1 2>/dev/null || \
  docker restart taskcash-user_bot-1 taskcash-admin_bot-1 2>/dev/null || \
  docker restart taskcash_user_bot_1 taskcash_admin_bot_1 2>/dev/null || true

# Nginx: статика
mkdir -p /var/www/taskcash
cp -r "$ROOT/frontend/dist" /var/www/taskcash/frontend 2>/dev/null || true
cp -r "$ROOT/admin/dist" /var/www/taskcash/admin 2>/dev/null || true
chown -R www-data:www-data /var/www/taskcash 2>/dev/null || true

# Конфиги nginx (production) — оба домена на один сертификат user.taskcashbot.ru
for f in "$ROOT/production/nginx/"*.conf; do
  [ -f "$f" ] && cp "$f" /etc/nginx/sites-enabled/ && echo "Copied $(basename "$f")"
done
rm -f /etc/nginx/sites-enabled/default
nginx -t && (nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null) || systemctl restart nginx 2>/dev/null || true

echo "=== Deploy done ==="
