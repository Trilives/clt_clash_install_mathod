# 原生安装：Clash Meta（Mihomo）最简指南

手动下载并运行原生 Mihomo（Clash Meta）内核，配合面板管理，使用订阅链接生成配置，最后注册为系统服务。（提出思路，修正细节，由AI编写文本，已验证成功）

- 订阅示例：`http://<your-subscription-url>?clash=1`
- 推荐本机/自托管面板；在线托管可能被拦截，仅在可信网络下使用
> 提示：下文出现的 `/path/to/clash`、`<your-subscription-url>` 等占位符，请替换为你自己的实际路径与订阅地址。

## 1. 手动下载并安装内核
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
（若不使用系统路径，也可放在工作目录，例如 `clash/bin/mihomo`，并在后续服务文件中相应修改。）

## 2. 用订阅链接生成配置
在工作目录中使用脚本生成 `config.yaml`：
```bash
cd /path/to/clash
./bin/fetch_config.sh --raw "http://sample.com?clash=1"
```
- `--raw`：订阅已是 Clash 格式，脚本直接下载；若失败会自动回退到转换服务（可通过 `SUBCONVERTER` 环境变量自定义）。
- 系统路径模式（服务默认读取 `/etc/mihomo/config.yaml`）：
```bash
sudo mkdir -p /etc/mihomo
sudo ./bin/fetch_config.sh --system --raw "http://sample.com?clash=1"
```

## 3. 运行与系统服务
- 临时运行（验证）：
```bash
/usr/local/bin/mihomo -f /path/to/clash/config/config.yaml
```
- 注册为 systemd 服务（建议）：
```bash
cd /path/to/clash
sudo cp service/mihomo.service /etc/systemd/system/mihomo.service
sudo systemctl daemon-reload
sudo systemctl enable --now mihomo
sudo systemctl status mihomo
```
服务文件默认使用 `/etc/mihomo/config.yaml`。两种用法：
1) 使用系统路径：创建目录并放置配置
```bash
sudo mkdir -p /etc/mihomo
sudo cp /path/to/clash/config/config.yaml /etc/mihomo/config.yaml
```
2) 直接使用仓库内配置（推荐便于订阅脚本更新）：修改 `/etc/systemd/system/mihomo.service` 中的路径
```bash
sudo sed -i 's|/etc/mihomo|/path/to/clash/config|g' /etc/systemd/system/mihomo.service
sudo systemctl daemon-reload
sudo systemctl restart mihomo
```
此时 `ExecStart` 应为 `/usr/local/bin/mihomo -f /path/to/clash/config/config.yaml`，`WorkingDirectory` 为 `/path/to/clash/config`。
> 注意：如果父目录更改，相应的服务中文件目录也要更改

## 2.5 用 JS 脚本复写生成的 config（两种模式二选一）
生成订阅后，可用仓库内脚本重写 `config/config.yaml` 的分组与规则：

1) 备份当前配置（可选）：
```bash
cd /path/to/clash
cp config/config.yaml config/config.yaml.bak
```

2) 安装一次依赖（需 Node.js）：
```bash
npm install js-yaml --prefix /path/to/clash
```

3) 运行脚本（按需选一个）：
- 故障转移模式：
```bash
cd /path/to/clash
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
cd /path/to/clash
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

提示：每次用 `bin/fetch_config.sh` 拉新订阅后，如需同样策略，再跑一次对应脚本即可。


## 4. 网页管理（优先本机/自托管；在线托管有拦截风险）
- 优先：自托管/本机托管面板（避免在线托管被拦截）
```bash
cd /path/to/clash
# 将 yacd-meta 静态文件拷贝到 web/yacd-meta
sudo cp service/yacd-meta.service /etc/systemd/system/yacd-meta.service
sudo systemctl daemon-reload
sudo systemctl enable --now yacd-meta
# 访问 http://<服务器IP>:19090
# 防火墙放行：务必确认宿主机防火墙（UFW/Firewalld）已开放对应端口（如 sudo ufw allow 19090/tcp），否则外部及虚拟网流量会被拦截。
```
	- 若需拉取静态文件，可用 `bin/install_dashboard.sh`，或在其他机器下载后拷贝到 `web/yacd-meta`。
	- 如需部署到 `/opt/yacd-meta`（与默认 service 匹配），参考：
```bash
sudo apt-get update -y && sudo apt-get install -y unzip
sudo mkdir -p /opt/yacd-meta
cd /opt/yacd-meta
sudo rm -rf ./*
sudo wget -O yacd-meta.zip https://github.com/MetaCubeX/Yacd-meta/archive/refs/heads/gh-pages.zip
sudo unzip -q yacd-meta.zip && sudo rm yacd-meta.zip
sudo bash -lc 'shopt -s dotglob nullglob; mv /opt/yacd-meta/Yacd-meta-gh-pages/* /opt/yacd-meta/'
sudo rmdir /opt/yacd-meta/Yacd-meta-gh-pages
sudo systemctl restart yacd-meta
```
- 可选：在线托管（仅在可信网络使用）https://yacd.metacubex.one/
	- Controller: `http://<服务器IP>:9090`
	- 如遇浏览器阻止（混合内容），在浏览器允许“不安全内容”后再填写控制器地址。

## 5. 代理切换（环境变量）
推荐通过环境变量在当前 shell 会话内启用/停用代理（对 `curl`、`wget`、`git`、语言包管理器等常见工具生效）。

方式 A：使用仓库脚本（推荐，需 source）
```bash
cd /path/to/clash
# 启用代理
source bin/use_proxy.sh

# 停用代理
source bin/no_proxy.sh
```

自定义代理地址与端口（在 `source` 前覆盖变量）：
```bash
export PROXY_HOST=127.0.0.1
export HTTP_PORT=7890
export SOCKS_PORT=7891
source bin/use_proxy.sh
```

方式 B：直接在 Bash 中设置（无需脚本）
```bash
# Proxy Switcher（可粘贴到 ~/.bashrc）
proxy_on() {
	local host="${PROXY_HOST:-127.0.0.1}"
	local http_port="${HTTP_PORT:-7890}"
	local socks_port="${SOCKS_PORT:-7891}"

	export http_proxy="http://${host}:${http_port}"
	export https_proxy="http://${host}:${http_port}"
	# socks5h 代理 DNS 解析；如你只用 7890 作为 SOCKS，可设 SOCKS_PORT=7890
	export all_proxy="socks5h://${host}:${socks_port}"

	export HTTP_PROXY="$http_proxy"
	export HTTPS_PROXY="$https_proxy"
	export ALL_PROXY="$all_proxy"

	export no_proxy="${NO_PROXY:-localhost,127.0.0.1,::1}"
	export NO_PROXY="$no_proxy"

	echo -e "\033[32m[✔] 系统代理已开启 (${host}: http=${http_port}, socks=${socks_port})\033[0m"
}

proxy_off() {
	unset http_proxy https_proxy all_proxy
	unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
	unset no_proxy NO_PROXY
	echo -e "\033[31m[✘] 系统代理已关闭\033[0m"
}

proxy_status() {
	echo "http_proxy: ${http_proxy:-<empty>}"
	echo "https_proxy: ${https_proxy:-<empty>}"
	echo "all_proxy:  ${all_proxy:-<empty>}"
	echo "no_proxy:   ${no_proxy:-<empty>}"
}

proxy_test() {
	curl -I https://www.google.com 2>&1 | head -n 20
}

# 用法示例：
# nano ~/.bashrc     # 将上面函数粘贴到当前终端
# source ~/.bashrc
# proxy_on
# proxy_status
# proxy_test
# proxy_off
```

开机默认开启（可选，基于方式 B 已粘贴的函数）

- 当前用户登录自动启用（添加到 ~/.bashrc）：
```bash
tee -a ~/.bashrc >/dev/null <<'EOF'
# 登录/新终端默认开启（设置 CLASH_PROXY_DEFAULT=off 可关闭此默认行为）
if [ "${CLASH_PROXY_DEFAULT:-on}" = "on" ]; then
	proxy_on
fi
EOF

source ~/.bashrc
```

- 取消代理（清空所有相关变量）：
```bash
unset http_proxy https_proxy all_proxy
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
unset no_proxy NO_PROXY
```

- 快速连通性测试：
```bash
curl -I https://www.google.com
```

- 注意：
  - 确保 Mihomo 服务已运行，且本机监听 `7890/7891`。
  - 快速自查：
```bash
sudo systemctl status mihomo
ss -lntp | grep -E '7890|7891'
```

## 6. 常用命令与排错
- 重载配置：`sudo systemctl restart mihomo`
- 查看日志：`journalctl -u mihomo -f`
- 面板连不上：检查 `external-controller: 0.0.0.0:9090` 与 `secret`；确认服务已启动。
- 订阅拉取失败：使用 `--raw`；或在可联网机器先下载 YAML 后手动拷贝。

## 7. 安全建议
- 设置强 `secret` 并限制 `9090` 的外网访问（如用防火墙）。
- 仅本机使用时，可将控制器与代理端口绑定到本地地址并关闭 `allow-lan`。

## 8. 更新订阅/配置后要做什么（快速清单）

以下步骤适用于你用新的订阅链接更新了配置（无论写入仓库路径还是系统路径），确保面板可用、可选节点且服务读取的是你刚更新的文件。

1) 拉取订阅并生成配置

```bash
# 写入仓库内配置（推荐便于维护）
cd /path/to/clash
./bin/fetch_config.sh --raw "http://sample.com?clash=1"

# 或写入系统路径（服务默认读取 /etc/mihomo/config.yaml）
sudo ./bin/fetch_config.sh --system --raw "http://sample.com?clash=1"
```

2) 确认服务实际读取的配置路径

```bash
sudo systemctl cat mihomo | grep -E 'ExecStart|WorkingDirectory'
# 结果应指向以下二选一：
# - /home/<user>/docker&apps/clash/config/config.yaml（仓库路径）
# - /etc/mihomo/config.yaml（系统路径）
```

3) 放开控制端口给外部面板（Yacd）使用

- 确保配置里存在：
	- `allow-lan: true`
	- `external-controller: 0.0.0.0:9090`

两种路径分别修改（按你上一步确认的实际路径执行一条即可）：

```bash
# 情况 A：服务读系统路径
sudo sed -i 's|^external-controller: .*|external-controller: 0.0.0.0:9090|' /etc/mihomo/config.yaml
sudo sed -i 's|^allow-lan:.*|allow-lan: true|' /etc/mihomo/config.yaml

# 情况 B：服务读仓库路径
sed -i 's|^external-controller: .*|external-controller: 0.0.0.0:9090|' /path/to/clash/config/config.yaml
sed -i 's|^allow-lan:.*|allow-lan: true|' /path/to/clash/config/config.yaml
```

4) 重启服务并验证监听

```bash
sudo systemctl restart mihomo
sudo ss -lntp | grep -E '9090|7890|7891'
# 期望看到：9090 监听在 0.0.0.0（或 *:9090），7890/7891 正常 LISTEN
```

5) 防火墙放行（如启用 UFW/Firewalld）

```bash
sudo ufw allow 9090/tcp
# 如果自托管面板（yacd-meta.service）在 19090：
sudo ufw allow 19090/tcp
```

6) 在面板中连接控制器

- 自托管面板（默认 19090）：浏览器打开 `http://<服务器IP>:19090`
- 在线面板（风险较高，需可信网络）：https://yacd.metacubex.one/
- Controller 填写：`http://<服务器IP>:9090`（注意 http 而非 https）
- 如果配置里设置了 `secret`，面板也要填相同密钥。

7) 常见故障速查

- 面板能打开但无法加载节点：`ss -lntp | grep 9090` 若显示 `127.0.0.1:9090`，说明控制端口仅本机监听，按第 3 步放开为 `0.0.0.0:9090` 并重启。
- 改了仓库内 `config/config.yaml` 但不生效：服务可能仍读 `/etc/mihomo/config.yaml`。用第 2 步确认路径；要么把服务改为仓库路径，要么同步修改 `/etc/mihomo/config.yaml`。
- 连不上控制器：检查防火墙是否放行 9090/TCP；浏览器不要用 https；如有 `secret` 必须一致。

提示：本仓库内的默认配置已将 `external-controller` 设为 `0.0.0.0:9090`，路径在 [config/config.yaml](config/config.yaml)。如你改回本地监听（127.0.0.1），外部面板将无法连接。
