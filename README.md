# 原生安装：Clash Meta（Mihomo）最简指南

手动下载并运行原生 Mihomo（Clash Meta）内核，配合面板管理，使用订阅链接生成配置，最后注册为系统服务。（提出思路，修正细节，由AI编写文本，已验证成功）

- 订阅示例：`http://sample.com?clash=1`
- 推荐本机/自托管面板；在线托管可能被拦截，仅在可信网络下使用

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


## 4. 网页管理（优先本机/自托管；在线托管有拦截风险）
- 优先：自托管/本机托管面板（避免在线托管被拦截）
```bash
cd /path/to/clash
# 将 yacd-meta 静态文件拷贝到 web/yacd-meta
sudo cp service/yacd-meta.service /etc/systemd/system/yacd-meta.service
sudo systemctl daemon-reload
sudo systemctl enable --now yacd-meta
# 访问 http://<服务器IP>:19090
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
