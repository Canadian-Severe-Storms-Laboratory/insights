FROM oven/bun:1.3.11-alpine AS base
WORKDIR /app

# --- 1. Prepare Stage (Pruning) ---
FROM base AS prepare
RUN bun add -g turbo@^2
COPY . .
RUN turbo prune --docker @insights/worker

# --- 2. Builder Stage (Install AND Build) ---
FROM base AS builder
COPY --from=prepare /app/out/json/ .

# Install dependencies (creates the global cache, devDependencies, & workspace symlinks)
RUN bun install --frozen-lockfile

# Copy the actual source code over into the SAME stage
COPY --from=prepare /app/out/full/ .
COPY .oxlintrc.json .
COPY tsconfig.* .

# Run the build while the Bun cache and all workspace node_modules are intact
RUN bun run build

# --- 3. Release Stage ---
FROM base AS release
WORKDIR /app

# Copy only the built artifacts from the builder stage
COPY --from=builder /app/apps/worker/dist ./dist

USER bun
ENV NODE_ENV=production \
    BASE_UPLOAD_DIR=/uploads

CMD ["bun", "dist/index.js"]
