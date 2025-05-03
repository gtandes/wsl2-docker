import jwt from "jsonwebtoken";
import { defineEndpoint } from "@directus/extensions-sdk";
import { DBService } from "../../common/services";
import { createPlatformUser } from "../../services/platformUser";
import { UserRole } from "types";

const getDomainByEnv = (envName: string) => {
  switch (envName) {
    case "sandbox":
      return "@ats.hsh2.com";
    case "prod":
      return "@integrations.hs-hire.com";
    case "dev":
    case "local":
    case "stg":
      return "@hs-hire.com";
    default:
      throw new Error("Unknown environment");
  }
};
const signJwtToken = (user_id: string, env: any) => {
  try {
    if (!env.SECRET) {
      throw new Error("JWT Secret is missing in environment variables");
    }

    const payload = {
      id: user_id,
      role: UserRole.PlatformUser,
      app_access: false,
      admin_access: false,
      iss: "directus",
    };

    const jwt_token = jwt.sign(payload, env.SECRET!);

    return jwt_token;
  } catch (error: any) {
    throw error; // Re-throw to catch it in the main API
  }
};

export default defineEndpoint((router, { services, logger, env }) => {
  const { ItemsService } = services;

  router.get("/custom-tab/fetch", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      const { agency_id, ats_type } = req.query;

      if (!agency_id || !ats_type) {
        logger.warn("Missing required fields", { agency_id, ats_type });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const db = new DBService(ItemsService, req.schema, req.accountability);
      const iFrameDB = db.get("iframe_tokens");

      const existingRecords = await iFrameDB.readByQuery({
        filter: {
          agency_id: { _eq: agency_id },
          ats_type: { _eq: ats_type },
        },
      });

      return res.json(existingRecords);
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/custom-tab/token", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.HSHAdmin) {
        logger.warn("Unauthorized access attempt", { userRole: req.accountability.role });
        return res.status(403).json({ error: "Forbidden: Only HSH Admin can access." });
      }

      const { agency_id, iframe_token, ats_type } = req.body;

      if (!agency_id || !iframe_token || !ats_type) {
        logger.warn("Missing required fields", { agency_id, iframe_token, ats_type });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const iFrameDB = db.get("iframe_tokens");

      logger.info("Fetching existing iframe token record...");
      const existingRecord = await iFrameDB.readByQuery({
        filter: { agency_id, ats_type },
      });

      let user_id;

      if (existingRecord?.length > 0) {
        user_id = existingRecord[0].user_id;

        const jwt = signJwtToken(user_id, env);

        await iFrameDB.updateByQuery({ filter: { agency_id, ats_type } }, { token: iframe_token, jwt_token: jwt });
        logger.info("Updated Token:", { filter: { agency_id, ats_type } });
      } else {
        user_id = await createPlatformUser({
          database: db,
          env: getDomainByEnv(env.ENV_NAME),
          agency_id,
          ats_type,
        });

        const jwt = signJwtToken(user_id, env);

        await iFrameDB.createOne({
          agency_id,
          token: iframe_token,
          ats_type,
          user_id,
          jwt_token: jwt,
        });
        logger.info("New iframe token record created");
      }

      return res.status(200).json({ success: true, message: "Token updated successfully" });
    } catch (error: any) {
      logger.error("Error saving/updating token:", error.message);
      logger.error("Stack trace:", error.stack);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.post("/custom-tab/get-jwt", async (req: any, res: any) => {
    try {
      const { token } = req.body;
      if (!token) {
        logger.info("Token is missing in request body.");
        return res.status(400).json({ success: false, error: "Token is missing" });
      }

      if (!env.SECRET) {
        logger.error("SECRET key is not defined in environment variables!");
        return res.status(500).json({ success: false, error: "Server configuration error" });
      }

      const db = new DBService(ItemsService, req.schema, { admin: true });
      const iFrameDB = db.get("iframe_tokens");

      const existingRecords = await iFrameDB.readByQuery({ filter: { token } });
      const existingRecord = existingRecords?.[0] || null;

      if (!existingRecord || !existingRecord.jwt_token) {
        logger.info("No matching record found or JWT token is missing.");
        return res.status(404).json({ success: false, error: "JWT token not found" });
      }

      res.json({ success: true, jwt_token: existingRecord.jwt_token });
    } catch (error) {
      logger.error("Error processing JWT retrieval", { error });
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });
});
