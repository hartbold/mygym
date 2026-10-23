# syntax=docker/dockerfile:1

# MY GYM és un export estàtic de Next (`output: "export"` → `out/`), així que
# la imatge final no necessita Node: només un servidor de fitxers estàtics.

ARG NODE_VERSION=24.19.0
ARG PNPM_VERSION=12.5.1

################################################################################
# Build: instal·la dependències i genera `out/` (next build + postbuild sw.js).
FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION

WORKDIR /usr/src/app

RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}

# Capa de dependències separada per aprofitar la memòria cau de Docker.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

################################################################################
# Final: nginx servint `out/` amb les mateixes regles que deploy/apache-vhost.conf.
FROM nginx:1.29-alpine AS final

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/out /usr/share/nginx/html

EXPOSE 80
