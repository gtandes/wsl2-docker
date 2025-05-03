import { EventContext, HookExtensionContext } from "@directus/types";
import { DirectusServices } from "../../../common/directus-services";
import { entityChangedWithPattern } from "../../../common/revisions";
import { CompetencyState, DirectusStatus } from "types";
import { getAgencyRecipients } from "../../../common/get-agency-recipients";
import { generateEmailPayload } from "emails";
import { format } from "date-fns";
import { getUserInfo } from "../../../common/utils";

const collection = "junction_modules_definition_directus_users";
const assignmentFields = [
  "*",
  "directus_users_id.first_name",
  "directus_users_id.last_name",
  "directus_users_id.email",
  "directus_users_id.status",
  "directus_users_id.agencies.supervisors.directus_users_id.email",
  "directus_users_id.agencies.supervisors.directus_users_id.agencies.agencies_id",
  "directus_users_id.agencies.supervisors.directus_users_id.role.id",
  "modules_definition_id.last_version.allowed_attempts",
  "modules_definition_id.*",
  "agency.*.*",
];

async function send(
  services: DirectusServices,
  params: Record<string, any>,
  hookContext: HookExtensionContext,
  eventContext: EventContext,
) {
  const assignmentId = params.keys[0];

  try {
    const currentAssignment = await services.modulesAssignmentsService.readOne(assignmentId, {
      fields: assignmentFields,
    });

    if (!currentAssignment) return;
    if (currentAssignment.directus_users_id.status !== DirectusStatus.ACTIVE) return;

    const FAILED = await entityChangedWithPattern(services.revisionsService, collection, assignmentId, {
      status: (v) => v === CompetencyState.FINISHED,
      approved: (v) => v === false,
    });

    if (FAILED) {
      await handleFailedModule(currentAssignment, services, hookContext);
    }

    const COMPLETED = await entityChangedWithPattern(services.revisionsService, collection, assignmentId, {
      status: (v) => v === CompetencyState.FINISHED,
      approved: (v) => v === true,
    });

    if (COMPLETED) {
      await handleCompletedModule(currentAssignment, services, hookContext);
    }
  } catch (error) {
    hookContext.logger.error(
      `Error sending module result email. Assignment ID: ${assignmentId}, userInfo: ${JSON.stringify(
        getUserInfo(eventContext),
      )}`,
    );
    hookContext.logger.error(error);
  }
}

async function handleFailedModule(
  currentAssignment: any,
  services: DirectusServices,
  hookContext: HookExtensionContext,
) {
  if (currentAssignment.agency.notifications_settings?.clinician.success_failure) {
    const clinicianEmail = generateEmailPayload(
      "clinician-module-failed",
      currentAssignment.directus_users_id.email,
      "Update on Your Curriculum Module Attempt",
      {
        props: {
          previewText: "Update on Your Curriculum Module Attempt",
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          module: {
            name: currentAssignment.modules_definition_id.title,
            date: format(Date.now(), "dd MMMM, YYY"),
            score: currentAssignment.score,
            attempts_used: currentAssignment.attempts_used,
            allowed_attempts: currentAssignment.allowed_attempts,
          },
        },
      },
    );

    await services.mailService.send(clinicianEmail);

    hookContext.logger.info(
      `Module failed notification for clinician "${currentAssignment.directus_users_id.email}" and module "${currentAssignment.modules_definition_id.id}" sent`,
    );
  }

  const recipients = await getAgencyRecipients({
    usersService: services.usersService,
    assignment: currentAssignment,
    settingKey: "module_completion",
  });

  if (recipients.length) {
    const managerEmails = recipients.map((recipient) =>
      generateEmailPayload("module-failed", recipient, `Notification: Clinician's Failed Module Attempt`, {
        props: {
          previewText: `Notification: Clinician's Failed Module Attempt`,
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          module: {
            name: currentAssignment.modules_definition_id.title,
            date: format(Date.now(), "dd MMMM, YYY"),
            score: currentAssignment.score,
            allowed_attempts: currentAssignment.allowed_attempts,
            attempts_used: currentAssignment.attempts_used,
          },
        },
      }),
    );

    await Promise.allSettled(managerEmails.map((e: any) => services.mailService.send(e)));

    hookContext.logger.info(
      `Module Completion notification for users [${recipients.join(", ")}] and module "${
        currentAssignment.modules_definition_id.id
      }" sent`,
    );
  }
}

async function handleCompletedModule(
  currentAssignment: any,
  services: DirectusServices,
  hookContext: HookExtensionContext,
) {
  if (currentAssignment.agency.notifications_settings?.clinician.success_failure) {
    const clinicianEmail = generateEmailPayload(
      "clinician-module-passed",
      currentAssignment.directus_users_id.email,
      "Congratulations on receiving your certificate!",
      {
        props: {
          previewText: "Congratulations on receiving your certificate!",
          user: currentAssignment.directus_users_id,
          agency: {
            name: currentAssignment.agency.name,
            logo: currentAssignment.agency.logo?.id || null,
          },
          module: {
            name: currentAssignment.modules_definition_id.title,
            cert_url: `${hookContext.env.WEB_URL}/clinician/modules/${currentAssignment.id}/certificate`,
          },
        },
      },
    );

    await services.mailService.send(clinicianEmail);

    hookContext.logger.info(
      `Module passed notification for clinician "${currentAssignment.directus_users_id.email}" and module "${currentAssignment.modules_definition_id.id}" sent`,
    );
  }

  const recipients = await getAgencyRecipients({
    usersService: services.usersService,
    assignment: currentAssignment,
    settingKey: "module_completion",
  });

  if (recipients.length) {
    const managerEmails = recipients.map((recipient) =>
      generateEmailPayload(
        "module-completion",
        recipient,
        `Healthcare Staffing Hire: Congratulations! Successful Module Completion for ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
        {
          props: {
            previewText: `Healthcare Staffing Hire: Congratulations! Successful Module Completion for ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
            user: currentAssignment.directus_users_id,
            agency: {
              name: currentAssignment.agency.name,
              logo: currentAssignment.agency.logo?.id || null,
            },
            module: {
              name: currentAssignment.modules_definition_id.title,
              passed_date: format(Date.now(), "dd MMMM, YYY"),
              score: currentAssignment.score,
              cert_url: `${hookContext.env.WEB_URL}/clinician/modules/${currentAssignment.id}/certificate`,
            },
          },
        },
      ),
    );

    await Promise.allSettled(managerEmails.map((e: any) => services.mailService.send(e)));

    hookContext.logger.info(
      `Module Completion notification for users [${recipients.join(", ")}] and module "${
        currentAssignment.modules_definition_id.id
      }" sent`,
    );
  }
}

export const modulesEmailsHandler = {
  send,
};
