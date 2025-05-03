import { defineHook } from "@directus/extensions-sdk";
import crypto from "crypto";
import { CompetencyState } from "types";
import { columnChanged } from "../../common/revisions";

const LogPrefix = "INTEGRITY-ADVOCATE-CRON";
const BASE_URL = "https://ca.integrityadvocateserver.com/api/2-0/participant";

interface ScoreHistoryEntry {
  score: number;
  assignment_status: string;
  attempt: number;
  score_status?: string;
}

interface ExamRecord {
  id: number;
  agency: string;
  directus_users_id: string;
  status: string;
  ia_app_id: string;
  ia_api_key: string;
  exams_id: string;
  modality: string;
  attempts_used: number;
  score_history: Array<ScoreHistoryEntry>;
}

interface Session {
  End: string;
  Start: string;
  Id: string;
  Status: string;
  Override_Date: string | null;
  Override_Status?: string | null;
  Flags?: Flag[];
}

interface Flag {
  CaptureData: string;
  CaptureDate: string;
  Comment: string;
  Created: string;
  Id: string;
  FlagType_Id: number;
  FlagType_Name: string;
}

interface ParticipantStatusResponse {
  Created: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Modified: string;
  Status: string;
  Sessions: Session[];
}

type ParticipantPayload = {
  Sessions: Session[];
};

function getLatestSessionStatus(payload: ParticipantPayload): string | null {
  if (!payload.Sessions || payload.Sessions.length === 0) return null;

  const latestSession = payload.Sessions.reduce((latest, session) => {
    return Number(session.End) > Number(latest.End) ? session : latest;
  });

  if (latestSession.Override_Date) {
    return latestSession.Override_Status ?? null;
  }

  return latestSession.Status ?? null;
}

export default defineHook(async ({ schedule }, context) => {
  let isJobRunning = false;
  const pageSize = 50;
  const { database, logger, getSchema, services } = context;

  const { ItemsService } = services;

  const revisionsService = new ItemsService("directus_revisions", {
    database,
    schema: await getSchema(),
    accountability: { admin: true },
  });

  /**
   * Generates a cryptographic nonce for HMAC authentication.
   */
  const generateNonce = (): string => {
    return crypto.randomBytes(8).toString("hex") + Date.now().toString(16);
  };

  /**
   * Generates an HMAC signature for the Integrity Advocate API.
   */
  const generateSignature = (method: string, appId: string, apiKey: string): string => {
    const requestTimeStamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();
    const signatureRawData = appId + method + encodeURIComponent(BASE_URL).toLowerCase() + requestTimeStamp + nonce;

    const signatureBytes = crypto
      .createHmac("sha256", Buffer.from(apiKey, "base64"))
      .update(signatureRawData)
      .digest("base64");

    return `amx ${appId}:${signatureBytes}:${nonce}:${requestTimeStamp}`;
  };

  /**
   * Fetches the exam status from Integrity Advocate API.
   */
  const fetchParticipantStatus = async (
    courseId: string,
    activityId: string,
    participantIdentifier: string,
    appId: string,
    apiKey: string,
  ): Promise<string> => {
    const requestUrl = `${BASE_URL}?courseid=${encodeURIComponent(courseId)}&activityid=${encodeURIComponent(
      activityId,
    )}&participantidentifier=${encodeURIComponent(participantIdentifier)}`;

    const authorizationHeader = generateSignature("GET", appId, apiKey);

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: authorizationHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data: ParticipantStatusResponse = await response.json();

    const sessionBasedStatus = getLatestSessionStatus({ Sessions: data.Sessions ?? [] });

    if (sessionBasedStatus) return sessionBasedStatus;

    if (data.Status) return data.Status;

    throw new Error("Unable to determine participant status.");
  };

  schedule("*/15 * * * *", async () => {
    if (isJobRunning) {
      logger.info(`${LogPrefix}: Job already in progress. Skipping execution.`);
      return;
    }
    logger.info(`${LogPrefix}: Running cron job`);

    try {
      const featureEnabled = await database("feature_flags")
        .select("enabled")
        .where("flag_key", "enabled_integrity_advocate");

      if (!featureEnabled.length || !featureEnabled[0].enabled) {
        logger.info(`${LogPrefix}: Integrity Advocate feature is disabled. Skipping execution.`);
        return;
      }
    } catch (error) {
      logger.error(`${LogPrefix}: Error checking feature flag - ${error}`);
      return;
    }

    isJobRunning = true;

    const schema = await getSchema();
    const dbSettings = {
      database,
      schema,
      accountability: { admin: true },
    };

    const examService = new ItemsService("junction_directus_users_exams", dbSettings);

    try {
      const latestExamsQuery = database("junction_directus_users_exams")
        .select(
          "junction_directus_users_exams.directus_users_id",
          "junction_directus_users_exams.exams_id",
          database.raw("MAX(junction_directus_users_exams.id) AS latest_id"),
        )
        .groupBy("junction_directus_users_exams.directus_users_id", "junction_directus_users_exams.exams_id")
        .as("latest");

      let page = 1;

      while (true) {
        const offset = (page - 1) * pageSize;

        const exams: ExamRecord[] = await database("junction_directus_users_exams")
          .select(
            "junction_directus_users_exams.id",
            "junction_directus_users_exams.agency",
            "junction_directus_users_exams.directus_users_id",
            "junction_directus_users_exams.status",
            "junction_directus_users_exams.score_history",
            "junction_directus_users_exams.exams_id",
            "junction_directus_users_exams.attempts_used",
            "agencies.ia_app_id",
            "agencies.ia_api_key",
            "exams.modality",
          )
          .where("exam_versions.is_proctoring", true)
          .join(latestExamsQuery, function () {
            this.on("junction_directus_users_exams.directus_users_id", "=", "latest.directus_users_id")
              .andOn("junction_directus_users_exams.exams_id", "=", "latest.exams_id")
              .andOn("junction_directus_users_exams.id", "=", "latest.latest_id");
          })
          .leftJoin("directus_users", "junction_directus_users_exams.directus_users_id", "directus_users.id")
          .leftJoin("agencies", "junction_directus_users_exams.agency", "agencies.id")
          .leftJoin("exams", "junction_directus_users_exams.exams_id", "exams.id")
          .leftJoin("exam_versions", "junction_directus_users_exams.exam_versions_id", "exam_versions.id")
          .limit(pageSize)
          .offset(offset);

        if (exams.length === 0) {
          logger.info(`${LogPrefix}: No more exams to process. Stopping pagination.`);
          break;
        }

        for (const exam of exams) {
          const { id, directus_users_id, exams_id, modality, ia_app_id, ia_api_key, score_history } = exam;

          try {
            const iaStatus = await fetchParticipantStatus(modality, exams_id, directus_users_id, ia_app_id, ia_api_key);
            const normalizedStatus = iaStatus.toLowerCase().trim();
            const VALID_STATUS = "valid";
            const INVALID_STATUS = "invalid";

            if (!normalizedStatus.includes(VALID_STATUS) && !normalizedStatus.includes(INVALID_STATUS)) {
              logger.error(`${LogPrefix}: Unexpected IA status for exam ${id} - "${iaStatus}"`);
              continue;
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
              const scoreHistory: ScoreHistoryEntry[] = Array.isArray(score_history)
                ? score_history
                : JSON.parse(score_history || "[]");

              const latestAttempt: ScoreHistoryEntry | null = scoreHistory.reduce<ScoreHistoryEntry | null>(
                (latest, current) => (current.attempt > (latest?.attempt || 0) ? current : latest),
                null,
              );

              updatedStatus = latestAttempt?.assignment_status
                ? latestAttempt.assignment_status
                : exam.attempts_used === 0
                ? CompetencyState.IN_PROGRESS
                : updatedStatus;
            } else {
              logger.error(`${LogPrefix}: Unable to determine status for exam ${id} with "${iaStatus}"`);
              continue;
            }

            if (!updatedStatus) {
              logger.error(`${LogPrefix}: No status update needed for exam ${id}`);
              continue;
            }

            const changed = await columnChanged(revisionsService, "junction_directus_users_exams", id + "", "status");

            if (!changed) {
              logger.info(`${LogPrefix}: No status change for exam ${id}. Current status: ${updatedStatus}`);
              continue;
            }

            await examService.updateOne(id, { status: updatedStatus });
            logger.info(`${LogPrefix}: Updated exam ${id} to status ${updatedStatus}`);
          } catch (error) {
            logger.error(`${LogPrefix}: Error processing IA status for exam ${id} - ${error}`);
            continue;
          }
        }

        page++;
      }
    } catch (error) {
      logger.error(`${LogPrefix}: Error processing cron job - ${error}`);
    } finally {
      logger.info(`${LogPrefix}: Completed cron job`);
      isJobRunning = false;
    }
  });
});
