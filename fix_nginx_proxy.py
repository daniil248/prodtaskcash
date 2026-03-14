# -*- coding: utf-8 -*-
"""Однократная правка: заменить в nginx proxy_pass IP контейнера на 127.0.0.1:8001 и перезагрузить nginx."""
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

# Заменить любой IP вида 172.20.0.X:8000 на 127.0.0.1:8001 (без .bak, чтобы nginx не подхватил дубликаты)
print('Fixing nginx proxy_pass to 127.0.0.1:8001...')
o, e = run("for f in /etc/nginx/sites-enabled/*.conf; do [ -f \"$f\" ] && sed -i 's|http://172\\.20\\.0\\.[0-9]*:8000|http://127.0.0.1:8001|g' \"$f\"; done; rm -f /etc/nginx/sites-enabled/*.bak 2>/dev/null; echo done")
print(o or e)

print('Nginx -t...')
o, e = run('nginx -t')
print(o or e)
if 'syntax is ok' in (o or e).lower() or 'successful' in (o or e).lower():
    print('Reloading nginx...')
    o2, e2 = run('nginx -s reload')
    print(o2 or e2 or 'OK')
    print('Done. Admin panel /api should now reach backend.')
else:
    print('Nginx test failed, not reloading.')

ssh.close()
