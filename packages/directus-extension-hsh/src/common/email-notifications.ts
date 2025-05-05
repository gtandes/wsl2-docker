/* eslint-disable turbo/no-undeclared-env-vars */
import { addDays, endOfDay, format, formatISO, isWithinInterval, startOfDay, subDays } from "date-fns";
import { DirectusServices } from "./directus-services";
import { generateEmailPayload, generateEmailPayloadWithAttachments } from "emails";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import { getSimpleHash } from "@directus/utils";
import { EndpointExtensionContext } from "@directus/types";
import jwt from "jsonwebtoken";
import { isUserActive } from "./utils";
import { ManagerExpiringCompetenciesService } from "./manager-expiring-competencies-service";
import { UserExpiringCompetency } from "./expiring-competency";
import { ManagerDueDateReportsService } from "../services/ManagerDueDateReportsService";

export class EmailNotifications {
  services: DirectusServices;
  agenciesFields = ["agencies.status", "agencies.agencies_id.id"];
  ctx: any;

  constructor(services: DirectusServices) {
    this.services = services;
  }

  _isNearDeadline(date: string) {
    return isWithinInterval(new Date(date), {
      start: endOfDay(addDays(new Date(), 6)),
      end: startOfDay(addDays(new Date(), 8)),
    });
  }
  _getLimits = (date: Date) => {
    return [formatISO(startOfDay(date)), formatISO(endOfDay(date))];
  };

  /**
   * dueDateReminder method
   * used to send the assignments due date reminder to a specific user.
   * @param userId
   */
  async dueDateReminder(userId: string) {
    try {
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

      const nextEightDays = formatISO(startOfDay(addDays(new Date(), 8)));
      const nextSixDays = formatISO(endOfDay(addDays(new Date(), 6)));

      const expiringDueDateCompetenciesFilter = {
        due_date: {
          _between: [nextSixDays, nextEightDays],
        },
      };

      const usersWithPendingAssignments = await this.services.usersService.readByQuery({
        filter: {
          _and: [
            {
              id: {
                _eq: userId,
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
          ...this.agenciesFields,
        ],
      });

      const emails = usersWithPendingAssignments
        .map((user: any) => {
          const recipient = user.email;

          const assignments: any[] = [];

          if (user.sc_definitions) {
            user.sc_definitions.forEach((sc: any) => {
              if (
                sc.agency.notifications_settings?.clinician.due_date_reminder &&
                this._isNearDeadline(sc.due_date) &&
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
                this._isNearDeadline(exam.due_date) &&
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
                this._isNearDeadline(module.due_date) &&
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
                this._isNearDeadline(document.due_date) &&
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
                this._isNearDeadline(policy.due_date) &&
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

          if (assignments.length === 0) {
            return;
          }

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
        })
        .filter(Boolean);

      await Promise.allSettled(emails.map((e: any) => this.services.mailService.send(e)));
    } catch (e) {
      console.log(e);
    }
  }
  /**
   * nagginDueDateReminder
   * used to send the nagging assignments due date reminder to a specific user.
   * @param userId
   */
  async nagginDueDateReminder(userId: string) {
    try {
      const skillChecklistFields = [
        "directus_users_id.email",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "directus_users_id.agencies.status",
        "directus_users_id.agencies.agencies_id.id",
        "sc_definitions_id.title",
        "status",
        "due_date",
        "agency.id",
        "agency.name",
        "agency.logo.id",
        "agency.notifications_settings",
      ];

      const examsFields = [
        "directus_users_id.email",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "directus_users_id.agencies.status",
        "directus_users_id.agencies.agencies_id.id",
        "exams_id.title",
        "status",
        "due_date",
        "agency.id",
        "agency.name",
        "agency.logo.id",
        "agency.notifications_settings",
      ];

      const modulesFields = [
        "directus_users_id.email",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "directus_users_id.agencies.status",
        "directus_users_id.agencies.agencies_id.id",
        "modules_definition_id.title",
        "status",
        "due_date",
        "agency.id",
        "agency.name",
        "agency.logo.id",
        "agency.notifications_settings",
      ];

      const documentsFields = [
        "directus_users_id.email",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "directus_users_id.agencies.status",
        "directus_users_id.agencies.agencies_id.id",
        "documents_id.title",
        "status",
        "due_date",
        "agency.id",
        "agency.name",
        "agency.logo.id",
        "agency.notifications_settings",
      ];

      const policiesFields = [
        "directus_users_id.email",
        "directus_users_id.first_name",
        "directus_users_id.last_name",
        "directus_users_id.agencies.status",
        "directus_users_id.agencies.agencies_id.id",
        "policies_id.name",
        "status",
        "due_date",
        "agency.id",
        "agency.name",
        "agency.logo.id",
        "agency.notifications_settings",
      ];
      const today = new Date();
      const prevSevenDays = subDays(today, 7);
      const prevFourteenDays = subDays(today, 14);
      const prevTwentyOneDays = subDays(today, 21);
      const prevTwentyEightDays = subDays(today, 28);
      const prevThirtyFiveDays = subDays(today, 35);

      const passedDueDateCompetenciesFilter = [
        {
          due_date: { _between: this._getLimits(prevSevenDays) },
        },
        {
          due_date: { _between: this._getLimits(prevFourteenDays) },
        },
        {
          due_date: { _between: this._getLimits(prevTwentyOneDays) },
        },
        {
          due_date: { _between: this._getLimits(prevTwentyEightDays) },
        },
        {
          due_date: { _between: this._getLimits(prevThirtyFiveDays) },
        },
      ];

      const [passedExams, passedSkillsChecklists, passedModules, passedDocuments, passedPolicies] = await Promise.all([
        this.services.examAssignmentsService.readByQuery({
          filter: {
            _or: passedDueDateCompetenciesFilter,
            status: {
              _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS, CompetencyState.DUE_DATE_EXPIRED],
            },
            directus_users_id: {
              id: { _eq: userId },
              status: { _eq: DirectusStatus.ACTIVE },
            },
          },
          fields: examsFields,
        }),
        this.services.skillsChecklistsService.readByQuery({
          filter: {
            _or: passedDueDateCompetenciesFilter,
            status: { _in: [CompetencyState.PENDING, CompetencyState.DUE_DATE_EXPIRED] },
            directus_users_id: {
              id: { _eq: userId },
              status: { _eq: DirectusStatus.ACTIVE },
            },
          },
          fields: skillChecklistFields,
        }),
        this.services.modulesAssignmentsService.readByQuery({
          filter: {
            _or: passedDueDateCompetenciesFilter,
            status: { _in: [CompetencyState.PENDING, CompetencyState.STARTED, CompetencyState.DUE_DATE_EXPIRED] },
            directus_users_id: {
              id: { _eq: userId },
              status: { _eq: DirectusStatus.ACTIVE },
            },
          },
          fields: modulesFields,
        }),
        this.services.documentsAssignmentsService.readByQuery({
          filter: {
            _or: passedDueDateCompetenciesFilter,
            status: { _in: [CompetencyState.DUE_DATE_EXPIRED, DirectusStatus.PUBLISHED] },
            read: { _null: true },
            directus_users_id: {
              id: { _eq: userId },
              status: { _eq: DirectusStatus.ACTIVE },
            },
          },
          fields: documentsFields,
        }),
        this.services.policiesAssignmentsService.readByQuery({
          filter: {
            _or: passedDueDateCompetenciesFilter,
            status: { _in: [CompetencyState.DUE_DATE_EXPIRED, DirectusStatus.PUBLISHED] },
            signed_on: { _null: true },
            directus_users_id: {
              id: { _eq: userId },
              status: { _eq: DirectusStatus.ACTIVE },
            },
          },
          fields: policiesFields,
        }),
      ]);

      const filteredBySetting = [
        ...passedExams,
        ...passedSkillsChecklists,
        ...passedModules,
        ...passedDocuments,
        ...passedPolicies,
      ].filter(
        (user) =>
          user.agency.notifications_settings?.clinician.nagging_email &&
          isUserActive(user.agency.id, { agencies: user.directus_users_id.agencies }),
      );

      const usersAssignments = new Map();
      filteredBySetting.forEach((assignment: any) => {
        const key = assignment.directus_users_id.email;
        if (usersAssignments.has(key)) {
          usersAssignments.get(key).push(assignment);
        } else {
          usersAssignments.set(key, [assignment]);
        }
      });

      const emails: any[] = [];
      usersAssignments.forEach((assignments) => {
        const user = assignments[0].directus_users_id;
        const email = user.email;
        emails.push(
          generateEmailPayload(
            "clinician-nagging-due-date-reminder",
            email,
            "URGENT: Competency Requirements for Completion",
            {
              props: {
                previewText: "URGENT: Competency Requirements for Completion",
                user,
                assignments: assignments.map((assignment: any) => {
                  return {
                    name:
                      assignment.exams_id?.title ||
                      assignment.sc_definitions_id?.title ||
                      assignment.modules_definition_id?.title ||
                      assignment.documents_id?.title ||
                      assignment.policies_id?.name,
                    due_date: format(new Date(assignment.due_date), "MM/dd/yyyy"),
                    status: assignment.status,
                  };
                }),
              },
            },
          ),
        );
      });

      await Promise.allSettled(emails.map((e: any) => this.services.mailService.send(e)));
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * pendingAssigmentRemainder
   * used to send the pending assignments reminder to a specific user.
   * @param userId
   */
  async pendingAssigmentRemainder(userId: string) {
    try {
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
      const pendingAssignments = await this.services.usersService.readByQuery({
        filter: {
          _and: [
            {
              id: {
                _eq: userId,
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
                  },
                },
                {
                  modules: {
                    status: {
                      _in: [CompetencyState.STARTED, CompetencyState.PENDING],
                    },
                  },
                },
                {
                  exams: {
                    status: {
                      _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS],
                    },
                  },
                },
                {
                  _and: [
                    {
                      policies: {
                        signed_on: {
                          _null: true,
                        },
                      },
                    },
                    {
                      policies: {
                        status: { _neq: DirectusStatus.ARCHIVED },
                      },
                    },
                  ],
                },

                {
                  _and: [
                    {
                      documents: {
                        read: {
                          _null: true,
                        },
                      },
                    },
                    {
                      documents: {
                        status: { _neq: DirectusStatus.ARCHIVED },
                      },
                    },
                  ],
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
          ...this.agenciesFields,
        ],
      });

      const emails = pendingAssignments
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

      await Promise.allSettled(emails.map((e: any) => this.services.mailService.send(e)));
    } catch (e) {
      console.log(e);
    }
  }
  /**
   * newAssignmentNotification
   * used to send the notify the new assignments to a specific user.
   * @param userId
   * @param agencyId
   * @param endpointExtensionContext
   */
  async newAssignmentNotification(
    userId: string,
    agencyId: string,
    endpointExtensionContext: EndpointExtensionContext,
  ) {
    try {
      const skillChecklistFields = ["sc_definitions.sc_definitions_id.title", "sc_definitions.assigned_on"];
      const documentsFields = ["documents.documents_id.title", "documents.assigned_on"];
      const policiesFields = ["policies.policies_id.name", "policies.assigned_on"];
      const examsFields = [
        "exams.exams_id.title",
        "exams.assigned_on",
        "exams.exams_id.exam_versions.allowed_attempts",
      ];
      const modulesFields = [
        "modules.modules_definition_id.title",
        "modules.assigned_on",
        "modules.modules_definition_id.last_version.allowed_attempts",
      ];

      const agency = await this.services.agenciesService.readOne(agencyId);
      const userAssignments = await this.services.usersService.readOne(userId, {
        fields: [
          "id",
          "first_name",
          "last_name",
          "email",
          ...skillChecklistFields,
          ...examsFields,
          ...modulesFields,
          ...documentsFields,
          ...policiesFields,
        ],
      });
      const emailCompetencies = [
        ...userAssignments.modules.map((m: any) => ({
          type: "module",
          title: m.modules_definition_id.title,
          category: "Module",
          assigned_on: format(new Date(m.assigned_on), "PPpp"),
          allowed_attempts: m.modules_definition_id.last_version.allowed_attempts,
          icon_url: `${endpointExtensionContext.env["WEB_URL"]}/email/module.png`,
          competency_link: `${endpointExtensionContext.env["WEB_URL"]}/clinician/modules`,
        })),
        ...userAssignments.exams.map((e: any) => ({
          type: "exam",
          title: e.exams_id.title,
          category: "Exam",
          assigned_on: format(new Date(e.assigned_on), "PPpp"),
          allowed_attempts: e.exams_id.exam_versions.at(0).allowed_attempts,
          icon_url: `${endpointExtensionContext.env["WEB_URL"]}/email/exam.png`,
          competency_link: `${endpointExtensionContext.env["WEB_URL"]}/clinician/exams`,
        })),
        ...userAssignments.sc_definitions.map((sc: any) => ({
          type: "skill-checklist",
          title: sc.sc_definitions_id.title,
          category: "Skills Checklist",
          assigned_on: format(new Date(sc.assigned_on), "PPpp"),
          icon_url: `${endpointExtensionContext.env["WEB_URL"]}/email/skill-checklist.png`,
          competency_link: `${endpointExtensionContext.env["WEB_URL"]}/clinician/skills-checklists`,
        })),
        ...userAssignments.policies.map((p: any) => ({
          type: "policy",
          title: p.policies_id.name,
          category: "Policy",
          assigned_on: format(new Date(p.assigned_on), "PPpp"),
          icon_url: `${endpointExtensionContext.env["WEB_URL"]}/email/policy.png`,
          competency_link: `${endpointExtensionContext.env["WEB_URL"]}/clinician/policies`,
        })),
        ...userAssignments.documents.map((d: any) => ({
          type: "document",
          title: d.documents_id.title,
          category: "Document",
          assigned_on: format(new Date(d.assigned_on), "PPpp"),
          icon_url: `${endpointExtensionContext.env["WEB_URL"]}/email/document.png`,
          competency_link: `${endpointExtensionContext.env["WEB_URL"]}/clinician/documents`,
        })),
      ];

      if (emailCompetencies.length > 0 && agency.notifications_settings?.clinician?.new_assignment) {
        const agencyName = agency.name;

        const emailPayload = generateEmailPayload(
          "clinician-new-assignment",
          userAssignments.email,
          `[${agencyName}] New Assignments`,
          {
            props: {
              user: userAssignments,
              competencies: emailCompetencies,
              agency,
              previewText: "New Assignment",
            },
          },
        );

        this.services.mailService.send(emailPayload);
      }
    } catch (e) {
      console.log(e);
    }
  }
  /**
   * welcomeNotification
   * used to send the welcome email to a specific user.
   * @param userId
   * @param agencyId
   * @param endpointExtensionContext
   */
  async welcomeNotification(userId: string, agencyId: string, endpointExtensionContext: EndpointExtensionContext) {
    try {
      const user = await this.services.usersService.readOne(userId);
      const agency = await this.services.agenciesService.readOne(agencyId, {
        fields: ["id", "name", "logo.*", "notifications_settings"],
      });

      if (!user || !agency) {
        throw new Error("User or agency not found");
      }

      if (user.status !== DirectusStatus.ACTIVE) return;

      if (!agency.notifications_settings.clinician.welcome_email) {
        return;
      }

      const payload = {
        email: user.email,
        scope: "password-reset",
        hash: getSimpleHash("" + user.password),
      };

      const secret = endpointExtensionContext.env["SECRET"] as string;
      const token = jwt.sign(payload, secret, { expiresIn: "3d", issuer: "directus" });
      const url = process.env.PASSWORD_RESET_URL_ALLOW_LIST;

      const registrationUrl = `${url}?token=${token}`;

      const subject = `Welcome to the ${agency.name} Family!`;

      const email = generateEmailPayload("welcome", user.email, subject, {
        props: {
          previewText: subject,
          user: {
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          agency: {
            name: agency.name,
            logo: agency.logo?.id,
          },
          registrationUrl,
        },
      });

      await this.services.mailService.send(email);
    } catch (e) {
      console.log(e);
    }
  }
  /**
   * forgotPassword
   * used to send the forgot password email to a specific user
   * @param email
   * @param endpointExtensionContext
   */
  async forgotPassword(email: string, endpointExtensionContext: EndpointExtensionContext) {
    try {
      const users = await this.services.usersService.readByQuery({
        fields: ["status"],
        filter: {
          email: { _eq: email },
        },
      });

      if (users?.length && users[0].status === DirectusStatus.ACTIVE) {
        await this.services.userDirectusService.requestPasswordReset(
          email,
          endpointExtensionContext.env["PASSWORD_RESET_URL_ALLOW_LIST"],
        );
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Expiring Competency Reminder method
   * used to send the competency expiration (45 days) reminder to a specific user.
   * @param userId
   */
  async expiringCompetencyReminder(userId: string, database: any) {
    try {
      console.log(`Starting expiring competency reminder for userId: ${userId}`);

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

      const usersWithExpiringCompetencies: {
        [key: string]: UserCompetency;
      } = {};

      const userExpiringCompetency = new UserExpiringCompetency(database);

      const expiringCompetencyData = await userExpiringCompetency.getExpiryCompetencies(userId);

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
        console.log(`Sending ${emails.length} email reminders.`);
        await Promise.allSettled(emails.map((e: any) => this.services.mailService.send(e)));
      } else {
        console.log("No emails to send.");
      }
    } catch (e) {
      console.error("Error in expiring competency reminder:", e);
    }
  }

  async sendExpiringDueDateReport(userId: string, agencyId: string, database?: any): Promise<void> {
    try {
      const user = await this.services.usersService.readOne(userId);
      const agency = await this.services.agenciesService.readOne(agencyId, {
        fields: ["id", "name", "logo.*", "notifications_settings"],
      });

      if (!user || !agency) {
        throw new Error("User or agency not found");
      }

      if (
        user.role !== UserRole.UsersManager &&
        user.role !== UserRole.AgencyUser &&
        user.role !== UserRole.CredentialingUser
      ) {
        console.log("User Role not allowed to receive this email");
        return;
      }

      const managerDueDateService = new ManagerDueDateReportsService(database);

      const upcomingDueDates = await managerDueDateService.getExpiryCompetencies(userId, agencyId, user.role);
      const csvContent = managerDueDateService.transformToCSV(upcomingDueDates);

      const csvAttachment = {
        filename: `upcoming-due-date-${format(new Date(), "dd-MM-yyyy")}.csv`,
        content: csvContent,
        encoding: "utf-8",
      };

      const weburl = process.env["WEB_URL"]?.replace(/^"|"$/g, "").trim();
      const emailPayload = generateEmailPayload(
        "upcoming-due-date",
        user.email,
        "Weekly Reminder: Clinicians Nearing Competencies Due Date!",
        {
          props: {
            previewText: "Weekly Reminder: Clinicians Nearing Competencies Due Date!",
            agency: {
              name: agency.name,
              logo: agency.logo.id ?? "",
            },
            user: {
              first_name: user.first_name,
              last_name: user.last_name,
            },
            report_link: `${weburl}/admin/dashboard/compliance`,
          },
        },
      );

      await this.services.mailService.send({
        ...emailPayload,
        attachments: [csvAttachment],
      });
    } catch (err) {
      console.error("Error in sendExpiringDueDateReport:", err);
    }
  }

  /**
   * Used to send the competency expiration (45 days) reminder to specific users (Agency Admins and User Manager Role ).
   * Optimized to minimize database load without changing pool settings
   * @param userIds
   * @param agencyId
   */
  async sendExpiringCompetenciesReport(userId: string, agencyId: string, database?: any): Promise<void> {
    try {
      const user = await this.services.usersService.readOne(userId);
      const agency = await this.services.agenciesService.readOne(agencyId, {
        fields: ["id", "name", "logo.*", "notifications_settings"],
      });

      if (!user || !agency) {
        throw new Error("User or agency not found");
      }

      if (
        user.role !== UserRole.UsersManager &&
        user.role !== UserRole.AgencyUser &&
        user.role !== UserRole.CredentialingUser
      ) {
        console.log("User Role not allowed to receive this email");
        return;
      }

      const managerExpiringComptencyService = new ManagerExpiringCompetenciesService(database);

      const data = await managerExpiringComptencyService.getExpiryCompetencies(userId, agencyId, user.role, true);

      const csvContent = managerExpiringComptencyService.transformToCSV(data);
      const secret = process.env["SECRET"]?.replace(/^"|"$/g, "").trim();
      if (!secret) {
        console.error("No SECRET provided for JWT verification");
        return;
      }

      const encodedToken = managerExpiringComptencyService.createDownloadToken(
        user.id,
        user.role,
        agencyId,
        secret,
        true,
      );

      const subject = `Expiring Competencies Report for ${agency.name}`;
      const fileName = `Expiring_Competencies_Report_${format(new Date(), "yyyy-MM-dd")}.csv`;

      const email = generateEmailPayloadWithAttachments({
        templateId: "agency-admin-expiring-competencies-report",
        to: user.email,
        subject: `Expiring Competencies Report for ${agency.name}`,
        templateData: {
          props: {
            previewText: subject,
            user: {
              first_name: user.first_name,
              last_name: user.last_name,
            },
            agency: {
              name: agency.name,
              logo: agency.logo?.id,
            },
            reportDate: format(new Date(), "yyyy-MM-dd"),
            csvDownloadHref: `${process.env.PUBLIC_URL}/user/download-report/${encodedToken}`,
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

      await this.services.mailService.send(email);
    } catch (error) {
      console.error("Error in sendExpiringCompetenciesReports2:", error);
      throw error;
    }
  }
}
