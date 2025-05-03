import { defineEndpoint } from "@directus/extensions-sdk";

import { CompetencyState } from "types";
import crypto from "crypto";

interface ActivitySetting {
  Activity_Id: string;
  Enabled: string;
}

const BASE_URL_ACTIVITY = "https://ca.integrityadvocateserver.com/api/2-0/activitysettings";

const generateNonce = (): string => {
  return crypto.randomBytes(8).toString("hex") + Date.now().toString(16);
};

const generateSignature = (method: string, appId: string, apiKey: string): string => {
  const requestTimeStamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const signatureRawData =
    appId + method + encodeURIComponent(BASE_URL_ACTIVITY).toLowerCase() + requestTimeStamp + nonce;

  const signatureBytes = crypto
    .createHmac("sha256", Buffer.from(apiKey, "base64"))
    .update(signatureRawData)
    .digest("base64");

  return `amx ${appId}:${signatureBytes}:${nonce}:${requestTimeStamp}`;
};

interface ScoreHistoryEntry {
  score: number;
  assignment_status: string;
  attempt: number;
  score_status?: string;
}

export default defineEndpoint((router, { database, logger }) => {
  router.post("/callback", async (req: any, res: any) => {
    const authHeader = req.headers["authorization"] || req.headers["redirect-http-authorization"];

    if (!authHeader) {
      logger.error("Authorization header missing or incorrect");
      return res.status(400).send("Authorization header missing or incorrect");
    }

    const authMatch = typeof authHeader === "string" ? authHeader.match(/amx (\S+):(\S+):(\S+):(\S+)/) : null;
    if (!authMatch) {
      logger.error("Invalid authorization format");
      return res.status(400).send("Invalid authorization format");
    }

    const agency_id = req.query.agency;
    const assignment_id = req.query.assignment;

    if (!agency_id) {
      return res.status(400).send("Agency id missing");
    }

    try {
      const [_, appId, receivedSignature, nonce, timestamp] = authMatch;
      let cleanedAgencyId = agency_id;
      if (cleanedAgencyId.endsWith("=")) {
        cleanedAgencyId = cleanedAgencyId.slice(0, -1);
      }

      const agency = await database("agencies").select("ia_app_id").where("id", cleanedAgencyId).first();

      if (!agency) {
        logger.error(`Agency not found: ${cleanedAgencyId}`);
        return res.status(404).send("Agency not found");
      }

      const assignment = await database("junction_directus_users_exams")
        .select("status", "score_history")
        .where("id", assignment_id)
        .first();

      if (!assignment) {
        logger.error(`Assignment not found: ${assignment_id}`);
        return res.status(404).send("Assignment not found");
      }

      const APP_ID = agency.ia_app_id;

      const method = "POST";
      const uri = req.protocol + "://" + req.get("host") + req.originalUrl;

      const signatureRawData = `${appId}${method}${uri}${timestamp}${nonce}`;

      const { status } = req.body;

      if (!status) {
        return res.status(400).send("Status missing");
      }

      const VALID_STATUS = "Valid";
      const INVALID_STATUS = "Invalid";

      if (
        !status.toLowerCase().includes(VALID_STATUS.toLowerCase()) &&
        !status.toLowerCase().includes(INVALID_STATUS.toLowerCase())
      ) {
        logger.error(`Integrity Advocate status is not valid or invalid - ${status}`);
        return;
      }

      const isValid =
        status.toLowerCase().startsWith(VALID_STATUS.toLowerCase()) ||
        status.toLowerCase().includes(` ${VALID_STATUS.toLowerCase()}`);

      let updatedStatus;

      if (!isValid) {
        updatedStatus = CompetencyState.INVALID;
      } else {
        const scoreHistory: ScoreHistoryEntry[] = Array.isArray(assignment.score_history)
          ? assignment.score_history
          : JSON.parse(assignment.score_history || "[]");

        const latestAttempt: ScoreHistoryEntry | null = scoreHistory.reduce<ScoreHistoryEntry | null>(
          (latest, current) => (current.attempt > (latest?.attempt || 0) ? current : latest),
          null,
        );

        updatedStatus = latestAttempt?.assignment_status;
      }

      await database("junction_directus_users_exams").where("id", assignment_id).update({
        status: updatedStatus,
      });

      logger.info(`Successfully updated assignment ${assignment_id} to status ${updatedStatus}`);
      res.status(200).send("Webhook received");
    } catch (e) {
      logger.error(e);
      return res.status(500).send("Internal server error");
    }
  });

  router.get("/activity-settings", async (req: any, res: any) => {
    try {
      if (!req.accountability.user) {
        return res.status(403).json({ message: "Access forbidden." });
      }

      const { agencyId } = req.query;

      let cleanedAgencyId = agencyId;
      if (cleanedAgencyId.endsWith("=")) {
        cleanedAgencyId = cleanedAgencyId.slice(0, -1);
      }

      if (!agencyId) {
        return res.status(400).json({ error: "agencyId is required" });
      }
      const agency = await database("agencies")
        .select("id", "ia_app_id", "ia_api_key")
        .where("id", cleanedAgencyId)
        .first();

      if (!agency) {
        return res.status(404).json({ error: "Agency not found" });
      }

      const { id, ia_app_id, ia_api_key } = agency;
      const authorizationHeader = generateSignature("GET", ia_app_id, ia_api_key);

      const response = await fetch(BASE_URL_ACTIVITY, {
        method: "GET",
        headers: {
          Authorization: authorizationHeader,
        },
      });

      if (!response.ok) {
        logger.error(`API request failed for agency ${id} with status: ${response.status}`);
        return res.status(response.status).json({ error: "Failed to fetch activity settings" });
      }

      const data: ActivitySetting[] = await response.json();
      const filteredData = data.map(({ Activity_Id, Enabled }) => ({ Activity_Id, Enabled }));

      return res.json({ agencyId: id, activitySettings: filteredData });
    } catch (error) {
      logger.error(`Error fetching activity settings - ${error}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
