FROM node:18-alpine

# Install base dependencies + build tools (same as web)
RUN apk update && apk add --no-cache \
  libc6-compat \
  python3 \
  make \
  g++ \
  curl
  # If you actually NEED to run Puppeteer inside the container at runtime,
  # you MUST install chromium here:
  # chromium

# Set environment variable to skip ALL Puppeteer downloads during install
ENV PUPPETEER_SKIP_DOWNLOAD=true
# This tells Puppeteer where to look IF it runs. Will only work if chromium is installed via apk.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install and activate pnpm v10.0.0
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PATH:$PNPM_HOME

WORKDIR /app

# Copy the entire project context
# NOTE: This is inefficient for caching, optimize later by copying manifests first.
COPY . .

# Install dependencies needed by 'cms' and its workspace dependencies
# Adjust filters based on actual dependencies of 'cms'. Assuming similar base deps.
# Using --frozen-lockfile is recommended for reproducible builds
RUN pnpm install --filter eslint-config-custom --frozen-lockfile
RUN pnpm install --filter api --frozen-lockfile # If cms depends on api
RUN pnpm install --filter tsconfig --frozen-lockfile # If cms depends on tsconfig
RUN pnpm install --filter cms --frozen-lockfile

# --- REMOVE THIS LINE ---
# This was incorrectly copied from the web Dockerfile anyway.
# COPY .env apps/web/.env
# ---

# Build the 'cms' app *** CORRECTED TO CMS ***
# Using pnpm directly in the app's directory
RUN cd apps/cms && pnpm build
# Alternatively, using Turborepo from the root (might be cleaner if configured)
# RUN pnpm turbo run build --filter=cms

# Set the command to start the 'cms' app *** CORRECTED TO CMS ***
CMD ["pnpm", "--filter=cms", "start"] # Using filter syntax is often more robust
# Or: CMD cd apps/cms && pnpm start