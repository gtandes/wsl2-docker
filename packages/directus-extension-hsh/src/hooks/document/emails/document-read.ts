import { defineHook } from "@directus/extensions-sdk";
import { generateEmailPayload } from "emails";
import { DirectusServices } from "../../../common/directus-services";
import { entityChangedWithPattern } from "../../../common/revisions";
import { getAgencyRecipients } from "../../../common/get-agency-recipients";
import { getUserInfo } from "../../../common/utils";
import { DirectusStatus } from "types";

export default defineHook(async ({ action }, hookContext) => {
  const collection = "junction_directus_users_documents";

  action(`${collection}.items.update`, async (params, actionCtx) => {
    const assignmentId = params.keys[0];

    try {
      const services = DirectusServices.fromHook(hookContext, actionCtx);

      const mailService = services.mailService;
      const revisionsService = services.revisionsService;
      const documentsAssignmentsService = services.documentsAssignmentsService;
      const usersService = services.usersService;

      const currentAssignment = await documentsAssignmentsService.readOne(assignmentId, {
        fields: [
          "*",
          "directus_users_id.first_name",
          "directus_users_id.last_name",
          "directus_users_id.email",
          "directus_users_id.status",
          "directus_users_id.agencies.supervisors.directus_users_id.email",
          "directus_users_id.agencies.supervisors.directus_users_id.agencies.agencies_id",
          "directus_users_id.agencies.supervisors.directus_users_id.role.id",
          "documents_id.*",
          "agency.*.*",
        ],
      });

      if (!currentAssignment) return;
      if (currentAssignment.directus_users_id.status !== DirectusStatus.ACTIVE) return;

      const recipients = await getAgencyRecipients({
        usersService,
        assignment: currentAssignment,
        settingKey: "document_read",
      });

      if (recipients.length === 0 || !currentAssignment.agency?.notifications_settings?.user_manager.document_read) {
        return;
      }

      const hasChanged = await entityChangedWithPattern(revisionsService, collection, assignmentId, {
        read: (v) => v !== null,
      });

      if (!hasChanged) return;

      const emails = recipients.map((recipient) =>
        generateEmailPayload(
          "document-read",
          recipient,
          `Healthcare Staffing Hire: Congratulations! Document Read by ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
          {
            props: {
              previewText: `Healthcare Staffing Hire: Congratulations! Document Read by ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
              user: currentAssignment.directus_users_id,
              agency: {
                name: currentAssignment.agency.name,
                logo: currentAssignment.agency.logo?.id || null,
              },
              document: {
                title: currentAssignment.documents_id.title,
              },
            },
          },
        ),
      );

      await Promise.allSettled(emails.map((e: any) => mailService.send(e)));

      hookContext.logger.info(
        `Document Read notification for users [${recipients.join(", ")}] and document "${assignmentId}" sent`,
      );
    } catch (e) {
      hookContext.logger.error(
        `Error with document assignment update hook. Assignment ID: ${assignmentId}, userInfo: ${JSON.stringify(
          getUserInfo(actionCtx),
        )}`,
      );
      hookContext.logger.error(e);
    }
  });
});
