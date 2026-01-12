#!/usr/bin/env bash
set -euo pipefail

# 从订阅链接生成 Clash config.yaml
# 依赖：curl, python3；可选：xclip 或 wl-paste（读取剪贴板）
# 可选环境：SUBCONVERTER="http://your-subconv/sub" 覆盖默认转换服务
# 选项：--raw 订阅为原生 Clash 格式时优先直接下载；--system 写入到 /etc/mihomo

script_dir="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
use_system=false
force_raw=false

while [[ ${#} -gt 0 ]]; do
  case "${1}" in
    --system) use_system=true; shift ;;
    --raw)    force_raw=true; shift ;;
    *) break ;;
  esac
done

if $use_system; then
  config_dir="/etc/mihomo"
else
  config_dir="${script_dir}/config"
fi
config_file="${config_dir}/config.yaml"
subconverter_base="${SUBCONVERTER:-https://sub.xeton.dev/sub}"

read_clipboard() {
  if command -v xclip >/dev/null 2>&1; then
    xclip -selection clipboard -o 2>/dev/null || xclip -selection primary -o 2>/dev/null || return 1
  elif command -v wl-paste >/dev/null 2>&1; then
    wl-paste 2>/dev/null || return 1
  else
    return 1
  fi
}

url="${1-}"
if [[ -z "${url}" ]]; then
  url="$(read_clipboard || true)"
fi
if [[ -z "${url}" ]]; then
  read -r -p "Enter Clash subscription URL: " url
fi
if [[ -z "${url}" ]]; then
  echo "No subscription URL provided." >&2
  exit 1
fi

mkdir -p "${config_dir}"

echo "Using subscription URL: ${url}"
encoded_url="$(python3 - "${url}" <<'PY'
import sys, urllib.parse
url = sys.argv[1]
print(urllib.parse.quote(url, safe=''))
PY
)"

output_tmp="${config_file}.tmp"

try_raw=false
if $force_raw; then
  try_raw=true
else
  if [[ "$url" == *"clash=1"* ]] || [[ "$url" == *"target=clash"* ]]; then
    try_raw=true
  fi
fi

if $try_raw; then
  if curl -fsSL "${url}" -o "${output_tmp}"; then
    if grep -qE "^(mixed-port|proxies:|proxy-groups:|rules:)" "${output_tmp}" || grep -qE "external-controller:" "${output_tmp}"; then
      mv "${output_tmp}" "${config_file}"
      echo "Config written (raw) to ${config_file}."
    else
      echo "Raw not YAML, fallback to subconverter..."
      rm -f "${output_tmp}"
      query="target=clash&url=${encoded_url}&insert=false&emoji=true&udp=true&tfo=true"
      curl -fsSL "${subconverter_base}?${query}" -o "${output_tmp}"
      mv "${output_tmp}" "${config_file}"
    fi
  else
    echo "Raw download failed, fallback to subconverter..."
    query="target=clash&url=${encoded_url}&insert=false&emoji=true&udp=true&tfo=true"
    curl -fsSL "${subconverter_base}?${query}" -o "${output_tmp}"
    mv "${output_tmp}" "${config_file}"
  fi
else
  query="target=clash&url=${encoded_url}&insert=false&emoji=true&udp=true&tfo=true"
  curl -fsSL "${subconverter_base}?${query}" -o "${output_tmp}"
  mv "${output_tmp}" "${config_file}"
fi

echo "Config written to ${config_file}."
if $use_system; then
  echo "Restart service: sudo systemctl restart mihomo"
else
  echo "Run mihomo: /usr/local/bin/mihomo -f ${config_file}"
fi
