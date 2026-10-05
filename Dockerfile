# MCS Web 容器镜像（2026-10-05 加）
#
# 面向「托管平台跑公网模式」这一条路：Render / Fly / Railway / 自建 K8s 都能用。
#
# 三个要点：
# 1. **Python 必须装**：证书重放要真的跑 `mcs-foundations/validation/certification/kernel.py`。
#    没有 Python 时重放会如实报「无法启动检查器」而不是伪报通过，但那就少了一项能力。
# 2. **构建产物与源码同镜像**：本服务既是 API 又是静态站点（`mcs-web/web/dist`），
#    不需要第二个服务来托管前端。
# 3. **不写数据进镜像**：学习数据在 PostgreSQL（`DATABASE_URL`），
#    容器里的 `runtime/` 只是可重建的缓存与临时目录。
#
# 注意：本机没有 docker，这个文件**未经本机构建验证**。第一条部署时请核对
# `docker build` 是否通过，并把结果写回 `RELEASE-READINESS.md`。
FROM node:24-bookworm-slim

# Python 只装标准库就够（kernel.py 只用 stdlib）；tini 负责正确转发信号。
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先只拷依赖清单：改业务代码时不必重装依赖。
COPY mcs-web/package.json mcs-web/package-lock.json ./mcs-web/
RUN cd mcs-web && npm ci --omit=dev=false

# 再拷源码（.dockerignore 已排除 node_modules / dist / runtime / 参考文献等）。
COPY . .

RUN cd mcs-web && npm run build

ENV NODE_ENV=production \
    PORT=8080 \
    MCS_WEB_HOST=0.0.0.0 \
    MCS_WEB_PUBLIC_MODE=1 \
    MCS_WEB_AUTH_MODE=supabase \
    MCS_WEB_AUTH_EMAIL_ENABLED=0 \
    MCS_WEB_TUTOR_ENABLED=0

# 公网模式启动时会自检：缺 publicOrigin / allowedHosts / DATABASE_URL / 账号配置
# 一律**拒绝启动**。这是刻意的——起不来好过起来一个谁都能写的服务。
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "mcs-web/server/index.mjs"]
