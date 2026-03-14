# -*- coding: utf-8 -*-
"""Перезапуск только backend taskcash и проверка, что 127.0.0.1:8001 отвечает. Остальное на сервере не трогаем."""
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')
import paramiko

HOST = '92.51.44.138'
PORT = 22
USER = 'root'
PASS = 'w6Z6Sk8DK5k#po'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=30):
    _, out, err = ssh.exec_command(cmd, timeout=timeout)
    return out.read().decode('utf-8', errors='replace').strip(), err.read().decode('utf-8', errors='replace').strip()

print('Перезапуск только taskcash-backend-1...')
run('docker restart taskcash-backend-1', timeout=30)
time.sleep(8)
print('Проверка 127.0.0.1:8001...')
for i in range(5):
    o, e = run('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:8001/api/settings/public')
    code = (o or e).strip()
    if code == '200':
        print('OK: 127.0.0.1:8001 отвечает 200.')
        break
    print(f'  попытка {i+1}: HTTP {code or "fail"}')
    time.sleep(2)
else:
    print('ВНИМАНИЕ: после рестарта порт по-прежнему не отвечает. Нужно смотреть docker logs и порты на хосте.')

ssh.close()
