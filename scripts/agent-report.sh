#!/usr/bin/env bash
# Opsora Linux agent example ( §14 ).
# Collects host metrics with portable tools and reports to the API.
# Requires: AGENT_INGEST_TOKEN + OPSORA_API_URL env vars.
set -euo pipefail

API="${OPSORA_API_URL:-http://localhost:4100}"
TOKEN="${AGENT_INGEST_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "AGENT_INGEST_TOKEN is not set" >&2
  exit 1
fi

HOSTNAME="$(hostname)"
OS="$(uname -srm)"
KERNEL="$(uname -r)"
UPTIME="$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo null)"
CPU="$(top -bn1 2>/dev/null | grep 'Cpu(s)' | awk '{print $2 + $4}' || echo null)"
MEM_TOTAL="$(awk '/MemTotal/ {print $2 * 1024}' /proc/meminfo 2>/dev/null || echo null)"
MEM_AVAIL="$(awk '/MemAvailable/ {print $2 * 1024}' /proc/meminfo 2>/dev/null || echo null)"

python3 - "$API" "$TOKEN" "$HOSTNAME" "$OS" "$KERNEL" "$UPTIME" "$CPU" "$MEM_TOTAL" "$MEM_AVAIL" <<'EOF'
import json, os, sys, urllib.request
api, token, hostname, os_, kernel, uptime, cpu, mem_total, mem_avail = sys.argv[1:10]

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

mem_total_n = num(mem_total)
mem_avail_n = num(mem_avail)
mem_used = mem_total_n - mem_avail_n if mem_total_n and mem_avail_n else None
body = {
    "hostname": hostname,
    "os": os_,
    "kernel": kernel,
    "cpuPercent": num(cpu),
    "memPercent": (mem_used / mem_total_n * 100) if mem_total_n and mem_used else None,
    "memUsedBytes": mem_used,
    "memTotalBytes": mem_total_n,
    "uptimeSeconds": num(uptime),
}
req = urllib.request.Request(
    f"{api}/api/servers/report",
    data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json", "X-Agent-Token": token},
)
with urllib.request.urlopen(req, timeout=10) as res:
    print(res.status, res.read().decode()[:200])
EOF
