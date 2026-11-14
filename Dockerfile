FROM alpine:3.22 AS base

ARG TARGETPLATFORM
ARG RELEASE_CHANNEL=stable

WORKDIR /app

# ffmpeg：B 站音视频合并、章节切分等
RUN apk update && apk add --no-cache \
    ca-certificates \
    tzdata \
    ffmpeg

# 复制所有Linux二进制文件
COPY ./hei-Linux-*.tar.gz ./

# 根据目标平台解压对应的二进制文件
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
    tar xzvf ./hei-Linux-x86_64-musl.tar.gz; \
    elif [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
    tar xzvf ./hei-Linux-aarch64-musl.tar.gz; \
    else \
    echo "Unsupported platform: $TARGETPLATFORM" && exit 1; \
    fi

# 写入镜像构建时间（用于 /api/updates/beta 的本地时间对比，避免“编译时间 < 推送时间”导致误判）
RUN date -u +"%Y-%m-%dT%H:%M:%SZ" > /app/image-built-at.txt
RUN echo -n "$RELEASE_CHANNEL" > /app/release-channel.txt

# 清理压缩文件并设置权限
RUN rm -f ./hei-Linux-*.tar.gz && \
    chmod +x ./hei

FROM scratch

WORKDIR /app

ENV LANG=zh_CN.UTF-8 \
    TZ=Asia/Shanghai \
    HOME=/app \
    CONTAINER=1 \
    RUST_BACKTRACE=1 \
    RUST_LOG=None,bili_sync=info

COPY --from=base / /

ENTRYPOINT [ "/app/hei" ]

VOLUME [ "/app/.config/hei" ]

