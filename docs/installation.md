# 安装指南

## Docker（推荐）

### 一键部署
```bash
docker run -d \
  --name hei \
  -p 12345:12345 \
  -v /path/to/data:/app/.config/hei \
  -v /path/to/videos:/Downloads \
  ghcr.io/lurenyang418/hei:latest
```

> 镜像发布在 GitHub Container Registry：`ghcr.io/lurenyang418/hei`。首次使用前请在仓库的 Packages 页面把该包可见性设为 Public；私有包需要先 `docker login ghcr.io`。

> 程序默认下载目录是容器内的 `/Downloads`（添加视频源时「保存路径」默认就是 `/Downloads`），所以视频卷要挂到 `/Downloads`；挂到别的容器内路径等于下载进容器，容器重建后文件会丢。

### docker-compose
```yaml
services:

  hei:
    image: ghcr.io/lurenyang418/hei:latest
    # build:
    #   context: .
    #   dockerfile: Dockerfile
    restart: unless-stopped
    network_mode: bridge
    # 该选项请仅在日志终端支持彩色输出时启用，否则日志中可能会出现乱码
    tty: false
    # 非必需设置项，推荐设置为宿主机用户的 uid 及 gid (`$uid:$gid`)
    # 可以执行 `id ${user}` 获取 `user` 用户的 uid 及 gid
    # 程序下载的所有文件权限将与此处的用户保持一致，不设置默认为 Root
    # user: 1000:1000
    hostname: hei
    container_name: hei
    # 程序默认绑定 0.0.0.0:12345 运行 http 服务
    ports:
      - 12345:12345
    volumes:
      - ./config:/app/.config/hei
      - ./Downloads:/Downloads # 下载目录：程序默认下载到容器内 /Downloads，这里映射到宿主机 ./Downloads

    environment:
      - TZ=Asia/Shanghai
      - RUST_LOG=None,bili_sync=info
    # 资源限制（可选）
    # deploy:
    #   resources:
    #     limits:
    #       cpus: '2'
    #       memory: 2G
    #     reservations:
    #       cpus: '0.5'
    #       memory: 500M
```

## 群晖 NAS

### Container Manager（Docker）

1. 打开 Container Manager (Docker)
2. 在「注册表」页签选择「添加 → 从 URL 添加」，填入 `ghcr.io/lurenyang418/hei:latest`（GHCR 镜像不在 Docker Hub 搜索里）
3. 下载并创建容器
4. 设置端口映射和文件夹映射（视频目录挂到容器内 `/Downloads`）

> 首次使用前请在仓库的 Packages 页面把该包可见性设为 Public；私有包需要先在 Container Manager 里登录 `ghcr.io`。

## 升级方法

### Linux 二进制
下载新版压缩包，替换旧文件后重启即可。当前仅发布 Linux amd64 / arm64 预编译产物；Windows / macOS 需自行从源码编译。

### Docker
```bash
docker pull ghcr.io/lurenyang418/hei
docker restart hei
```

## 注意事项

- 首次运行会自动创建数据库 `data.sqlite` 并进入设置向导（跟着向导配置 B 站 Cookie、下载路径即可）
- 视频默认保存在 `/Downloads`（容器内），Docker 部署时请把宿主机目录挂到 `/Downloads`
- 建议使用 Docker 部署，更新更方便