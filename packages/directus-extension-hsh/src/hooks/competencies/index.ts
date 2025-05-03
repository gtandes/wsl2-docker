import { defineHook } from "@directus/extensions-sdk";
import { handleCompetencyDueDate } from "./schedules";
import { DBService } from "../../common/services";
import { DirectusServices } from "../../common/directus-services";
import {
  WebhookEventStatus,
  WebhookEvents,
  bullhornCheckListSyncHook,
  documentsHook,
  examsHook,
  moduleHook,
  policiesHook,
  skillChecklistsHook,
  uploadFileToBhHook,
} from "./webhook";
import S3Service from "../../services/UploadToS3Service.js";
import { CompetencyState } from "types";

const LogPrefix = "STATUS_COMPETENCIES_CRON";

export default defineHook(({ action, schedule }, hookContext) => {
  const { ItemsService } = hookContext.services;
  let isRunning = false;

  const createWebhookLog = async (database: any, assignmentId: string, eventType: string): Promise<number | null> => {
    try {
      const [logEntry] = await database("webhooks_logs").insert(
        {
          assignment_id: assignmentId,
          status: WebhookEventStatus.IN_PROGRESS,
          event_type: eventType,
          date_created: new Date(),
        },
        ["id"],
      );
      return logEntry?.id ?? null;
    } catch (error) {
      console.error("Error creating webhook log:", error);
      return null;
    }
  };

  action("junction_directus_users_exams.items.update", async (params, actionCtx) => {
    if (
      [
        CompetencyState.COMPLETED,
        CompetencyState.FAILED,
        CompetencyState.FAILED_TIMED_OUT,
        CompetencyState.IN_PROGRESS,
      ].includes(params.payload.status)
    ) {
      const services = DirectusServices.fromHook(hookContext, actionCtx);
      const logId = await createWebhookLog(hookContext.database, params.keys[0], WebhookEvents.EXAM.ATTEMPT.COMPLETED);

      if (params.payload.status === CompetencyState.COMPLETED) {
        try {
          const result = await S3Service.generateCertificatePdf(hookContext.database, "exam", params.keys[0]);
          if (result && result.pdfPath) {
            await uploadFileToBhHook(params, services, hookContext, result.pdfPath, "exam");

            await S3Service.cleanupCertificateFiles(result.pdfPath);
          } else {
            console.error("Failed to generate or retrieve PDF path.");
          }
        } catch (error) {
          console.error("Error during certificate generation or file upload:", error);
        }
      }

      if (logId) {
        examsHook(params, services, hookContext, logId);
      }
    }
  });

  action("junction_modules_definition_directus_users.items.update", async (params, actionCtx) => {
    if (
      [
        CompetencyState.FINISHED,
        CompetencyState.FAILED,
        CompetencyState.FAILED_TIMED_OUT,
        CompetencyState.IN_PROGRESS,
      ].includes(params.payload.status)
    ) {
      const services = DirectusServices.fromHook(hookContext, actionCtx);
      const logId = await createWebhookLog(
        hookContext.database,
        params.keys[0],
        WebhookEvents.MODULE.ATTEMPT.COMPLETED,
      );

      try {
        if (params.payload.status === CompetencyState.FINISHED) {
          const result = await S3Service.generateCertificatePdf(hookContext.database, "module", params.keys[0]);
          if (result && result.pdfPath) {
            await uploadFileToBhHook(params, services, hookContext, result.pdfPath, "module");

            await S3Service.cleanupCertificateFiles(result.pdfPath);
          } else {
            console.error("Failed to generate or retrieve PDF path.");
          }
        }
      } catch (error) {
        console.error("Error during certificate generation or file upload:", error);
      }
      if (logId) {
        moduleHook(params, services, hookContext, logId);
      }
    }
  });

  action("junction_sc_definitions_directus_users.items.update", async (params, actionCtx) => {
    const services = DirectusServices.fromHook(hookContext, actionCtx);
    skillChecklistsHook(params, services, hookContext);
    bullhornCheckListSyncHook(params, services, hookContext);
  });

  action("junction_sc_definitions_directus_users.items.create", async (params, actionCtx) => {
    const services = DirectusServices.fromHook(hookContext, actionCtx);

    bullhornCheckListSyncHook(params, services, hookContext);
  });

  action("junction_directus_users_documents.items.update", async (params, actionCtx) => {
    const services = DirectusServices.fromHook(hookContext, actionCtx);
    documentsHook(params, services, hookContext);
  });

  action("junction_directus_users_policies.items.update", async (params, actionCtx) => {
    const services = DirectusServices.fromHook(hookContext, actionCtx);
    policiesHook(params, services, hookContext);
  });

  schedule("*/10 2-4 * * *", async () => {
    try {
      if (isRunning) {
        hookContext.logger.info(`${LogPrefix}: Already running`);
        return;
      }
      isRunning = true;
      hookContext.logger.info(`${LogPrefix}: Running`);
      const schema = await hookContext.getSchema();
      const db = new DBService(ItemsService, schema, { admin: true });
      handleCompetencyDueDate(db, hookContext.logger);
    } catch (e) {
      hookContext.logger.error(`${LogPrefix}: ${e}`);
    } finally {
      isRunning = false;
    }
  });
});
