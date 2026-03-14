# -*- coding: utf-8 -*-
"""
Единый скрипт деплоя TaskCash. Хост-nginx: статика из dist, /api/ на 127.0.0.1:8001.
Используется docker-compose (через дефис) из-за ограничения API на сервере.
Запуск: py deploy.py (из папки taskcash или корня репозитория).
"""
import os
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')
import paramiko

HOST = '92.51.44.138'
PORT = 22
USER = 'root'
PASS = 'w6Z6Sk8DK5k#po'

# Корень проекта taskcash (где лежит deploy.py)
BASE = os.path.dirname(os.path.abspath(__file__))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
print('Connected.')

def run(cmd, timeout=60):
    print(f'$ {cmd}')
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o:
        print(o[:3000])
    if e:
        print('[ERR]', e[:500])
    return o

def rel(path: str) -> str:
    return path.replace('/', os.sep)

files = [
    (rel('frontend/src/pages/TasksPage.tsx'), 'frontend/src/pages/TasksPage.tsx'),
    (rel('frontend/src/pages/TaskDetailPage.tsx'), 'frontend/src/pages/TaskDetailPage.tsx'),
    (rel('frontend/src/pages/ProfilePage.tsx'), 'frontend/src/pages/ProfilePage.tsx'),
    (rel('frontend/src/pages/BonusesPage.tsx'), 'frontend/src/pages/BonusesPage.tsx'),
    (rel('frontend/src/pages/SplashPage.tsx'), 'frontend/src/pages/SplashPage.tsx'),
    (rel('frontend/src/pages/ProfileSettingsPage.tsx'), 'frontend/src/pages/ProfileSettingsPage.tsx'),
    (rel('frontend/src/components/LevelBadge.tsx'), 'frontend/src/components/LevelBadge.tsx'),
    (rel('frontend/src/components/TaskCard.tsx'), 'frontend/src/components/TaskCard.tsx'),
    (rel('frontend/src/components/BottomNav.tsx'), 'frontend/src/components/BottomNav.tsx'),
    (rel('frontend/src/components/Toast.tsx'), 'frontend/src/components/Toast.tsx'),
    (rel('frontend/src/components/DocumentView.tsx'), 'frontend/src/components/DocumentView.tsx'),
    (rel('frontend/src/documents.ts'), 'frontend/src/documents.ts'),
    (rel('frontend/src/App.tsx'), 'frontend/src/App.tsx'),
    (rel('frontend/src/main.tsx'), 'frontend/src/main.tsx'),
    (rel('frontend/src/api/client.ts'), 'frontend/src/api/client.ts'),
    (rel('frontend/src/types.ts'), 'frontend/src/types.ts'),
    (rel('frontend/src/store/index.ts'), 'frontend/src/store/index.ts'),
    (rel('frontend/src/utils/level.ts'), 'frontend/src/utils/level.ts'),
    (rel('frontend/src/styles/index.css'), 'frontend/src/styles/index.css'),
    (rel('frontend/public/icon.svg'), 'frontend/public/icon.svg'),
    (rel('frontend/public/splash-screen.svg'), 'frontend/public/splash-screen.svg'),
    (rel('admin/src/pages/TasksAdminPage.tsx'), 'admin/src/pages/TasksAdminPage.tsx'),
    (rel('admin/src/pages/SettingsPage.tsx'), 'admin/src/pages/SettingsPage.tsx'),
    (rel('admin/src/pages/DashboardPage.tsx'), 'admin/src/pages/DashboardPage.tsx'),
    (rel('admin/src/pages/UsersPage.tsx'), 'admin/src/pages/UsersPage.tsx'),
    (rel('admin/src/pages/BlacklistPage.tsx'), 'admin/src/pages/BlacklistPage.tsx'),
    (rel('admin/src/pages/WithdrawalsPage.tsx'), 'admin/src/pages/WithdrawalsPage.tsx'),
    (rel('admin/src/pages/BroadcastPage.tsx'), 'admin/src/pages/BroadcastPage.tsx'),
    (rel('admin/src/pages/LoginPage.tsx'), 'admin/src/pages/LoginPage.tsx'),
    (rel('admin/src/App.tsx'), 'admin/src/App.tsx'),
    (rel('admin/src/main.tsx'), 'admin/src/main.tsx'),
    (rel('admin/src/api.ts'), 'admin/src/api.ts'),
    (rel('admin/src/styles.css'), 'admin/src/styles.css'),
    (rel('admin/src/vite-env.d.ts'), 'admin/src/vite-env.d.ts'),
    (rel('backend/app/api/admin.py'), 'backend/app/api/admin.py'),
    (rel('backend/app/api/auth.py'), 'backend/app/api/auth.py'),
    (rel('backend/app/api/tasks.py'), 'backend/app/api/tasks.py'),
    (rel('backend/app/api/settings.py'), 'backend/app/api/settings.py'),
    (rel('backend/app/api/withdrawals.py'), 'backend/app/api/withdrawals.py'),
    (rel('backend/app/api/bonuses.py'), 'backend/app/api/bonuses.py'),
    (rel('backend/app/api/profile.py'), 'backend/app/api/profile.py'),
    (rel('backend/app/api/deps.py'), 'backend/app/api/deps.py'),
    (rel('backend/app/config.py'), 'backend/app/config.py'),
    (rel('backend/app/models.py'), 'backend/app/models.py'),
    (rel('backend/app/schemas.py'), 'backend/app/schemas.py'),
    (rel('backend/app/workers/tasks.py'), 'backend/app/workers/tasks.py'),
    (rel('backend/app/services/task_verification.py'), 'backend/app/services/task_verification.py'),
    (rel('backend/app/services/verification.py'), 'backend/app/services/verification.py'),
    (rel('backend/app/services/auth.py'), 'backend/app/services/auth.py'),
    (rel('backend/app/services/antifraid.py'), 'backend/app/services/antifraid.py'),
    (rel('backend/app/services/referral.py'), 'backend/app/services/referral.py'),
    (rel('bot/user_bot.py'), 'bot/user_bot.py'),
    (rel('.env.example'), '.env.example'),
    (rel('BOTS_SETUP.md'), 'BOTS_SETUP.md'),
    (rel('docker-compose.yml'), 'docker-compose.yml'),
    (rel('nginx/host-testuser.telegbot3td.ru.conf'), 'nginx/host-testuser.telegbot3td.ru.conf'),
    (rel('nginx/host-testadmin.telegbot3td.ru.conf'), 'nginx/host-testadmin.telegbot3td.ru.conf'),
    (rel('backend/alembic/versions/005_task_timer_simulation.py'), 'backend/alembic/versions/005_task_timer_simulation.py'),
    (rel('backend/alembic/versions/006_user_full_name.py'), 'backend/alembic/versions/006_user_full_name.py'),
]

sftp = ssh.open_sftp()
uploaded = 0
for local_rel, remote_rel in files:
    local_path = os.path.join(BASE, local_rel)
    remote_path = '/root/taskcash/' + remote_rel.replace('\\', '/')
    try:
        sftp.put(local_path, remote_path)
        uploaded += 1
        print('.', end='', flush=True)
    except FileNotFoundError:
        print(f'\n[SKIP] not found: {local_path}')
    except Exception as ex:
        print(f'\n[ERR] {local_rel}: {ex}')
print(f'\nUploaded: {uploaded}/{len(files)} files.')
sftp.close()

print('\n--- Сборка frontend и admin ---')
run('docker run --rm -v /root/taskcash/frontend:/app -w /app node:20-alpine sh -c "npm install --silent 2>&1 | tail -1 && npm run build 2>&1"', timeout=300)
run('docker run --rm -v /root/taskcash/admin:/app -w /app node:20-alpine sh -c "npm install --silent 2>&1 | tail -1 && npm run build 2>&1"', timeout=300)

print('\n--- Backend: перезапуск (compose или docker restart) и ожидание 8001 ---')
run('cd /root/taskcash && docker-compose up -d backend --force-recreate 2>/dev/null || docker compose up -d backend --force-recreate 2>/dev/null || true', timeout=90)
# Если compose падает с API version (1.43 vs 1.44), пробуем просто перезапустить контейнер по имени
run('docker restart taskcash_backend_1 2>/dev/null || docker restart taskcash-backend-1 2>/dev/null || true', timeout=30)
# Чтобы после падения бэкенда данные не пропадали: при каждом деплое выставляем restart=always (работает и для уже запущенных контейнеров)
run('docker update --restart=always taskcash-backend-1 taskcash-worker-1 2>/dev/null || docker update --restart=always taskcash_backend_1 taskcash_worker_1 2>/dev/null || true', timeout=15)
time.sleep(5)
for attempt in range(1, 25):
    time.sleep(2)
    code = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:8001/api/settings/public')
    if code and code.strip() == '200':
        print('Backend 8001 отвечает 200.')
        break
    print('  попытка %s/24: %s' % (attempt, code or 'нет ответа'))
else:
    print('WARN: backend за ~48 сек не ответил 200.')
time.sleep(2)
# docker-compose v1 даёт taskcash_backend_1, v2 — taskcash-backend-1
run('docker exec taskcash-backend-1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || docker exec taskcash_backend_1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || true', timeout=30)
# compose на сервере падает с API 1.43 — рестартуем по имени контейнеров
run('docker restart taskcash-worker-1 taskcash-user_bot-1 taskcash-admin_bot-1 2>/dev/null || docker restart taskcash_worker_1 taskcash_user_bot_1 taskcash_admin_bot_1 2>/dev/null || true', timeout=45)
time.sleep(3)

print('\n--- Хост-nginx: статика + /api/ на 127.0.0.1:8001 ---')
run('cp /root/taskcash/nginx/host-testuser.telegbot3td.ru.conf /etc/nginx/sites-enabled/testuser.telegbot3td.ru.conf')
run('cp /root/taskcash/nginx/host-testadmin.telegbot3td.ru.conf /etc/nginx/sites-enabled/testadmin.telegbot3td.ru.conf')
out = run('grep -l "127.0.0.1:8001" /etc/nginx/sites-enabled/testadmin* /etc/nginx/sites-enabled/testuser* 2>/dev/null || true')
if out and out.strip():
    print('OK: в конфигах 127.0.0.1:8001.')
run('nginx -t', timeout=10)
run('nginx -s reload', timeout=15)

print('\n--- Проверка: 8001 и HTTPS ---')
code = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:8001/api/settings/public')
if code and code.strip() == '200':
    print('OK: API 8001 -> 200.')
else:
    print('WARN: API 8001 код:', code or '?')
code_https = run('curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: testuser.telegbot3td.ru" https://127.0.0.1/')
code_api = run('curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: testuser.telegbot3td.ru" https://127.0.0.1/api/settings/public')
if (code_https or '').strip() == '200' and (code_api or '').strip() == '200':
    print('OK: мини-апп и API по HTTPS 200.')
else:
    print('WARN: HTTPS index=%s, API=%s' % (code_https or '?', code_api or '?'))

# Убедиться, что админка видит пользователей и задания: логин -> users -> tasks по 127.0.0.1:8001
print('\n--- Проверка: админ API (users + tasks) по 8001 ---')
verify_script = r"""
export ADMIN_SECRET=$(docker exec taskcash-backend-1 printenv ADMIN_SECRET 2>/dev/null || docker exec taskcash_backend_1 printenv ADMIN_SECRET 2>/dev/null)
if [ -z "$ADMIN_SECRET" ]; then echo "VERIFY_FAIL: no ADMIN_SECRET"; exit 1; fi
BODY=$(python3 -c "import json,os; print(json.dumps({'secret': os.environ.get('ADMIN_SECRET','')}))")
LOGIN=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:8001/api/admin/login -H "Content-Type: application/json" -d "$BODY")
HTTP=$(echo "$LOGIN" | tail -n1)
JSON=$(echo "$LOGIN" | sed '$d')
if [ "$HTTP" != "200" ]; then echo "VERIFY_FAIL: login HTTP $HTTP"; exit 1; fi
TOKEN=$(echo "$JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
if [ -z "$TOKEN" ]; then echo "VERIFY_FAIL: no token"; exit 1; fi
UOUT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:8001/api/admin/users?page=1")
UHTTP=$(echo "$UOUT" | tail -n1)
if [ "$UHTTP" != "200" ]; then echo "VERIFY_FAIL: users HTTP $UHTTP"; exit 1; fi
UCOUNT=$(echo "$UOUT" | sed '$d' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
TOUT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:8001/api/admin/tasks")
THTTP=$(echo "$TOUT" | tail -n1)
if [ "$THTTP" != "200" ]; then echo "VERIFY_FAIL: tasks HTTP $THTTP"; exit 1; fi
TCOUNT=$(echo "$TOUT" | sed '$d' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")
echo "VERIFY_OK users=$UCOUNT tasks=$TCOUNT"
"""
verify_out = run(verify_script, timeout=25)
verify_ok = verify_out and 'VERIFY_OK' in verify_out
if verify_ok:
    print(verify_out)
    print('OK: админ API отдаёт users и tasks.')
else:
    print(verify_out or '(нет вывода)')
    print('Повторный перезапуск backend и проверка через 10 сек...')
    run('docker restart taskcash-backend-1 2>/dev/null || docker restart taskcash_backend_1 2>/dev/null || true', timeout=30)
    time.sleep(10)
    verify_out2 = run(verify_script, timeout=25)
    verify_ok2 = verify_out2 and 'VERIFY_OK' in verify_out2
    if verify_ok2:
        print(verify_out2)
        print('OK: после повторного рестарта админ API работает.')
    else:
        print(verify_out2 or '(нет вывода)')
        print('ОШИБКА: админ API (users/tasks) по 8001 недоступен или не возвращает 200.')
        run("(crontab -l 2>/dev/null | grep -v check_backend_port) | crontab - 2>/dev/null || true")
        ssh.close()
        sys.exit(1)

# Убрать крон-костыль, если остался с прошлого деплоя
run("(crontab -l 2>/dev/null | grep -v check_backend_port) | crontab - 2>/dev/null || true")

print('\n=== DONE ===')
print('Mini App (Telegram): https://testuser.telegbot3td.ru')
print('Админка: https://testadmin.telegbot3td.ru')
ssh.close()
