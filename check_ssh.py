# -*- coding: utf-8 -*-
import paramiko
hosts = [
    ("31.31.198.244", 22, "u3054910", "7I3xY1sVF6TUlu9e"),
    ("188.137.240.101", 22, "root", "!Q2w3e4r5t6y7u"),
    ("92.51.44.138", 22, "root", "w6Z6Sk8DK5k#po"),
]
for host, port, user, pw in hosts:
    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(host, port=port, username=user, password=pw, timeout=20, banner_timeout=20)
        c.close()
        print(host, "OK")
    except Exception as e:
        print(host, "FAIL", type(e).__name__, str(e)[:80])
