# Деплой TaskCash (production)

## Где находятся Secrets and variables

В репозитории на GitHub: **Settings** (иконка шестерёнки вверху) → в левой колонке раздел **Security** → **Secrets and variables** → **Actions**. Там список **Repository secrets** (например `SSH_PASS_TASKCASH`). Секреты для автодеплоя по SSH: **PROD_SSH_HOST**, **PROD_SSH_USER**, **PROD_SSH_PASS**. Токены ботов подставляются из workflow (при необходимости можно переопределить через секреты BOT_TOKEN, ADMIN_BOT_TOKEN).

Если в Actions шаг «Deploy via SSH» падает с ошибкой **timeout** или **i/o timeout** — сервер не доступен с раннеров GitHub (фаервол/сеть). Тогда деплой только через `deploy_production.py` с машины, откуда есть SSH до сервера.

## Репозиторий для продакшена

- **GitHub:** https://github.com/daniil248/prodtaskcash  
- **Клонирование:** `git clone https://github.com/daniil248/prodtaskcash.git`

## Два способа деплоя

### 1. Деплой из GitHub (рекомендуется)

С локальной машины (где есть SSH-доступ к серверу и этот репозиторий):

```bash
cd taskcash
python deploy_production.py --from-git
```

Скрипт по SSH:

- клонирует или обновляет репозиторий на сервере (`git clone` / `git pull`);
- создаёт/обновляет `.env` (токены ботов, домены, секреты);
- при необходимости ставит Docker, nginx, certbot;
- запускает на сервере `scripts/deploy_from_git.sh` (сборка фронтов при необходимости, `docker compose`, миграции, nginx).

Сервер по умолчанию: **5.129.247.36**, домены: **user.taskcashbot.ru**, **admin.taskcashbot.ru** (заданы в `deploy_production.py`).

### 2. Деплой с сервера (после ручного клонирования)

На сервере:

```bash
cd /root/taskcash   # или куда клонировали репозиторий
# Если git pull ругается на локальные изменения:
git reset --hard origin/main
git pull origin main
# Если нет .env: bash scripts/create_env.sh
bash scripts/deploy_from_git.sh
```

Скрипт `scripts/deploy_from_git.sh`:

- при отсутствии `frontend/dist` и `admin/dist` — собирает фронты (npm или через Docker);
- собирает образы backend/bot через `docker build --network=host` (чтобы pip видел DNS), затем `docker-compose up -d`;
- выполняет миграции Alembic;
- сбрасывает webhook ботов (long polling);
- копирует статику в `/var/www/taskcash` и перезагружает nginx.

## Пуш кода в prodtaskcash (GitHub)

С локальной машины из папки с полным проектом (taskcash):

```bash
cd taskcash
git remote add prod https://github.com/daniil248/prodtaskcash.git   # один раз
git push -u prod main
```

Либо по SSH (если настроен ключ):

```bash
git remote add prod git@github.com:daniil248/prodtaskcash.git
git push -u prod main
```

Дальше деплой: `python deploy_production.py --from-git` или на сервере `git pull && bash scripts/deploy_from_git.sh`.
