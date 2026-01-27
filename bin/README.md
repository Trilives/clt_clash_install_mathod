# bin 目录脚本说明

## fetch_config.sh
- 功能：从订阅链接生成 Clash/Mihomo 配置 `config/config.yaml`（或 `--system` 写入 `/etc/mihomo/config.yaml`）。
- 依赖：curl、python3；可选 `SUBCONVERTER` 环境变量指定转换服务（默认 https://sub.xeton.dev/sub）。
- 常用示例：
  - 直接下载或自动回退转换：`./bin/fetch_config.sh "<订阅 URL>"`
  - 强制只用原始 Clash 链接：`./bin/fetch_config.sh --raw "<订阅 URL>"`
  - 写入系统目录：`sudo ./bin/fetch_config.sh --system "<订阅 URL>"`
- 说明：脚本会根据链接特征尝试原始下载，不符合 Clash YAML 则回退到 subconverter；失败时可更换 `SUBCONVERTER` 或检查代理。

## use_proxy.sh
- 功能：在当前 shell 导出 HTTP/HTTPS/SOCKS 代理环境变量。
- 用法（需 source 以便生效）：`source bin/use_proxy.sh`
- 可选变量：`PROXY_HOST`（默认 127.0.0.1）、`HTTP_PORT`（默认 7890）、`SOCKS_PORT`（默认 7891）。
- 提示：启用后可配合 curl、git 等命令走代理。

## no_proxy.sh
- 功能：清理所有代理相关环境变量，停用代理。
- 用法（同样需 source）：`source bin/no_proxy.sh`

## install_dashboard.sh
- 功能：在本机用 Python 简单 HTTP 服务器托管 `web/yacd-meta` 前端，便于本地访问面板。
- 前置：确保 `web/yacd-meta` 已存在并包含 yacd-meta 静态文件（无法下载可手动拷贝）。
- 启动：`./bin/install_dashboard.sh`，默认监听 `http://0.0.0.0:19090`。
- 备注：若目录不存在，脚本会提示使用官方在线面板 https://yacd.metacubex.one/ 。
