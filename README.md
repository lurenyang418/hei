# hei

[![GitHub Release](https://img.shields.io/github/v/release/lurenyang418/hei)](https://github.com/lurenyang418/hei/releases/latest)
[![Build](https://github.com/lurenyang418/hei/actions/workflows/build.yml/badge.svg)](https://github.com/lurenyang418/hei/actions/workflows/build.yml)
[![Docker Build](https://github.com/lurenyang418/hei/actions/workflows/docker-build.yml/badge.svg)](https://github.com/lurenyang418/hei/actions/workflows/docker-build.yml)
[![Downloads](https://img.shields.io/github/downloads/lurenyang418/hei/total)](https://github.com/lurenyang418/hei/releases)

专为 NAS 用户打造的哔哩哔哩同步工具，基于 Rust & Tokio 构建。

📚 [在线文档](https://lurenyang418.github.io/hei/) | 🚀 [快速开始](#快速开始) | 📝 [更新日志](./docs/changelog.md)

## ✨ 核心特性

### 🎬 视频源支持
- **收藏夹** - 直接显示用户所有收藏夹，支持快速选择
- **合集 / 列表** - 订阅单个合集或系列，支持合集聚合与季度结构
- **UP主投稿** - 输入UP主ID查看所有合集/系列
- **稍后再看** - 自动同步稍后再看列表
- **番剧下载** - 支持单季和全季下载模式
- **B站课程** - 支持课程（pugv / cheese）订阅

## 🚀 快速开始

### 使用 Docker（推荐）

```bash
docker run -d \
  --name hei \
  -p 12345:12345 \
  -v ./data:/app/.config/hei \
  -v ./videos:/app/videos \
  ghcr.io/lurenyang418/hei:latest
```

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
      - ./data:/app/.config/hei
      - ./videos:/app/videos # 下载目录：程序默认下载到容器内 /app/videos，这里映射到宿主机 ./videos

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

### 二进制文件

从 [Releases](https://github.com/lurenyang418/hei/releases) 下载 Linux amd64 / arm64 可执行文件；Windows / macOS 需自行从源码编译。

### 开发环境

```bash
# 克隆项目
git clone https://github.com/lurenyang418/hei
cd hei

# 构建前端
cd web
npm install
npm run build
cd ..

# 启动
cargo run -p bili_sync
```

访问 `http://localhost:12345` 进入管理界面。

## 🛠️ 配置说明

首次启动会自动进入设置向导，引导您完成：
- Cookie 配置
- 下载路径设置
- 视频源添加

所有配置支持在 Web 界面实时修改。

## 📝 许可证

本项目采用 MIT 许可证。
