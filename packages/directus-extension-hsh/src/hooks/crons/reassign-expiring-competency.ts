/* eslint-disable turbo/no-undeclared-env-vars */
import { defineHook } from "@directus/extensions-sdk";
import { addDays } from "date-fns";
import { reassignCompetency } from "../../endpoints/assignments/utilities";
import { TCompetencyDetails } from "../../endpoints/assignments/types";
import { ExpirationType, DEFAULT_DUE_DATE_DAYS } from "types";

interface IAgency {
  id: number;
  default_due_date: number;
  default_expiration: string;
  notifications_settings: any;
}

interface IAgencyDetails {
  due_date: Date;
  expiration_type: string;
  allow_reassigning: boolean;
}

const LogPrefix = "RE-ASSIGN-EXPIRING-COMPETENCIES-CRON";
const BATCH_SIZE = 100;

export default defineHook(({ schedule }, { services, database, logger, getSchema }) => {
  const { ItemsService } = services;

  function parseNotificationSettings(settings: any): boolean {
    try {
      return settings?.clinician?.expiring_competencies_reminder === true;
    } catch (e: any) {
      logger.warn(`${LogPrefix}: Invalid notifications_settings structure. Error: ${e.message}`);
      return false;
    }
  }

  schedule("*/5 0-7 * * 1-5", async () => {
    try {
      let reassignCount = 0;

      logger.info(`${LogPrefix}: Running`);

      const schema = await getSchema();
      const dbSettings = {
        database,
        schema,
        accountability: { admin: true },
      };

      const agencyService = new ItemsService("agencies", dbSettings);
      const assignmentsServices = {
        skillsChecklists: new ItemsService("junction_sc_definitions_directus_users", dbSettings),
        modules: new ItemsService("junction_modules_definition_directus_users", dbSettings),
        exams: new ItemsService("junction_directus_users_exams", dbSettings),
        policies: new ItemsService("junction_directus_users_policies", dbSettings),
        documents: new ItemsService("junction_directus_users_documents", dbSettings),
      };

      const agencies: IAgency[] = await agencyService.readByQuery({
        fields: ["id", "default_due_date", "default_expiration", "notifications_settings"],
        limit: 100000,
      });

      logger.info(`${LogPrefix}: Pulled settings for ${agencies.length} agencies`);

      const agencyDetails = agencies.reduce((details, agency) => {
        if (!parseNotificationSettings(agency.notifications_settings)) {
          return details;
        }

        const due_date = addDays(new Date(), agency.default_due_date || DEFAULT_DUE_DATE_DAYS);

        details[agency.id] = {
          due_date,
          expiration_type: agency.default_expiration || ExpirationType.YEARLY,
          allow_reassigning: parseNotificationSettings(agency.notifications_settings),
        };
        return details;
      }, {} as Record<number, IAgencyDetails>);

      const today = new Date();
      const fortyFiveDaysFromToday = addDays(today, 45).toISOString();

      const agencyIdsWithReassigning = Object.keys(agencyDetails)
        .filter((id: any) => {
          return agencyDetails[id]?.allow_reassigning;
        })
        .map(String);

      for (let i = 0; i < agencyIdsWithReassigning.length; i += BATCH_SIZE) {
        const batch = agencyIdsWithReassigning.slice(i, i + BATCH_SIZE);
        const expiresOnFilter = {
          expires_on: {
            _between: [today.toISOString(), fortyFiveDaysFromToday],
          },
          reassigned: { _eq: false },
          agency: {
            id: { _in: batch },
          },
        };

        const [skillsChecklists, modulesAssignments, examsAssignments, policiesAssignments, documentsAssignments] =
          await Promise.all([
            assignmentsServices.skillsChecklists.readByQuery({
              filter: expiresOnFilter,
              fields: ["id", "agency.id", "sc_definitions_id.title"],
              limit: 100,
            }),
            assignmentsServices.modules.readByQuery({
              filter: expiresOnFilter,
              fields: ["id", "agency.id", "modules_definition_id.title", "allowed_attempts"],
              limit: 100,
            }),
            assignmentsServices.exams.readByQuery({
              filter: expiresOnFilter,
              fields: ["id", "agency.id", "exams_id.title", "allowed_attempts"],
              limit: 100,
            }),
            assignmentsServices.policies.readByQuery({
              filter: expiresOnFilter,
              fields: ["id", "agency.id", "policies_id.name"],
              limit: 100,
            }),
            assignmentsServices.documents.readByQuery({
              filter: expiresOnFilter,
              fields: ["id", "agency.id", "documents_id.title"],
              limit: 100,
            }),
          ]);

        const processReassignment = async (assignments: any[], service: typeof ItemsService, type: string) => {
          await Promise.all(
            assignments.map(async (assignment) => {
              const agencySettings = agencyDetails[assignment.agency.id];
              if (agencySettings) {
                const details: TCompetencyDetails = {
                  due_date: agencySettings.due_date,
                  expiration: (agencySettings.expiration_type as ExpirationType) || ExpirationType.YEARLY,
                  allowed_attempts: assignment.allowed_attempts ?? 3,
                };
                await reassignCompetency(schema, service, assignment.id, details, type);
                reassignCount++;
                logger.info(`${LogPrefix}: Reassigned ${type} ${assignment.id}`);
              } else {
                logger.info(`${LogPrefix}: Failed to get default setting for agency ${assignment.agency.id}`);
              }
            }),
          );
        };

        await Promise.all([
          processReassignment(skillsChecklists, ItemsService, "Skill Checklist"),
          processReassignment(modulesAssignments, ItemsService, "Module"),
          processReassignment(examsAssignments, ItemsService, "Exam"),
          processReassignment(policiesAssignments, ItemsService, "Policy"),
          processReassignment(documentsAssignments, ItemsService, "Document"),
        ]);
      }
      logger.info(`${LogPrefix}: Reassigned ${reassignCount} for filter`);
      logger.info(`${LogPrefix}: Finished Running`);
    } catch (e: any) {
      logger.error(`${LogPrefix}: Error encountered - ${e.message}`);
    }
  });
});
