# hei

[![GitHub Release](https://img.shields.io/github/v/release/lurenyang418/hei)](https://github.com/lurenyang418/hei/releases/latest)
[![Build](https://github.com/lurenyang418/hei/actions/workflows/build.yml/badge.svg)](https://github.com/lurenyang418/hei/actions/workflows/build.yml)
[![Docker Build](https://github.com/lurenyang418/hei/actions/workflows/docker-build.yml/badge.svg)](https://github.com/lurenyang418/hei/actions/workflows/docker-build.yml)
[![Downloads](https://img.shields.io/github/downloads/lurenyang418/hei/total)](https://github.com/lurenyang418/hei/releases)

专为 NAS 用户打造的哔哩哔哩同步工具，基于 Rust & Tokio 构建。

📚 [在线文档](https://lurenyang418.github.io/hei/) | 🚀 [快速开始](#快速开始) | 📝 [更新日志](./docs/changelog.md) | 💬 [QQ群交流](https://qm.qq.com/q/144RN3oaLM)

## ✨ 核心特性

### 🚀可直接原项目迁移运行
- **迁移后只需调整个别功能设置**

### 🎯 智能化功能
- **充电视频智能识别** - 自动检测并处理充电专享视频，无需人工干预
- **失败任务智能筛选** - 一键筛选失败任务，快速定位问题
- **任务队列持久化** - 程序重启后自动恢复任务状态
- **配置热重载** - 修改配置立即生效，无需重启

### 🎬 视频源支持
- **收藏夹** - 直接显示用户所有收藏夹，支持快速选择
- **合集 / 列表** - 订阅单个合集或系列，支持合集聚合与季度结构
- **UP主投稿** - 输入UP主ID查看所有合集/系列
- **稍后再看** - 自动同步稍后再看列表
- **番剧下载** - 支持单季和全季下载模式
- **B站课程** - 支持课程（pugv / cheese）订阅

### 🚀 技术优势
- **高性能** - Rust + Tokio 异步架构，支持高并发
- **内存优化** - 智能内存数据库模式，提升扫描性能
- **Web管理** - 友好的 Web 界面，无需命令行操作
- **自动重试** - 智能错误处理和重试机制

## 🚀 快速开始

### 使用 Docker（推荐）

```bash
docker run -d \
  --name hei \
  -p 12345:12345 \
  -v ./config:/app/.config/hei \
  -v ./Downloads:/Downloads \
  ghcr.io/lurenyang418/hei:latest
```

> 镜像发布在 GitHub Container Registry：`ghcr.io/lurenyang418/hei`。首次使用前请在仓库的 Packages 页面把该包可见性设为 Public；私有包需要先 `docker login ghcr.io`。

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

## 📸 界面预览

<details>
<summary>点击展开截图</summary>

### 主页界面
![概览](./docs/assets/主页.jpg)

</details>

## 🛠️ 配置说明

首次启动会自动进入设置向导，引导您完成：
- Cookie 配置
- 下载路径设置
- 视频源添加

所有配置支持在 Web 界面实时修改。

## 📂 项目结构

```
├── crates/                 # Rust 后端
│   ├── bili_sync/          # 主应用
│   ├── bili_sync_entity/   # 数据库实体
│   └── bili_sync_migration/# 数据库迁移
├── web/                    # Svelte 前端
├── docs/                   # VitePress 文档
└── scripts/                # 辅助脚本
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing`)
5. 创建 Pull Request

## 📝 许可证

本项目采用 MIT 许可证。
