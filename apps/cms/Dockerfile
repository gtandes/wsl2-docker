# apps/cms/Dockerfile (REVISED STRUCTURE v8 - Removing comments near ENV vars)

# --- Stage 1: Install Deps & Prepare Deployment ---
    FROM node:18-alpine AS builder

    # Install base dependencies needed for pnpm install & building extensions
    RUN apk update && apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++
    
    # Install and activate pnpm v10.0.0 INSIDE this stage
    RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
    # Re-typed these ENV lines to ensure cleanliness
    ENV PNPM_HOME=/root/.local/share/pnpm
    ENV PATH=$PATH:$PNPM_HOME
    ENV PUPPETEER_SKIP_DOWNLOAD=true
    
    WORKDIR /app_build
    
    # Copy root manifests and workspace config
    COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
    
    # Copy ALL workspace package.json files
    COPY apps/cms/package.json ./apps/cms/
    COPY packages/api/package.json ./packages/api/
    COPY packages/directus-extension-data-migration/package.json ./packages/directus-extension-data-migration/
    COPY packages/directus-extension-hook-sentry/package.json ./packages/directus-extension-hook-sentry/
    COPY packages/directus-extension-hsh/package.json ./packages/directus-extension-hsh/
    COPY packages/emails/package.json ./packages/emails/
    COPY packages/eslint-config-custom/package.json ./packages/eslint-config-custom/
    COPY packages/tsconfig/package.json ./packages/tsconfig/
    COPY packages/types/package.json ./packages/types/
    
    # Install ALL dependencies
    RUN rm -rf /root/.pnpm-store
    RUN pnpm install --frozen-lockfile
    
    # Copy all source code needed for build/runtime
    COPY . .
    
    # Build necessary extensions
    RUN pnpm --filter directus-extension-hook-sentry build
    RUN pnpm --filter directus-extension-data-migration build
    RUN pnpm --filter directus-extension-hsh build
    
    # Create deployment directory structure
    RUN mkdir /app_deploy
    RUN pnpm deploy --filter cms --prod /app_deploy/apps/cms
    
    
    # --- Stage 2: Final Runtime Image ---
    FROM node:18-alpine
    
    # Install only runtime dependencies (chromium, etc.)
    RUN apk update && apk add --no-cache \
        libc6-compat \
        curl \
        chromium \
        nss \
        freetype \
        harfbuzz \
        ca-certificates \
        ttf-freefont \
        font-noto \
        font-noto-cjk \
        font-noto-emoji \
        fontconfig
    ENV TZ=Asia/Singapore
    # Re-typed these ENV lines for cleanliness
    ENV PUPPETEER_SKIP_DOWNLOAD=true
    ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    
    # Set final working directory
    WORKDIR /app/apps/cms
    
    # Copy the deployed application files from the build stage
    COPY --from=builder /app_deploy/apps/cms /app/apps/cms
    
    # Use the simplified start command
    CMD ["node_modules/.bin/directus", "start"]