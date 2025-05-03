import { defineHook } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { generateEmailPayload } from "emails";
import { format } from "date-fns";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import { isUserActive } from "../../common/utils";

export default defineHook(({ schedule }, ctx) => {
  schedule("0 10 * * 1", async () => {
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

    const emails = usersWithPendingAssignments
      .map((user: any) => {
        const recipient = user.email;

        const assignments: any[] = [];

        if (user.sc_definitions) {
          user.sc_definitions.forEach((sc: any) => {
            if (
              sc.agency.notifications_settings?.clinician.pending_assignment_reminder &&
              isUserActive(sc.agency.id, user)
            ) {
              if (sc.status === CompetencyState.PENDING) {
                assignments.push({
                  name: sc.sc_definitions_id.title,
                  due_date: format(new Date(sc.due_date), "MM/dd/yyyy"),
                  status: sc.status,
                });
              }
            }
          });
        }

        if (user.exams) {
          user.exams.forEach((e: any) => {
            if ([CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS].includes(e.status)) {
              if (
                e.agency.notifications_settings?.clinician.pending_assignment_reminder &&
                isUserActive(e.agency.id, user)
              ) {
                assignments.push({
                  name: e.exams_id.title,
                  due_date: format(new Date(e.due_date), "MM/dd/yyyy"),
                  status: e.status,
                });
              }
            }
          });
        }

        if (user.modules) {
          user.modules.forEach((m: any) => {
            if ([CompetencyState.STARTED, CompetencyState.PENDING].includes(m.status)) {
              if (
                m.agency.notifications_settings?.clinician.pending_assignment_reminder &&
                isUserActive(m.agency.id, user)
              ) {
                assignments.push({
                  name: m.modules_definition_id.title,
                  due_date: format(new Date(m.due_date), "MM/dd/yyyy"),
                  status: m.status,
                });
              }
            }
          });
        }

        if (user.documents) {
          user.documents.forEach((d: any) => {
            if (!d.read) {
              if (
                d.agency.notifications_settings?.clinician.pending_assignment_reminder &&
                isUserActive(d.agency.id, user)
              ) {
                assignments.push({
                  name: d.documents_id.title,
                  due_date: format(new Date(d.due_date), "MM/dd/yyyy"),
                  status: "UNREAD",
                });
              }
            }
          });
        }

        if (user.policies) {
          user.policies.forEach((p: any) => {
            if (!p.signed_on) {
              if (
                p.agency.notifications_settings?.clinician.pending_assignment_reminder &&
                isUserActive(p.agency.id, user)
              ) {
                assignments.push({
                  name: p.policies_id.name,
                  due_date: format(new Date(p.due_date), "MM/dd/yyyy"),
                  status: "UNSIGNED",
                });
              }
            }
          });
        }

        if (assignments.length === 0) {
          return;
        }

        return generateEmailPayload(
          "clinician-pending-assignment",
          recipient,
          "Friendly Reminder: Pending Assignment",
          {
            props: {
              previewText: "Friendly Reminder: Pending Assignment",
              user,
              assignments: assignments.sort((a, b) => {
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
              }),
            },
          },
        );
      })
      .filter(Boolean);

    await Promise.allSettled(emails.map((e: any) => services.mailService.send(e)));

    ctx.logger.info(`Sent ${emails.length} pending assignments reminder emails`);
  });
});
