import { defineHook } from "@directus/extensions-sdk";
import { generateEmailPayload } from "emails";
import { format } from "date-fns";
import { entityChangedWithPattern } from "../../../common/revisions";
import { getAgencyRecipients } from "../../../common/get-agency-recipients";
import { DirectusServices } from "../../../common/directus-services";
import { getUserInfo } from "../../../common/utils";
import { DirectusStatus } from "types";

export default defineHook(async ({ action }, hookContext) => {
  const collection = "junction_sc_definitions_directus_users";

  action(`${collection}.items.update`, async (params, eventContext) => {
    const assignmentId = params.keys[0];

    try {
      const services = DirectusServices.fromHook(hookContext, eventContext);

      const currentAssignment = await services.skillsChecklistsService.readOne(assignmentId, {
        fields: [
          "*",
          "directus_users_id.first_name",
          "directus_users_id.last_name",
          "directus_users_id.email",
          "directus_users_id.status",
          "directus_users_id.agencies.supervisors.directus_users_id.email",
          "directus_users_id.agencies.supervisors.directus_users_id.agencies.agencies_id",
          "directus_users_id.agencies.supervisors.directus_users_id.role.id",
          "sc_definitions_id.title",
          "agency.id",
          "agency.name",
          "agency.logo.id",
          "agency.notifications_settings",
        ],
      });

      if (!currentAssignment) return;
      if (currentAssignment.directus_users_id.status !== DirectusStatus.ACTIVE) return;

      const recipients = await getAgencyRecipients({
        usersService: services.usersService,
        assignment: currentAssignment,
        settingKey: "sc_submitted",
      });

      if (recipients.length === 0 || !currentAssignment.agency?.notifications_settings?.user_manager.sc_submitted)
        return;

      const hasChanged = await entityChangedWithPattern(services.revisionsService, collection, assignmentId, {
        status: (v) => v === "COMPLETED",
      });

      if (!hasChanged) return;

      const clinicianName = `${currentAssignment.directus_users_id.first_name} ${currentAssignment.directus_users_id.last_name}`;

      const emails = recipients.map((recipient) =>
        generateEmailPayload(
          "skill-checklist-completion",
          recipient,
          `Healthcare Staffing Hire: Congratulations! Successful Skills Checklist Completion for ${clinicianName}`,
          {
            props: {
              previewText: `Healthcare Staffing Hire: Congratulations! Successful Skills Checklist Completion for ${clinicianName}`,
              user: currentAssignment.directus_users_id,
              agency: {
                name: currentAssignment.agency.name,
                logo: currentAssignment.agency.logo?.id || null,
              },
              skill_checklist: {
                title: currentAssignment.sc_definitions_id.title,
                completion_date: format(new Date(), "dd MMMM, YYY"),
                result_url: `${hookContext.env.WEB_URL}/admin/dashboard/reports/${currentAssignment.directus_users_id.id}/skills-checklist/${assignmentId}/review?from_report=true`,
              },
            },
          },
        ),
      );

      await Promise.allSettled(emails.map((e: any) => services.mailService.send(e)));

      hookContext.logger.info(
        `Skills Checklist Completion notification for users [${recipients.join(
          ", ",
        )}] and Skill Checklist "${assignmentId}" sent`,
      );
    } catch (e) {
      hookContext.logger.error(
        `Error with sc assignment update hook. Assignment ID: ${assignmentId}, userInfo: ${JSON.stringify(
          getUserInfo(eventContext),
        )}`,
      );
      hookContext.logger.error(e);
    }
  });
});
