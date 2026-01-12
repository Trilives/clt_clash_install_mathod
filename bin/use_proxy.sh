#!/usr/bin/env bash
set -euo pipefail

# 使用方法：在当前 shell 中执行：
#   source bin/use_proxy.sh
# 或：
#   . bin/use_proxy.sh
# 这样导出的环境变量才会在当前会话中生效。

# 如需自定义端口，可在执行前覆盖这些变量：
: "${PROXY_HOST:=127.0.0.1}"
: "${HTTP_PORT:=7890}"
: "${SOCKS_PORT:=7891}"

# 导出小写与大写环境变量，兼容不同工具
export http_proxy="http://${PROXY_HOST}:${HTTP_PORT}"
export https_proxy="http://${PROXY_HOST}:${HTTP_PORT}"
# 使用 socks5h 以代理 DNS 解析（对某些场景更可靠）
export all_proxy="socks5h://${PROXY_HOST}:${SOCKS_PORT}"

export HTTP_PROXY="${http_proxy}"
export HTTPS_PROXY="${https_proxy}"
export ALL_PROXY="${all_proxy}"

# 常见不走代理的地址
export no_proxy="localhost,127.0.0.1,::1"
export NO_PROXY="${no_proxy}"

echo "[proxy] 已启用: HTTP(S) -> ${PROXY_HOST}:${HTTP_PORT}, SOCKS -> ${PROXY_HOST}:${SOCKS_PORT}"
echo "[proxy] 说明: 请使用 'source bin/no_proxy.sh' 停用代理"
