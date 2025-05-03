import { defineHook } from "@directus/extensions-sdk";
import { generateEmailPayload } from "emails";
import { entityChangedWithPattern } from "../../../common/revisions";
import { getAgencyRecipients } from "../../../common/get-agency-recipients";
import { DirectusServices } from "../../../common/directus-services";
import { getUserInfo } from "../../../common/utils";
import { DirectusStatus } from "types";

export default defineHook(async ({ action }, hookContext) => {
  const collection = "junction_directus_users_policies";

  action(`${collection}.items.update`, async (params, eventContext) => {
    const assignmentId = params.keys[0];

    try {
      const services = DirectusServices.fromHook(hookContext, eventContext);

      const currentAssignment = await services.policiesAssignmentsService.readOne(assignmentId, {
        fields: [
          "*",
          "policies_id.name",
          "directus_users_id.first_name",
          "directus_users_id.last_name",
          "directus_users_id.email",
          "directus_users_id.status",
          "directus_users_id.agencies.supervisors.directus_users_id.email",
          "directus_users_id.agencies.supervisors.directus_users_id.agencies.agencies_id",
          "directus_users_id.agencies.supervisors.directus_users_id.role.id",
          "agency.logo.id",
          "agency.name",
          "agency.id",
          "agency.notifications_settings",
        ],
      });

      if (!currentAssignment) return;
      if (currentAssignment.directus_users_id.status !== DirectusStatus.ACTIVE) return;

      const recipients = await getAgencyRecipients({
        usersService: services.usersService,
        assignment: currentAssignment,
        settingKey: "policy_signed",
      });

      if (recipients.length === 0 || !currentAssignment.agency?.notifications_settings?.user_manager.policy_signed)
        return;

      const hasChanged = await entityChangedWithPattern(services.revisionsService, collection, assignmentId, {
        signed_on: (v) => v !== null,
      });

      if (!hasChanged) return;

      const emails = recipients.map((recipient) =>
        generateEmailPayload(
          "policy-signed",
          recipient,
          `Healthcare Staffing Hire: Congratulations! Policy Signed by ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
          {
            props: {
              previewText: `Healthcare Staffing Hire: Congratulations! Policy Signed by ${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`,
              user: currentAssignment.directus_users_id,
              agency: {
                name: currentAssignment.agency.name,
                logo: currentAssignment.agency.logo?.id || null,
              },
              policy: {
                title: currentAssignment.policies_id.name,
                signature_link: `${hookContext.env.WEB_URL}/admin/policies/${assignmentId}/signature`,
              },
            },
          },
        ),
      );

      await Promise.allSettled(emails.map((e: any) => services.mailService.send(e)));

      hookContext.logger.info(
        `Policy Sign notification for users [${recipients.join(", ")}] and policy "${assignmentId}" sent`,
      );
    } catch (e) {
      hookContext.logger.error(
        `Error with policy assignment update hook. Assignment ID: ${assignmentId}, userInfo: ${JSON.stringify(
          getUserInfo(eventContext),
        )}`,
      );
      hookContext.logger.error(e);
    }
  });
});
