import { defineEndpoint } from "@directus/extensions-sdk";
import { body } from "express-validator";
import { DBService } from "../../common/services";
import { uniqBy } from "lodash";
import { AssignmentUser, CompetencyUpdateDetails } from "./types";
import {
  getCompetencyTable,
  getExpirationType,
  getUsersBy,
  arraysIntersect,
  insertUserLog,
  getCompetencyEntityTable,
} from "./utilities";
import { addDays, addYears, format, parseISO } from "date-fns";
import { CompetencyState, CompetencyType, DirectusStatus, UserLogEventType, UserRole, controlExpiration } from "types";
import { generateEmailPayload } from "emails";

const LOG_PREFIX = "ASSIGNMENTS COMPETENCIES";

export default defineEndpoint((router, { services, logger, database, env }) => {
  const { ItemsService, MailService } = services;

  router.post(
    "/competencies",
    body("users_by").notEmpty(),
    body("competencies").notEmpty(),
    body("agency").notEmpty(),
    async (_req: any, res: any) => {
      const { competencies, users_by, details, agency: agencyId } = _req.body;
      const db = new DBService(ItemsService, _req.schema, _req.accountability);
      const userServices = db.get("directus_users");
      const userExamsServices = db.get("junction_directus_users_exams");
      const userScServices = db.get("junction_sc_definitions_directus_users");
      const userModulesServices = db.get("junction_modules_definition_directus_users");
      const userDocumentsServices = db.get("junction_directus_users_documents");
      const userPoliciesServices = db.get("junction_directus_users_policies");

      if (!agencyId || !_req.accountability.user) {
        return res.sendStatus(403);
      }

      try {
        const accountability = await userServices.readOne(_req.accountability.user, {
          fields: ["id", "role.id", "agencies.agencies_id"],
        });

        if (accountability?.role?.id !== UserRole.HSHAdmin) {
          const accountabilityAgencies: string[] = accountability.agencies.map((a: any) => a.agencies_id);
          if (!accountabilityAgencies.includes(agencyId)) {
            return res.send(403, {
              errors: [
                {
                  message: "Agency not allowed",
                },
              ],
            });
          }
        }
      } catch (e) {
        logger.error(`${LOG_PREFIX}: ${e}`);
        return res.sendStatus(400);
      }

      const agency = await db.get("agencies").readOne(agencyId);
      let detailsData = details;
      if (!detailsData) {
        detailsData = { due_date: "", expiration: "", allowed_attempts: "" };
      }

      const mailService = new MailService({
        schema: _req.schema,
        knex: database,
      });

      try {
        const agency_exams_allow_attempts = agency.custom_allowed_attempts_exams;
        const agency_modules_allow_attempts = agency.custom_allowed_attempts_modules;
        const agency_due_date = agency.default_due_date;
        const agency_expires_on = agency.default_expiration;

        const due_date = detailsData.due_date
          ? detailsData.due_date
          : agency_due_date
          ? addDays(new Date(), agency_due_date)
          : addYears(new Date(), 2);

        let allUsers: AssignmentUser[] = [];
        let allExams = competencies.exams || [];
        let allModules = competencies.modules || [];
        let allSkillsChecklists = competencies.skills_checklists || [];
        let allPolicies = competencies.policies || [];
        let allDocuments = competencies.documents || [];

        //gathering all bundle competencies to assign them to the users
        let bundles = competencies.bundles;

        if (competencies.bundle_ids && competencies.bundle_ids.length) {
          const bundleData: any[] = [];
          await Promise.all(
            competencies.bundle_ids.map(async (bid: string) => {
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

        //get all users by users, supervisor, specialties, departments and locations
        const usersBy = await getUsersBy(users_by, agencyId, db);
        if (usersBy) {
          allUsers = uniqBy([...usersBy], "id");
        }

        // assign competencies to the users
        await Promise.all(
          allUsers.map((user) => {
            //assign Exams
            if (allExams.length) {
              allExams.map(async (exam: any) => {
                try {
                  const userHasExam = await userServices.readByQuery({
                    fields: ["exams.status"],
                    filter: {
                      _and: [
                        { id: { _eq: user.id } },
                        { exams: { agency: { id: { _eq: agencyId } } } },
                        { exams: { exams_id: { id: { _eq: exam.id } } } },
                        { exams: { status: { _neq: DirectusStatus.ARCHIVED } } },
                      ],
                    },
                  });

                  if (
                    !userHasExam.length ||
                    [CompetencyState.COMPLETED, CompetencyState.EXPIRED].includes(userHasExam?.[0].exams?.status)
                  ) {
                    const exam_version = exam.exam_versions.at(exam.exam_versions.length - 1);
                    const expiration_type = getExpirationType(
                      detailsData.expiration || exam_version?.expiration || agency_expires_on,
                    );

                    const assignedCompetencyId = await userExamsServices.createOne({
                      agency: agencyId,
                      exams_id: exam.id,
                      directus_users_id: user.id,
                      allowed_attempts: detailsData.allowed_attempts
                        ? detailsData.allowed_attempts
                        : agency_exams_allow_attempts
                        ? agency_exams_allow_attempts
                        : exam_version.allowed_attempts,
                      status: CompetencyState.NOT_STARTED,
                      due_date,
                      exam_versions_id: exam_version.id,
                      expiration_type,
                      ...(exam.bundle_id && { bundle_id: exam.bundle_id }),
                    });

                    await insertUserLog(
                      database,
                      user.id,
                      { id: exam.id, type: CompetencyType.EXAM, assignmentId: assignedCompetencyId },
                      _req.accountability.user,
                      `Assigned ${exam.title}`,
                      UserLogEventType.ASSIGNED,
                    );
                  }
                } catch (e) {
                  logger.error(`${LOG_PREFIX}: ${e}`);
                }
              });
            }

            //assign skill checklists
            if (allSkillsChecklists.length) {
              allSkillsChecklists.map(async (sc: any) => {
                try {
                  const userHasSkill = await userServices.readByQuery({
                    fields: ["id"],
                    filter: {
                      _and: [
                        { id: { _eq: user.id } },
                        { sc_definitions: { agency: { id: { _eq: agencyId } } } },
                        { sc_definitions: { sc_definitions_id: { id: { _eq: sc.id } } } },
                        { sc_definitions: { status: { _neq: DirectusStatus.ARCHIVED } } },
                      ],
                    },
                  });
                  if (!userHasSkill.length) {
                    const expiration_type = getExpirationType(
                      detailsData.expiration || sc.last_version?.expiration || agency_expires_on,
                    );
                    const assignedCompetencyId = await userScServices.createOne({
                      agency: agencyId,
                      directus_users_id: { id: user.id },
                      sc_definitions_id: { id: sc.id },
                      status: CompetencyState.PENDING,
                      due_date,
                      assigned_on: new Date(Date.now()),
                      expiration_type,
                      ...(sc?.bundle_id && { bundle_id: sc?.bundle_id }),
                    });
                    await insertUserLog(
                      database,
                      user.id,
                      {
                        id: sc.id,
                        type: CompetencyType.SKILL_CHECKLIST,
                        assignmentId: assignedCompetencyId,
                      },
                      _req.accountability.user,
                      `Assigned ${sc.title}`,
                      UserLogEventType.ASSIGNED,
                    );
                  }
                } catch (e) {
                  logger.error(`${LOG_PREFIX}: ${e}`);
                }
              });
            }

            //assign documents
            if (allDocuments.length) {
              allDocuments.map(async (document: any) => {
                try {
                  const userHasDocument = await userServices.readByQuery({
                    fields: ["id"],
                    filter: {
                      _and: [
                        { id: { _eq: user.id } },
                        { documents: { agency: { id: { _eq: agencyId } } } },
                        { documents: { documents_id: { id: { _eq: document.id } } } },
                        { documents: { status: { _neq: DirectusStatus.ARCHIVED } } },
                      ],
                    },
                  });
                  if (!userHasDocument.length) {
                    const expiration_type = getExpirationType(detailsData.expiration || agency_expires_on);
                    const assignedCompetencyId = await userDocumentsServices.createOne({
                      agency: agencyId,
                      directus_users_id: { id: user.id },
                      documents_id: { id: document.id },
                      due_date,
                      expiration_type,
                      ...(document?.bundle_id && { bundle_id: document?.bundle_id }),
                    });
                    await insertUserLog(
                      database,
                      user.id,
                      {
                        id: document.id,
                        type: CompetencyType.POLICY,
                        assignmentId: assignedCompetencyId,
                      },
                      _req.accountability.user,
                      `Assigned ${document.title}`,
                      UserLogEventType.ASSIGNED,
                    );
                  }
                } catch (e) {
                  logger.error(`${LOG_PREFIX}: ${e}`);
                }
              });
            }
            //assign policies
            if (allPolicies.length) {
              allPolicies.map(async (policy: any) => {
                try {
                  const userHasPolicy = await userServices.readByQuery({
                    fields: ["id"],
                    filter: {
                      _and: [
                        { id: { _eq: user.id } },
                        { policies: { agency: { id: { _eq: agencyId } } } },
                        { policies: { policies_id: { id: { _eq: policy.id } } } },
                        { policies: { status: { _neq: DirectusStatus.ARCHIVED } } },
                      ],
                    },
                  });
                  if (!userHasPolicy.length) {
                    const expiration_type = getExpirationType(detailsData.expiration || agency_expires_on);
                    const assignedCompetencyId = await userPoliciesServices.createOne({
                      agency: agencyId,
                      directus_users_id: { id: user.id },
                      policies_id: { id: policy.id },
                      due_date,
                      expiration_type,
                      ...(policy?.bundle_id && { bundle_id: policy?.bundle_id }),
                    });

                    await insertUserLog(
                      database,
                      user.id,
                      {
                        id: policy.id,
                        type: CompetencyType.POLICY,
                        assignmentId: assignedCompetencyId,
                      },
                      _req.accountability.user,
                      `Assigned ${policy.name}`,
                      UserLogEventType.ASSIGNED,
                    );
                  }
                } catch (e) {
                  logger.error(`${LOG_PREFIX}: ${e}`);
                }
              });
            }

            //assign modules
            if (allModules.length) {
              allModules.map(async (module: any) => {
                try {
                  const userHasModule = await userServices.readByQuery({
                    fields: ["id"],
                    filter: {
                      _and: [
                        { id: { _eq: user.id } },
                        { modules: { agency: { id: { _eq: agencyId } } } },
                        { modules: { modules_definition_id: { id: { _eq: module.id } } } },
                        { modules: { status: { _neq: DirectusStatus.ARCHIVED } } },
                      ],
                    },
                  });
                  if (!userHasModule.length) {
                    const module_version = module.last_version;
                    const expiration_type = getExpirationType(
                      detailsData.expiration || module_version?.expiration || agency_expires_on,
                    );
                    const assignedCompetencyId = await userModulesServices.createOne({
                      agency: agencyId,
                      directus_users_id: { id: user.id },
                      modules_definition_id: { id: module.id },
                      due_date,
                      assigned_on: new Date(Date.now()),
                      cert_code: String(Date.now()),
                      allowed_attempts: detailsData.allowed_attempts
                        ? detailsData.allowed_attempts
                        : agency_modules_allow_attempts
                        ? agency_modules_allow_attempts
                        : module_version.allowed_attempts || 3,
                      expiration_type,
                      ...(module?.bundle_id && { bundle_id: module?.bundle_id }),
                    });

                    await insertUserLog(
                      database,
                      user.id,
                      {
                        id: module.id,
                        type: CompetencyType.MODULE,
                        assignmentId: assignedCompetencyId,
                      },
                      _req.accountability.user,
                      `Assigned ${module.title}`,
                      UserLogEventType.ASSIGNED,
                    );
                  }
                } catch (e) {
                  logger.error(`${LOG_PREFIX}: ${e}`);
                }
              });
            }
          }),
        );

        const usersLog = allUsers.map((user: any) => user.id);
        const bundlesLog = bundles.map((bundle: any) => bundle.id);
        const examLog = allExams.map((exam: any) => ({
          id: exam.id,
          ...(exam.bundle_id && { bundle_id: exam.bundle_id }),
        }));
        const scLog = allSkillsChecklists.map((sc: any) => ({
          id: sc.id,
          ...(sc?.bundle_id && { bundle_id: sc?.bundle_id }),
        }));
        const documentsLog = allDocuments.map((document: any) => ({
          id: document.id,
          ...(document?.bundle_id && { bundle_id: document?.bundle_id }),
        }));
        const policiesLog = allPolicies.map((policy: any) => ({
          id: policy.id,
          ...(policy?.bundle_id && { bundle_id: policy?.bundle_id }),
        }));
        const moduleLog = allModules.map((module: any) => ({
          id: module.id,
          ...(module?.bundle_id && { bundle_id: module?.bundle_id }),
        }));

        logger.info(
          `${LOG_PREFIX}: ${JSON.stringify({
            users: usersLog,
            bundles_ids: bundlesLog,
            exams_ids: examLog,
            sc_ids: scLog,
            documents_ids: documentsLog,
            policies_ids: policiesLog,
            modules_ids: moduleLog,
          })}`,
        );

        const emailCompetencies = [
          ...allModules.map((m: any) => ({
            type: "module",
            title: m.title,
            category: "Module",
            assigned_on: format(new Date(), "PPpp"),
            allowed_attempts: detailsData.allowed_attempts
              ? detailsData.allowed_attempts
              : m.last_version.allowed_attempts,
            icon_url: `${env.WEB_URL}/email/module.png`,
            competency_link: `${env.WEB_URL}/clinician/modules`,
          })),
          ...allExams.map((e: any) => ({
            type: "exam",
            title: e.title,
            category: "Exam",
            assigned_on: format(new Date(), "PPpp"),
            allowed_attempts: detailsData.allowed_attempts
              ? detailsData.allowed_attempts
              : e.exam_versions.at(0).allowed_attempts,
            icon_url: `${env.WEB_URL}/email/exam.png`,
            competency_link: `${env.WEB_URL}/clinician/exams`,
          })),
          ...allSkillsChecklists.map((sc: any) => ({
            type: "skill-checklist",
            title: sc.title,
            category: "Skills Checklist",
            assigned_on: format(new Date(), "PPpp"),
            icon_url: `${env.WEB_URL}/email/skill-checklist.png`,
            competency_link: `${env.WEB_URL}/clinician/skills-checklists`,
          })),
          ...allPolicies.map((p: any) => ({
            type: "policy",
            title: p.name,
            category: "Policy",
            assigned_on: format(new Date(), "PPpp"),
            icon_url: `${env.WEB_URL}/email/policy.png`,
            competency_link: `${env.WEB_URL}/clinician/policies`,
          })),
          ...allDocuments.map((d: any) => ({
            type: "document",
            title: d.title,
            category: "Document",
            assigned_on: format(new Date(), "PPpp"),
            icon_url: `${env.WEB_URL}/email/document.png`,
            competency_link: `${env.WEB_URL}/clinician/documents`,
          })),
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

        return res.sendStatus(200);
      } catch (e) {
        logger.error(`${LOG_PREFIX}: ${e}`);
        return res.sendStatus(400);
      }
    },
  );

  /**
   * Edit Competency
   */
  router.patch(
    "/competency",
    body("competency_id").notEmpty(),
    body("type").notEmpty(),
    body("details").notEmpty(),
    async (_req: any, res: any) => {
      try {
        const { competency_id, details, type } = _req.body;
        const competencyType = type as CompetencyType;
        const db = new DBService(ItemsService, _req.schema, _req.accountability);
        const expiration_type = getExpirationType(details.expiration);
        const detailsData = {
          due_date: details.due_date + " 23:59:59",
          expiration_type,
          ...(details.allowed_attempts && { allowed_attempts: details.allowed_attempts }),
        };
        const competencyTable: string = getCompetencyTable(competencyType);
        await db.get(competencyTable).updateOne(competency_id, detailsData);

        const relationMap = {
          Exam: "exams_id",
          Policy: "policies_id",
          Document: "documents_id",
          Module: "modules_definitions_id",
          "Skill Checklist": "sc_definitions_id",
        };

        const competenyDetails = await database(competencyTable).select("*").where({ id: competency_id });

        if (competenyDetails) {
          const detailsDataMapped = Object.entries(detailsData)
            .map(([key, value]) => `${key.replace("_", " ")}: ${value}`)
            .join(", ");

          await insertUserLog(
            database,
            competenyDetails[0].directus_users_id,
            {
              id: competenyDetails[0][relationMap[competencyType]],
              type: competencyType,
              assignmentId: competency_id,
            },
            _req.accountability.user,
            `Updated : ${detailsDataMapped}`,
            UserLogEventType.UPDATED,
          );
        }
        return res.sendStatus(200);
      } catch (e) {
        logger.error(`EDIT COMPETENCY: ${e}`);
        return res.sendStatus(400);
      }
    },
  );

  /**
   * Reassign Competency
   */

  // TODO : Use the shared code in src/endpoints/assignments/utilities.ts
  router.post(
    "/reassign",
    body("competency_id").notEmpty(),
    body("type").notEmpty(),
    body("details").notEmpty(),
    async (_req: any, res: any) => {
      try {
        const { competency_id, details, type } = _req.body;
        const competencyType = type as CompetencyType;
        const db = new DBService(ItemsService, _req.schema, _req.accountability);

        const competencyTable: string = getCompetencyTable(competencyType);
        const competencyEntityTable: string = getCompetencyEntityTable(competencyType);

        const expiration_type = getExpirationType(details.expiration);
        const competency = await db.get(competencyTable).readOne(competency_id);
        const detailsData = {
          agency: competency.agency,
          directus_users_id: competency.directus_users_id,
          due_date: details.due_date,
          expiration_type,
          ...(details.allowed_attempts && { allowed_attempts: details.allowed_attempts }),
        };

        switch (competencyType) {
          case CompetencyType.EXAM:
            detailsData.competencyId = competency.exams_id;
            detailsData.exams_id = competency.exams_id;
            detailsData.status = CompetencyState.NOT_STARTED;
            detailsData.exam_versions_id = competency.exam_versions_id;
            if (competency.bundle_id) {
              detailsData.bundle_id = competency.bundle_id;
            }
            break;
          case CompetencyType.MODULE:
            detailsData.competencyId = competency.modules_definition_id;
            detailsData.modules_definition_id = { id: competency.modules_definition_id };
            detailsData.status = CompetencyState.PENDING;
            detailsData.assigned_on = new Date(Date.now());
            detailsData.cert_code = String(Date.now());
            if (competency.bundle_id) {
              detailsData.bundle_id = competency.bundle_id;
            }
            break;
          case CompetencyType.SKILL_CHECKLIST:
            detailsData.competencyId = competency.sc_definitions_id;
            detailsData.sc_definitions_id = { id: competency.sc_definitions_id };
            detailsData.status = CompetencyState.PENDING;
            detailsData.assigned_on = new Date(Date.now());
            if (competency.bundle_id) {
              detailsData.bundle_id = competency.bundle_id;
            }
            break;
          case CompetencyType.DOCUMENT:
            detailsData.competencyId = competency.documents_id;
            detailsData.documents_id = { id: competency.documents_id };
            if (competency.bundle_id) {
              detailsData.bundle_id = competency.bundle_id;
            }
            break;
          case CompetencyType.POLICY:
            detailsData.competencyId = competency.policies_id;
            detailsData.policies_id = { id: competency.policies_id };
            if (competency.bundle_id) {
              detailsData.bundle_id = competency.bundle_id;
            }
            break;
        }

        await db.get(competencyTable).updateOne(competency_id, { reassigned: true });

        const assignmentId = await db.get(competencyTable).createOne(detailsData);

        try {
          const dbAdmin = new DBService(ItemsService, _req.schema, { admin: true });

          const userServices = dbAdmin.get("directus_users");
          const agencyServices = dbAdmin.get("agencies");
          const competencyServices = dbAdmin.get(competencyEntityTable);

          const user = await userServices.readOne(competency.directus_users_id, {
            fields: ["email", "first_name", "last_name"],
          });

          const agency = await agencyServices.readOne(competency.agency, {
            fields: ["name", "logo"],
          });

          const entityId =
            competency.exams_id ||
            competency.modules_definition_id ||
            competency.documents_id ||
            competency.policies_id ||
            competency.sc_definitions_id;

          const entityDetails = await competencyServices.readOne(entityId, {
            fields: [type === CompetencyType.POLICY ? "name" : "title"],
          });

          const formattedCompetencyType = competencyType.toLowerCase().replace(/\s+/g, "-");

          const emailCompetencies = [
            {
              type: formattedCompetencyType,
              title: entityDetails.title || entityDetails.name,
              category: competencyType,
              assigned_on: format(new Date(), "PPpp"),
              ...(competency.allowed_attempts && { allowed_attempts: competency.allowed_attempts }),
              icon_url: `${env.WEB_URL}/email/${formattedCompetencyType}.png`,
              competency_link:
                formattedCompetencyType === "policy"
                  ? `${env.WEB_URL}/clinician/policies`
                  : `${env.WEB_URL}/clinician/${formattedCompetencyType}s`,
            },
          ];

          const emailPayload = generateEmailPayload(
            "clinician-new-assignment",
            user.email,
            `[${agency.name}] Competency Reassignment`,
            {
              props: {
                user: {
                  email: user.email,
                  first_name: user.first_name,
                  last_name: user.last_name,
                },
                competencies: emailCompetencies,
                agency,
                previewText: `[${agency.name}] Competency Reassignment`,
              },
            },
          );

          const mailService = new MailService({
            schema: _req.schema,
            knex: database,
          });

          mailService.send(emailPayload);
        } catch (e) {
          logger.error(`Reasssign : ${e}`);
        }

        await insertUserLog(
          database,
          competency.directus_users_id,
          {
            id: detailsData.competencyId,
            type,
            assignmentId,
          },
          _req.accountability.user,
          `Competency Reassigned`,
          UserLogEventType.REASSIGNED,
        );

        await insertUserLog(
          database,
          competency.directus_users_id,
          {
            id: detailsData.competencyId,
            type,
            assignmentId: competency_id as string | number,
          },
          _req.accountability.user,
          `Competency Reassigned`,
          UserLogEventType.REASSIGNED,
        );
        return res.sendStatus(200);
      } catch (e) {
        logger.error(`REASSIGN COMPETENCY: ${e}`);
        return res.sendStatus(400);
      }
    },
  );

  /**
   * ATS API, list all available competencies for an agency
   */
  router.get("/competencies", async (req: any, res: any) => {
    try {
      // if (req.accountability.role !== UserRole.GenericATS) {
      //   return res.status(400).send({ status: 400, message: "Unauthorized" });
      // }

      const limit: number = Math.max(parseInt(req.query.limit, 10) || -1, -1);
      const examsFilter = req.query.exams ? req.query.exams.split(",") : null;
      const scFilter = req.query.skill_checklists ? req.query.skill_checklists.split(",") : null;
      const modulesFilter = req.query.modules ? req.query.modules.split(",") : null;
      const documentsFilter = req.query.documents ? req.query.documents.split(",") : null;
      const policiesFilter = req.query.policies ? req.query.policies.split(",") : null;

      const db = new DBService(ItemsService, req.schema, req.accountability);

      const competencies: any = {};

      if (examsFilter) {
        const exams = await db.get("exams").readByQuery({
          fields: ["id", "title"],
          filter: { id: { _in: examsFilter } },
          limit: limit,
        });
        competencies.exams = exams;
      }

      if (scFilter) {
        const sc = await db.get("sc_definitions").readByQuery({
          fields: ["id", "title"],
          filter: { id: { _in: scFilter } },
          limit: limit,
        });
        competencies.skill_checklists = sc;
      }

      if (modulesFilter) {
        const modules = await db.get("modules_definition").readByQuery({
          fields: ["id", "title"],
          filter: { id: { _in: modulesFilter } },
          limit: limit,
        });
        competencies.modules = modules;
      }

      if (documentsFilter) {
        const documents = await db.get("documents").readByQuery({
          fields: ["id", "title"],
          filter: { id: { _in: documentsFilter } },
          limit: limit,
        });
        competencies.documents = documents;
      }

      if (policiesFilter) {
        const policies = await db.get("policies").readByQuery({
          fields: ["id", "name"],
          filter: { id: { _in: policiesFilter } },
          limit: limit,
        });
        competencies.policies = policies;
      }

      if (!examsFilter && !scFilter && !modulesFilter && !documentsFilter && !policiesFilter) {
        const exams = await db.get("exams").readByQuery({
          fields: ["id", "title"],
          limit: limit,
        });
        const sc = await db.get("sc_definitions").readByQuery({
          fields: ["id", "title"],
          limit: limit,
        });
        const modules = await db.get("modules_definition").readByQuery({
          fields: ["id", "title"],
          limit: limit,
        });
        const documents = await db.get("documents").readByQuery({
          fields: ["id", "title"],
          limit: limit,
        });
        const policies = await db.get("policies").readByQuery({
          fields: ["id", "name"],
          limit: limit,
        });

        competencies.exams = exams;
        competencies.skill_checklists = sc;
        competencies.modules = modules;
        competencies.documents = documents;
        competencies.policies = policies;
      }

      return res.status(200).send({ data: competencies });
    } catch (e) {
      logger.error(`ATS - COMPETENCIES: ${e}`);
      return res.status(500).send({ status: 500, message: e });
    }
  });

  /**
   * Reassign Competency
   */
  router.patch(
    "/mark-as-completed",
    body("assignment").notEmpty(),
    body("type").notEmpty(),
    body("finished_on").notEmpty(),
    body("expiration").notEmpty(),
    async (_req: any, res: any) => {
      try {
        const { assignment, finished_on, expiration } = _req.body;
        const db = new DBService(ItemsService, _req.schema, _req.accountability);
        const userModulesServices = db.get("junction_modules_definition_directus_users");
        const finished = parseISO(finished_on);
        const expires_on = controlExpiration(expiration, finished);
        const score = 100;
        finished.setHours(0, 0, 0, 0);

        await userModulesServices.updateOne(assignment.id, {
          started_on: finished,
          finished_on: finished,
          score,
          status: CompetencyState.FINISHED,
          approved: true,
          attempts_used: assignment.attempts_used + 1,
          expires_on,
          last_attempt: {
            assignment_id: assignment.id,
            status: CompetencyState.FINISHED,
            module_definition_id: assignment.modules_definition_id.id,
            started_on: finished,
            finished_on,
            score,
          },
        });

        return res.sendStatus(200);
      } catch (e) {
        logger.error(`COMPETENCY: ${e}`);
        return res.sendStatus(400);
      }
    },
  );

  /**
   * Update clinician assigned competency
   */

  router.patch("/assigned-competency", async (req: any, res: any) => {
    try {
      if (!req.accountability.user) {
        return res.status(403).json({ message: "Access forbidden." });
      }
      if (![UserRole.GenericATS, UserRole.HSHAdmin, UserRole.AgencyUser].includes(req.accountability.role)) {
        return res.sendStatus(403, { status: 403, message: "Forbidden : Only ATS Role can access." });
      }
      const { competency_id, details, type, clinician_id } = req.body;

      const competencyType = type as CompetencyType;

      const db = new DBService(ItemsService, req.schema, req.accountability);
      const userServices = db.get("directus_users");
      const userExamsServices = db.get("junction_directus_users_exams");

      try {
        const accountability = await userServices.readOne(req.accountability.user, {
          fields: ["id", "role.id", "agencies.agencies_id"],
        });

        const clinicianAccountability = await userServices.readOne(clinician_id, {
          fields: ["id", "role.id", "agencies.agencies_id"],
        });

        if (accountability?.role?.id !== UserRole.HSHAdmin) {
          const userAgencies: string[] = accountability.agencies.map((a: any) => a.agencies_id);
          const clinicianAgencies: string[] = clinicianAccountability.agencies.map((a: any) => a.agencies_id);
          if (!arraysIntersect(userAgencies, clinicianAgencies)) {
            return res.status(403).json({ message: "Agency not allowed." });
          }
        }
      } catch (e) {
        logger.error(`${LOG_PREFIX}: ${e}`);
        return res.sendStatus(400);
      }

      const updates: Partial<CompetencyUpdateDetails> = {};

      const propertiesToUpdate: (keyof CompetencyUpdateDetails)[] = ["due_date", "expiration_date", "allowed_attempts"];

      for (const property of propertiesToUpdate) {
        if (property in details && details[property] !== undefined) {
          updates[property] = details[property];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No updates provided." });
      }

      const query = {
        competency_id: competency_id,
        clinician_id: clinician_id,
      };
      // Only
      if (competencyType === CompetencyType.EXAM) {
        const examDetails = await userExamsServices.readOne(competency_id);

        if ([CompetencyState.COMPLETED].includes(examDetails.status))
          await userExamsServices.findOneAndUpdate(query, updates);
      } else {
        return res.status(400).json({ message: "Competency type invalid." });
      }
    } catch (e) {
      logger.error(`COMPETENCY: ${e}`);
      return res.status(400).json({ message: `COMPETENCY: ${e}` });
    }
  });

  /**
   * Log archived competency event
   */

  router.post("/log-archived-competency", async (req: any, res: any) => {
    try {
      if (!req.accountability.user) {
        return res.status(403).json({ message: "Access forbidden." });
      }

      const { assignmentId, type } = req.body;

      if (!assignmentId || !type) {
        return res.status(400).json({ message: `COMPETENCY: Invalid request.` });
      }

      const db = new DBService(ItemsService, req.schema, req.accountability);

      const competencyMap = {
        [CompetencyType.EXAM]: {
          table: "junction_directus_users_exams",
          title: "exams_id.title",
          id: "exams_id",
        },
        [CompetencyType.SKILL_CHECKLIST]: {
          table: "junction_sc_definitions_directus_users",
          title: "sc_definitions_id.title",
          id: "sc_definitions_id",
        },
        [CompetencyType.MODULE]: {
          table: "junction_modules_definition_directus_users",
          title: "modules_definition_id.title",
          id: "modules_definition_id",
        },
        [CompetencyType.DOCUMENT]: {
          table: "junction_directus_users_documents",
          title: "documents_id.title",
          id: "documents_id",
        },
        [CompetencyType.POLICY]: {
          table: "junction_directus_users_policies",
          title: "policies_id.name",
          id: "policies_id",
        },
      };

      const competency = competencyMap[type as CompetencyType];
      if (!competency) {
        return res.status(400).json({ message: `COMPETENCY: Invalid type.` });
      }

      const competencyService = db.get(competency.table);
      const title = competency.title;
      const competencyId = competency.id;

      const competencyDetails = await competencyService.readOne(assignmentId, {
        fields: ["id", title, "directus_users_id", `${competencyId}.id`],
      });

      await insertUserLog(
        database,
        competencyDetails.directus_users_id,
        {
          id: competencyDetails[competencyId].id,
          type,
          assignmentId,
        },
        req.accountability.user,
        `Archived : ${competencyDetails[competencyId].title || competencyDetails[competencyId].name}`,
        UserLogEventType.ARCHIVED,
      );

      return res.status(200).json({ message: "Event logged." });
    } catch (e) {
      logger.error(`COMPETENCY: ${e}`);
      return res.status(400).json({ message: `COMPETENCY: ${e}` });
    }
  });
});
