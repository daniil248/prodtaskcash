#!/bin/bash
# Создаёт .env в корне репозитория. Запуск: из корня репо — bash scripts/create_env.sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PG_PASS=$(openssl rand -hex 16)
JWT_S=$(openssl rand -hex 32)
ADM_S=$(openssl rand -hex 32)
BOT_TOKEN="8626901412:AAFsnR1PR1zCNqJykcN9eHS-KZB7iCOGbSc"
ADMIN_BOT_TOKEN="8433735388:AAGbEDt9FLJsKulonKJ0KRH6PB5w3FDNBLM"
{
  echo "POSTGRES_PASSWORD=$PG_PASS"
  echo "DATABASE_URL=postgresql+asyncpg://taskcash:${PG_PASS}@postgres:5432/taskcash"
  echo "REDIS_URL=redis://redis:6379/0"
  echo "BOT_TOKEN=$BOT_TOKEN"
  echo "BOT_USERNAME=TaskCashAppBot"
  echo "MINI_APP_URL=https://user.taskcashbot.ru"
  echo "ADMIN_BOT_TOKEN=$ADMIN_BOT_TOKEN"
  echo "ADMIN_APP_URL=https://admin.taskcashbot.ru"
  echo "ADMIN_TG_IDS="
  echo "BACKEND_URL=http://backend:8000"
  echo "JWT_SECRET=$JWT_S"
  echo "JWT_EXPIRE_HOURS=168"
  echo "ADMIN_SECRET=$ADM_S"
  echo "MIN_WITHDRAWAL=10.0"
  echo "MAX_WITHDRAWAL_DAY=1000.0"
  echo "WITHDRAWAL_FEE_PERCENT=5.0"
  echo "REFERRAL_REWARD=0.50"
  echo "REFERRAL_MIN_TASKS=3"
} > "$ROOT/.env"
echo "Created $ROOT/.env"
