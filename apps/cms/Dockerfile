# apps/cms/Dockerfile (REVISED STRUCTURE v5 - Using pnpm deploy)

FROM node:18-alpine

# ... (apk add, puppeteer setup, pnpm setup) ...

# --- Stage 1: Install Deps & Prepare Deployment ---
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
RUN rm -rf /root/.pnpm-store # Keep cache clear for this test
RUN pnpm install --frozen-lockfile

# Copy all source code needed for build/runtime
COPY . .

# Build necessary extensions (if their build output is needed at runtime)
# Alternatively, build could happen in the final stage if only needed there
RUN pnpm --filter directus-extension-hook-sentry build
RUN pnpm --filter directus-extension-data-migration build
RUN pnpm --filter directus-extension-hsh build

# Create deployment directory structure by copying only prod dependencies
# And copying workspace packages instead of linking
RUN mkdir /app_deploy
RUN pnpm deploy --filter cms --prod /app_deploy/apps/cms


# --- Stage 2: Final Runtime Image ---
FROM node:18-alpine

# Install only runtime dependencies (chromium, etc.)
# Copy necessary ones from the list in Stage 1
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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set final working directory
WORKDIR /app/apps/cms # Match the deploy target structure

# Copy the deployed application files from the build stage
COPY --from=0 /app_deploy/apps/cms /app/apps/cms

# Use the simplified start command
CMD ["node_modules/.bin/directus", "start"] # Use direct path since npm context might differ
# Or CMD ["npm", "run", "simple-start"] if that script exists and works