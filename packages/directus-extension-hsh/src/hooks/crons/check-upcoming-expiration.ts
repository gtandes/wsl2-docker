import { defineHook } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { format } from "date-fns";
import { generateEmailPayload } from "emails";

export default defineHook(async ({ schedule }, ctx) => {
  schedule("0 22 * * 0", async () => {
    const services = await DirectusServices.fromSchedule(ctx);

    const today = new Date();

    const todayISO = today.toISOString();
    const oneMonthLaterISO = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const expiresOnFilter = {
      expires_on: {
        _between: [todayISO, oneMonthLaterISO],
      },
      directus_users_id: {
        status: {
          _eq: "active",
        },
      },
    };

    const directusUsersFields = [
      "directus_users_id.first_name",
      "directus_users_id.last_name",
      "directus_users_id.email",
    ];
    const agencyFields = [
      "agency.name",
      "agency.departments.name",
      "agency.locations.name",
      "agency.id",
      "agency.notifications_settings",
      "agency.directus_users.*.*",
      "agency.logo.*",
    ];

    const skillsChecklists = await services.skillsChecklistsService.readByQuery({
      filter: expiresOnFilter,
      fields: ["*", ...directusUsersFields, ...agencyFields, "sc_definitions_id.title"],
    });

    const modulesAssignments = await services.modulesAssignmentsService.readByQuery({
      filter: expiresOnFilter,
      fields: ["*", ...directusUsersFields, ...agencyFields, "modules_definition_id.title"],
    });

    const examsAssignments = await services.examAssignmentsService.readByQuery({
      filter: expiresOnFilter,
      fields: ["*", ...directusUsersFields, ...agencyFields, "exams_id.title"],
    });

    const policiesAssignments = await services.policiesAssignmentsService.readByQuery({
      filter: expiresOnFilter,
      fields: ["*", ...directusUsersFields, ...agencyFields, "policies_id.name"],
    });

    const documentsAssignments = await services.documentsAssignmentsService.readByQuery({
      filter: expiresOnFilter,
      fields: ["*", ...directusUsersFields, ...agencyFields, "documents_id.title"],
    });

    const assignments = [
      ...skillsChecklists,
      ...modulesAssignments,
      ...examsAssignments,
      ...policiesAssignments,
      ...documentsAssignments,
    ];

    const rawRecipients: any[] = [];

    assignments.forEach((assignment: any) => {
      const recipientsRoles: string[] = [];
      const agencyUserRoleId = "122c0248-4037-49ae-8c82-43a5e7f1d9c5";
      const userManagerRoleId = "fb7c8da4-685c-11ee-8c99-0242ac120002";
      const agencyAdminNotifSettings = assignment.agency.notifications_settings?.agency_admin;
      const userManagerNotifSettings = assignment.agency.notifications_settings?.user_manager;
      if (agencyAdminNotifSettings?.["competency_expiration_report"]) {
        recipientsRoles.push(agencyUserRoleId);
      }
      if (userManagerNotifSettings?.["competency_expiration_report"]) {
        recipientsRoles.push(userManagerRoleId);
      }

      const agencyUsers = assignment.agency.directus_users;

      const agencyRecipients = agencyUsers.filter((u: any) => recipientsRoles.includes(u.directus_users_id.role));

      rawRecipients.push(...agencyRecipients);
    });

    const agencyIdSet = new Set();

    const recipients = rawRecipients.filter((r: any) => {
      const agencyId = r.agencies_id.id;

      const userEmail = r.directus_users_id.email;

      if (!agencyIdSet.has(`${agencyId}-${userEmail}`)) {
        agencyIdSet.add(`${agencyId}-${userEmail}`);
        return true;
      }
      return false;
    });

    const headers = [
      "Date/Time Generated",
      "First Name",
      "Last Name",
      "Email",
      "User Created On Date",
      "User Last Access",
      "Department",
      "Location",
      "Specialties",
      "Supervisors",
      "Content Title",
      "Content Type",
      "Frequency",
      "Due Date",
      "Expiry Date",
      "Allowed Attempts",
      "Number of Attempts Used",
      "Status",
    ].join(",");

    const skillsChecklistsCSVRows = skillsChecklists.reduce((acc: string[], curr: any) => {
      const row = [
        format(new Date(curr.assigned_on), "dd MMMM YYY"),
        curr.directus_users_id.first_name,
        curr.directus_users_id.last_name,
        curr.directus_users_id.email,
        "-",
        "-",
        curr.agency.departments.map((d: any) => d.name).join(", "),
        curr.agency.locations.map((l: any) => l.name).join(", "),
        "-",
        "-",
        curr.sc_definitions_id.title,
        "Skills Checklist",
        "-",
        format(new Date(curr.due_date), "dd MMMM YYY"),
        "-",
        "-",
        "-",
        curr.status,
      ];

      acc.push(row.join(","));

      return acc;
    }, []);

    const policiesCSVRows = policiesAssignments.reduce((acc: string[], curr: any) => {
      const row = [
        format(new Date(curr.assigned_on), "dd MMMM YYY"),
        curr.directus_users_id.first_name,
        curr.directus_users_id.last_name,
        curr.directus_users_id.email,
        "-",
        "-",
        curr.agency.departments.map((d: any) => d.name).join(", "),
        curr.agency.locations.map((l: any) => l.name).join(", "),
        "-",
        "-",
        curr.policies_id.name,
        "Policy",
        "-",
        "-",
        format(new Date(curr.expires_on), "dd MMMM YYY"),
        "-",
        "-",
        curr.status,
      ];

      acc.push(row.join(","));

      return acc;
    }, []);

    const modulesCSVRows = modulesAssignments.reduce((acc: string[], curr: any) => {
      const row = [
        format(new Date(curr.assigned_on), "dd MMMM YYY"),
        curr.directus_users_id.first_name,
        curr.directus_users_id.last_name,
        curr.directus_users_id.email,
        "-",
        "-",
        curr.agency.departments.map((d: any) => d.name).join(", "),
        curr.agency.locations.map((l: any) => l.name).join(", "),
        "-",
        "-",
        curr.modules_definition_id.title,
        "Module",
        "-",
        format(new Date(curr.due_date), "dd MMMM YYY"),
        "-",
        curr.allowed_attempts,
        curr.attempts_used,
        curr.status,
      ];

      acc.push(row.join(","));

      return acc;
    }, []);

    const examsCSVRows = examsAssignments.reduce((acc: string[], curr: any) => {
      const row = [
        format(new Date(curr.assigned_on), "dd MMMM YYY"),
        curr.directus_users_id.first_name,
        curr.directus_users_id.last_name,
        curr.directus_users_id.email,
        "-",
        "-",
        curr.agency.departments.map((d: any) => d.name).join(", "),
        curr.agency.locations.map((l: any) => l.name).join(", "),
        "-",
        "-",
        curr.exams_id.title,
        "Exam",
        "-",
        format(new Date(curr.due_date), "dd MMMM YYY"),
        "-",
        curr.allowed_attempts,
        curr.attempts_used,
        curr.status,
      ];

      acc.push(row.join(","));

      return acc;
    }, []);

    const documentsCSVRows = documentsAssignments.reduce((acc: string[], curr: any) => {
      const row = [
        format(new Date(curr.assigned_on), "dd MMMM YYY"),
        curr.directus_users_id.first_name,
        curr.directus_users_id.last_name,
        curr.directus_users_id.email,
        "-",
        "-",
        curr.agency.departments.map((d: any) => d.name).join(", "),
        curr.agency.locations.map((l: any) => l.name).join(", "),
        "-",
        "-",
        curr.documents_id.title,
        "Document",
        "-",
        "-",
        format(new Date(curr.expires_on), "dd MMMM YYY"),
        "-",
        "-",
        curr.status,
      ];

      acc.push(row.join(","));

      return acc;
    }, []);

    const csv = [
      headers,
      ...skillsChecklistsCSVRows,
      ...policiesCSVRows,
      ...modulesCSVRows,
      ...examsCSVRows,
      ...documentsCSVRows,
    ].join("\n");

    const emails = recipients.map((r: any) =>
      generateEmailPayload(
        "upcoming-expiration",
        r.directus_users_id.email,
        "Weekly Reminder: Clinicians Competencies Expirations Approaching!",
        {
          props: {
            previewText: "Weekly Reminder: Clinicians Competencies Expirations Approaching!",
            agency: {
              name: r.agencies_id.name,
              logo: r.agencies_id.logo ? `${ctx.env.WEB_URL}/cms/assets/${r.agencies_id.logo.filename_disk}` : "",
            },
            user: r.directus_users_id,
            report_link: `${ctx.env.WEB_URL}/admin/dashboard/compliance`,
          },
        },
      ),
    );

    await Promise.allSettled(
      emails.map((e: any) =>
        services.mailService.send({
          ...e,
          attachments: [
            {
              filename: `upcoming-due-date-${format(new Date(), "dd-MM-yyyy")}.csv`,
              content: csv,
              encoding: "utf-8",
            },
          ],
        }),
      ),
    );

    ctx.logger.info(
      `CHECK_UPCOMING_DUE_DATE_CRON: Found ${skillsChecklists.length} skills checklists, ${policiesAssignments.length} policies, ${modulesAssignments.length} modules, ${examsAssignments.length} exams, ${documentsAssignments.length} documents with upcoming due date`,
    );
  });
});
