import { defineEndpoint } from "@directus/extensions-sdk";

const LOG_PREFIX = "LOGS";

export default defineEndpoint((router: any, endpointContext: any) => {
  const { database, logger } = endpointContext;

  router.get("/", async (req: any, res: any) => {
    try {
      if (!req.accountability.user) {
        return res.sendStatus(403);
      }
      const { userId, assignmentId, type } = req.query;

      if (!assignmentId || !userId || !type) {
        return res.status(400).json({ error: "Missing required query parameters" });
      }

      try {
        const response = await database("user_logs")
          .select(
            "user_logs.created_on",
            "user_logs.description",
            database.raw("CONCAT(du_user.first_name, ' ', du_user.last_name) as user_full_name"),
            database.raw("CONCAT(du_initiator.first_name, ' ', du_initiator.last_name) as initiator_full_name"),
          )
          .join("directus_users as du_user", "du_user.id", "user_logs.directus_users_id")
          .join("directus_users as du_initiator", "du_initiator.id", "user_logs.initiator_id")
          .where({ assignment_id: assignmentId, directus_users_id: userId, competency_type: type })
          .orderBy("user_logs.created_on", "desc");

        res.status(200).json(response);
      } catch (error) {
        logger.error(`${LOG_PREFIX} : ${error}`);
        res.status(500).json({ error: "Internal server error" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).send({
        success: false,
        message: "Error creating user",
        error: errorMessage,
      });
    }
  });
});
