#!/usr/bin/env bash
set -euo pipefail

# 使用方法：在当前 shell 中执行：
#   source bin/no_proxy.sh
# 或：
#   . bin/no_proxy.sh

# 取消所有代理相关环境变量
unset http_proxy https_proxy all_proxy
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
unset no_proxy NO_PROXY

echo "[proxy] 已停用: 环境变量已清除"
