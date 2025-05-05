import { addDays, format, formatISO } from "date-fns";
import { DirectusServices } from "../../common/directus-services";
import { ReportType } from "./reports";
import { stringifyCSV } from "../../common/utils";

export async function getSkillsChecklistReport(
  services: DirectusServices,
  type: ReportType,
  agency: string,
  ids: string[],
) {
  let csv;

  switch (type) {
    case ReportType.AGGREGATE:
      csv = await handleAggregateReport(services, agency);
      break;

    case ReportType.SPECIFIC:
      csv = await handleSpecificReport(services, agency, ids);
      break;

    default:
      throw new Error("Invalid report type");
  }

  return csv;
}

async function handleSpecificReport(services: DirectusServices, agency: string, ids: string[]) {
  const featureFlags = await services.featureFlagsService.readByQuery({
    filter: { flag_key: { _eq: "is_skill_checklist_new_format_enabled" } },
    fields: ["id", "enabled"],
  });

  const isNewFormatEnabled = featureFlags?.[0]?.enabled;
  const headers = isNewFormatEnabled
    ? [
        "SC TITLE",
        "SC ID",
        "SPECIALTY",
        "DEPARTMENT",
        "LOCATION",
        "EMAIL",
        "TENANT",
        "SECTION",
        "ITEM",
        "SKILL RESPONSE",
        "FREQUENCY RESPONSE",
        "PROFICIENCY RESPONSE",
      ]
    : [
        "SC TITLE",
        "SC ID",
        "SPECIALTY",
        "DEPARTMENT",
        "LOCATION",
        "EMAIL",
        "TENANT",
        "SECTION",
        "ITEM",
        "SKILL RESPONSE",
        "FREQUENCY RESPONSE",
      ];

  const body: string[][] = [];

  const skillsChecklists = await services.skillsChecklistsService.readByQuery({
    fields: [
      "assigned_on",
      "finished_on",
      "status",
      "agency.id",
      "agency.name",
      "questions",
      "sc_definitions_id.id",
      "sc_definitions_id.title",
      "directus_users_id.email",
      "directus_users_id.agencies.locations.locations_id.name",
      "directus_users_id.agencies.departments.departments_id.name",
      "directus_users_id.agencies.specialties.specialties_id.name",
      "directus_users_id.agencies.agencies_id.id",
      "directus_users_id.agencies.agencies_id.name",
    ],
    filter: {
      ...(agency !== "all" && { agency: { id: { _eq: agency } } }),
      sc_definitions_id: { id: { _in: ids } },
      assigned_on: { _between: [formatISO(addDays(new Date(), -90)), formatISO(new Date())] },
    },
    sort: ["-assigned_on"],
    limit: -1,
  });

  skillsChecklists.forEach((sc: any) => {
    let locations: string[] = [];
    let departments: string[] = [];
    let specialties: string[] = [];

    const scAgency = sc.directus_users_id.agencies.find((agency: any) => agency?.agencies_id?.id === sc?.agency?.id);

    if (scAgency) {
      locations = scAgency.locations.map((location: any) => location.locations_id?.name);
      departments = scAgency.departments.map((department: any) => department.departments_id?.name);
      specialties = scAgency.specialties.map((specialty: any) => specialty.specialties_id?.name);
    }

    if (!sc.questions) return;

    sc.questions.forEach((q: any) => {
      q.sections.forEach((s: any) => {
        s.items.forEach((i: any) => {
          if (isNewFormatEnabled) {
            body.push([
              sc.sc_definitions_id?.title,
              sc.sc_definitions_id?.id,
              specialties.join(", "),
              departments.join(", "),
              locations.join(", "),
              sc.directus_users_id?.email,
              sc.agency?.name,
              s?.title,
              i?.title,
              i?.skill,
              i?.frequency,
              i?.proficiency,
            ]);
          } else {
            body.push([
              sc.sc_definitions_id?.title,
              sc.sc_definitions_id?.id,
              specialties.join(", "),
              departments.join(", "),
              locations.join(", "),
              sc.directus_users_id?.email,
              sc.agency?.name,
              s?.title,
              i?.title,
              i?.skill,
              i?.frequency,
            ]);
          }
        });
      });
    });
  });

  return stringifyCSV(headers, body);
}

async function handleAggregateReport(services: DirectusServices, agency: string) {
  const headers = [
    "TITLE",
    "ASSIGNED",
    "COMPLETED",
    "STATUS",
    "TENANT",
    "EMAIL",
    "LOCATION",
    "DEPARTMENT",
    "SPECIALTY",
    "SUPERVISORS",
    "CATEGORY 1",
    "CATEGORY 2",
    "CATEGORY 3",
  ];

  const body: string[][] = [];

  const skillsChecklists = await services.skillsChecklistsService.readByQuery({
    fields: [
      "assigned_on",
      "finished_on",
      "status",
      "agency.id",
      "agency.name",
      "sc_definitions_id.title",
      "sc_definitions_id.category.title",
      "sc_definitions_id.speciality.title",
      "sc_definitions_id.sub_speciality.title",
      "directus_users_id.email",
      "directus_users_id.agencies.supervisors.directus_users_id.email",
      "directus_users_id.agencies.locations.locations_id.name",
      "directus_users_id.agencies.departments.departments_id.name",
      "directus_users_id.agencies.specialties.specialties_id.name",
      "directus_users_id.agencies.agencies_id.id",
      "directus_users_id.agencies.agencies_id.name",
    ],
    filter: {
      ...(agency !== "all" && { agency: { id: { _eq: agency } } }),
      assigned_on: { _between: [formatISO(addDays(new Date(), -90)), formatISO(new Date())] },
    },
    sort: ["-assigned_on"],
    limit: -1,
  });

  skillsChecklists.forEach((sc: any) => {
    let supervisors = [];
    let locations = [];
    let departments = [];
    let specialties = [];

    const scAgency = sc.directus_users_id.agencies.find((agency: any) => agency.agencies_id?.id === sc?.agency?.id);

    if (scAgency) {
      supervisors = scAgency.supervisors.map((supervisor: any) => supervisor.directus_users_id.email);
      locations = scAgency.locations.map((location: any) => location.locations_id.name);
      departments = scAgency.departments.map((department: any) => department.departments_id.name);
      specialties = scAgency.specialties.map((specialty: any) => specialty.specialties_id.name);
    }

    body.push([
      sc.sc_definitions_id?.title,
      format(new Date(sc.assigned_on), "MM/dd/yyyy"),
      sc.finished_on ? format(new Date(sc.finished_on), "MM/dd/yyyy") : "",
      sc.status,
      sc.agency?.name,
      sc.directus_users_id?.email,
      locations.join(", "),
      departments.join(", "),
      specialties.join(", "),
      supervisors.join(", "),
      sc.sc_definitions_id?.category?.title,
      sc.sc_definitions_id?.speciality?.title || "",
      sc.sc_definitions_id?.sub_speciality?.title || "",
    ]);
  });

  return stringifyCSV(headers, body);
}
