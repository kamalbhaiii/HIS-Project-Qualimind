# --------------------------------------------------
# Stage 1: Build the application
# --------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache git python3 make g++ libc6-compat \
 && corepack enable && corepack prepare pnpm@9.13.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install
COPY . .
ARG MODE
RUN pnpm build:${MODE}


# --------------------------------------------------
# Stage 2: Serve the built application
# --------------------------------------------------
FROM nginx:1.25-alpine AS dev
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
