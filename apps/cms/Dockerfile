FROM node:18-alpine

# Update and install necessary packages
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

# Set environment variable to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PATH:$PNPM_HOME

# Build the app
WORKDIR /app
COPY . .
RUN pnpm install --filter eslint-config-custom
RUN pnpm install --filter tsconfig
RUN pnpm install --filter cms

# --- CHANGES START HERE ---

# Set the working directory to the specific app's folder
WORKDIR /app/apps/cms

# Use the 'simple-start' script via npm run (exec form)
CMD ["npm", "run", "simple-start"]

# --- CHANGES END HERE ---

# This line is replaced by the lines above:
# CMD cd apps/cms && pnpm start
