# ---------- Base deps ----------
FROM node:20.19.5-alpine AS base
WORKDIR /app
RUN apk add --no-cache git python3 make g++ libc6-compat \
 && corepack enable && corepack prepare pnpm@9.13.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# ---------- Dev (hot reload) ----------
FROM base AS dev
WORKDIR /app
# nodemon + ts-node + tsconfig-paths are expected in dev deps
COPY . .
ARG MODE
CMD ["pnpm", "prepare:${MODE}"]

# ---------- Build ----------
FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm build

# ---------- Production ----------
FROM node:20.19.5-alpine AS prod
WORKDIR /app
RUN corepack enable
COPY --from=build /app/dist ./dist
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
ARG MODE
CMD ["pnpm", "start:${MODE}"]
