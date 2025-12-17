# syntax=docker/dockerfile:1.7

FROM node:20-bullseye AS base
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm run build

FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/components.json ./components.json
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
CMD ["pnpm","start"]

# Build-time envs (set via --build-arg …)
ARG NEXT_PUBLIC_APP_URL
ARG MONGODB_URI
ARG MONGODB_DB
ARG S3_BUCKET
ARG AWS_REGION
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV MONGODB_URI=${MONGODB_URI}
ENV MONGODB_DB=${MONGODB_DB}
ENV S3_BUCKET=${S3_BUCKET}
ENV AWS_REGION=${AWS_REGION}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

