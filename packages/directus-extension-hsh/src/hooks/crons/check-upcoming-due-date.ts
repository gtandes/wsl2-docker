import { defineHook } from "@directus/extensions-sdk";
import { format } from "date-fns";
import { generateEmailPayload } from "emails";
import { Recipient } from "types";
import { ManagerDueDateReportsService } from "../../services/ManagerDueDateReportsService";
import { RoleId } from "../../common/manager-expiring-competencies-service";

export default defineHook(async ({ schedule }, ctx) => {
  let isRunning = false;
  const { database, logger, env, services, getSchema } = ctx;
  const { MailService } = services;
  const currentEnvironment = env.ENV_NAME || "";
  const cronSchedule = ["stg"].includes(currentEnvironment) ? "*/30 * * * *" : "0 22 * * 0";
  const schema = await getSchema();

  const mailService = new MailService({
    schema,
    database,
    accountability: { admin: true },
  });

  const managerDueDateService = new ManagerDueDateReportsService(database);

  const sendEmailToRecipient = async (recipient: Recipient, agencyId: string): Promise<void> => {
    const { email, first_name, last_name, agency_name, agency_logo, directus_users_id, user_role } = recipient;
    const emailPayload = generateEmailPayload(
      "upcoming-due-date",
      email,
      "Weekly Reminder: Clinicians Nearing Competencies Due Date!",
      {
        props: {
          previewText: "Weekly Reminder: Clinicians Nearing Competencies Due Date!",
          agency: {
            name: agency_name,
            logo: agency_logo ?? "",
          },
          user: {
            first_name: first_name,
            last_name: last_name,
          },
          report_link: `${env.WEB_URL}/admin/dashboard/compliance`,
        },
      },
    );
    const dueDateCompetencies = await managerDueDateService.getExpiryCompetencies(
      directus_users_id,
      agencyId,
      user_role as RoleId,
    );
    if (!dueDateCompetencies?.length) {
      logger.info(` No due date competencies found for agency ${agencyId}. Skipping.`);
      return;
    }
    const csvContent = managerDueDateService.transformToCSV(dueDateCompetencies);

    const csvAttachment = {
      filename: `upcoming-due-date-${format(new Date(), "dd-MM-yyyy")}.csv`,
      content: csvContent,
      encoding: "utf-8",
    };

    await mailService.send({
      ...emailPayload,
      attachments: [csvAttachment],
    });
  };

  schedule(cronSchedule, async () => {
    if (isRunning) {
      ctx.logger.info("CHECK_UPCOMING_DUE_DATE_CRON: Already running, skipping this execution.");
      return;
    }

    ctx.logger.info("CHECK_UPCOMING_DUE_DATE_CRON: Starting execution...");

    try {
      isRunning = true;

      const agencyWithDueDatesCompetencies = await managerDueDateService.getAgenciesWithClinicianDueDate();
      if (!agencyWithDueDatesCompetencies.length) {
        logger.info(" No agencies found with duedate competencies.");
        return;
      }

      for (const agencyId of agencyWithDueDatesCompetencies) {
        const recipients = await managerDueDateService.getRecipients(agencyId);
        if (!recipients?.length) {
          logger.info(` No recipients found for agency ${agencyId}. Skipping.`);
          continue;
        }

        for (const recipient of recipients) {
          await sendEmailToRecipient(recipient, agencyId);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      ctx.logger.error("An error occurred during the scheduled task (CHECK_UPCOMING_DUE_DATE_CRON): ", error);
    } finally {
      isRunning = false;
      ctx.logger.info("CHECK_UPCOMING_DUE_DATE_CRON: Finished execution.");
    }
  });
});
