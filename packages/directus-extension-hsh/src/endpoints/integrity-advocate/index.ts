import { defineEndpoint } from "@directus/extensions-sdk";

import { CompetencyState } from "types";
import crypto from "crypto";
import { willColumnChangeTo } from "../../common/revisions";

interface VerifyHmacSignatureOptions {
  appId: string;
  apiKey: string;
  method: string;
  uri: string;
  timestamp: string;
  nonce: string;
  receivedSignature: string;
}

export function verifyHmacSignature({
  appId,
  apiKey,
  method,
  uri,
  timestamp,
  nonce,
  receivedSignature,
}: VerifyHmacSignatureOptions): boolean {
  const requestURI = encodeURIComponent(uri.toLowerCase());
  const rawData = `${appId}${method}${requestURI}${timestamp}${nonce}`;
  const secretKey = Buffer.from(apiKey, "base64");
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(rawData);
  const expectedSignature = hmac.digest("base64");

  return expectedSignature === receivedSignature;
}

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

export default defineEndpoint((router, { database, logger, services, getSchema }) => {
  const { ItemsService } = services;

  router.post("/callback", async (req: any, res: any) => {
    const authHeader = req.headers["authorization"] || req.headers["redirect-http-authorization"];

    if (!authHeader || typeof authHeader !== "string") {
      logger.error("Authorization header missing or incorrect");
      return res.status(400).send("Authorization header missing or incorrect");
    }

    const authMatch = authHeader.match(/amx (\S+):(\S+):(\S+):(\S+)/);

    if (!authMatch) {
      logger.error("Invalid authorization format");
      return res.status(400).send("Invalid authorization format");
    }

    const [, appId, receivedSignature, nonce, timestamp] = authMatch;

    if (!appId || !receivedSignature || !nonce || !timestamp) {
      logger.error("Missing one or more HMAC components");
      return res.status(400).send("Incomplete authorization data");
    }

    const agency_id = req.query.agency_id as string | undefined;
    const assignment_id = req.query.assignment_id as string | undefined;

    if (!agency_id) {
      logger.error("Agency id missing");
      return res.status(400).send("Agency id missing");
    }

    if (!assignment_id) {
      logger.error("Assignment id missing");
      return res.status(400).send("Assignment id missing");
    }

    try {
      const cleanedAgencyId = agency_id.endsWith("=") ? agency_id.slice(0, -1) : agency_id;

      const agency = await database("agencies").select("ia_app_id", "ia_api_key").where("id", cleanedAgencyId).first();

      if (!agency) {
        logger.error(`Agency not found: ${cleanedAgencyId}`);
        return res.status(404).send("Agency not found");
      }
      const assignment = await database("junction_directus_users_exams")
        .select("status", "score_history", "attempts_used")
        .where("id", assignment_id)
        .first();

      if (!assignment) {
        logger.error(`Assignment not found: ${assignment_id}`);
        return res.status(404).send("Assignment not found");
      }

      const method = req.method.toUpperCase();
      const originalUrl = req.headers["x-original-url"];
      const requestUri = (originalUrl || `${req.protocol}://${req.get("host")}${req.originalUrl}`).toLowerCase();

      const isValidSignature = verifyHmacSignature({
        appId: agency.ia_app_id,
        apiKey: agency.ia_api_key,
        method,
        uri: requestUri,
        timestamp,
        nonce,
        receivedSignature,
      });
      if (!isValidSignature) {
        logger.error("Invalid HMAC signature");
        return res.status(401).send("Unauthorized");
      }

      const { status } = req.body;

      if (!status) {
        logger.error(`Status missing for exam ${assignment_id}`);
        return res.status(400).send("Status missing");
      }

      const normalizedStatus = status.toLowerCase().trim();
      const VALID_STATUS = "valid";
      const INVALID_STATUS = "invalid";

      if (!normalizedStatus.includes(VALID_STATUS) && !normalizedStatus.includes(INVALID_STATUS)) {
        logger.error(`Unexpected IA status for exam ${assignment_id} - "${status}"`);
        return res.status(400).send("Invalid status");
      }

      let updatedStatus;

      const isExplicitlyInvalid =
        normalizedStatus === INVALID_STATUS ||
        normalizedStatus.includes(` ${INVALID_STATUS} `) ||
        normalizedStatus.startsWith(`${INVALID_STATUS} `) ||
        normalizedStatus.endsWith(` ${INVALID_STATUS}`) ||
        normalizedStatus === INVALID_STATUS;

      const isExplicitlyValid =
        normalizedStatus === VALID_STATUS ||
        normalizedStatus.includes(` ${VALID_STATUS} `) ||
        normalizedStatus.startsWith(`${VALID_STATUS} `) ||
        normalizedStatus.endsWith(` ${VALID_STATUS}`) ||
        normalizedStatus === VALID_STATUS;

      if (isExplicitlyInvalid) {
        updatedStatus = CompetencyState.INVALID;
      } else if (isExplicitlyValid) {
        const scoreHistory: ScoreHistoryEntry[] = Array.isArray(assignment.score_history)
          ? assignment.score_history
          : JSON.parse(assignment.score_history || "[]");

        const latestAttempt: ScoreHistoryEntry | null = scoreHistory.reduce<ScoreHistoryEntry | null>(
          (latest, current) => (current.attempt > (latest?.attempt || 0) ? current : latest),
          null,
        );

        updatedStatus = latestAttempt?.assignment_status
          ? latestAttempt.assignment_status
          : assignment.attempts_used === 0
          ? CompetencyState.IN_PROGRESS
          : updatedStatus;
      } else {
        logger.error(`Unable to determine status for exam ${assignment_id} with "${status}"`);
        return res.status(400).send("Unable to determine status");
      }

      if (!updatedStatus) {
        logger.error(`No status update needed for exam ${assignment_id} : "${updatedStatus}"`);
        return res.status(200).send("No status update needed");
      }

      const examService = new ItemsService("junction_directus_users_exams", {
        database,
        schema: await getSchema(),
        accountability: { admin: true },
      });

      const revisionsService = new ItemsService("directus_revisions", {
        database,
        schema: await getSchema(),
        accountability: { admin: true },
      });

      const shouldUpdate = await willColumnChangeTo(
        revisionsService,
        "junction_directus_users_exams",
        assignment_id + "",
        "status",
        updatedStatus,
      );

      if (!shouldUpdate) {
        logger.info(`No status change for exam ${assignment_id}. Current status: ${updatedStatus}`);
        return res.status(200).send("No status change needed");
      }

      await examService.updateOne(assignment_id, { status: updatedStatus });
      logger.info(`Updated exam ${assignment_id} to status ${updatedStatus}`);
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
