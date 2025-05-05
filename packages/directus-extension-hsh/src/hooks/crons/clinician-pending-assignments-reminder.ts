/* eslint-disable turbo/no-undeclared-env-vars */
import { defineHook } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { generateEmailPayload } from "emails";
import { format } from "date-fns";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import { isUserActive } from "../../common/utils";

export default defineHook(({ schedule }, ctx) => {
  const currentEnvironment = process.env.ENV_NAME || "";
  const cronSchedule = ["stg"].includes(currentEnvironment) ? "*/30 * * * *" : "0 10 * * 1";

  schedule(cronSchedule, async () => {
    ctx.logger.info("Running clinician pending assignments reminder");
    const services = await DirectusServices.fromSchedule(ctx);

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
      "documents.read",
      "documents.due_date",
      "documents.agency.id",
      "documents.agency.name",
      "documents.agency.logo.id",
      "documents.agency.notifications_settings",
    ];

    const policiesFields = [
      "policies.policies_id.name",
      "policies.signed_on",
      "policies.due_date",
      "policies.agency.id",
      "policies.agency.name",
      "policies.agency.logo.id",
      "policies.agency.notifications_settings",
    ];

    const agenciesFields = ["agencies.status", "agencies.agencies_id.id"];

    const usersWithPendingAssignments = await services.usersService.readByQuery({
      filter: {
        _and: [
          {
            role: {
              _eq: UserRole.Clinician,
            },
            status: { _eq: DirectusStatus.ACTIVE },
          },
          {
            _or: [
              {
                sc_definitions: {
                  status: {
                    _in: [CompetencyState.PENDING],
                  },
                  sc_definitions_id: {
                    status: { _neq: DirectusStatus.ARCHIVED },
                  },
                },
              },
              {
                modules: {
                  status: {
                    _in: [CompetencyState.STARTED, CompetencyState.PENDING],
                  },
                  modules_definition_id: {
                    status: { _neq: DirectusStatus.ARCHIVED },
                  },
                },
              },
              {
                exams: {
                  status: {
                    _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS],
                  },
                  exams_id: {
                    status: { _neq: DirectusStatus.ARCHIVED },
                  },
                },
              },
              {
                policies: {
                  signed_on: {
                    _null: true,
                  },
                  policies_id: {
                    status: { _neq: DirectusStatus.ARCHIVED },
                  },
                },
              },
              {
                documents: {
                  read: {
                    _null: true,
                  },
                  documents_id: {
                    status: { _neq: DirectusStatus.ARCHIVED },
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

    const reminderEmails = usersWithPendingAssignments
      .map((user: any) => {
        const recipient = user.email;

        const userAssignmentsGroupedByAgency: Record<string, Record<string, { agency: any; assignments: any[] }>> = {};

        userAssignmentsGroupedByAgency[recipient] = {};

        if (user.sc_definitions) {
          for (const sc of user.sc_definitions) {
            const agencyId = sc.agency.id;
            const shouldNotify = sc.agency.notifications_settings?.clinician.pending_assignment_reminder;
            const isActive = isUserActive(agencyId, user);

            if (sc.status !== CompetencyState.PENDING || !shouldNotify || !isActive) {
              continue;
            }

            if (!userAssignmentsGroupedByAgency[recipient]) {
              userAssignmentsGroupedByAgency[recipient] = {};
            }

            if (!userAssignmentsGroupedByAgency[recipient][agencyId]) {
              userAssignmentsGroupedByAgency[recipient][agencyId] = {
                agency: sc.agency,
                assignments: [],
              };
            }

            userAssignmentsGroupedByAgency[recipient][agencyId].assignments.push({
              name: sc.sc_definitions_id.title,
              due_date: format(new Date(sc.due_date), "MM/dd/yyyy"),
              status: sc.status,
            });
          }
        }

        if (user.exams) {
          for (const exam of user.exams) {
            const agencyId = exam.agency.id;
            const shouldNotify = exam.agency.notifications_settings?.clinician.pending_assignment_reminder;
            const isActive = isUserActive(agencyId, user);

            if (
              ![CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS].includes(exam.status) ||
              !shouldNotify ||
              !isActive
            ) {
              continue;
            }

            if (!userAssignmentsGroupedByAgency[recipient][agencyId]) {
              userAssignmentsGroupedByAgency[recipient][agencyId] = {
                agency: exam.agency,
                assignments: [],
              };
            }

            userAssignmentsGroupedByAgency[recipient][agencyId].assignments.push({
              name: exam.exams_id.title,
              due_date: format(new Date(exam.due_date), "MM/dd/yyyy"),
              status: exam.status,
            });
          }
        }

        if (user.modules) {
          for (const competencyModule of user.modules) {
            const agencyId = competencyModule.agency.id;
            const shouldNotify = competencyModule.agency.notifications_settings?.clinician.pending_assignment_reminder;
            const isActive = isUserActive(agencyId, user);
            if (
              ![CompetencyState.STARTED, CompetencyState.PENDING].includes(competencyModule.status) ||
              !shouldNotify ||
              !isActive
            ) {
              continue;
            }

            if (!userAssignmentsGroupedByAgency[recipient][agencyId]) {
              userAssignmentsGroupedByAgency[recipient][agencyId] = {
                agency: competencyModule.agency,
                assignments: [],
              };
            }

            userAssignmentsGroupedByAgency[recipient][agencyId].assignments.push({
              name: competencyModule.modules_definition_id.title,
              due_date: format(new Date(competencyModule.due_date), "MM/dd/yyyy"),
              status: competencyModule.status,
            });
          }
        }

        if (user.documents) {
          for (const doc of user.documents) {
            const agencyId = doc.agency.id;
            const shouldNotify = doc.agency.notifications_settings?.clinician.pending_assignment_reminder;
            const isActive = isUserActive(agencyId, user);
            if (doc.read || !shouldNotify || !isActive) {
              continue;
            }

            if (!userAssignmentsGroupedByAgency[recipient][agencyId]) {
              userAssignmentsGroupedByAgency[recipient][agencyId] = {
                agency: doc.agency,
                assignments: [],
              };
            }

            userAssignmentsGroupedByAgency[recipient][agencyId].assignments.push({
              name: doc.documents_id.title,
              due_date: format(new Date(doc.due_date), "MM/dd/yyyy"),
              status: "UNREAD",
            });
          }
        }

        if (user.policies) {
          for (const policy of user.policies) {
            const agencyId = policy.agency.id;
            const shouldNotify = policy.agency.notifications_settings?.clinician.pending_assignment_reminder;
            const isActive = isUserActive(agencyId, user);
            if (policy.signed_on || !shouldNotify || !isActive) {
              continue;
            }

            if (!userAssignmentsGroupedByAgency[recipient][agencyId]) {
              userAssignmentsGroupedByAgency[recipient][agencyId] = {
                agency: policy.agency,
                assignments: [],
              };
            }

            userAssignmentsGroupedByAgency[recipient][agencyId].assignments.push({
              name: policy.policies_id.name,
              due_date: format(new Date(policy.due_date), "MM/dd/yyyy"),
              status: "UNSIGNED",
            });
          }
        }

        const allAssignments = Object.values(userAssignmentsGroupedByAgency[recipient]).flatMap(
          (group) => group.assignments,
        );

        if (allAssignments.length === 0) return null;

        const emails: any[] = [];

        if (Object.keys(userAssignmentsGroupedByAgency[recipient]).length !== 0) {
          Object.values(userAssignmentsGroupedByAgency[recipient]).forEach((agencyData: any) => {
            const agencyAssignments = agencyData.assignments;

            const sortedAssignments = [...agencyAssignments].sort((a, b) => {
              return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            });

            emails.push(
              generateEmailPayload("clinician-pending-assignment", recipient, `Friendly Reminder: Pending Assignment`, {
                props: {
                  previewText: "Friendly Reminder: Pending Assignment",
                  user,
                  agency: agencyData.agency,
                  assignments: sortedAssignments,
                },
              }),
            );
          });
        }

        return emails;
      })
      .filter((entry: any) => entry !== null)
      .flat();

    await Promise.allSettled(reminderEmails.map((e: any) => services.mailService.send(e)));

    ctx.logger.info(`Sent ${reminderEmails.length} pending assignments reminder emails`);
  });
});
