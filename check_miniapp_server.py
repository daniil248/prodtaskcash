# -*- coding: utf-8 -*-
"""Проверка мини-аппа на сервере: dist, nginx, доступность."""
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

def run(cmd, timeout=15):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    return out.read().decode('utf-8', errors='replace').strip(), err.read().decode('utf-8', errors='replace').strip()

print('=== 1. Frontend dist на сервере ===')
o, e = run('ls -la /root/taskcash/frontend/dist/ 2>/dev/null || echo "NO DIST"')
print(o or e)
print()

print('=== 2. index.html есть? первые строки ===')
o, e = run('head -20 /root/taskcash/frontend/dist/index.html 2>/dev/null || echo "no file"')
print(o or e)
print()

print('=== 3. Nginx конфиг для мини-аппа (testuser) ===')
o, e = run('cat /etc/nginx/sites-enabled/testuser.telegbot3td.ru.conf 2>/dev/null || echo "no conf"')
print(o or e)
print()

print('=== 4. Curl мини-апп (localhost по домену testuser) ===')
o, e = run('curl -s -o /dev/null -w "%{http_code}" -H "Host: testuser.telegbot3td.ru" http://127.0.0.1/ 2>/dev/null')
print('HTTP index:', o or e)
print()

print('=== 5. Curl /api с хоста ===')
o, e = run('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/settings/public')
print('API 127.0.0.1:8001:', o or e)
print()

print('=== 6. Проверка Cache-Control для index.html в nginx ===')
o, e = run(r'grep -A2 "index.html\|Cache-Control\|no-cache" /etc/nginx/sites-enabled/testuser.telegbot3td.ru.conf 2>/dev/null')
print(o or e or '(не найдено)')

ssh.close()
print('\n=== Конец ===')
