module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-custom`
  extends: ["custom"],
  rules: {
    "no-console": 1,
  },
  settings: {
    next: {
      rootDir: ["apps/*/"],
    },
  },
};
