FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS prepare
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune --docker @insights/worker

FROM base AS install
COPY --from=prepare /app/out/json/ .
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY --from=prepare /app/out/*/ .
COPY .oxlintrc.json .
COPY tsconfig.* .
ENV NODE_ENV=production
RUN bun run build

FROM base AS release
WORKDIR /app

COPY --from=build /app/apps/worker/dist ./dist

USER bun
ENV NODE_ENV=production \
    BASE_UPLOAD_DIR=/uploads

CMD ["bun", "dist/index.js"]