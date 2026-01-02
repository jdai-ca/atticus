# Multi-stage Dockerfile for Agentic service
# Use Debian-based Node images for broad compatibility (avoid musl issues on Alpine)

FROM node:18-bullseye AS builder
WORKDIR /app

# Copy package manifests first to leverage Docker cache for deps
COPY package.json package-lock.json tsconfig.json ./

# Install all dependencies (including dev) needed to build
RUN npm ci --silent

# Copy source and configuration
COPY . .

# Build TypeScript
RUN npm run build --silent

# Remove devDependencies to shrink final image
RUN npm prune --production --silent

# Final runtime image
FROM node:18-bullseye-slim
WORKDIR /app

# Create non-root user
RUN useradd --system --user-group --create-home --home-dir /nonroot nonroot || true

# Copy production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config ./config

# Create log directories and give permissions
RUN mkdir -p /app/logs/audit && chown -R nonroot:nonroot /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run as non-root user
USER nonroot

# Use the start script (node dist/server/index.js). Using direct node avoids extra shell.
CMD ["node", "dist/server/index.js"]
