# TaskCash — сборка для заказчика

В этой папке только файлы, необходимые для запуска приложения. Упакуйте в zip и передайте заказчику.

## Состав

- **backend** — API, миграции Alembic, воркер Celery
- **frontend** — мини-апп для пользователей (сборка: `npm install && npm run build`)
- **admin** — админ-панель (сборка: `npm install && npm run build`)
- **bot** — пользовательский и админский Telegram-боты
- **nginx** — конфиги для user.taskcashbot.ru и admin.taskcashbot.ru
- **docker-compose.yml** — запуск Postgres, Redis, backend, worker, ботов
- **.env.example** — пример переменных окружения (скопировать в `.env` и заполнить)

## Деплой на сервер

1. Скопировать папку на сервер (например в `/root/taskcash/`).
2. Создать `.env` из `.env.example`, подставить токены ботов, домены, пароли и секреты.
3. Установить Docker и Docker Compose.
4. Собрать фронты: из корня проекта  
   `docker run --rm -v $(pwd)/frontend:/app -w /app node:20-alpine sh -c "npm install && npm run build"`  
   и то же для `admin`.
5. Запустить: `docker compose up -d` (или `docker-compose up -d`).
6. Миграции: `docker exec <backend_container> sh -c "cd /app && alembic upgrade head"`.
7. Настроить nginx: скопировать файлы из `nginx/` в `/etc/nginx/sites-enabled/`, выдать SSL (certbot) для user.taskcashbot.ru и admin.taskcashbot.ru, перезагрузить nginx.

Домены по умолчанию: **user.taskcashbot.ru** (мини-апп), **admin.taskcashbot.ru** (админка).
