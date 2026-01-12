这份笔记整理了解决 Docker 代理失效问题的完整逻辑。其核心在于：**终端的环境变量不等于 Docker 服务的环境变量**。

---

# Docker 代理与镜像加速复现指南

## 1. 现象分析

* **症状**：终端已 `export http_proxy`，但 `docker pull` 依然提示 `context deadline exceeded` 或 `Connection refused`。
* **原因**：Docker 是 **Client-Server** 架构。`docker pull` 是由 **Docker Daemon (Server)** 执行的，它运行在独立的进程中，无法读取当前用户的 Shell 环境变量。

---

## 2. 核心方案：配置 Docker 守护进程代理

这是最彻底的解决方法，让 Docker 引擎自身具备联网能力。

### 第一步：创建配置目录

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d

```

### 第二步：配置代理文件

创建或编辑 `/etc/systemd/system/docker.service.d/proxy.conf`：

```ini
[Service]
# 注意：127.0.0.1 仅适用于代理软件在同台机器的情况
Environment="HTTP_PROXY=http://127.0.0.1:7890"
Environment="HTTPS_PROXY=http://127.0.0.1:7890"
# 排除本地流量，防止容器间通信走代理导致回环
Environment="NO_PROXY=localhost,127.0.0.1,::1,*.local,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

```

### 第三步：加载配置并重启

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker

```

---

## 3. 辅助方案：配置镜像加速器

如果代理不稳定，配置国内镜像源作为备选方案。

编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://hub-mirror.c.163.com"
  ]
}

```

*修改后同样需要执行 `sudo systemctl restart docker`。*

---

## 4. 验证命令清单

执行以下命令检查配置是否生效：

* **检查环境变量是否注入：**
```bash
systemctl show --property=Environment docker

```


* **检查 Docker 运行详情：**
```bash
docker info | grep -i proxy

```


* **拉取测试：**
```bash
docker pull hello-world

```



---

## 5. 特殊场景补充

### A. WSL2 架构下的注意事项

如果在 WSL2 中使用，`127.0.0.1` 可能无法指向 Windows 宿主机的代理。

* **解决：** 将 `127.0.0.1` 替换为 WSL2 的网关 IP（通过 `cat /etc/resolv.conf` 查看）。

### B. 让容器内程序也走代理

如果你希望 `docker-compose up` 启动的容器内部也能联网（如 `apt update`），需要在 `docker-compose.yml` 中注入：

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      - HTTP_PROXY=http://127.0.0.1:7890
      - HTTPS_PROXY=http://127.0.0.1:7890

```
