# -*- coding: utf-8 -*-
"""Просмотр логов и проверка состояния на сервере. Запуск: py check_logs.py"""
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
    return out.read().decode('utf-8', errors='replace'), err.read().decode('utf-8', errors='replace')

print('=== Backend (последние 60 строк) ===')
o, _ = run('docker logs taskcash-backend-1 2>&1 | tail -60')
print(o)

print('=== Worker (последние 25 строк) ===')
o, _ = run('docker logs taskcash-worker-1 2>&1 | tail -25')
print(o)

print('=== API /api/settings/public ===')
o, _ = run('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/settings/public')
print('HTTP:', o or '?')

ssh.close()
print('\n=== Конец ===')
