# -*- coding: utf-8 -*-
"""Проверка SSH-подключения к серверу TaskCash. Запуск: py test_ssh.py"""
import paramiko

HOST = '5.129.247.36'
PORT = 22
USER = 'root'
PASS = 'r_9kqXRGAyLJE4'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=60, banner_timeout=60)
    print('OK: Подключено.')
    _, out, err = ssh.exec_command('hostname; uptime')
    print(out.read().decode('utf-8', errors='replace'))
    ssh.close()
except Exception as e:
    print('FAIL:', type(e).__name__, str(e))
