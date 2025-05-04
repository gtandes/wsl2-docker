FROM node:18-alpine

# Install base dependencies + build tools
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

# Install dependencies needed by 'web' and its workspace dependencies
# Using --frozen-lockfile is recommended for reproducible builds
RUN pnpm install --filter eslint-config-custom --frozen-lockfile
RUN pnpm install --filter api --frozen-lockfile
RUN pnpm install --filter tsconfig --frozen-lockfile
RUN pnpm install --filter web --frozen-lockfile

# --- REMOVE THIS LINE ---
# Do NOT copy .env into the image. Inject variables via Docker Compose.
# COPY .env apps/web/.env
# ---

# Build the 'web' app
# Using pnpm directly in the app's directory
RUN cd apps/web && pnpm build
# Alternatively, using Turborepo from the root (might be cleaner if configured)
# RUN pnpm turbo run build --filter=web

# Set the command to start the 'web' app
CMD ["pnpm", "--filter=web", "start"] # Using filter syntax is often more robust
# Or: CMD cd apps/web && pnpm start