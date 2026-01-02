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
FROM node:18-alpine

WORKDIR /app

# Copy package definition
COPY package.json tsconfig.json ./

# Install dependencies
# In a real build, we'd run npm install. 
# For this structure, we assume we are inside /agentic context
RUN npm install

# Copy source code
COPY . .

# Copy configuration (assuming build context root has access or we copy from outside)
# Since context is usually ./agentic, we need to handle this carefully.
# We will assume we copy the config folder into ./agentic/config BEFORE build or use a context that allows it.
# For now, let's assume we copy to ./config inside the image.
COPY config/ ./config/

# Build the project
RUN npm run build

# Create log directories
RUN mkdir -p /app/logs/audit && chmod 777 /app/logs

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
