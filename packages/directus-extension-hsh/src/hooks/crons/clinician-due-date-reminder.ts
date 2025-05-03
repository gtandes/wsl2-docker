import { defineHook } from "@directus/extensions-sdk";
import { generateEmailPayload } from "emails";
import { format, addDays, isWithinInterval, formatISO, endOfDay, startOfDay } from "date-fns";
import { DirectusServices } from "../../common/directus-services";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import { isUserActive } from "../../common/utils";

function isNearDeadline(date: string) {
  return isWithinInterval(new Date(date), {
    start: endOfDay(addDays(new Date(), 6)),
    end: startOfDay(addDays(new Date(), 8)),
  });
}

export default defineHook(({ schedule }, ctx) => {
  schedule("0 5 * * *", async () => {
    let services;
    try {
      services = await DirectusServices.fromSchedule(ctx);
    } catch (error) {
      ctx.logger.error("Failed to initialize services", error);
      return;
    }

    const skillChecklistFields = [
      "sc_definitions.sc_definitions_id.title",
      "sc_definitions.status",
      "sc_definitions.due_date",
      "sc_definitions.agency.id",
      "sc_definitions.agency.name",
      "sc_definitions.agency.logo.id",
      "sc_definitions.agency.notifications_settings",
    ];

    const examsFields = [
      "exams.exams_id.title",
      "exams.status",
      "exams.due_date",
      "exams.agency.id",
      "exams.agency.name",
      "exams.agency.logo.id",
      "exams.agency.notifications_settings",
    ];

    const modulesFields = [
      "modules.modules_definition_id.title",
      "modules.status",
      "modules.due_date",
      "modules.agency.id",
      "modules.agency.name",
      "modules.agency.logo.id",
      "modules.agency.notifications_settings",
    ];

    const documentsFields = [
      "documents.documents_id.title",
      "documents.status",
      "documents.due_date",
      "documents.agency.id",
      "documents.agency.name",
      "documents.agency.logo.id",
      "documents.agency.notifications_settings",
    ];

    const policiesFields = [
      "policies.policies_id.name",
      "policies.status",
      "policies.due_date",
      "policies.agency.id",
      "policies.agency.name",
      "policies.agency.logo.id",
      "policies.agency.notifications_settings",
    ];

    const agenciesFields = ["agencies.status", "agencies.agencies_id.id"];

    const nextEightDays = formatISO(startOfDay(addDays(new Date(), 8)));
    const nextSixDays = formatISO(endOfDay(addDays(new Date(), 6)));

    const expiringDueDateCompetenciesFilter = {
      due_date: {
        _between: [nextSixDays, nextEightDays],
      },
    };

    let usersWithPendingAssignments;
    try {
      usersWithPendingAssignments = await services.usersService.readByQuery({
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
                  sc_definitions: {
                    _and: [
                      expiringDueDateCompetenciesFilter,
                      {
                        status: {
                          _eq: CompetencyState.PENDING,
                        },
                      },
                    ],
                  },
                },
                {
                  modules: {
                    _and: [
                      expiringDueDateCompetenciesFilter,
                      {
                        status: {
                          _in: [CompetencyState.STARTED, CompetencyState.PENDING],
                        },
                      },
                    ],
                  },
                },
                {
                  exams: {
                    _and: [
                      expiringDueDateCompetenciesFilter,
                      {
                        status: {
                          _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS],
                        },
                      },
                    ],
                  },
                },
                {
                  policies: {
                    status: {
                      _eq: CompetencyState.UNSIGNED,
                    },
                  },
                },
                {
                  documents: {
                    status: {
                      _eq: CompetencyState.UNREAD,
                    },
                  },
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
    } catch (error) {
      ctx.logger.error("Failed to fetch users with pending assignments", error);
      return;
    }

    const emails = usersWithPendingAssignments
      .map((user: any) => {
        const recipient = user.email;
        const assignments: any[] = [];

        try {
          if (user.sc_definitions) {
            user.sc_definitions.forEach((sc: any) => {
              if (
                sc.agency.notifications_settings?.clinician.due_date_reminder &&
                isNearDeadline(sc.due_date) &&
                isUserActive(sc.agency.id, user)
              ) {
                assignments.push({
                  name: sc.sc_definitions_id.title,
                  due_date: format(new Date(sc.due_date), "MM/dd/yyyy"),
                  status: sc.status,
                });
              }
            });
          }

          if (user.exams) {
            user.exams.forEach((exam: any) => {
              if (
                exam.agency.notifications_settings?.clinician.due_date_reminder &&
                isNearDeadline(exam.due_date) &&
                isUserActive(exam.agency.id, user)
              ) {
                assignments.push({
                  name: exam.exams_id.title,
                  due_date: format(new Date(exam.due_date), "MM/dd/yyyy"),
                  status: exam.status,
                });
              }
            });
          }

          if (user.modules) {
            user.modules.forEach((module: any) => {
              if (
                module.agency.notifications_settings?.clinician.due_date_reminder &&
                isNearDeadline(module.due_date) &&
                isUserActive(module.agency.id, user)
              ) {
                assignments.push({
                  name: module.modules_definition_id.title,
                  due_date: format(new Date(module.due_date), "MM/dd/yyyy"),
                  status: module.status,
                });
              }
            });
          }

          if (user.documents) {
            user.documents.forEach((document: any) => {
              if (
                document.agency.notifications_settings?.clinician.due_date_reminder &&
                isNearDeadline(document.due_date) &&
                isUserActive(document.agency.id, user)
              ) {
                assignments.push({
                  name: document.documents_id.title,
                  due_date: format(new Date(document.due_date), "MM/dd/yyyy"),
                  status: document.status,
                });
              }
            });
          }

          if (user.policies) {
            user.policies.forEach((policy: any) => {
              if (
                policy.agency.notifications_settings?.clinician.due_date_reminder &&
                isNearDeadline(policy.due_date) &&
                isUserActive(policy.agency.id, user)
              ) {
                assignments.push({
                  name: policy.policies_id.name,
                  due_date: format(new Date(policy.due_date), "MM/dd/yyyy"),
                  status: policy.status,
                });
              }
            });
          }
        } catch (error) {
          ctx.logger.error("Failed to process assignments for user", error);
          return;
        }

        if (assignments.length === 0) {
          return;
        }

        try {
          return generateEmailPayload(
            "clinician-due-date-reminder",
            recipient,
            "Friendly Reminder: Assignment Due Date Approaching",
            {
              props: {
                previewText: "Friendly Reminder: Assignment Due Date Approaching",
                user,
                assignments: assignments.sort((a, b) => {
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }),
              },
            },
          );
        } catch (error) {
          ctx.logger.error("Failed to generate email payload", error);
          return;
        }
      })
      .filter(Boolean);

    try {
      await Promise.allSettled(emails.map((e: any) => services.mailService.send(e)));
    } catch (error) {
      ctx.logger.error("Failed to send emails", error);
    }

    ctx.logger.info(`Sent ${emails.length} due date reminders emails`);
  });
});
