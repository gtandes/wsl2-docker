# React Email

Develop email templates with React and Tailwind CSS.

Start a dev server with live reload to preview your email templates in the browser.

## Getting Started

Run the following commands to setup the dev server, it's a one time setup, and all the commands should be run from the root of the monorepo.

Install the monorepo dependencies:

```sh
pnpm install
```

Try starting the dev server (it should fail)

```sh
pnpm email
```

The error message will be something like:

```sh
 WARN   Local package.json exists, but node_modules missing, did you mean to install?
```

Install React Email dependencies and apply a patch:

```sh
pnpm email:patch
```

Now you can normally start the dev server:

```sh
pnpm email
```

Open [localhost:3001](http://localhost:3001) with your browser to see templates.
