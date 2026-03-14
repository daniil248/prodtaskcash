#!/bin/bash
# Перезапуск сервисов TaskCash: бэкенд, воркер Celery, боты.
# Запускать из корня проекта или: bash scripts/restart-services.sh (из корня).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

if [ ! -f "docker-compose.yml" ]; then
  echo "Ошибка: docker-compose.yml не найден в $PROJECT_DIR"
  exit 1
fi

echo "Перезапуск сервисов в $PROJECT_DIR ..."
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose restart backend worker user_bot admin_bot
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose restart backend worker user_bot admin_bot
else
  echo "Ошибка: нужен docker compose или docker-compose"
  exit 1
fi
echo "Готово: backend, worker, user_bot, admin_bot перезапущены."
