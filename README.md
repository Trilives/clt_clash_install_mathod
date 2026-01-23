# 原生安装：Clash Meta（Mihomo）最简指南

这份文档用于在 Linux 上部署 Mihomo（Clash Meta）内核：
用订阅链接生成配置（可选再用 JS 规则脚本“复写”分组/规则），最后注册为 systemd 服务，并通过面板管理。

- 订阅示例：`http://<your-subscription-url>?clash=1`
- 推荐本机/自托管面板；在线托管可能被拦截，仅在可信网络下使用。

> 占位符替换提示
>
> - 文中出现的 `/path/to/clash`、`<your-subscription-url>`、`<server-ip>` 等均为占位符，请替换为你自己的实际值。
> - 如果你的实际路径包含 `&`、空格等特殊字符，请在命令里用引号包住，例如：`cd "/path/to/clash"`。

## 0. 依赖与前置条件
- 必需：`curl`、`python3`（用于订阅下载/转换）、可运行的 Mihomo 二进制
- 可选：Node.js（仅在你要运行 `Script_cover_config/` 的 JS 复写脚本时需要）
- 如果要用 systemd：需要有 `systemctl`（大多数发行版默认有）

## 1. 安装 Mihomo 内核
1) 在可联网电脑打开：https://github.com/MetaCubeX/mihomo/releases
2) 下载与你服务器架构匹配的包（常见 `mihomo-linux-amd64.gz` 或 `mihomo-linux-arm64.gz`）。
3) 解压并设为可执行：
```bash
gunzip -f mihomo-linux-amd64.gz
chmod +x mihomo-linux-amd64
```
4) 上传到服务器并放到系统路径：
```bash
scp mihomo-linux-amd64 <user>@<server>:/tmp/mihomo
ssh <user>@<server>
sudo mv /tmp/mihomo /usr/local/bin/mihomo
sudo chmod +x /usr/local/bin/mihomo
which mihomo   # 应显示 /usr/local/bin/mihomo
```

## 2. 用订阅链接生成配置
在工作目录中使用脚本生成 `config.yaml`：
```bash
cd "/path/to/clash"
./bin/fetch_config.sh --raw "http://<your-subscription-url>?clash=1"
```

- `--raw`：订阅已是 Clash 格式时优先直接下载；若失败会自动回退到转换服务（可通过 `SUBCONVERTER` 环境变量自定义）。
- 系统路径模式（服务默认读取 `/etc/mihomo/config.yaml`）：
```bash
sudo mkdir -p /etc/mihomo
sudo ./bin/fetch_config.sh --system --raw "http://<your-subscription-url>?clash=1"
```

## 3.（可选）用 JS 脚本复写分组/规则（两种模式二选一）
仓库内的 `Script_cover_config/` 提供两种策略脚本：

- `Fallback.js`：按地区自动分组，使用 `fallback`（故障转移）
- `url-test.js`：按地区自动分组，使用 `url-test`（自动测速选优）

每次你用订阅更新了 `config.yaml` 后，如果还想继续沿用同一套分组/规则，再跑一次脚本即可。

1) 备份当前配置（可选）：
```bash
cd "/path/to/clash"
cp config/config.yaml config/config.yaml.bak
```

2) 安装依赖（只需一次，需 Node.js）：
```bash
cd "/path/to/clash"
npm install js-yaml --prefix "/path/to/clash"
```

3) 执行脚本（选一个）：

- 故障转移模式：
```bash
cd "/path/to/clash"
node - <<'NODE'
const fs = require('fs');
const yaml = require('./node_modules/js-yaml');
const { main } = require('./Script_cover_config/Fallback');
const path = './config/config.yaml';
const cfg = yaml.load(fs.readFileSync(path, 'utf8'));
fs.writeFileSync(path, yaml.dump(main(cfg), { lineWidth: -1 }));
console.log('已应用 Fallback 脚本 ->', path);
NODE
```

- 自动测速模式：
```bash
cd "/path/to/clash"
node - <<'NODE'
const fs = require('fs');
const yaml = require('./node_modules/js-yaml');
const { main } = require('./Script_cover_config/url-test');
const path = './config/config.yaml';
const cfg = yaml.load(fs.readFileSync(path, 'utf8'));
fs.writeFileSync(path, yaml.dump(main(cfg), { lineWidth: -1 }));
console.log('已应用 url-test 脚本 ->', path);
NODE
```

## 4. 运行与 systemd 服务
- 临时运行（验证）：
```bash
/usr/local/bin/mihomo -f "/path/to/clash/config/config.yaml"
```

- 注册为 systemd 服务（建议）：
```bash
cd "/path/to/clash"
sudo cp service/mihomo.service /etc/systemd/system/mihomo.service
sudo systemctl daemon-reload
sudo systemctl enable --now mihomo
sudo systemctl status mihomo
```

服务文件默认读取 `/etc/mihomo/config.yaml`。两种常用方式：

1) 使用系统路径（保持 service 默认不改）：
```bash
sudo mkdir -p /etc/mihomo
sudo cp "/path/to/clash/config/config.yaml" /etc/mihomo/config.yaml
sudo systemctl restart mihomo
```

2) 直接读取仓库内配置（便于脚本更新）：修改 `/etc/systemd/system/mihomo.service` 中的路径，例如：
```bash
sudo sed -i 's|/etc/mihomo|/path/to/clash/config|g' /etc/systemd/system/mihomo.service
sudo systemctl daemon-reload
sudo systemctl restart mihomo
```

## 5. 网页管理（面板）
优先推荐自托管/本机托管面板（避免在线托管被拦截）：
```bash
cd "/path/to/clash"
sudo cp service/yacd-meta.service /etc/systemd/system/yacd-meta.service
sudo systemctl daemon-reload
sudo systemctl enable --now yacd-meta
```

- 访问：`http://<server-ip>:19090`
- 控制器（Mihomo）：`http://<server-ip>:9090`

可选：在线托管（仅在可信网络使用）https://yacd.metacubex.one/

## 6. 代理切换（环境变量）
推荐通过环境变量在当前 shell 会话内启用/停用代理（对 `curl`、`wget`、`git`、语言包管理器等常见工具生效）。

方式 A：使用仓库脚本（推荐，需 source）：
```bash
cd "/path/to/clash"
source bin/use_proxy.sh   # 启用
source bin/no_proxy.sh    # 停用
```

方式 B：直接在 Bash 中设置（无需脚本，适合写入 `~/.bashrc`）：
```bash
proxy_on() {
	local host="${PROXY_HOST:-127.0.0.1}"
	local http_port="${HTTP_PORT:-7890}"
	local socks_port="${SOCKS_PORT:-7891}"

	export http_proxy="http://${host}:${http_port}"
	export https_proxy="http://${host}:${http_port}"
	export all_proxy="socks5h://${host}:${socks_port}"

	export HTTP_PROXY="$http_proxy"
	export HTTPS_PROXY="$https_proxy"
	export ALL_PROXY="$all_proxy"

	export no_proxy="${NO_PROXY:-localhost,127.0.0.1,::1}"
	export NO_PROXY="$no_proxy"
}

proxy_off() {
	unset http_proxy https_proxy all_proxy
	unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
	unset no_proxy NO_PROXY
}
```

快速测试：
```bash
curl -I https://www.google.com
```

## 7. 常用命令与排错
- 重载配置：`sudo systemctl restart mihomo`
- 查看日志：`journalctl -u mihomo -f`
- 检查监听：`sudo ss -lntp | grep -E '9090|7890|7891'`

## 8. 安全建议
- 强烈建议设置 `secret`，并限制 `9090` 的外网访问（防火墙/安全组）。
- 仅本机使用时，可将控制器与代理端口绑定到 `127.0.0.1` 并关闭 `allow-lan`。

## 9. 更新订阅/配置后要做什么（快速清单）
1) 拉取订阅并生成配置：
```bash
cd "/path/to/clash"
./bin/fetch_config.sh --raw "http://<your-subscription-url>?clash=1"
# 或写入系统路径：
sudo ./bin/fetch_config.sh --system --raw "http://<your-subscription-url>?clash=1"
```

2)（可选）再跑一次 JS 复写脚本（见第 3 节）。

3) 确认服务读取的配置路径：
```bash
sudo systemctl cat mihomo | grep -E 'ExecStart|WorkingDirectory'
# 结果通常是二选一：
# - /path/to/clash/config/config.yaml（仓库路径）
# - /etc/mihomo/config.yaml（系统路径）
```

4) 放开控制端口供面板使用（按你的配置文件路径修改）：
```bash
# 配置路径示例：/etc/mihomo/config.yaml
sudo sed -i 's|^external-controller: .*|external-controller: 0.0.0.0:9090|' /etc/mihomo/config.yaml
sudo sed -i 's|^allow-lan:.*|allow-lan: true|' /etc/mihomo/config.yaml
```

5) 重启并验证：
```bash
sudo systemctl restart mihomo
sudo ss -lntp | grep -E '9090|7890|7891'
```

提示：仓库内默认配置路径是 [config/config.yaml](config/config.yaml)。如果把 `external-controller` 改回仅本机监听（如 `127.0.0.1:9090`），外部面板将无法连接。
