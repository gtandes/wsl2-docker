import { defineHook } from "@directus/extensions-sdk";

import { generateEmailPayload } from "emails";
import { format, formatISO, endOfDay, startOfDay, subDays } from "date-fns";
import { DirectusServices } from "../../common/directus-services";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import { isUserActive } from "../../common/utils";

export default defineHook(({ schedule }, ctx) => {
  schedule("0 5 * * *", async () => {
    const services = await DirectusServices.fromSchedule(ctx);

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
      "agency.name",
      "agency.id",
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

    const getLimits = (date: Date) => {
      return [formatISO(startOfDay(date)), formatISO(endOfDay(date))];
    };

    const passedDueDateCompetenciesFilter = [
      {
        due_date: { _between: getLimits(prevSevenDays) },
      },
      {
        due_date: { _between: getLimits(prevFourteenDays) },
      },
      {
        due_date: { _between: getLimits(prevTwentyOneDays) },
      },
      {
        due_date: { _between: getLimits(prevTwentyEightDays) },
      },
      {
        due_date: { _between: getLimits(prevThirtyFiveDays) },
      },
    ];

    const [passedExams, passedSkillsChecklists, passedModules, passedDocuments, passedPolicies] = await Promise.all([
      services.examAssignmentsService.readByQuery({
        filter: {
          _or: passedDueDateCompetenciesFilter,
          status: {
            _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS, CompetencyState.DUE_DATE_EXPIRED],
          },
          directus_users_id: {
            role: { id: { _eq: UserRole.Clinician } },
            status: { _eq: DirectusStatus.ACTIVE },
          },
        },
        fields: examsFields,
      }),
      services.skillsChecklistsService.readByQuery({
        filter: {
          _or: passedDueDateCompetenciesFilter,
          status: { _in: [CompetencyState.PENDING, CompetencyState.DUE_DATE_EXPIRED] },
          directus_users_id: {
            role: { id: { _eq: UserRole.Clinician } },
            status: { _eq: DirectusStatus.ACTIVE },
          },
        },
        fields: skillChecklistFields,
      }),
      services.modulesAssignmentsService.readByQuery({
        filter: {
          _or: passedDueDateCompetenciesFilter,
          status: { _in: [CompetencyState.PENDING, CompetencyState.STARTED, CompetencyState.DUE_DATE_EXPIRED] },
          directus_users_id: {
            role: { id: { _eq: UserRole.Clinician } },
            status: { _eq: DirectusStatus.ACTIVE },
          },
        },
        fields: modulesFields,
      }),
      services.documentsAssignmentsService.readByQuery({
        filter: {
          _or: passedDueDateCompetenciesFilter,
          status: { _in: [CompetencyState.DUE_DATE_EXPIRED, DirectusStatus.PUBLISHED] },
          read: { _null: true },
          directus_users_id: {
            role: { id: { _eq: UserRole.Clinician } },
            status: { _eq: DirectusStatus.ACTIVE },
          },
        },
        fields: documentsFields,
      }),
      services.policiesAssignmentsService.readByQuery({
        filter: {
          _or: passedDueDateCompetenciesFilter,
          status: { _in: [CompetencyState.DUE_DATE_EXPIRED, DirectusStatus.PUBLISHED] },
          signed_on: { _null: true },
          directus_users_id: {
            role: { id: { _eq: UserRole.Clinician } },
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

    await Promise.allSettled(emails.map((e: any) => services.mailService.send(e)));

    ctx.logger.info(`Sent ${emails.length} due date reminders emails`);
  });
});
