# apps/cms/Dockerfile (REVISED STRUCTURE v9 - Standard Multi-Stage, No Deploy)

# --- Stage 1: Builder ---
    FROM node:18-alpine AS builder

    # Install base dependencies needed for pnpm install & building extensions
    RUN apk update && apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++
    
    # Install and activate pnpm v10.0.0 INSIDE this stage
    RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
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
    
    # Install ALL dependencies (including devDeps)
    RUN rm -rf /root/.pnpm-store
    RUN pnpm install --frozen-lockfile
    
    # Copy all source code needed for build
    COPY . .
    
    # Build necessary extensions
    RUN pnpm --filter directus-extension-hook-sentry build
    RUN pnpm --filter directus-extension-data-migration build
    RUN pnpm --filter directus-extension-hsh build
    
    
    # --- Stage 2: Final Production Image ---
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
    ENV PUPPETEER_SKIP_DOWNLOAD=true # Still needed if any runtime dep uses puppeteer
    ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    
    # Install pnpm again (needed for install command in this stage)
    RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
    ENV PNPM_HOME=/root/.local/share/pnpm
    ENV PATH=$PATH:$PNPM_HOME
    
    WORKDIR /app
    
    # Copy ONLY necessary manifests/configs for production install
    COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
    COPY apps/cms/package.json ./apps/cms/
    COPY packages/api/package.json ./packages/api/ # Copy packages cms depends on
    COPY packages/directus-extension-data-migration/package.json ./packages/directus-extension-data-migration/
    COPY packages/directus-extension-hook-sentry/package.json ./packages/directus-extension-hook-sentry/
    COPY packages/directus-extension-hsh/package.json ./packages/directus-extension-hsh/
    COPY packages/emails/package.json ./packages/emails/
    COPY packages/tsconfig/package.json ./packages/tsconfig/
    COPY packages/types/package.json ./packages/types/
    
    # Install ONLY production dependencies
    RUN pnpm install --prod --frozen-lockfile
    
    # Copy necessary source code for cms app from context
    COPY apps/cms/config.js ./apps/cms/config.js
    COPY apps/cms/src ./apps/cms/src
    # Add any other essential source files/dirs for cms runtime
    
    # Copy built extension artifacts FROM the builder stage
    COPY --from=builder /app_build/packages/directus-extension-hook-sentry/dist ./packages/directus-extension-hook-sentry/dist
    COPY --from=builder /app_build/packages/directus-extension-data-migration/dist ./packages/directus-extension-data-migration/dist
    COPY --from=builder /app_build/packages/directus-extension-hsh/dist ./packages/directus-extension-hsh/dist
    
    # Copy internal migrations from context (assuming they are needed at runtime)
    COPY apps/cms/extensions/migrations ./apps/cms/extensions/migrations
    
    # Copy other extension source if needed at runtime (e.g. data-sync)
    # COPY packages/data-sync/... ./packages/data-sync/...
    
    # Set final working directory
    WORKDIR /app/apps/cms
    
    # Use the simplified start command
    CMD ["../node_modules/.bin/directus", "start"] # Adjust path to node_modules relative to final WORKDIR