# HSH

This is a monorepo of a full-stack web app with a Next.js frontend and a Directus backend.

## Requirements for development

This project only runs on Linux and macOS. Windows is not supported.

Install the following dependencies on your computer:

- NodeJS 18.12
- pnpm (`npm i -g pnpm`)

Install the following extensions on your VSCode:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## How to start the development server?

1. Make sure pnpm is installed
2. Copy `.env.example` to `.env` and fill in the required values
3. Run `pnpm install` to install all dependencies
4. Run `pnpm run dev` to start all the development servers and the database
5. Open `http://localhost:3000` in your browser for the web app
6. Open `http://localhost:3000/cms/admin` in your browser for the admin panel
7. Login using the default admin credentials: `test@test.com` / `test123`

## What's inside?

This turborepo uses [pnpm](https://pnpm.io) as a package manager. It includes the following packages/apps:

### Apps and Packages

- `web`: a [Next.js](https://nextjs.org/) app
- `cms`: a [Directus](https://directus.io/) app
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Useful commands

- `pnpm install`: To install all dependencies across all packages
- `pnpm dev`: To start all the development servers and the database
- `pnpm lint`: To lint the code (ESLint + Prettier)
- `pnpm format`: To format all files with Prettier
- `pnpm snapshot`: To create a snapshot of the CMS schema (DB must be running)
- `pnpm data:export`: To export the CMS data into JSON files in `./apps/cms/seed/*.JSON` (DB must be running)
- `pnpm boiler:update`: To pull the latest changes from the boilerplate
- `pnpm codegen`: To run the codegenerator (graphql-codegen for NextJS, CMS must be running)
- `pnpm cms`: To only start the CMS
- `pnpm web`: To only start the web app
- `pnpm db`: To only start the database

## How to deploy?

This project is fully dockerized. You can deploy it to any cloud provider that supports docker.

There are two main apps: `web` and `cms`. You can deploy them separately or together.

You can look at the `docker-compose.yml` file to see how the apps are deployed.

Run `docker-compose up -d` to start the apps.
