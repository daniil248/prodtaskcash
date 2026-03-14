#!/bin/bash
# Прописывает DNS в /etc/docker/daemon.json чтобы при сборке pip резолвил pypi.org
mkdir -p /etc/docker
if ! grep -q '"dns"' /etc/docker/daemon.json 2>/dev/null; then
  if [ ! -s /etc/docker/daemon.json ]; then
    echo '{"dns":["8.8.8.8","8.8.4.4"]}' > /etc/docker/daemon.json
  else
    python3 -c '
import json, os
p = "/etc/docker/daemon.json"
d = json.load(open(p)) if os.path.isfile(p) and os.path.getsize(p) > 0 else {}
d["dns"] = ["8.8.8.8", "8.8.4.4"]
open(p, "w").write(json.dumps(d, indent=2))
' 2>/dev/null || echo '{"dns":["8.8.8.8","8.8.4.4"]}' > /etc/docker/daemon.json
  fi
  systemctl restart docker 2>/dev/null || true
  sleep 2
fi
