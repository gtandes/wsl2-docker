/* eslint-disable turbo/no-undeclared-env-vars */
import { defineHook } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { generateEmailPayload } from "emails";
import { UserExpiringCompetency } from "../../common/expiring-competency";
import { format } from "date-fns";

const LogPrefix = "CLINICIAN-WEEKLY-EXPIRING-COMPETENCIES-REMINDER-CRON";

interface Assignment {
  name: string;
  expires_on: string;
  status: string;
  type: string;
}
interface UserCompetency {
  first_name: string;
  last_name: string;
  email: string;
  logoId: string;
  agencyName: string;
  assignments: Assignment[];
}

export default defineHook(({ schedule }, ctx) => {
  let isJobRunning = false;
  schedule("0 2 * * 5", async () => {
    const allowedEnvironments = ["dev", "stg", "prod", "local"];
    const currentEnvironment = process.env.ENV_NAME || "";
    const database = ctx.database;

    if (!allowedEnvironments.includes(currentEnvironment)) {
      ctx.logger.info(`${LogPrefix}: Disabled - Current environment: ${currentEnvironment}`);
      return;
    }
    interface Assignment {
      name: string;
      expires_on: string;
      status: string;
      type: string;
    }
    interface UserCompetency {
      first_name: string;
      last_name: string;
      email: string;
      logoId: string;
      agencyName: string;
      assignments: Assignment[];
    }

    if (isJobRunning) {
      ctx.logger.info(`${LogPrefix}: Job already in progress. Skipping execution.`);
      return;
    }

    ctx.logger.info(`${LogPrefix}: Running Weekly Expiring Competency`);

    try {
      isJobRunning = true;
      const usersWithExpiringCompetencies: { [key: string]: UserCompetency } = {};

      const services = await DirectusServices.fromSchedule(ctx);

      const userExpiringCompetency = new UserExpiringCompetency(database);

      const expiringCompetencyData = await userExpiringCompetency.getAllExpiryCompetencies();

      expiringCompetencyData.forEach((item) => {
        let assignmentRecord: Assignment = {
          name: typeof item?.title === "string" ? item.title : "",
          expires_on:
            item?.expires_on && !isNaN(new Date(item.expires_on).getTime())
              ? format(new Date(item.expires_on), "MM/dd/yyyy")
              : "N/A",
          status: typeof item?.competency_status === "string" ? item.competency_status : "N/A",
          type: item.contentType,
        };
        // check if directus_users_id already exists in the listOfUsersCompetencies array
        let directusUserIdKey = item.user_id.replace("-", "");

        if (usersWithExpiringCompetencies[directusUserIdKey]) {
          // If user exists, push the new assignment to their assignments array
          usersWithExpiringCompetencies[directusUserIdKey] &&
            usersWithExpiringCompetencies[directusUserIdKey]!.assignments.push(assignmentRecord);
        } else {
          // If user does not exist, create a new entry for them
          usersWithExpiringCompetencies[directusUserIdKey] = {
            first_name: item.first_name || "",
            last_name: item.last_name || "",
            email: item.email,
            logoId: item.logo || "",
            agencyName: item.agency_name || "",
            assignments: [assignmentRecord],
          };
        }
      });

      const emails = Object.values(usersWithExpiringCompetencies)
        .map((user) => {
          if (!user.email) {
            return null;
          }

          const agencyName = user.agencyName;
          const logoId = user.logoId || "";

          const emailPayload = generateEmailPayload(
            "clinician-expiring-competencies-reminder-new",
            user.email,
            `${agencyName} | Expiring Notification Reminder for ${user.first_name} ${user.last_name}`,
            {
              props: {
                previewText: `${agencyName} | Expiring Notification Reminder for ${user.first_name} ${user.last_name}`,
                user,
                assignments: user.assignments.sort((a, b) => {
                  return new Date(a.expires_on).getTime() - new Date(b.expires_on).getTime();
                }),
                agency: { name: agencyName, logo: logoId },
              },
            },
          );
          return emailPayload;
        })
        .filter(Boolean);

      if (emails.length > 0) {
        ctx.logger.info(`${LogPrefix}: Sending ${emails.length} email reminders.`);
        emails.map(async (e: any) => {
          await services.mailService.send(e);
          await new Promise((resolve) => setTimeout(resolve, 500));
        });
      } else {
        ctx.logger.info(`${LogPrefix}: No emails to send.`);
      }
    } catch (error) {
      logError(error, ctx.logger);
    } finally {
      isJobRunning = false;
      ctx.logger.info(`${LogPrefix}: DONE`);
    }
  });
});

function logError(error: unknown, logger: any) {
  if (error instanceof Error) {
    logger.error(`${LogPrefix}: Error during execution: ${error.message}`);
  } else {
    logger.error(`${LogPrefix}: Unknown error during execution.`);
  }
}
