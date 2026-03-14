# -*- coding: utf-8 -*-
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('5.129.247.36', port=22, username='root', password='r_9kqXRGAyLJE4', timeout=20)
    def run(c):
        _, o, e = ssh.exec_command(c, timeout=15)
        return (o.read() + e.read()).decode('utf-8', errors='replace')
    print('=== CONTAINERS ===')
    print(run('docker ps -a --format "{{.Names}} {{.Status}}"'))
    print('=== USER BOT LOGS ===')
    print(run('docker logs taskcash-user_bot-1 2>&1 | tail -15'))
    print('=== ADMIN BOT LOGS ===')
    print(run('docker logs taskcash-admin_bot-1 2>&1 | tail -15'))
    print('=== PORTS ===')
    print(run('ss -tlnp 2>/dev/null | grep -E ":80 |:443 "'))
    print('=== CURL LOCAL ===')
    print('user:', run('curl -s -o /dev/null -w "%{http_code}" -k -H "Host: user.taskcashbot.ru" https://127.0.0.1/ 2>/dev/null').strip())
    print('admin:', run('curl -s -o /dev/null -w "%{http_code}" -k -H "Host: admin.taskcashbot.ru" https://127.0.0.1/ 2>/dev/null').strip())
    print('=== DNS (server) ===')
    print(run('getent hosts admin.taskcashbot.ru user.taskcashbot.ru 2>/dev/null'))
    ssh.close()
except Exception as e:
    print('ERROR:', e)
