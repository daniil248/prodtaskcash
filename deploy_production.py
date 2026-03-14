# -*- coding: utf-8 -*-
"""
Деплой TaskCash на продакшн-сервер заказчика.
Сервер: 5.129.247.36, домены: user.taskcashbot.ru, admin.taskcashbot.ru
Запуск: py deploy_production.py (из папки taskcash).
"""
import os
import sys
import time
import secrets
sys.stdout.reconfigure(encoding='utf-8')
import paramiko

HOST = '5.129.247.36'
PORT = 22
USER = 'root'
PASS = 'r_9kqXRGAyLJE4'

# Данные заказчика
BOT_TOKEN = '8626901412:AAFsnR1PR1zCNqJykcN9eHS-KZB7iCOGbSc'
BOT_USERNAME = 'TaskCashAppBot'
MINI_APP_URL = 'https://user.taskcashbot.ru'
ADMIN_BOT_TOKEN = '8433735388:AAGbEDt9FLJsKulonKJ0KRH6PB5w3FDNBLM'
ADMIN_APP_URL = 'https://admin.taskcashbot.ru'

BASE = os.path.dirname(os.path.abspath(__file__))
PRODUCTION = os.path.join(BASE, 'production')
REMOTE_ROOT = '/root/taskcash'
GIT_REPO = 'https://github.com/daniil248/prodtaskcash.git'
FROM_GIT = '--from-git' in sys.argv

# Локальная сборка frontend и admin (только при деплое через SFTP, не при --from-git)
import subprocess
if not FROM_GIT:
    for name, path in [('frontend', os.path.join(BASE, 'frontend')), ('admin', os.path.join(BASE, 'admin'))]:
        dist_path = os.path.join(path, 'dist')
        if not os.path.isdir(dist_path) or not os.listdir(dist_path):
            print(f'Локальная сборка {name}...')
            try:
                subprocess.run(['npm', 'run', 'build'], cwd=path, capture_output=True, timeout=180, shell=True)
            except Exception as e:
                print(f'  [WARN] {e}')
        else:
            print(f'{name}/dist есть, пропуск сборки.')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def connect_ssh():
    # timeout — таймаут TCP; banner_timeout — время ожидания SSH-баннера (часто причина "Error reading SSH protocol banner")
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60, banner_timeout=60)

def reconnect_ssh():
    try:
        ssh.close()
    except Exception:
        pass
    connect_ssh()

for attempt in range(1, 11):
    try:
        connect_ssh()
        print('Connected.')
        break
    except Exception:
        if attempt < 10:
            print(f'Попытка {attempt}/10, жду 5 мин...')
            time.sleep(300)
        else:
            raise

def run(cmd, timeout=120):
    print(f'$ {cmd}')
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8', errors='replace').strip()
    e = err.read().decode('utf-8', errors='replace').strip()
    if o:
        print(o[:4000])
    if e:
        print('[ERR]', e[:500])
    return o

def rel(path: str) -> str:
    return path.replace('/', os.sep)

# ---------- Режим деплоя из GitHub (--from-git) ----------
if FROM_GIT:
    print('Режим: деплой из GitHub (git pull + scripts/deploy_from_git.sh)')
    has_git = run(f'test -d {REMOTE_ROOT}/.git && echo ok') or ''
    if 'ok' not in has_git:
        run(f'mkdir -p {REMOTE_ROOT}; cd {REMOTE_ROOT} && git clone {GIT_REPO} .', timeout=120)
    else:
        run(f'cd {REMOTE_ROOT} && git pull origin main', timeout=60)
    # .env на сервере
    run(f'mkdir -p {REMOTE_ROOT}')
    env_exists_out = run(f'test -f {REMOTE_ROOT}/.env && echo ok') or ''
    if 'ok' not in env_exists_out:
        postgres_pass = secrets.token_hex(16)
        jwt_secret = secrets.token_hex(32)
        admin_secret = secrets.token_hex(32)
        env_content = f"""POSTGRES_PASSWORD={postgres_pass}
DATABASE_URL=postgresql+asyncpg://taskcash:{postgres_pass}@postgres:5432/taskcash
REDIS_URL=redis://redis:6379/0

BOT_TOKEN={BOT_TOKEN}
BOT_USERNAME={BOT_USERNAME}
MINI_APP_URL={MINI_APP_URL}

ADMIN_BOT_TOKEN={ADMIN_BOT_TOKEN}
ADMIN_APP_URL={ADMIN_APP_URL}

ADMIN_TG_IDS=

BACKEND_URL=http://backend:8000

JWT_SECRET={jwt_secret}
JWT_EXPIRE_HOURS=168

ADMIN_SECRET={admin_secret}

MIN_WITHDRAWAL=10.0
MAX_WITHDRAWAL_DAY=1000.0
WITHDRAWAL_FEE_PERCENT=5.0

REFERRAL_REWARD=0.50
REFERRAL_MIN_TASKS=3
"""
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False, encoding='utf-8') as f:
            f.write(env_content)
            tmp = f.name
        try:
            sftp = ssh.open_sftp()
            sftp.put(tmp, REMOTE_ROOT + '/.env')
            sftp.close()
        finally:
            os.unlink(tmp)
        print('Created new .env with generated secrets.')
    else:
        run(f"sed -i 's|^BOT_TOKEN=.*|BOT_TOKEN={BOT_TOKEN}|' {REMOTE_ROOT}/.env")
        run(f"sed -i 's|^MINI_APP_URL=.*|MINI_APP_URL={MINI_APP_URL}|' {REMOTE_ROOT}/.env")
        run(f"sed -i 's|^ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN={ADMIN_BOT_TOKEN}|' {REMOTE_ROOT}/.env")
        run(f"sed -i 's|^ADMIN_APP_URL=.*|ADMIN_APP_URL={ADMIN_APP_URL}|' {REMOTE_ROOT}/.env")
        run(f"grep -q '^ADMIN_TG_IDS=' {REMOTE_ROOT}/.env || echo 'ADMIN_TG_IDS=' >> {REMOTE_ROOT}/.env")
        run(f"sed -i 's|^ADMIN_TG_IDS=.*|ADMIN_TG_IDS=|' {REMOTE_ROOT}/.env")
        print('Updated .env tokens/URLs.')
    # Bootstrap
    check = run('which docker 2>/dev/null && echo ok || true')
    if 'ok' not in (check or ''):
        run('apt-get update -qq && apt-get install -y docker.io 2>&1 | tail -8', timeout=120)
        run('systemctl start docker 2>/dev/null; systemctl enable docker 2>/dev/null || true')
    check = run('(which docker-compose 2>/dev/null && echo ok) || (docker compose version 2>/dev/null && echo ok) || true')
    if 'ok' not in (check or ''):
        run('curl -sL "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose 2>&1', timeout=30)
    if 'ok' not in (run('which nginx 2>/dev/null && echo ok') or ''):
        run('apt-get install -y nginx 2>&1 | tail -3', timeout=60)
    run('mkdir -p /etc/nginx/sites-enabled', timeout=5)
    if 'ok' not in (run('which certbot 2>/dev/null && echo ok') or ''):
        run('apt-get install -y certbot 2>&1 | tail -3', timeout=90)
    # SSL
    cert_user = run(f'test -d /etc/letsencrypt/live/user.taskcashbot.ru && echo ok') or ''
    cert_admin = run(f'test -d /etc/letsencrypt/live/admin.taskcashbot.ru && echo ok') or ''
    if 'ok' not in cert_user or 'ok' not in cert_admin:
        run('systemctl stop nginx 2>/dev/null || nginx -s stop 2>/dev/null || true', timeout=10)
        time.sleep(2)
        if 'ok' not in cert_user:
            run('certbot certonly --standalone -d user.taskcashbot.ru --non-interactive --agree-tos --email admin@taskcashbot.ru 2>&1', timeout=90)
        if 'ok' not in cert_admin:
            run('certbot certonly --standalone -d admin.taskcashbot.ru --non-interactive --agree-tos --email admin@taskcashbot.ru 2>&1', timeout=90)
        run('systemctl start nginx 2>/dev/null || true', timeout=10)
    run('ufw allow 80 2>/dev/null; ufw allow 443 2>/dev/null; ufw --force enable 2>/dev/null; true', timeout=10)
    # Docker mirror
    run(r'mkdir -p /etc/docker; if ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then echo \'{"registry-mirrors":["https://docker.1ms.run"]}\' > /etc/docker/daemon.json; systemctl restart docker 2>/dev/null; sleep 5; fi', timeout=30)
    # Запуск деплой-скрипта на сервере
    run(f'cd {REMOTE_ROOT} && chmod +x scripts/deploy_from_git.sh && bash scripts/deploy_from_git.sh', timeout=600)
    # Проверки
    code = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:8001/api/settings/public')
    if code and code.strip() == '200':
        print('OK: API 8001 -> 200.')
    code_u = run('curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: user.taskcashbot.ru" https://127.0.0.1/')
    code_a = run('curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: admin.taskcashbot.ru" https://127.0.0.1/')
    print(f'HTTPS user: {code_u or "?"}, admin: {code_a or "?"}')
    print('\n=== DONE (from git) ===')
    print('Мини-апп: https://user.taskcashbot.ru')
    print('Админка:  https://admin.taskcashbot.ru')
    ssh.close()
    sys.exit(0)

def sftp_mkdir_p(sftp, path):
    path = path.replace('\\', '/')
    if not path or path == '/':
        return
    parts = path.strip('/').split('/')
    is_abs = path.startswith('/')
    current = '/' if is_abs else ''
    for p in parts:
        if not p:
            continue
        current = (current + '/' + p) if current else ('/' + p if is_abs else p)
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)

def upload_tree(sftp, local_path, remote_path, exclude_dirs=None):
    exclude_dirs = exclude_dirs or {'node_modules', '__pycache__', '.pytest_cache', 'dist', '.git', '.env'}
    local_path = os.path.abspath(local_path)
    if not os.path.isdir(local_path):
        return 0
    sftp_mkdir_p(sftp, remote_path)
    n = 0
    for root, dirs, files in os.walk(local_path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        rel_root = os.path.relpath(root, local_path)
        remote_dir = (remote_path + '/' + rel_root.replace('\\', '/')).replace('//', '/').rstrip('/')
        sftp_mkdir_p(sftp, remote_dir)
        for f in files:
            if f.endswith('.pyc'):
                continue
            local_file = os.path.abspath(os.path.join(root, f))
            if not os.path.isfile(local_file):
                continue
            remote_file = (remote_dir + '/' + f).replace('//', '/')
            try:
                sftp.put(local_file, remote_file)
                n += 1
                if n % 50 == 0:
                    print('.', end='', flush=True)
                if n % 200 == 0:
                    time.sleep(0.5)
            except Exception as ex:
                print(f'\n[ERR] {local_file}: {ex}')
    return n

# --- 1. Загрузка файлов ---
def do_upload_phase():
    sftp = ssh.open_sftp()
    try:
        print('Uploading backend...')
        upload_tree(sftp, os.path.join(BASE, 'backend'), REMOTE_ROOT + '/backend')
        print(' Uploading frontend...')
        upload_tree(sftp, os.path.join(BASE, 'frontend'), REMOTE_ROOT + '/frontend', exclude_dirs={'node_modules', '__pycache__', '.git', '.env'})
        print(' Uploading admin...')
        upload_tree(sftp, os.path.join(BASE, 'admin'), REMOTE_ROOT + '/admin', exclude_dirs={'node_modules', '__pycache__', '.git', '.env'})
        print(' Uploading bot...')
        upload_tree(sftp, os.path.join(BASE, 'bot'), REMOTE_ROOT + '/bot')
        return sftp
    except (OSError, ConnectionError, Exception) as e:
        if 'socket' in str(e).lower() or 'closed' in str(e).lower() or 'drop' in str(e).lower():
            try:
                sftp.close()
            except Exception:
                pass
            raise
        raise

sftp = None
for attempt in range(2):
    try:
        sftp = do_upload_phase()
        break
    except (OSError, ConnectionError, Exception) as e:
        if attempt == 0 and ('socket' in str(e).lower() or 'closed' in str(e).lower() or 'drop' in str(e).lower()):
            print('\n[Обрыв соединения, переподключаюсь...]')
            reconnect_ssh()
            continue
        raise
if sftp is None:
    sys.exit(1)

# docker-compose и nginx из production
for local_name, remote_name in [
    (os.path.join(PRODUCTION, 'docker-compose.yml'), REMOTE_ROOT + '/docker-compose.yml'),
    (os.path.join(PRODUCTION, 'nginx', 'host-user.taskcashbot.ru.conf'), REMOTE_ROOT + '/nginx/host-user.taskcashbot.ru.conf'),
    (os.path.join(PRODUCTION, 'nginx', 'host-admin.taskcashbot.ru.conf'), REMOTE_ROOT + '/nginx/host-admin.taskcashbot.ru.conf'),
]:
    local_name = os.path.abspath(local_name)
    if os.path.isfile(local_name):
        sftp_mkdir_p(sftp, os.path.dirname(remote_name))
        sftp.put(local_name, remote_name)
        print(f'  {remote_name}')
    else:
        print(f'  [SKIP] нет файла: {local_name}')

# --- 2. .env на сервере ---
run('mkdir -p ' + REMOTE_ROOT)
try:
    sftp.stat(REMOTE_ROOT + '/.env')
    env_exists = True
except FileNotFoundError:
    env_exists = False
if not env_exists:
    postgres_pass = secrets.token_hex(16)
    jwt_secret = secrets.token_hex(32)
    admin_secret = secrets.token_hex(32)
    env_content = f"""POSTGRES_PASSWORD={postgres_pass}
DATABASE_URL=postgresql+asyncpg://taskcash:{postgres_pass}@postgres:5432/taskcash
REDIS_URL=redis://redis:6379/0

BOT_TOKEN={BOT_TOKEN}
BOT_USERNAME={BOT_USERNAME}
MINI_APP_URL={MINI_APP_URL}

ADMIN_BOT_TOKEN={ADMIN_BOT_TOKEN}
ADMIN_APP_URL={ADMIN_APP_URL}

ADMIN_TG_IDS=

BACKEND_URL=http://backend:8000

JWT_SECRET={jwt_secret}
JWT_EXPIRE_HOURS=168

ADMIN_SECRET={admin_secret}

MIN_WITHDRAWAL=10.0
MAX_WITHDRAWAL_DAY=1000.0
WITHDRAWAL_FEE_PERCENT=5.0

REFERRAL_REWARD=0.50
REFERRAL_MIN_TASKS=3
"""
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False, encoding='utf-8') as f:
        f.write(env_content)
        tmp = f.name
    try:
        sftp.put(tmp, REMOTE_ROOT + '/.env')
        print('Created new .env with generated secrets.')
    finally:
        os.unlink(tmp)
else:
    run(f"sed -i 's|^BOT_TOKEN=.*|BOT_TOKEN={BOT_TOKEN}|' {REMOTE_ROOT}/.env")
    run(f"sed -i 's|^MINI_APP_URL=.*|MINI_APP_URL={MINI_APP_URL}|' {REMOTE_ROOT}/.env")
    run(f"sed -i 's|^ADMIN_BOT_TOKEN=.*|ADMIN_BOT_TOKEN={ADMIN_BOT_TOKEN}|' {REMOTE_ROOT}/.env")
    run(f"sed -i 's|^ADMIN_APP_URL=.*|ADMIN_APP_URL={ADMIN_APP_URL}|' {REMOTE_ROOT}/.env")
    run(f"grep -q '^ADMIN_TG_IDS=' {REMOTE_ROOT}/.env || echo 'ADMIN_TG_IDS=' >> {REMOTE_ROOT}/.env")
    run(f"sed -i 's|^ADMIN_TG_IDS=.*|ADMIN_TG_IDS=|' {REMOTE_ROOT}/.env")
    print('Updated .env tokens/URLs.')
sftp.close()

# --- 2b. Установка Docker / nginx / certbot если нет ---
print('\n--- Проверка Docker, nginx, certbot ---')
check = run('which docker 2>/dev/null && echo ok || true')
if 'ok' not in (check or ''):
    print('Устанавливаю Docker...')
    run('apt-get update -qq && apt-get install -y docker.io 2>&1 | tail -8', timeout=120)
    run('systemctl start docker 2>/dev/null; systemctl enable docker 2>/dev/null || true')
    run('docker --version 2>&1 || true')
check = run('(which docker-compose 2>/dev/null && echo ok) || (docker compose version 2>/dev/null && echo ok) || true')
if 'ok' not in (check or ''):
    print('Устанавливаю docker-compose...')
    run('curl -sL "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose 2>&1', timeout=30)
check = run('which nginx 2>/dev/null && echo ok || true')
if 'ok' not in (check or ''):
    print('Устанавливаю nginx...')
    run('apt-get install -y nginx 2>&1 | tail -3', timeout=60)
run('mkdir -p /etc/nginx/sites-enabled', timeout=5)
check = run('which certbot 2>/dev/null && echo ok || true')
if 'ok' not in (check or ''):
    print('Устанавливаю certbot...')
    run('apt-get install -y certbot 2>&1 | tail -3', timeout=90)

# --- 3. Frontend и admin: dist уже залит (собран локально), при отсутствии — пробуем собрать на сервере ---
print('\n--- Frontend/admin dist ---')
ru = run(f'test -d {REMOTE_ROOT}/frontend/dist && test -f {REMOTE_ROOT}/frontend/dist/index.html && echo ok || true')
if 'ok' not in (ru or ''):
    run(f'docker run --rm -v {REMOTE_ROOT}/frontend:/app -w /app node:20-alpine sh -c "npm install --silent 2>&1 | tail -1 && npm run build 2>&1" 2>&1 | tail -5', timeout=300)
ru = run(f'test -d {REMOTE_ROOT}/admin/dist && test -f {REMOTE_ROOT}/admin/dist/index.html && echo ok || true')
if 'ok' not in (ru or ''):
    run(f'docker run --rm -v {REMOTE_ROOT}/admin:/app -w /app node:20-alpine sh -c "npm install --silent 2>&1 | tail -1 && npm run build 2>&1" 2>&1 | tail -5', timeout=300)

# --- 4. SSL сертификаты (если нет) ---
print('\n--- SSL (certbot при необходимости) ---')
cert_user = run(f'test -d /etc/letsencrypt/live/user.taskcashbot.ru && echo ok || true')
cert_admin = run(f'test -d /etc/letsencrypt/live/admin.taskcashbot.ru && echo ok || true')
if 'ok' not in (cert_user or '') or 'ok' not in (cert_admin or ''):
    run('systemctl stop nginx 2>/dev/null || nginx -s stop 2>/dev/null || true', timeout=10)
    time.sleep(2)
    if 'ok' not in (cert_user or ''):
        run('certbot certonly --standalone -d user.taskcashbot.ru --non-interactive --agree-tos --email admin@taskcashbot.ru 2>&1', timeout=90)
    if 'ok' not in (cert_admin or ''):
        run('certbot certonly --standalone -d admin.taskcashbot.ru --non-interactive --agree-tos --email admin@taskcashbot.ru 2>&1', timeout=90)
    run('systemctl start nginx 2>/dev/null || true', timeout=10)
else:
    print('Certificates already exist.')

# --- 5. Docker: mirror для обхода rate limit Docker Hub ---
run(r'''mkdir -p /etc/docker
if ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then
  echo '{"registry-mirrors":["https://docker.1ms.run"]}' > /etc/docker/daemon.json
  systemctl restart docker 2>/dev/null
  sleep 5
fi''', timeout=30)
run(f'grep -q "^DOCKER_HUB_USER=" {REMOTE_ROOT}/.env 2>/dev/null && (set -a; . {REMOTE_ROOT}/.env 2>/dev/null; set +a; echo "$DOCKER_HUB_PASS" | docker login -u "$DOCKER_HUB_USER" --password-stdin 2>/dev/null) || true', timeout=15)
print('\n--- Docker Compose up ---')
run(f'cd {REMOTE_ROOT} && docker-compose up -d --build 2>&1', timeout=300)

# --- 6. Ожидание backend 8001 ---
print('\n--- Ожидание backend 8001 ---')
for attempt in range(1, 30):
    time.sleep(2)
    code = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:8001/api/settings/public')
    if code and code.strip() == '200':
        print('Backend 8001 отвечает 200.')
        break
    print(f'  попытка {attempt}/29: {code or "нет ответа"}')
else:
    print('WARN: backend не ответил 200 за 60 сек.')

# --- 7. Миграции ---
time.sleep(2)
run('docker exec taskcash-backend-1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || docker exec taskcash_backend_1 sh -c "cd /app && alembic upgrade head" 2>/dev/null || true', timeout=30)

# --- 8. Удаление webhook (чтобы боты работали по long polling) и перезапуск ---
run(f'curl -s "https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook" 2>/dev/null; curl -s "https://api.telegram.org/bot{ADMIN_BOT_TOKEN}/deleteWebhook" 2>/dev/null', timeout=15)
run('docker restart taskcash-worker-1 taskcash-user_bot-1 taskcash-admin_bot-1 2>/dev/null || docker restart taskcash_worker_1 taskcash_user_bot_1 taskcash_admin_bot_1 2>/dev/null || true', timeout=45)
time.sleep(5)

# --- 9. Фаервол: открыть 80 и 443 ---
run('ufw allow 80 2>/dev/null; ufw allow 443 2>/dev/null; ufw --force enable 2>/dev/null; true', timeout=10)

# --- 10. Nginx: статика в /var/www и конфиги ---
print('\n--- Nginx ---')
run(f'mkdir -p /var/www/taskcash; cp -r {REMOTE_ROOT}/frontend/dist /var/www/taskcash/frontend; cp -r {REMOTE_ROOT}/admin/dist /var/www/taskcash/admin; chown -R www-data:www-data /var/www/taskcash 2>/dev/null || true', timeout=15)
ru_cert = run('test -f /etc/letsencrypt/live/user.taskcashbot.ru/fullchain.pem && echo ok || true')
if ru_cert and 'ok' in ru_cert:
    run(f'cp {REMOTE_ROOT}/nginx/host-user.taskcashbot.ru.conf /etc/nginx/sites-enabled/user.taskcashbot.ru.conf')
else:
    run(r'''cat > /etc/nginx/sites-enabled/user.taskcashbot.ru.conf << 'NGX'
server { listen 80; server_name user.taskcashbot.ru; root /var/www/taskcash/frontend; index index.html; location /api/ { proxy_pass http://127.0.0.1:8001; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; } location / { try_files $uri $uri/ /index.html; } }
NGX''', timeout=5)
run(f'cp {REMOTE_ROOT}/nginx/host-admin.taskcashbot.ru.conf /etc/nginx/sites-enabled/admin.taskcashbot.ru.conf')
run('nginx -t 2>&1 || true', timeout=10)
run('nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true', timeout=15)

# --- 10. Проверки ---
print('\n--- Проверка ---')
code = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:8001/api/settings/public')
if code and code.strip() == '200':
    print('OK: API 8001 -> 200.')
else:
    print('WARN: API 8001 код:', code or '?')

code_https_u = run('curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: user.taskcashbot.ru" https://127.0.0.1/')
code_https_a = run('curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 -H "Host: admin.taskcashbot.ru" https://127.0.0.1/')
print(f'HTTPS user.taskcashbot.ru: {code_https_u or "?"}, admin.taskcashbot.ru: {code_https_a or "?"}')

verify_script = r"""
export ADMIN_SECRET=$(docker exec taskcash-backend-1 printenv ADMIN_SECRET 2>/dev/null || docker exec taskcash_backend_1 printenv ADMIN_SECRET 2>/dev/null)
if [ -z "$ADMIN_SECRET" ]; then echo "VERIFY_FAIL: no ADMIN_SECRET"; exit 1; fi
BODY=$(python3 -c "import json,os; print(json.dumps({'secret': os.environ.get('ADMIN_SECRET','')}))")
LOGIN=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:8001/api/admin/login -H "Content-Type: application/json" -d "$BODY")
HTTP=$(echo "$LOGIN" | tail -n1)
if [ "$HTTP" != "200" ]; then echo "VERIFY_FAIL: login HTTP $HTTP"; exit 1; fi
echo "VERIFY_OK"
"""
verify_out = run(verify_script, timeout=25)
if 'VERIFY_OK' in (verify_out or ''):
    print('OK: админ API логин работает.')
else:
    print('WARN:', verify_out or '(нет вывода)')

print('\n=== DONE ===')
print('Мини-апп: https://user.taskcashbot.ru')
print('Админка:  https://admin.taskcashbot.ru')
print('Бот юзер: t.me/TaskCashAppBot/myapp')
print('Бот админ: https://t.me/efgrfhdeutgtsaw_bot/myapp')
print('\nЕсли сайты не открываются: проверь DNS (A-записи на 5.129.247.36) и фаервол хостера.')
ssh.close()
