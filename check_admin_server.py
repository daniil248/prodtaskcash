# -*- coding: utf-8 -*-
"""Проверка админки и данных на сервере."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import paramiko

HOST = '92.51.44.138'
PORT = 22
USER = 'root'
PASS = 'w6Z6Sk8DK5k#po'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=20):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

print('=== 1. Контейнер PostgreSQL ===')
o, e = run('docker ps -a --format "{{.Names}}" | grep -i postgres')
print(o or e or 'not found')

print('=== 2. PostgreSQL (user taskcash): количество users и tasks ===')
o, e = run("docker exec taskcash-postgres-1 psql -U taskcash -d taskcash -t -c \"SELECT 'users', count(*) FROM users UNION ALL SELECT 'tasks', count(*) FROM tasks;\"")
print(o or e)

print('=== 3. Несколько записей users ===')
o, e = run("docker exec taskcash-postgres-1 psql -U taskcash -d taskcash -t -c \"SELECT id, telegram_id, first_name FROM users LIMIT 5;\"")
print(o or e)

print('=== 4. Несколько записей tasks ===')
o, e = run("docker exec taskcash-postgres-1 psql -U taskcash -d taskcash -t -c \"SELECT id, title FROM tasks LIMIT 5;\"")
print(o or e)

print('=== 5. Backend env: DATABASE_URL (masked), ADMIN_SECRET set? ===')
o, _ = run("docker exec taskcash-backend-1 env | grep -E '^DATABASE_URL=|^ADMIN_SECRET=' | sed 's/=.*/=***/'")
print(o or '(empty)')

print('=== 6. Admin API (login -> stats, users, tasks) ===')
import base64
py = b"""import os, json, urllib.request
secret = os.environ.get('ADMIN_SECRET', '')
data = json.dumps({'secret': secret}).encode()
req = urllib.request.Request('http://localhost:8000/api/admin/login', data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        token = json.loads(r.read()).get('access_token')
    if token:
        for path in ['/api/admin/stats', '/api/admin/users?page=1', '/api/admin/tasks']:
            r2 = urllib.request.Request('http://localhost:8000' + path, headers={'Authorization': 'Bearer ' + token})
            with urllib.request.urlopen(r2, timeout=5) as f:
                print(path, '->', f.read().decode()[:600])
    else:
        print('No access_token')
except Exception as e:
    print('Error:', e)
"""
b64 = base64.b64encode(py).decode()
o, e = run(f'docker exec taskcash-backend-1 python3 -c "import base64; exec(base64.b64decode(\\"{b64}\\"))"')
print(o or e)
token = None

print('=== 6. GET /api/admin/users?page=1 ===')
if token:
    o3, _ = run(f'curl -s -H "Authorization: Bearer {token}" "http://localhost:8000/api/admin/users?page=1"')
    print('Users API:', o3[:800] if o3 else 'empty')
else:
    print('(skip, no token)')

print('=== 7. GET /api/admin/tasks ===')
if token:
    o4, _ = run(f'curl -s -H "Authorization: Bearer {token}" http://localhost:8000/api/admin/tasks')
    print('Tasks API:', o4[:800] if o4 else 'empty')

print('=== 8. Backend container IP vs Nginx proxy_pass ===')
o, e = run("docker inspect taskcash-backend-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")
backend_ip = (o or e).strip()
print('Backend container IP now:', backend_ip)
o2, _ = run('grep proxy_pass /etc/nginx/sites-enabled/testadmin* 2>/dev/null')
print('Nginx proxy_pass for admin:', o2 or 'not found')
proxy_text = o2 or ''
if '127.0.0.1:8001' in proxy_text:
    print('>>> OK: Nginx proxies to 127.0.0.1:8001 (stable after container restart).')
elif backend_ip and backend_ip not in proxy_text:
    print('>>> MISMATCH: Nginx may point to old container IP; admin API can fail. Run fix_nginx_proxy.py.')
# Check 127.0.0.1:8001 (correct proxy target)
o3, _ = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:8001/api/settings/public')
print('Curl to 127.0.0.1:8001 /api/settings/public -> HTTP', o3.strip() or 'fail')

print('=== 9. Backend логи: admin 403/500 ===')
o, e = run('docker logs taskcash-backend-1 2>&1 | grep -E "admin|403|500" | tail -20')
print(o if o.strip() else '(none)')

ssh.close()
print('\n=== Конец ===')
