import { defineEndpoint } from "@directus/extensions-sdk";
import { WebhookEventMethod, WebhookEventStatus } from "../../hooks/competencies/webhook.js";
import fs from "fs";
import path from "path";

const LOG_PREFIX = "WEBHOOKS";

export default defineEndpoint((router, { database }) => {
  router.get("/logs", async (req: any, res: any) => {
    try {
      const logs = await database("webhooks_logs").select("*").orderBy("date_created", "desc").limit(50);
      return res.status(200).json(logs);
    } catch (error) {
      console.error(`${LOG_PREFIX} : Error during pulling logs :`, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/receiver", async (req: any, res: any) => {
    try {
      const filePath = path.join(__dirname, "webhook-payload.txt");
      const payloadString = JSON.stringify(req.body, null, 2);

      try {
        fs.writeFileSync(filePath, payloadString, "utf-8");
        console.log("Webhook received and saved to file.");
      } catch (fileError) {
        console.error("Failed to write webhook payload to file:", fileError);
      }

      const { data = {} } = req.body;

      await database("webhooks_logs").insert({
        status: WebhookEventStatus.RECEIVED,
        payload: payloadString,
        competency_type: data.competency_type || null,
        event_type: req.body.event || null,
        agency: data.agency || null,
        user_id: data.user_id || null,
        date_created: new Date(),
        method: WebhookEventMethod.INCOMING,
      });

      return res.status(200).json({ message: "Request received and saved" });
    } catch (error) {
      console.error("Error handling webhook:", error);
      return res.status(500).json({ error: "An internal error occurred" });
    }
  });
});
