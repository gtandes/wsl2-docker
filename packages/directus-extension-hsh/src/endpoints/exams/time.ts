import { defineEndpoint } from "@directus/extensions-sdk";

export default defineEndpoint((router) => {
  router.get("/server-time", async (req: any, res: any) => {
    res.status(200).json({ timestamp: new Date().toISOString(), epoch: Date.now() });
  });
});
