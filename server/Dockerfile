# ---------- Base deps ----------
FROM node:20.19.5-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# ---------- Dev (hot reload) ----------
FROM base AS dev
WORKDIR /app
# nodemon + ts-node + tsconfig-paths are expected in dev deps
COPY . .
EXPOSE 5000
CMD ["pnpm", "dev"]

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
EXPOSE 5000
CMD ["npm", "run", "dev"]
