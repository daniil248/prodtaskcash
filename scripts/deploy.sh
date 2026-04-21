#!/usr/bin/env bash
# Деплой TaskCash на проде.
# Запускать из /root/taskcash.
# Делает: git pull → пересобирает backend/worker → собирает фронты → копирует в nginx-root → reload nginx → smoke-test.
set -euo pipefail

REPO_DIR="/root/taskcash"
NGINX_ADMIN="/var/www/taskcash/admin"
NGINX_FRONT="/var/www/taskcash/frontend"

cd "$REPO_DIR"

echo "=== [1/5] git pull ==="
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
    echo "(no new commits)"
fi

echo "=== [2/5] build + restart backend / worker ==="
docker compose --env-file .env build backend worker
docker compose --env-file .env up -d --no-deps backend worker
# restart bots too (они могут зависеть от моделей — пусть подхватят свежий образ если собирали)
docker compose --env-file .env up -d --no-deps user_bot admin_bot

# Ждём готовности backend
for i in $(seq 1 20); do
    if docker logs --tail 5 taskcash-backend-1 2>&1 | grep -q "Uvicorn running"; then
        echo "backend up"
        break
    fi
    sleep 2
done

echo "=== [3/5] build admin ==="
docker run --rm --network=host -v "$REPO_DIR/admin:/app" -w /app node:20-alpine sh -lc "npm ci --silent --no-audit --no-fund && npm run build"
rm -rf "$NGINX_ADMIN"/*
cp -r "$REPO_DIR/admin/dist/"* "$NGINX_ADMIN/"

echo "=== [4/5] build frontend ==="
docker run --rm --network=host -v "$REPO_DIR/frontend:/app" -w /app node:20-alpine sh -lc "npm ci --silent --no-audit --no-fund && npm run build"
rm -rf "$NGINX_FRONT"/*
cp -r "$REPO_DIR/frontend/dist/"* "$NGINX_FRONT/"

echo "=== [5/5] nginx reload ==="
nginx -t
nginx -s reload

echo "=== smoke test ==="
if python3 "$REPO_DIR/scripts/smoke_test.py"; then
    echo "✅ Deploy OK"
else
    echo "❌ SMOKE TEST FAILED — проверь что сломано"
    exit 1
fi
