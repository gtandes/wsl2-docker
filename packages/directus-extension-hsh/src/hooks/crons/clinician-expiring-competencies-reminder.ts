import { defineHook } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { generateEmailPayload } from "emails";
import { format, formatISO, addDays } from "date-fns";
import { DirectusStatus, UserRole } from "types";
import { isUserActive } from "../../common/utils";

export default defineHook(({ schedule }, ctx) => {
  schedule("0 5 * * *", async () => {
    const services = await DirectusServices.fromSchedule(ctx);

    const skillChecklistFields = [
      "sc_definitions.sc_definitions_id.title",
      "sc_definitions.status",
      "sc_definitions.expires_on",
      "sc_definitions.agency.name",
      "sc_definitions.agency.id",
      "sc_definitions.agency.logo.id",
      "sc_definitions.agency.notifications_settings",
    ];

    const examsFields = [
      "exams.exams_id.title",
      "exams.status",
      "exams.expires_on",
      "exams.agency.id",
      "exams.agency.name",
      "exams.agency.logo.id",
      "exams.agency.notifications_settings",
    ];

    const modulesFields = [
      "modules.modules_definition_id.title",
      "modules.status",
      "modules.expires_on",
      "modules.agency.id",
      "modules.agency.name",
      "modules.agency.logo.id",
      "modules.agency.notifications_settings",
    ];

    const documentsFields = [
      "documents.documents_id.title",
      "documents.status",
      "documents.expires_on",
      "documents.agency.id",
      "documents.agency.name",
      "documents.agency.logo.id",
      "documents.agency.notifications_settings",
    ];

    const policiesFields = [
      "policies.policies_id.name",
      "policies.status",
      "policies.expires_on",
      "policies.agency.id",
      "policies.agency.name",
      "policies.agency.logo.id",
      "policies.agency.notifications_settings",
    ];

    const agenciesFields = ["agencies.status", "agencies.agencies_id.id"];

    const nextSevenDays = addDays(new Date(), 7);
    const nextSixDays = addDays(new Date(), 6);

    const expiringCompetenciesFilter = {
      expires_on: {
        _between: [formatISO(nextSixDays), formatISO(nextSevenDays)],
      },
    };

    const usersWithNearExpiryAssignments = await services.usersService.readByQuery({
      filter: {
        _and: [
          {
            role: {
              _eq: UserRole.Clinician,
            },
            status: {
              _eq: DirectusStatus.ACTIVE,
            },
          },
          {
            _or: [
              {
                sc_definitions: expiringCompetenciesFilter,
              },
              {
                modules: expiringCompetenciesFilter,
              },
              {
                exams: expiringCompetenciesFilter,
              },
              {
                policies: expiringCompetenciesFilter,
              },
              {
                documents: expiringCompetenciesFilter,
              },
            ],
          },
        ],
      },
      fields: [
        "*",
        ...skillChecklistFields,
        ...examsFields,
        ...modulesFields,
        ...documentsFields,
        ...policiesFields,
        ...agenciesFields,
      ],
    });

    const emails = usersWithNearExpiryAssignments
      .map((user: any) => {
        const recipient = user.email;

        const assignments: any[] = [];

        if (user.sc_definitions) {
          user.sc_definitions.forEach((sc: any) => {
            if (
              sc.agency.notifications_settings?.clinician.expiring_competencies_reminder &&
              isUserActive(sc.agency.id, user)
            ) {
              assignments.push({
                name: sc.sc_definitions_id.title,
                expires_on: format(new Date(sc.expires_on), "MM/dd/yyyy"),
                status: sc.status,
              });
            }
          });
        }

        if (user.exams) {
          user.exams.forEach((exam: any) => {
            if (
              exam.agency.notifications_settings?.clinician.expiring_competencies_reminder &&
              isUserActive(exam.agency.id, user)
            ) {
              assignments.push({
                name: exam.exams_id.title,
                expires_on: format(new Date(exam.expires_on), "MM/dd/yyyy"),
                status: exam.status,
              });
            }
          });
        }

        if (user.modules) {
          user.modules.forEach((module: any) => {
            if (
              module.agency.notifications_settings?.clinician.expiring_competencies_reminder &&
              isUserActive(module.agency.id, user)
            ) {
              assignments.push({
                name: module.modules_definition_id.title,
                expires_on: format(new Date(module.expires_on), "MM/dd/yyyy"),
                status: module.status,
              });
            }
          });
        }

        if (user.documents) {
          user.documents.forEach((document: any) => {
            if (
              document.agency.notifications_settings?.clinician.expiring_competencies_reminder &&
              isUserActive(document.agency.id, user)
            ) {
              assignments.push({
                name: document.documents_id.title,
                expires_on: format(new Date(document.expires_on), "MM/dd/yyyy"),
                status: document.status,
              });
            }
          });
        }

        if (user.policies) {
          user.policies.forEach((policy: any) => {
            if (
              policy.agency.notifications_settings?.clinician.expiring_competencies_reminder &&
              isUserActive(policy.agency.id, user)
            ) {
              assignments.push({
                name: policy.policies_id.name,
                expires_on: format(new Date(policy.expires_on), "MM/dd/yyyy"),
                status: policy.status,
              });
            }
          });
        }

        if (assignments.length === 0) {
          return;
        }

        return generateEmailPayload(
          "clinician-expiring-competencies-reminder-new",
          recipient,
          "Important: Your Competencies Are Expiring Soon!",
          {
            props: {
              previewText: "Important: Your Competencies Are Expiring Soon!",
              user,
              assignments: assignments.sort((a, b) => {
                return new Date(a.expires_on).getTime() - new Date(b.expires_on).getTime();
              }),
            },
          },
        );
      })
      .filter(Boolean);

    await Promise.allSettled(emails.map((e: any) => services.mailService.send(e)));

    ctx.logger.info(`Sent ${emails.length} expiring competencies reminder emails`);
  });
});
