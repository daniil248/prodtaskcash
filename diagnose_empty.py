# -*- coding: utf-8 -*-
"""Диагностика: почему в приложении периодически пусто. Только чтение, ничего не меняем."""
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

print('=== Порт 8001 на хосте (кто слушает) ===')
o, e = run('ss -tlnp 2>/dev/null | grep 8001 || netstat -tlnp 2>/dev/null | grep 8001 || true')
print(o or e or '(порт 8001 не слушается на хосте)')

print('\n=== Docker: проброс портов контейнера backend ===')
o, e = run('docker port taskcash-backend-1 2>/dev/null || docker port $(docker ps -q -f name=backend) 2>/dev/null || true')
print(o or e or '(контейнер не найден или порт не проброшен)')

print('\n=== Docker compose: порты сервиса backend ===')
o, e = run('cd /root/taskcash && docker compose config --services 2>/dev/null; docker compose config 2>/dev/null | grep -A 20 "backend:" | head -25')
print(o or e)

print('\n=== Curl с ХОСТА на 127.0.0.1:8001 (как делает nginx) ===')
o, e = run('curl -v --connect-timeout 3 http://127.0.0.1:8001/api/settings/public 2>&1 | head -25')
print(o or e)

print('\n=== Curl с хоста на 0.0.0.0:8001 ===')
o, e = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://0.0.0.0:8001/api/settings/public')
print('HTTP код:', o or e)

print('\n=== Nginx: куда идут запросы /api/ (testuser — мини-апп) ===')
o, e = run('grep -A 1 "location /api" /etc/nginx/sites-enabled/testuser* 2>/dev/null')
print(o or e)

print('\n=== Контейнеры taskcash: статус ===')
o, e = run('cd /root/taskcash && docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null')
print(o or e)

ssh.close()
print('\n=== Конец диагностики ===')
