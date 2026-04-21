#!/usr/bin/env python3
"""
Smoke-тесты TaskCash на проде.
Exit 0 = всё ок, exit 1 = что-то сломано.
Запускать после деплоя или руками.

Что проверяет:
 1. HTTPS user.taskcashbot.ru → 200
 2. HTTPS admin.taskcashbot.ru → 200
 3. /api/settings/online возвращает валидный JSON с ключом "online"
 4. SQLAlchemy может загрузить все Task (ловит регрессии enum-значений типа launch_bot)
 5. Celery worker отвечает на ping
 6. Postgres готов
 7. Redis ping → PONG
"""
import json
import subprocess
import sys


errors: list[str] = []


def run(cmd: str, timeout: int = 10) -> str:
    """Запустить shell-команду, вернуть stdout (strip). Не райзит на ненулевой exit."""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except subprocess.TimeoutExpired:
        return "TIMEOUT"


def expect(name: str, actual: str, expected: str) -> None:
    if actual != expected:
        errors.append(f"{name}: got {actual!r}, expected {expected!r}")


# 1-2. HTTPS reachability
expect(
    "user https",
    run("curl -sk -o /dev/null -w '%{http_code}' -H 'Host: user.taskcashbot.ru' https://127.0.0.1/"),
    "200",
)
expect(
    "admin https",
    run("curl -sk -o /dev/null -w '%{http_code}' -H 'Host: admin.taskcashbot.ru' https://127.0.0.1/"),
    "200",
)

# 3. /api/settings/online
out = run("curl -sk -H 'Host: user.taskcashbot.ru' https://127.0.0.1/api/settings/online")
try:
    data = json.loads(out)
    if "online" not in data:
        errors.append(f"/api/settings/online: no 'online' key — {out!r}")
except json.JSONDecodeError:
    errors.append(f"/api/settings/online: not JSON — {out!r}")

# 4. ORM enum integrity — grepaemсу launch_bot-kind of regressions
orm_script = (
    "import asyncio\n"
    "from sqlalchemy import select\n"
    "from app.database import AsyncSessionLocal\n"
    "from app.models import Task\n"
    "async def main():\n"
    "    async with AsyncSessionLocal() as db:\n"
    "        r = await db.execute(select(Task))\n"
    "        print(len(r.scalars().all()))\n"
    "asyncio.run(main())\n"
)
orm_out = run(
    f"docker exec -w /app taskcash-backend-1 python -c \"{orm_script}\"",
    timeout=15,
)
try:
    int(orm_out)
except ValueError:
    errors.append(f"ORM can't load Task (enum regression?) — {orm_out!r}")

# 5. Celery ping
celery_out = run(
    'docker exec taskcash-worker-1 sh -c "celery -A app.workers.celery_app:celery_app inspect ping --timeout 5"',
    timeout=15,
)
if "pong" not in celery_out.lower():
    errors.append(f"celery ping failed — {celery_out[:200]!r}")

# 6. Postgres
pg_out = run("docker exec taskcash-postgres-1 pg_isready -U taskcash -d taskcash")
if "accepting connections" not in pg_out:
    errors.append(f"postgres not ready — {pg_out!r}")

# 7. Redis
redis_out = run("docker exec taskcash-redis-1 redis-cli ping")
if redis_out != "PONG":
    errors.append(f"redis not ok — {redis_out!r}")


if errors:
    print("SMOKE FAIL:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)

print("SMOKE OK: 7/7 checks passed")
