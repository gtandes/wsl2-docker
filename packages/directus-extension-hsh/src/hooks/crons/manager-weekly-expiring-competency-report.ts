import { defineHook } from "@directus/extensions-sdk";
import { format } from "date-fns";
import { generateEmailPayloadWithAttachments } from "emails";
import {
  ManagerExpiringCompetenciesService,
  RoleId,
  roleToSetting,
} from "../../common/manager-expiring-competencies-service";
import { hasCompetencyExpirationReport, Recipient } from "types";

const LogPrefix = "MANAGER-WEEKLY-EXPIRING-COMPETENCY-REPORT-CRON";

export default defineHook(async ({ schedule }, { services, database, logger, getSchema, env }) => {
  let isJobRunning = false;
  const { MailService } = services;

  const schema = await getSchema();

  const mailService = new MailService({
    schema,
    database,
    accountability: { admin: true },
  });

  const managerExpiringComptencyService = new ManagerExpiringCompetenciesService(database);
  schedule("0 2 * * 5", async () => {
    if (isJobRunning) {
      logger.info(`${LogPrefix}: Job already in progress. Skipping execution.`);
      return;
    }

    logger.info(`${LogPrefix} RUNNING`);

    try {
      isJobRunning = true;
      logger.info(`${LogPrefix}: Retrieving expiring competencies data...`);
      const agenciesWithExpiryCompetencies = await managerExpiringComptencyService.getAgencyWithExpiryCompetencies();
      if (!agenciesWithExpiryCompetencies.length) {
        logger.info(`${LogPrefix}: No agencies found with expiring competencies.`);
        return;
      }

      await processEmailExpiryCompetencies(agenciesWithExpiryCompetencies);
    } catch (error: unknown) {
      logError(error, logger);
    } finally {
      isJobRunning = false;
      logger.info(`${LogPrefix}: DONE`);
    }
  });

  const processEmailExpiryCompetencies = async (expiringAgencyCompetencies: string[]): Promise<void> => {
    logger.info(`${LogPrefix}: Processing Sending Emails`);
    for (const agencyId of expiringAgencyCompetencies) {
      try {
        const recipients: Recipient[] = await managerExpiringComptencyService.getRecipientsAgency(agencyId);
        if (!recipients?.length) {
          logger.info(`${LogPrefix}: No recipients found for agency ${agencyId}. Skipping.`);
          continue;
        }

        for (const recipient of recipients) {
          try {
            const { user_role, notifications_settings } = recipient;
            if (!user_role || !(user_role in roleToSetting)) continue;
            if (!notifications_settings) continue;

            const requiredSetting = roleToSetting[user_role as RoleId] as keyof typeof notifications_settings;

            const userNotificationSettings = notifications_settings[requiredSetting];

            if (!userNotificationSettings || !hasCompetencyExpirationReport(userNotificationSettings)) {
              continue;
            }

            const isEnabled = userNotificationSettings.competency_expiration_report;

            if (!isEnabled) {
              continue;
            }

            await sendEmailToRecipient(recipient, agencyId);

            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            logger.error(`${LogPrefix}: Failed to process recipient ${recipient.email}:`, error);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`${LogPrefix}: Error processing agency ${agencyId}:`, error);
      }
    }
  };

  const sendEmailToRecipient = async (
    { directus_users_id, user_role, last_name, first_name, email: emailUser, agency_name, agency_logo }: Recipient,
    agencyId: string,
  ) => {
    try {
      const subject = `Expiring Competencies Report for ${agency_name}`;
      const fileName = `Expiring_Competencies_Report_${format(new Date(), "yyyy-MM-dd")}.csv`;

      const secret = env["SECRET"]?.replace(/^"|"$/g, "").trim();
      if (!secret) {
        throw new Error("No SECRET provided for JWT verification");
      }

      const data = await managerExpiringComptencyService.getExpiryCompetencies(
        directus_users_id,
        agencyId,
        user_role as RoleId,
      );

      const csvContent = managerExpiringComptencyService.transformToCSV(data);

      const downloadToken = managerExpiringComptencyService.createDownloadToken(
        directus_users_id,
        user_role,
        agencyId,
        secret,
      );

      const email = generateEmailPayloadWithAttachments({
        templateId: "agency-admin-expiring-competencies-report",
        to: emailUser,
        subject,
        templateData: {
          props: {
            previewText: subject,
            user: {
              first_name: first_name,
              last_name: last_name,
            },
            agency: {
              name: agency_name,
              logo: agency_logo ?? "",
            },
            reportDate: format(new Date(), "yyyy-MM-dd"),
            csvDownloadHref: `${env.PUBLIC_URL}/user/download-report/${downloadToken}`,
          },
        },
        attachments: [
          {
            filename: fileName,
            content: csvContent,
            type: "text/csv",
          },
        ],
      });

      await mailService.send(email);
    } catch (error) {
      logger.error(`${LogPrefix}: Error in sendEmailToRecipient:`, error);
      throw error;
    }
  };
});

function logError(error: unknown, logger: any) {
  if (error instanceof Error) {
    logger.error(`${LogPrefix}: Error during execution: ${error.message}`);
  } else {
    logger.error(`${LogPrefix}: Unknown error during execution.`);
  }
}
