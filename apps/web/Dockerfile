FROM node:18-alpine

RUN apk update
RUN apk add --no-cache libc6-compat python3 make g++ curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PATH:$PNPM_HOME

# Build the app
WORKDIR /app
COPY . .
RUN pnpm install --filter eslint-config-custom
RUN pnpm install --filter api
RUN pnpm install --filter tsconfig
RUN pnpm install --filter web
COPY .env apps/web/.env
RUN cd apps/web && pnpm build

CMD cd apps/web && pnpm start