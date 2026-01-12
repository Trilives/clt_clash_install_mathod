#!/usr/bin/env bash
set -euo pipefail

# 可选：本机托管 yacd-meta 前端
# 若服务器无法下载，请在其他机器下载 yacd-meta.zip 后拷贝到 ./web/yacd-meta
# 然后使用本脚本或 systemd 服务提供 HTTP 服务

script_dir="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
web_dir_local="${script_dir}/web/yacd-meta"

if [[ ! -d "${web_dir_local}" ]]; then
  echo "目录 ${web_dir_local} 不存在。请先将 yacd-meta 静态文件拷贝到该目录。"
  echo "托管版可直接使用：https://yacd.metacubex.one/"
  exit 1
fi

echo "启动本地前端：http://0.0.0.0:19090"
python3 -m http.server 19090 --directory "${web_dir_local}"
