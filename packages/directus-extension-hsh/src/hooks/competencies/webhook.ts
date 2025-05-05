import { CompetencyState, CompetencyType } from "types";
import { DirectusServices } from "../../common/directus-services";
import { HookExtensionContext } from "@directus/types";
import { skillChecklistGeneralAverages } from "../skills-checklists/utils";
import { computeStatusSummary } from "../../endpoints/integration/utils";

export enum WebhookEventType {
  CERTIFICATE_GENERATED = "certificate.generated",
  COMPETENCY_COMPLETED = "competency.completed",
  ATTEMPT_COMPLETED = "attempt.completed",
}

export const WebhookEvents = {
  EXAM: {
    ASSIGNED: "exam.assigned",
    ATTEMPT: {
      COMPLETED: "exam.attempt.completed",
    },
    DUE_DATE: {
      EXPIRED: "exam.due_date.expired",
    },
  },
  MODULE: {
    ASSIGNED: "module.assigned",
    ATTEMPT: {
      COMPLETED: "module.attempt.completed",
    },
    DUE_DATE: {
      EXPIRED: "module.due_date.expired",
    },
  },
  POLICY: {
    ASSIGNED: "policy.assigned",
    READ: "policiy.read",
    SIGNED: "policiy.signed",
  },
  DOCUMENT: {
    ASSIGNED: "document.assigned",
    READ: "document.read",
  },
  SKILLS_CHECKLIST: {
    ASSIGNED: "skills_checklist.assigned",
    STARTED: "skills_checklist.started",
    COMPLETED: "skills_checklist.completed",
  },
} as const;

export enum WebhookEventStatus {
  IN_PROGRESS = "in_progress",
  DELIVERED = "delivered",
  RECEIVED = "received",
  RETRYING = "retrying",
  FAILED = "failed",
}

export enum WebhookEventMethod {
  INCOMING = "incoming",
  OUTGOING = "outgoing",
}

type NormalizedParams = {
  assignmentId: string;
  status: CompetencyState;
};

const normalizeBullhornParams = (
  params: Record<string, any>,
  logger: HookExtensionContext["logger"],
): NormalizedParams | null => {
  const assignmentId = params.key || params.keys?.[0];
  const status = params.payload?.status;

  if (!assignmentId || !status) {
    logger.error("Bullhorn Sync Hook: Missing 'assignmentId' or 'status'.");
    return null;
  }

  return {
    assignmentId: String(assignmentId),
    status,
  };
};

const sendPayload = async (url: string, payload: object): Promise<void> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200) {
    if (response.status === 404) throw new Error("404, Not found");
    if (response.status === 500) throw new Error("500, internal server error");

    throw new Error(`status ${response.status}`);
  }
};

const sendSyncRequestBullhornChecklist = async (summaryStatus: string, url: string) => {
  if (summaryStatus !== "In Progress" && summaryStatus !== "Completed") {
    return;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summaryStatus,
    }),
  });
  if (response.status !== 200) {
    if (response.status === 404) throw new Error("404, Not found");
    if (response.status === 500) throw new Error("500, internal server error");

    throw new Error(`status ${response.status}`);
  }
};

function generateFilename(firstName: string, lastName: string, examTitle: string, extension = "pdf"): string {
  return `${firstName}_${lastName}_${examTitle}.${extension}`;
}

export const bullhornCheckListSyncHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
) => {
  const { database, env, logger } = hookContext;

  const normalized = normalizeBullhornParams(params, logger);
  if (!normalized) return;

  const { assignmentId, status } = normalized;

  const allowedStatuses = new Set([
    CompetencyState.COMPLETED,
    CompetencyState.NOT_STARTED,
    CompetencyState.PENDING,
    CompetencyState.DUE_DATE_EXPIRED,
  ]);

  if (!allowedStatuses.has(status)) {
    logger.info(
      `Bullhorn Sync Hook: Skipping sync. Received status '${status}', but only [${[...allowedStatuses].join(
        ", ",
      )}] are allowed.`,
    );
    return;
  }

  try {
    logger.info(`Bullhorn Sync Hook: Processing assignmentId: ${assignmentId}`);

    const scAssignmentService = services.skillsChecklistsService;

    const currentAssignment = await scAssignmentService.readOne(assignmentId, {
      fields: ["agency.id", "directus_users_id.id", "directus_users_id.first_name", "directus_users_id.last_name"],
    });

    if (!currentAssignment?.agency?.id || !currentAssignment?.directus_users_id?.id) {
      logger.error(`Bullhorn Sync Hook: Assignment ${assignmentId} is missing agencyId or userId.`);
      return;
    }

    const agencyId = currentAssignment.agency.id;
    const userId = currentAssignment.directus_users_id.id;

    logger.info(`Bullhorn Sync Hook: Retrieved assignment for userId: ${userId}, agencyId: ${agencyId}`);

    const isEnableMappingChecklist = await database("bh_config")
      .select("is_enable_mapping_checklist")
      .where("agency_id", agencyId)
      .first();

    if (!isEnableMappingChecklist) {
      logger.error(`Bullhorn Sync Hook: No 'bh_config' entry found for agencyId: ${agencyId}`);
      return;
    }

    if (!isEnableMappingChecklist.is_enable_mapping_checklist) {
      logger.warn(`Bullhorn Sync Hook: Mapping checklist is DISABLED for agencyId: ${agencyId}`);
      return;
    }

    logger.info(`Bullhorn Sync Hook: Mapping checklist is ENABLED for agencyId: ${agencyId}`);

    const scDefinitions = await database("junction_sc_definitions_directus_users")
      .select("junction_sc_definitions_directus_users.status")
      .where("directus_users_id", userId)
      .whereIn("junction_sc_definitions_directus_users.status", Array.from(allowedStatuses));

    if (!scDefinitions.length) {
      logger.error(`Bullhorn Sync Hook: No skill checklist definitions found for userId: ${userId}`);
      return;
    }

    const statusSummary = computeStatusSummary(scDefinitions);

    const { bullhorn_id } =
      (await database("junction_directus_users_agencies")
        .select("bullhorn_id")
        .where({
          agencies_id: agencyId,
          directus_users_id: userId,
        })
        .first()) || {};

    if (!bullhorn_id) {
      logger.error(`Bullhorn Checklist Sync Hook: Missing bullhorn_id for userId: ${userId}`);
      return;
    }

    const url = `${env.WEB_URL}/cms/integration/bullhorn/skills-checklist-sync?agency_id=${agencyId}&bullhorn_id=${bullhorn_id}`;
    await sendSyncRequestBullhornChecklist(statusSummary, url);

    logger.info(`Bullhorn Sync Hook: Successfully sent sync request for agencyId: ${agencyId}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Bullhorn Sync Hook: Unexpected error occurred. Message: ${error.message}`, { stack: error.stack });
    } else {
      logger.error("Bullhorn Sync Hook: Unexpected error of unknown type", { error });
    }
  }
};
export const uploadFileToBhHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
  pdfPath: string | null,
  competencyType: "exam" | "module",
) => {
  const { database, env, logger } = hookContext;
  const assignmentId = params.keys?.[0];

  if (!assignmentId) {
    logger.error("Bullhorn Sync Hook: Missing 'keys' in params.");
    return;
  }

  const status = params.payload?.status;
  if (!status || status === CompetencyState.EXPIRED || status === "archived") return;

  try {
    const examsAssignmentsService = services.examAssignmentsService;
    const moduleAssignmentsService = services.modulesAssignmentsService;

    let assignment;

    if (competencyType === "exam") {
      assignment = await examsAssignmentsService.readOne(assignmentId, {
        fields: [
          "directus_users_id.id",
          "directus_users_id.first_name",
          "directus_users_id.last_name",
          "agency.id",
          "exams_id.title",
        ],
      });
    } else if (competencyType === "module") {
      assignment = await moduleAssignmentsService.readOne(assignmentId, {
        fields: [
          "directus_users_id.id",
          "directus_users_id.first_name",
          "directus_users_id.last_name",
          "agency.id",
          "modules_definition_id.title",
        ],
      });
    }

    const agencyId = assignment.agency?.id;
    const userId = assignment.directus_users_id?.id;

    if (!agencyId || !userId) {
      logger.error("Bullhorn Sync Hook: Missing agency ID or user ID.");
      return;
    }

    const { bh_enable } = (await database("agencies").select("bh_enable").where({ id: agencyId }).first()) || {};

    if (!bh_enable) {
      logger.info("Bullhorn is disabled for this agency. Skipping upload.");
      return;
    }

    const { bullhorn_id } =
      (await database("junction_directus_users_agencies")
        .select("bullhorn_id")
        .where({ agencies_id: agencyId, directus_users_id: userId })
        .first()) || {};

    if (!bullhorn_id) {
      logger.warn(`Bullhorn ID not found for user ${userId} in agency ${agencyId}`);
      return;
    }

    let title = "";
    if (competencyType === "exam") {
      title = assignment.exams_id?.title || "Certificate-Exam";
    } else if (competencyType === "module") {
      title = assignment.modules_definition_id?.title || "Certificate-Module";
    }

    const filename = generateFilename(
      assignment.directus_users_id.first_name,
      assignment.directus_users_id.last_name,
      title,
    );

    const fileType = "Other";
    const body = {
      candidate_id: { bullhorn_id },
      agency_id: agencyId,
      file_path: pdfPath,
      filename,
      fileType,
    };

    const response = await fetch(`${env.WEB_URL}/cms/integration/bullhorn/upload-from-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error("Bullhorn API returned an error", {
        status: response.status,
        body: errorData,
      });
    } else {
      logger.info("File uploaded successfully to Bullhorn.");
    }

    logger.info(`Bullhorn Upload File Hook: Processing for Candidate ID: ${bullhorn_id}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Bullhorn Upload File Hook: Unexpected error occurred. Message: ${error.message}`, {
        stack: error.stack,
      });
    } else {
      logger.error("Bullhorn Upload File Hook: Unexpected error of unknown type", { error });
    }
  }
};

export const examsHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
  logId: number,
) => {
  const assignmentId = params.keys[0];
  try {
    const status = params.payload.status;

    if (status && (status === CompetencyState.EXPIRED || status === "archived")) return;

    const isCompleted = status === CompetencyState.COMPLETED;
    const examsAssignmentsService = services.examAssignmentsService;
    const currentAssignment = await examsAssignmentsService.readOne(assignmentId, {
      fields: [
        "started_on",
        "expires_on",
        "score",
        "allowed_attempts",
        "attempts_used",
        "status",
        "allowed_attemps",
        "attempts_used",
        "directus_users_id.id",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "exams_id.id",
        "exams_id.title",
        "agency.id",
        "agency.webhook_enable",
        "agency.webhook_url",
        "exam_versions_id",
      ],
    });

    if (currentAssignment.agency.webhook_enable) {
      const {
        expires_on: assignmentExpiry,
        directus_users_id: { id: user_id, first_name: firstName, last_name: lastName },
        exams_id: { id: exam_id, title: competencyTitle },
        exam_versions_id: versionId,
        status: assignmentStatus,
        allowed_attempts,
        score,
        attempts_used,
        started_on,
      } = currentAssignment;

      const ceu = await hookContext.database("exam_versions").select("contact_hour").where("id", versionId);
      const timestamp = new Date().toISOString();
      const fullName = `${firstName} ${lastName}`;
      const certExpiry = new Date(assignmentExpiry).toISOString();

      const payload = {
        event: WebhookEventType.ATTEMPT_COMPLETED,
        content_type: CompetencyType.EXAM,
        timestamp,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        assignment: {
          competency_type: CompetencyType.EXAM,
          competency_id: exam_id,
          assignment_id: assignmentId,
          user_id,
          agency: currentAssignment.agency.id,
          title: competencyTitle,
          ceu: ceu[0].contact_hour,
          status: assignmentStatus.toLowerCase(),
          score,
          allowed_attempts,
          ...(isCompleted && {
            certificate: {
              certificate_url: `${
                hookContext.env.WEB_URL
              }/admin/reports/${user_id}/${CompetencyType.EXAM.toLowerCase()}/${assignmentId}/certificate/view`,
              download_url: `${
                hookContext.env.WEB_URL
              }/admin/reports/${user_id}/${CompetencyType.EXAM.toLowerCase()}/${assignmentId}/certificate/download`,
              expires_on: certExpiry,
            },
          }),
          attempt: {
            attempt_count: attempts_used,
            started_on,
            finished_on: new Date(),
            status: status === CompetencyState.COMPLETED ? "passed" : "failed",
            score: score,
          },
        },
      };

      await hookContext.database("webhooks_logs").where({ id: logId }).update({
        status: WebhookEventStatus.DELIVERED,
        payload,
        date_created: new Date(),
        event_type: WebhookEventType.ATTEMPT_COMPLETED,
        method: WebhookEventMethod.OUTGOING,
        agency: currentAssignment.agency.id,
        competency_type: CompetencyType.EXAM,
      });

      await sendPayload(currentAssignment.agency.webhook_url, payload);

      hookContext.logger.info(
        `[WEBHOOK] ${CompetencyType.EXAM} data with exam: ${exam_id}, agancy: ${currentAssignment.agency.id} and user: ${user_id}, sent`,
      );
    }
  } catch (e) {
    hookContext.logger.error(
      `[WEBHOOK] ${CompetencyType.EXAM} failed on send webhook data with assignment: ${assignmentId}, Error: ${e}`,
    );
  }
};

export const moduleHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
  logId: number,
) => {
  const assignmentId = params.keys[0];
  try {
    const status = params.payload.status;
    const isCompleted = status === CompetencyState.FINISHED;

    if (status) {
      const moduleAssignmentsService = services.modulesAssignmentsService;
      const currentAssignment = await moduleAssignmentsService.readOne(assignmentId, {
        fields: [
          "started_on",
          "expires_on",
          "score",
          "allowed_attempts",
          "attempts_used",
          "status",
          "allowed_attemps",
          "attempts_used",
          "directus_users_id.id",
          "directus_users_id.first_name",
          "directus_users_id.last_name",
          "modules_definition_id.id",
          "modules_definition_id.title",
          "agency.id",
          "agency.webhook_enable",
          "agency.webhook_url",
          "module_version",
        ],
      });

      if (currentAssignment.agency.webhook_enable) {
        const {
          module_version: versionId,
          expires_on: assignmentExpiry,
          directus_users_id: { id: user_id, first_name: firstName, last_name: lastName },
          modules_definition_id: { id: module_id, title: competencyTitle },
          status: assignmentStatus,
          score,
          allowed_attempts,
          attempts_used,
          started_on,
        } = currentAssignment;

        const ceu = await hookContext.database("modules_versions").select("contact_hour").where("id", versionId);
        const timestamp = new Date().toISOString();
        const certExpiry = new Date(assignmentExpiry).toISOString();
        const fullName = `${firstName} ${lastName}`;

        const payload = {
          event: WebhookEventType.ATTEMPT_COMPLETED,
          content_type: CompetencyType.MODULE,
          timestamp,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          assignment: {
            competency_type: CompetencyType.MODULE,
            competency_id: module_id,
            assignment_id: assignmentId,
            user_id,
            agency: currentAssignment.agency.id,
            title: competencyTitle,
            ceu: ceu[0].contact_hour,
            status: assignmentStatus.toLowerCase(),
            score,
            allowed_attempts,
            ...(isCompleted && {
              certificate: {
                certificate_url: `${
                  hookContext.env.WEB_URL
                }/admin/reports/${user_id}/${CompetencyType.MODULE.toLowerCase()}/${assignmentId}/certificate/view`,
                download_url: `${
                  hookContext.env.WEB_URL
                }/admin/reports/${user_id}/${CompetencyType.MODULE.toLowerCase()}/${assignmentId}/certificate/download`,
                expires_on: certExpiry,
              },
            }),
            attempt: {
              attempt_count: attempts_used,
              started_on,
              finished_on: new Date(),
              status: score >= 80 ? "passed" : "failed",
              score: score,
            },
          },
        };

        await hookContext.database("webhooks_logs").where({ id: logId }).update({
          status: WebhookEventStatus.DELIVERED,
          payload,
          date_created: new Date(),
          event_type: WebhookEventType.ATTEMPT_COMPLETED,
          method: WebhookEventMethod.OUTGOING,
          agency: currentAssignment.agency.id,
          competency_type: CompetencyType.MODULE,
        });

        await sendPayload(currentAssignment.agency.webhook_url, payload);
        hookContext.logger.info(
          `[WEBHOOK] ${CompetencyType.MODULE} data with id ${module_id}, agancy: ${currentAssignment.agency.id} and user: ${user_id}, sent`,
        );
      }
    }
  } catch (e) {
    hookContext.logger.error(
      `[WEBHOOK] ${CompetencyType.MODULE} failed on send webhook data with assignment: ${assignmentId}, Error: ${e}`,
    );
  }
};
export const skillChecklistsHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
) => {
  const assignmentId = params.keys[0];
  const { logger, database, env } = hookContext;

  try {
    if (params.payload.status !== CompetencyState.COMPLETED) return;

    const skillsChecklistsAssignmentsService = services.skillsChecklistsService;
    const currentAssignment = await skillsChecklistsAssignmentsService.readOne(assignmentId, {
      fields: [
        "directus_users_id.id",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "sc_definitions_id.id",
        "sc_definitions_id.title",
        "agency.id",
        "agency.webhook_enable",
        "agency.webhook_url",
        "questions",
        "status",
        "assigned_on",
        "finished_on",
        "expires_on",
      ],
    });

    const { agency, directus_users_id, sc_definitions_id, questions, status, assigned_on, finished_on, expires_on } =
      currentAssignment;
    if (!agency.webhook_enable) return;

    const { id: user_id, first_name, last_name } = directus_users_id;
    const { id: sc_id, title: competencyTitle } = sc_definitions_id;
    const timestamp = new Date().toISOString();
    const overalls = skillChecklistGeneralAverages(questions);

    const payload = {
      event: WebhookEventType.COMPETENCY_COMPLETED,
      competency_type: CompetencyType.SKILL_CHECKLIST,
      timestamp,
      id: sc_id,
      user_id,
      first_name,
      last_name,
      assignment: {
        status,
        assignment_id: assignmentId,
        competency_id: sc_id,
        agency: agency.id,
        title: competencyTitle,
        assigned_on,
        finished_on,
        expires_on,
        skills_assessment: questions,
        overall_avg: overalls.overallAvg?.toFixed(2) || "N/A",
        skill_avg: overalls.skillAverage?.toFixed(2) || "N/A",
        frequency_avg: overalls.frequencyAverage?.toFixed(2) || "N/A",
        admin_results_url: `${env.WEB_URL}/admin/dashboard/reports/${user_id}/skills-checklist/${assignmentId}/review?from_report=true`,
        clinician_results_url: `${env.WEB_URL}/clinician/skills-checklists/462/review`,
      },
    };

    await database("webhooks_logs").insert({
      user_id,
      status: WebhookEventStatus.DELIVERED,
      payload,
      date_created: new Date(),
      event_type: WebhookEventType.ATTEMPT_COMPLETED,
      method: WebhookEventMethod.OUTGOING,
      agency: agency.id,
      competency_type: CompetencyType.SKILL_CHECKLIST,
    });

    await sendPayload(agency.webhook_url, payload);
    logger.info(`
      [WEBHOOK] ${CompetencyType.SKILL_CHECKLIST} sent - 
      ID: ${sc_id}, Agency: ${agency.id}, User: ${user_id}
    `);
  } catch (error: any) {
    logger.error(
      `[WEBHOOK] ${CompetencyType.SKILL_CHECKLIST} failed - Assignment: ${assignmentId}, Error: ${error.message}`,
    );
  }
};

export const documentsHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
) => {
  const assignmentId = params.keys[0];
  const { logger, database } = hookContext;

  try {
    if (!params.payload.read) return;

    const documentsAssignmentsService = services.documentsAssignmentsService;
    const currentAssignment = await documentsAssignmentsService.readOne(assignmentId, {
      fields: [
        "documents_id.id",
        "documents_id.title",
        "documents_id.description",
        "directus_users_id.id",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "agency.id",
        "agency.webhook_enable",
        "agency.webhook_url",
        "status",
        "assigned_on",
      ],
    });

    const { agency, documents_id, directus_users_id, status, assigned_on } = currentAssignment;
    if (!agency.webhook_enable) return;

    const { id: document_id, title: competencyTitle, description } = documents_id;
    const { id: user_id, first_name, last_name } = directus_users_id;
    const { id: agencyId, webhook_url } = agency;
    const timestamp = new Date().toISOString();

    const payload = {
      content_type: CompetencyType.DOCUMENT,
      event: WebhookEventType.COMPETENCY_COMPLETED,
      timestamp,
      user_id,
      first_name,
      last_name,
      assignment: {
        assignment_id: assignmentId,
        competency_id: document_id,
        agency: agencyId,
        title: competencyTitle,
        description,
        read: true,
        read_date: params.payload.read,
        id: document_id,
        status,
        assigned_on,
      },
    };

    await database("webhooks_logs").insert({
      user_id,
      status: WebhookEventStatus.DELIVERED,
      payload,
      date_created: new Date(),
      event_type: WebhookEventType.ATTEMPT_COMPLETED,
      method: WebhookEventMethod.OUTGOING,
      agency: agencyId,
      competency_type: CompetencyType.DOCUMENT,
    });

    await sendPayload(webhook_url, payload);

    logger.info(`
      [WEBHOOK] ${CompetencyType.DOCUMENT} sent - 
      ID: ${document_id}, Agency: ${agencyId}, User: ${user_id}
    `);
  } catch (error: any) {
    logger.error(`[WEBHOOK] ${CompetencyType.DOCUMENT} failed - Assignment: ${assignmentId}, Error: ${error.message}`);
  }
};

export const policiesHook = async (
  params: Record<string, any>,
  services: DirectusServices,
  hookContext: HookExtensionContext,
) => {
  const assignmentId = params.keys[0];
  try {
    if (!params.payload.signed_on) return;

    const signed_on = params.payload.signed_on;

    const policiesAssignmentsService = services.policiesAssignmentsService;
    const currentAssignment = await policiesAssignmentsService.readOne(assignmentId, {
      fields: [
        "status",
        "policies_id.id",
        "directus_users_id.id",
        "agency.id",
        "agency.webhook_enable",
        "agency.webhook_url",
        "read",
        "assigned_on",
      ],
    });

    if (currentAssignment.agency.webhook_enable) {
      const { agency, directus_users_id, read, assigned_on } = currentAssignment;
      const { id: policy_id, title: competencyTitle } = currentAssignment.policies_id;

      const { id: user_id, first_name, last_name } = directus_users_id;
      const { id: agencyId, webhook_url } = agency;
      const timestamp = new Date().toISOString();

      const payload = {
        content_type: CompetencyType.POLICY,
        event: WebhookEventType.COMPETENCY_COMPLETED,
        timestamp,
        user_id,
        first_name,
        last_name,
        assignment: {
          assignment_id: assignmentId,
          competency_id: policy_id,
          agency: agencyId,
          title: competencyTitle,
          ...(read !== undefined && { read: true }),
          read_date: read,
          assigned_on,
          signed_on,
        },
      };

      await hookContext.database("webhooks_logs").insert({
        user_id,
        status: WebhookEventStatus.DELIVERED,
        payload,
        date_created: new Date(),
        event_type: WebhookEventType.ATTEMPT_COMPLETED,
        method: WebhookEventMethod.OUTGOING,
        agency: currentAssignment.agency.id,
        competency_type: CompetencyType.POLICY,
      });

      await sendPayload(webhook_url, payload);

      hookContext.logger.info(
        `[WEBHOOK] ${CompetencyType.POLICY} data with id ${policy_id}, agancy: ${currentAssignment.agency.id} and user: ${currentAssignment.directus_users_id.id}, sent`,
      );
    }
  } catch (e) {
    hookContext.logger.error(
      `[WEBHOOK] ${CompetencyType.POLICY} failed on send webhook data with assignment: ${assignmentId}, Error: ${e}`,
    );
  }
};
