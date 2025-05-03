import { CompetencyType, ExpirationType, UserRole, CompetencyState, UserLogEventType } from "types";
import { DBService } from "../../common/services";
import { AssignmentUser, UsersBy, TCompetencyDetails } from "./types";
import { addDays, addYears } from "date-fns";
import { uniqBy } from "lodash";
import { format } from "date-fns";
import { generateEmailPayload } from "emails";
import intersect from "lodash/intersection";
import { SchemaOverview } from "@directus/types";
import { v4 as uuidv4 } from "uuid";

interface Competencies {
  bundles_ids: string[];
  exams_id: string[];
  documents_id: string[];
  policies_id: string[];
  skills_checklists_id: string[];
  modules_id: string[];
}

interface competencyPayload {
  id: number | string;
  allowedAttempts?: number | string;
  bundle_id?: number;
}

export function getUsersByQuery(usersBy: UsersBy, agency: string) {
  const filter: any = {
    agencies_id: { id: { _eq: agency } },
    directus_users_id: { role: { id: { _eq: UserRole.Clinician } } },
    _or: [],
  };

  if (usersBy?.users?.length) {
    filter._or.push({
      directus_users_id: { id: { _in: usersBy.users.flatMap((us) => us.id) } },
    });
  }
  if (usersBy?.supervisors?.length) {
    filter._or.push({
      supervisors: { directus_users_id: { id: { _in: usersBy.supervisors.flatMap((us) => us.id) } } },
    });
  }
  if (usersBy?.locations?.length) {
    filter._or.push({
      locations: { locations_id: { id: { _in: usersBy.locations.flatMap((us) => us.id) } } },
    });
  }
  if (usersBy?.departments?.length) {
    filter._or.push({
      departments: { departments_id: { id: { _in: usersBy.departments.flatMap((us) => us.id) } } },
    });
  }
  if (usersBy?.specialties?.length) {
    filter._or.push({
      specialties: { specialties_id: { id: { _in: usersBy.specialties.flatMap((us) => us.id) } } },
    });
  }

  return {
    fields: [
      "directus_users_id.id",
      "directus_users_id.first_name",
      "directus_users_id.last_name",
      "directus_users_id.email",
      "directus_users_id.exams.exams_id.id",
      "directus_users_id.sc_definitions.sc_definitions_id.id",
      "directus_users_id.documents.documents_id.id",
      "directus_users_id.modules.modules_definition_id.id",
      "directus_users_id.policies.policies_id.id",
    ],
    filter,
  };
}

export async function getUsersBy(userBy: UsersBy, agency: string, db: DBService): Promise<AssignmentUser[] | null> {
  const userAgenciesServices = db.get("junction_directus_users_agencies");
  let hasUserByFilter = false;

  for (const comp of Object.values(userBy)) {
    if (comp.length) hasUserByFilter = true;
  }

  if (hasUserByFilter) {
    const users = await userAgenciesServices.readByQuery(getUsersByQuery(userBy, agency));
    if (users.length) {
      return users.flatMap((su: any) => ({ ...su.directus_users_id }));
    }
    return null;
  }
  return null;
}

export const getCompetencyTable = (type: CompetencyType): string => {
  let competencyTable: string;

  switch (type) {
    case CompetencyType.EXAM:
      competencyTable = "junction_directus_users_exams";
      break;
    case CompetencyType.MODULE:
      competencyTable = "junction_modules_definition_directus_users";
      break;
    case CompetencyType.DOCUMENT:
      competencyTable = "junction_directus_users_documents";
      break;
    case CompetencyType.POLICY:
      competencyTable = "junction_directus_users_policies";
      break;
    case CompetencyType.SKILL_CHECKLIST:
      competencyTable = "junction_sc_definitions_directus_users";
      break;
  }

  return competencyTable;
};

export const getCompetencyEntityTable = (type: CompetencyType): string => {
  let competencyEntityTable: string = "";

  switch (type) {
    case CompetencyType.EXAM:
      competencyEntityTable = "exams";
      break;
    case CompetencyType.MODULE:
      competencyEntityTable = "modules_definition";
      break;
    case CompetencyType.DOCUMENT:
      competencyEntityTable = "documents";
      break;
    case CompetencyType.POLICY:
      competencyEntityTable = "policies";
      break;
    case CompetencyType.SKILL_CHECKLIST:
      competencyEntityTable = "sc_definitions";
      break;
  }

  return competencyEntityTable;
};

export const getExpirationType = (expirationType: ExpirationType) => {
  switch (expirationType) {
    case ExpirationType.ONE_TIME:
      return ExpirationType.ONE_TIME;
    case ExpirationType.YEARLY:
      return ExpirationType.YEARLY;
    case ExpirationType.BIANNUAL:
      return ExpirationType.BIANNUAL;
    default:
      return ExpirationType.YEARLY;
  }
};

export async function getAgencyDetails(db: DBService, agencyId: string, res: any) {
  const agency = await db.get("agencies").readOne(agencyId);

  if (!agency) {
    return res.status(403).json({ message: "Forbidden: Agency ID is not found." });
  }

  return {
    agency_exams_allow_attempts: agency.custom_allowed_attempts_exams,
    agency_modules_allow_attempts: agency.custom_allowed_attempts_modules,
    agency_due_date: agency.default_due_date,
    agency_expires_on: agency.default_expiration,
    due_date: agency.default_due_date ? addDays(new Date(), agency.default_due_date) : addYears(new Date(), 2),
    agency,
  };
}

function pluck(competencyIds?: string[] | null): competencyPayload[] {
  return competencyIds ? competencyIds.map((id) => ({ id })) : [];
}

export async function getCompetencyAssignmentDetails(db: DBService, competencies: Competencies) {
  let bundles = [];
  let allExams: competencyPayload[] = pluck(competencies.exams_id);
  let allModules: competencyPayload[] = pluck(competencies.modules_id);
  let allSkillsChecklists: competencyPayload[] = pluck(competencies?.skills_checklists_id);
  let allPolicies: competencyPayload[] = pluck(competencies.policies_id);
  let allDocuments: competencyPayload[] = pluck(competencies.documents_id);

  if (competencies.bundles_ids && competencies.bundles_ids.length) {
    const bundleData: any[] = [];
    await Promise.all(
      competencies.bundles_ids.map(async (bid: string) => {
        const bundle = await db.get("bundles").readOne(bid, {
          fields: [
            "id",
            "exams.exams_id.*",
            "exams.exams_id.exam_versions.*",
            "modules.modules_definition_id.*",
            "modules.modules_definition_id.last_version.*",
            "skills_checklists.sc_definitions_id.*",
            "policies.policies_id.*",
            "documents.documents_id.*",
          ],
        });

        bundleData.push(bundle);
      }),
    );
    bundles = bundleData;
  }

  if (bundles.length) {
    bundles.map((b: any) => {
      const bundle_id = b.id;
      if (b.exams.length) {
        allExams = uniqBy([...allExams, ...b.exams.flatMap((be: any) => ({ ...be.exams_id, bundle_id }))], "id");
      }
      if (b.modules.length) {
        allModules = uniqBy(
          [...allModules, ...b.modules.flatMap((bm: any) => ({ ...bm.modules_definition_id, bundle_id }))],
          "id",
        );
      }
      if (b.skills_checklists.length) {
        allSkillsChecklists = uniqBy(
          [
            ...allSkillsChecklists,
            ...b.skills_checklists.flatMap((bsc: any) => ({ ...bsc.sc_definitions_id, bundle_id })),
          ],
          "id",
        );
      }
      if (b.policies.length) {
        allPolicies = uniqBy(
          [...allPolicies, ...b.policies.flatMap((bp: any) => ({ ...bp.policies_id, bundle_id }))],
          "id",
        );
      }
      if (b.documents.length) {
        allDocuments = uniqBy(
          [...allDocuments, ...b.documents.flatMap((bd: any) => ({ ...bd.documents_id, bundle_id }))],
          "id",
        );
      }
    });
  }

  return {
    bundles,
    allExams,
    allModules,
    allSkillsChecklists,
    allPolicies,
    allDocuments,
  };
}

export async function assignmentLogger(
  logger: any,
  logPrefix: string,
  bundles: string[] | number[],
  allUsers: AssignmentUser[],
  allExams: competencyPayload[],
  allSkillsChecklists: competencyPayload[],
  allDocuments: competencyPayload[],
  allPolicies: competencyPayload[],
  allModules: competencyPayload[],
) {
  const usersLog = allUsers.map((user: any) => user.id);
  const bundlesLog = bundles.map((bundle: any) => bundle.id);
  const examLog = createLog(allExams);
  const scLog = createLog(allSkillsChecklists);
  const documentsLog = createLog(allDocuments);
  const policiesLog = createLog(allPolicies);
  const moduleLog = createLog(allModules);

  logger.info(
    `${logPrefix}:  users: ${JSON.stringify(usersLog)}, 
          bundles ids: ${JSON.stringify(bundlesLog)},  
          Exams ids: ${JSON.stringify(examLog)}, 
          Skill checklists ids" ${JSON.stringify(scLog)}, 
          Documents ids: ${JSON.stringify(documentsLog)}, 
          Policies ids: ${JSON.stringify(policiesLog)}, 
          Modules ids: ${JSON.stringify(moduleLog)}`,
  );
}

function createLog(array: any[]) {
  return array.map((item: any) => ({
    id: item.id,
    ...(item.bundle_id && { bundle_id: item.bundle_id }),
  }));
}

export async function emailAssignments(
  env: Record<string, any>,
  allUsers: AssignmentUser[],
  allExams: competencyPayload[],
  allSkillsChecklists: competencyPayload[],
  allDocuments: competencyPayload[],
  allPolicies: competencyPayload[],
  allModules: competencyPayload[],
  agency: any,
  mailService: any,
) {
  const emailCompetencies = [
    ...compileCompetencyDetails(env, allModules, "module", "Module", "module", "modules"),
    ...compileCompetencyDetails(env, allExams, "exam", "Exam", "exam", "exams"),
    ...compileCompetencyDetails(
      env,
      allSkillsChecklists,
      "skill-checklist",
      "Skills Checklist",
      "skill-checklist",
      "skills-checklists",
    ),
    ...compileCompetencyDetails(env, allPolicies, "policy", "Policy", "policy", "policies"),
    ...compileCompetencyDetails(env, allDocuments, "document", "Document", "document", "documents"),
  ];

  if (emailCompetencies.length > 0 && agency.notifications_settings?.clinician?.new_assignment) {
    const agencyName = agency.name;

    const emailPromises = allUsers.map((user) => {
      const emailPayload = generateEmailPayload(
        "clinician-new-assignment",
        user.email,
        `[${agencyName}] New Assignments`,
        {
          props: {
            user,
            competencies: emailCompetencies,
            agency,
            previewText: "New Assignment",
          },
        },
      );

      return mailService.send(emailPayload);
    });

    await Promise.allSettled(emailPromises);
  }
}

function compileCompetencyDetails(env: any, items: any[], type: string, category: string, icon: string, link: string) {
  return items.map((item: any) => ({
    type,
    title: item.title || item.name,
    category,
    assigned_on: format(new Date(), "PPpp"),
    ...(item.allowedAttempts && { allowed_attempts: item.allowedAttempts }),
    icon_url: `${env.WEB_URL}/email/${icon}.png`,
    competency_link: `${env.WEB_URL}/clinician/${link}`,
  }));
}

export async function getCompetencyLatestVersion(
  db: DBService,
  logger: any,
  tableName: string,
  fields: string[],
  matchCase: any,
) {
  return new Promise(async (resolve, reject) => {
    try {
      const latestVersion = await db.get(tableName).readByQuery({
        fields: fields,
        limit: 1,
        match: matchCase,
        sort: ["-date_updated"],
      });

      resolve(latestVersion);
    } catch (e) {
      logger.error(`Get Competency Latest Version: ${e}`);
      reject(e);
    }
  });
}

export async function isCompetencyExisting(db: DBService, tableName: string, matchCase: any) {
  try {
    const competency = await db.get(tableName).readByQuery({
      fields: ["id"],
      match: matchCase,
      limit: 1,
    });

    return competency !== null;
  } catch (e) {
    throw e;
  }
}

export const arraysIntersect = (arr1: any, arr2: any) => {
  const intersection = intersect(arr1, arr2);
  return intersection.length > 0;
};

export async function reassignCompetency(
  schema: SchemaOverview,
  ItemsService: any,
  competency_id: number | string,
  details: TCompetencyDetails,
  type: string,
) {
  const competencyType = type as CompetencyType;
  // Reconfigure to accept _req.accountability when reusing code.
  const db = new DBService(ItemsService, schema, { admin: true });

  const competencyTable: string = getCompetencyTable(competencyType);
  const expiration_type = getExpirationType(details.expiration);
  const competency = await db.get(competencyTable).readOne(competency_id);
  const detailsData: any = {
    agency: competency.agency,
    directus_users_id: competency.directus_users_id,
    due_date: details.due_date,
    expiration_type,
    ...(details.allowed_attempts && { allowed_attempts: details.allowed_attempts }),
  };

  switch (competencyType) {
    case CompetencyType.EXAM:
      detailsData.exams_id = competency.exams_id;
      detailsData.status = CompetencyState.NOT_STARTED;
      // Why not get the latest version?
      detailsData.exam_versions_id = competency.exam_versions_id;
      if (competency.bundle_id) {
        detailsData.bundle_id = competency.bundle_id;
      }
      break;
    case CompetencyType.MODULE:
      detailsData.modules_definition_id = { id: competency.modules_definition_id };
      detailsData.status = CompetencyState.PENDING;
      detailsData.assigned_on = new Date(Date.now());
      detailsData.cert_code = String(Date.now());
      if (competency.bundle_id) {
        detailsData.bundle_id = competency.bundle_id;
      }
      break;
    case CompetencyType.SKILL_CHECKLIST:
      detailsData.sc_definitions_id = { id: competency.sc_definitions_id };
      detailsData.status = CompetencyState.PENDING;
      detailsData.assigned_on = new Date(Date.now());
      if (competency.bundle_id) {
        detailsData.bundle_id = competency.bundle_id;
      }
      break;
    case CompetencyType.DOCUMENT:
      detailsData.documents_id = { id: competency.documents_id };
      if (competency.bundle_id) {
        detailsData.bundle_id = competency.bundle_id;
      }
      break;
    case CompetencyType.POLICY:
      detailsData.policies_id = { id: competency.policies_id };
      if (competency.bundle_id) {
        detailsData.bundle_id = competency.bundle_id;
      }
      break;
  }

  await db.get(competencyTable).updateOne(competency_id, { reassigned: true });
  await db.get(competencyTable).createOne(detailsData);
}

export async function insertUserLog(
  database: any,
  userId: string,
  competency: { id: string | number; type: string; assignmentId: string | number },
  initiatorId: string,
  description: string,
  eventType: UserLogEventType,
) {
  return database("user_logs").insert({
    id: uuidv4(),
    event_type: eventType,
    description,
    competency_type: competency.type,
    competency_id: competency.id,
    directus_users_id: userId,
    initiator_id: initiatorId,
    assignment_id: competency.assignmentId,
    created_on: new Date(),
  });
}
