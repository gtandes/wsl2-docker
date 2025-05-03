import { Directus } from "@directus/sdk";

export const directus = new Directus("/cms", {
  auth: {
    autoRefresh: true,
  },
  storage: {
    prefix: "ger_",
  },
});
