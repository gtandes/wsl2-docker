Okay, let's analyze these Dockerfiles in the context of your monorepo and the previous `docker-compose.yml`.

Here are the observations and potential issues/improvements:

**General Observations & Best Practices:**

1.  **Base Image:** `node:18-alpine` is a good choice for smaller images. Consistent across all files.
2.  **System Dependencies:** Installing `python3`, `make`, `g++` is necessary if any Node dependencies have native bindings that need compilation. `curl` is needed if your healthchecks use it (the previous `docker-compose.yml` used `wget`, so ensure consistency or install `wget` instead/as well if needed).
3.  **PNPM Installation:** Using `corepack enable && corepack prepare pnpm@10.0.0 --activate` is the modern and recommended way to manage/install pnpm. Good.
4.  **WORKDIR:** Setting `WORKDIR /app` is standard.

**Major Issues & Recommendations:**

1.  **Inefficient Docker Layer Caching (ALL Dockerfiles):**
    *   **Problem:** You have `COPY . .` near the beginning. This copies *everything* from your build context (the entire monorepo) into the image. Any change to *any* file in your monorepo (even unrelated code, README updates, etc.) will invalidate this layer and force *all* subsequent `RUN pnpm install...` and `RUN ... pnpm build` commands to re-run every time you build the image. This makes builds unnecessarily slow.
    *   **Solution:** Optimize the dependency installation steps to leverage Docker caching:
        *   Copy only the necessary package manager files first.
        *   Install *all* dependencies using a single `pnpm install`.
        *   Copy the rest of the source code.
        *   Run the build command for the specific app.
    *   **Recommended Structure (Example for `WEB` Dockerfile):**
        ```dockerfile
        FROM node:18-alpine

        RUN apk update && apk add --no-cache libc6-compat python3 make g++ curl # or wget

        # Install pnpm
        RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
        ENV PNPM_HOME=/root/.local/share/pnpm
        ENV PATH=$PATH:$PNPM_HOME

        WORKDIR /app

        # 1. Copy only necessary files for dependency installation
        COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
        # Copy package.json files for all workspaces pnpm needs to resolve dependencies
        COPY apps/web/package.json ./apps/web/
        COPY apps/api/package.json ./apps/api/ # Assuming 'api' is a package/app 'web' depends on
        COPY apps/cms/package.json ./apps/cms/ # Assuming 'cms' is a package/app 'web' depends on
        COPY packages/tsconfig/package.json ./packages/tsconfig/ # Example package
        COPY packages/eslint-config-custom/package.json ./packages/eslint-config-custom/ # Example package
        # Add COPY lines for *all* relevant package.json files in apps/ and packages/

        # 2. Install ALL dependencies using the lockfile (leveraging pnpm workspace protocol)
        # Using --frozen-lockfile is recommended for CI/production builds
        RUN pnpm install --frozen-lockfile

        # 3. Copy the rest of the source code
        # This layer is invalidated only when actual code changes
        COPY . .

        # 4. Build ONLY the target application and its dependencies using Turborepo
        # Turborepo figures out what needs building based on turbo.json and code changes
        RUN pnpm turbo run build --filter=web... # The '...' tells turbo to include dependencies

        # 5. Set the command to run the specific application
        # Assuming PORT is passed via docker-compose environment: section
        CMD ["pnpm", "--filter=web", "start"]
        ```
        *Apply this optimized structure to `CMS` and `LRS` Dockerfiles as well, changing the `--filter` arguments accordingly.*

2.  **Incorrect `.env` Handling (`WEB`, `LRS` Dockerfiles):**
    *   **Problem:** The lines `COPY .env apps/web/.env` bake the contents of your *local* `.env` file directly into the Docker image *at build time*. This is bad practice:
        *   **Security Risk:** Sensitive credentials might be stored in image layers.
        *   **Inflexibility:** You cannot change environment variables without rebuilding the image.
        *   **Redundancy:** `docker-compose.yml` already uses `env_file: .env` to inject these variables into the *running container's environment*. The application should read from `process.env`, not a copied file.
    *   **Solution:** **Delete** the line `COPY .env apps/web/.env` from both `WEB` and `LRS` Dockerfiles. Ensure your applications (`web`, `lrs`, `cms`) are configured to read variables directly from the environment (e.g., `process.env.DATABASE_URL`, `process.env.PORT`).

3.  **Inefficient Dependency Installation (ALL Dockerfiles):**
    *   **Problem:** Running `pnpm install --filter <package>` multiple times is less efficient than a single `pnpm install` that installs everything needed based on the lockfile and workspace setup. The optimized structure above addresses this.
    *   **Solution:** Use a single `RUN pnpm install --frozen-lockfile` after copying the necessary manifest files.

4.  **`LRS` Dockerfile Seems Incorrect:**
    *   **Problem:** The `LRS` Dockerfile is identical to the `WEB` Dockerfile. It installs dependencies for `web` (`--filter web`), builds `web` (`cd apps/web && pnpm build`), and runs `web` (`cd apps/web && pnpm start`). This is almost certainly not what you intend for an `LRS` service.
    *   **Solution:**
        *   Verify if you have an application in `apps/lrs`.
        *   If yes, update the `LRS` Dockerfile to `--filter lrs` for install/build/start and adjust paths accordingly.
        *   If `LRS` functionality is part of the `web` app, you likely don't need a separate `LRS` Dockerfile or service in `docker-compose.yml`.
        *   If this Dockerfile is unused, remove it. **Based on the original file structure image and the previous compose file, you likely don't need this `LRS` Dockerfile.**

5.  **Missing Build Step (`CMS` Dockerfile):**
    *   **Problem:** The `CMS` Dockerfile installs dependencies but doesn't have a `RUN ... pnpm build` step. Does the CMS application (e.g., Strapi, or a custom app) require a build step (e.g., for TypeScript compilation, admin UI build)?
    *   **Solution:** If `apps/cms/package.json` contains a `build` script that needs to run before starting, add the Turborepo build step: `RUN pnpm turbo run build --filter=cms...` (after `COPY . .` in the optimized structure).

6.  **Chromium Installation (`CMS` Dockerfile):**
    *   **Observation:** You're installing Chromium and many font packages. This is correct if the CMS uses Puppeteer (or similar) for PDF/image generation.
    *   **Check:** Ensure the `PUPPETEER_EXECUTABLE_PATH` (`/usr/bin/chromium-browser`) is correct for the installed package on Alpine. Sometimes it might be just `/usr/bin/chromium`. Double-check this path inside the container if you encounter Puppeteer issues.

**Revised Dockerfiles (Conceptual - Apply Optimization):**

*   **`apps/cms/Dockerfile` (Optimized):**
    ```dockerfile
    FROM node:18-alpine

    # Install system deps including chromium and fonts
    RUN apk update && apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++ \
        curl \ # Or wget if needed by healthcheck
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
    ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser # Verify this path

    # Install pnpm
    RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
    ENV PNPM_HOME=/root/.local/share/pnpm
    ENV PATH=$PATH:$PNPM_HOME

    WORKDIR /app

    # Install dependencies (Cached)
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
    COPY apps/cms/package.json ./apps/cms/
    # Add COPY lines for packages/apps CMS depends on
    COPY packages/tsconfig/package.json ./packages/tsconfig/
    COPY packages/eslint-config-custom/package.json ./packages/eslint-config-custom/
    # ... copy other necessary package.json files ...
    RUN pnpm install --frozen-lockfile

    # Copy source code
    COPY . .

    # Build CMS (if needed)
    # If apps/cms/package.json has a build script:
    RUN pnpm turbo run build --filter=cms...

    # Start CMS
    # Assumes CMS_PORT is passed via docker-compose environment:
    CMD ["pnpm", "--filter=cms", "start"]
    ```

*   **`apps/web/Dockerfile` (Optimized):**
    ```dockerfile
    FROM node:18-alpine

    # Install system deps
    RUN apk update && apk add --no-cache libc6-compat python3 make g++ curl # or wget

    # Install pnpm
    RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
    ENV PNPM_HOME=/root/.local/share/pnpm
    ENV PATH=$PATH:$PNPM_HOME

    WORKDIR /app

    # Install dependencies (Cached)
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
    COPY apps/web/package.json ./apps/web/
    # Add COPY lines for packages/apps WEB depends on
    COPY packages/api/package.json ./packages/api/ # Example
    COPY packages/tsconfig/package.json ./packages/tsconfig/
    COPY packages/eslint-config-custom/package.json ./packages/eslint-config-custom/
    # ... copy other necessary package.json files ...
    RUN pnpm install --frozen-lockfile

    # Copy source code
    COPY . .

    # Build WEB using Turborepo
    RUN pnpm turbo run build --filter=web...

    # Start WEB
    # Assumes PORT is passed via docker-compose environment:
    CMD ["pnpm", "--filter=web", "start"]
    ```

*   **`LRS Dockerfile`:** Review its necessity. If needed, apply the same optimization pattern, targeting the correct app/package (`--filter=lrs` or similar). If not needed, remove it.

By implementing these changes, especially the optimized layer caching structure and removing the `.env` copy, your Docker builds should be significantly faster, and your setup will be more robust and follow best practices.