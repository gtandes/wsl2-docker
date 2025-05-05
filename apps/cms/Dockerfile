# apps/cms/Dockerfile (REVISED STRUCTURE v2 - Paths Confirmed)

FROM node:18-alpine

# Install base dependencies + build tools + Chromium
RUN apk update && apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    fontconfig
    
# Set Puppeteer env vars
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install and activate pnpm v10.0.0
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PATH:$PNPM_HOME

# Set working directory for the build steps
WORKDIR /app

# --- Monorepo Dependency Installation ---
# 1. Copy root manifests and workspace config FIRST
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# 2. Copy package.json for ALL workspaces needed for 'cms' build & runtime
COPY apps/cms/package.json ./apps/cms/
# Extensions and shared packages under ./packages/
COPY packages/directus-extension-hsh/package.json ./packages/directus-extension-hsh/
COPY packages/directus-extension-data-migration/package.json ./packages/directus-extension-data-migration/
COPY packages/directus-extension-hook-sentry/package.json ./packages/directus-extension-hook-sentry/
COPY packages/eslint-config-custom/package.json ./packages/eslint-config-custom/
# Assuming tsconfig and api packages also exist under ./packages/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/api/package.json ./packages/api/
# Add COPY lines for any other necessary workspace packages

# 3. Install ALL dependencies for the workspace defined by pnpm-workspace.yaml
#    This single install resolves workspace links correctly. Use --frozen-lockfile.
RUN pnpm install --frozen-lockfile
# Note: For production, consider "--prod" flag here in a multi-stage build

# 4. Copy the rest of the source code
COPY . .

# 5. Optional: Build step if needed
# RUN pnpm turbo run build --filter=cms... # Filter appropriately

# --- Runtime ---
WORKDIR /app/apps/cms
# Use the simplified start command
CMD ["npm", "run", "simple-start"]