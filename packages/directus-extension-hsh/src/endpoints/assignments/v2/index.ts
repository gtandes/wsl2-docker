/* eslint-disable turbo/no-undeclared-env-vars */
import { defineEndpoint } from "@directus/extensions-sdk";
import { body } from "express-validator";
import { DBService } from "../../../common/services";
import { uniqBy } from "lodash";
import { AssignmentUser } from "../../assignments/types";
import {
  getUsersBy,
  getExpirationType,
  getAgencyDetails,
  getCompetencyAssignmentDetails,
  assignmentLogger,
  emailAssignments,
  getCompetencyLatestVersion,
  isCompetencyExisting,
} from "../../assignments/utilities";
import { addDays, addYears } from "date-fns";
import { CompetencyState, DirectusStatus, UserRole, ResponseErrorCode } from "types";

const LOG_PREFIX = "ASSIGNMENTS COMPETENCIES";

interface IErrorResponse {
  competency_id: string | number;
  status: ResponseErrorCode;
}

export default defineEndpoint((router, { services, logger, database, env }) => {
  const { ItemsService, MailService } = services;
  router.post(
    "/competencies",
    body("users_by").notEmpty(),
    body("competencies").notEmpty(),
    body("agency").notEmpty(),
    async (_req: any, res: any) => {
      if (process.env.ENV_NAME === "prod") {
        return res.sendStatus(403);
      }
      const { competencies, users_id } = _req.body;
      const db = new DBService(ItemsService, _req.schema, { admin: true });
      const userServices = db.get("directus_users");
      const userExamsServices = db.get("junction_directus_users_exams");
      const userScServices = db.get("junction_sc_definitions_directus_users");
      const userModulesServices = db.get("junction_modules_definition_directus_users");
      const userDocumentsServices = db.get("junction_directus_users_documents");
      const userPoliciesServices = db.get("junction_directus_users_policies");

      if (_req.accountability.role !== UserRole.GenericATS) {
        return res.sendStatus(403, { status: 403, message: "Forbidden : Only ATS Role can access." });
      }

      let agencyId: string = "";

      try {
        const accountability = await userServices.readOne(_req.accountability.user, {
          fields: ["agencies.agencies_id"],
        });

        agencyId = accountability.agencies.map((a: any) => a.agencies_id)[0];

        if (!agencyId) {
          return res.sendStatus(403, { status: 403, message: "User has no agency." });
        }
      } catch (e) {
        logger.error(`${LOG_PREFIX}: ${e}`);
      }

      const mailService = new MailService({
        schema: _req.schema,
        knex: database,
      });

      try {
        const {
          agency_exams_allow_attempts,
          agency_modules_allow_attempts,
          agency_due_date,
          agency_expires_on,
          agency,
        } = await getAgencyDetails(db, agencyId, res);

        const due_date = agency_due_date ? addDays(new Date(), agency_due_date) : addYears(new Date(), 2);

        let allUsers: AssignmentUser[] = [];

        const { bundles, allExams, allModules, allSkillsChecklists, allPolicies, allDocuments } =
          await getCompetencyAssignmentDetails(db, competencies);

        const formattedUsersBy = users_id ? users_id.map((id: string) => ({ id })) : [];

        const usersBy = await getUsersBy(
          {
            users: formattedUsersBy,
            departments: [],
            locations: [],
            specialties: [],
            supervisors: [],
          },
          agencyId,
          db,
        );

        if (usersBy) {
          allUsers = uniqBy([...usersBy], "id");
        }

        let examsResponse: IErrorResponse[] = [];
        let skillChecklistsResponse: IErrorResponse[] = [];
        let modulesResponse: IErrorResponse[] = [];
        let policiesResponse: IErrorResponse[] = [];
        let documentsResponse: IErrorResponse[] = [];

        let finalResponse: any = [];

        // assign competencies to the users
        try {
          await Promise.all(
            allUsers.map(async (user) => {
              const userPromises = [];

              // Assign Exams
              if (allExams.length) {
                const examPromises = allExams.map(async (exam) => {
                  try {
                    const latestExamVersion: any = await getCompetencyLatestVersion(
                      db,
                      logger,
                      "exam_versions",
                      ["id", "expiration", "allowed_attempts"],
                      { exam: exam.id },
                    );

                    if (!latestExamVersion) {
                      return res.sendStatus(404).json({ status: 404, message: "Exam has no latest version." });
                    }

                    exam.allowedAttempts = latestExamVersion.allowed_attempts;

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

                    const isExamExisting = await isCompetencyExisting(db, "exams", { id: { _eq: exam.id } });

                    if (!userHasExam.length) {
                      if (isExamExisting) {
                        const expirationType = getExpirationType(agency_expires_on || latestExamVersion.expiration);

                        await userExamsServices.createOne({
                          agency: agencyId,
                          exams_id: exam.id,
                          directus_users_id: user.id,
                          allowed_attempts: agency_exams_allow_attempts
                            ? agency_exams_allow_attempts
                            : latestExamVersion.allowed_attempts,
                          status: CompetencyState.NOT_STARTED,
                          due_date,
                          exam_versions_id: latestExamVersion.id,
                          expiration_type: expirationType,
                          ...(exam?.bundle_id && { bundle_id: exam?.bundle_id }),
                        });
                      } else {
                        examsResponse.push({
                          competency_id: exam.id,
                          status: ResponseErrorCode.COMPETENCY_DOES_NOT_EXIST,
                        });
                      }
                    } else {
                      examsResponse.push({
                        competency_id: exam.id,
                        status: ResponseErrorCode.ALREADY_ASSIGNED,
                      });
                    }
                  } catch (e) {
                    logger.error(`${LOG_PREFIX}: ${e}`);
                  }
                });

                userPromises.push(...examPromises);
              }

              // Assign Skill Checklists
              if (allSkillsChecklists.length) {
                const skillsChecklistsPromises = allSkillsChecklists.map(async (sc) => {
                  try {
                    const latestSCVersion: any = await getCompetencyLatestVersion(
                      db,
                      logger,
                      "sc_versions",
                      ["expiration"],
                      { definition: sc.id },
                    );

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

                    const isSCExisting = await isCompetencyExisting(db, "sc_definitions", { id: { _eq: sc.id } });

                    if (!userHasSkill.length) {
                      if (isSCExisting) {
                        const expirationType = getExpirationType(agency_expires_on || latestSCVersion.expiration);

                        await userScServices.createOne({
                          agency: agencyId,
                          directus_users_id: { id: user.id },
                          sc_definitions_id: { id: sc.id },
                          status: CompetencyState.PENDING,
                          due_date,
                          assigned_on: new Date(),
                          expiration_type: expirationType,
                          ...(sc?.bundle_id && { bundle_id: sc?.bundle_id }),
                        });
                      } else {
                        skillChecklistsResponse.push({
                          competency_id: sc.id,
                          status: ResponseErrorCode.COMPETENCY_DOES_NOT_EXIST,
                        });
                      }
                    } else {
                      skillChecklistsResponse.push({
                        competency_id: sc.id,
                        status: ResponseErrorCode.ALREADY_ASSIGNED,
                      });
                    }
                  } catch (e) {
                    logger.error(`${LOG_PREFIX}: ${e}`);
                  }
                });

                userPromises.push(...skillsChecklistsPromises);
              }

              // Assign Documents
              if (allDocuments.length) {
                const documentsPromises = allDocuments.map(async (document) => {
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

                    const isDocumentExisting = await isCompetencyExisting(db, "documents", {
                      id: { _eq: document.id },
                    });

                    if (!userHasDocument.length) {
                      if (isDocumentExisting) {
                        const expirationType = getExpirationType(agency_expires_on);

                        await userDocumentsServices.createOne({
                          agency: agencyId,
                          directus_users_id: { id: user.id },
                          documents_id: { id: document.id },
                          due_date,
                          expiration_type: expirationType,
                          ...(document?.bundle_id && { bundle_id: document?.bundle_id }),
                        });
                      } else {
                        documentsResponse.push({
                          competency_id: document.id,
                          status: ResponseErrorCode.COMPETENCY_DOES_NOT_EXIST,
                        });
                      }
                    } else {
                      documentsResponse.push({
                        competency_id: document.id,
                        status: ResponseErrorCode.ALREADY_ASSIGNED,
                      });
                    }
                  } catch (e) {
                    logger.error(`${LOG_PREFIX}: ${e}`);
                  }
                });

                userPromises.push(...documentsPromises);
              }

              // Assign Policies
              if (allPolicies.length) {
                const policiesPromises = allPolicies.map(async (policy) => {
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

                    const isPolicyExisting = await isCompetencyExisting(db, "policies", {
                      id: { _eq: policy.id },
                    });

                    if (!userHasPolicy.length) {
                      if (isPolicyExisting) {
                        const expirationType = getExpirationType(agency_expires_on);
                        await userPoliciesServices.createOne({
                          agency: agencyId,
                          directus_users_id: { id: user.id },
                          policies_id: { id: policy.id },
                          due_date,
                          expiration_type: expirationType,
                          ...(policy?.bundle_id && { bundle_id: policy?.bundle_id }),
                        });
                      } else {
                        policiesResponse.push({
                          competency_id: policy.id,
                          status: ResponseErrorCode.COMPETENCY_DOES_NOT_EXIST,
                        });
                      }
                    } else {
                      policiesResponse.push({
                        competency_id: policy.id,
                        status: ResponseErrorCode.ALREADY_ASSIGNED,
                      });
                    }
                  } catch (e) {
                    logger.error(`${LOG_PREFIX}: ${e}`);
                  }
                });

                userPromises.push(...policiesPromises);
              }

              // Assign Modules
              if (allModules.length) {
                const modulesPromises = allModules.map(async (module) => {
                  try {
                    const latestModuleVersion: any = await getCompetencyLatestVersion(
                      db,
                      logger,
                      "modules_versions",
                      ["expiration", "allowed_attempts"],
                      { definition: module.id },
                    );

                    module.allowedAttempts = latestModuleVersion.allowed_attempts;

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

                    const isModuleExisting = await isCompetencyExisting(db, "modules_definition", {
                      id: { _eq: module.id },
                    });

                    if (!userHasModule.length) {
                      if (isModuleExisting) {
                        const expirationType = getExpirationType(agency_expires_on || latestModuleVersion.expiration);
                        await userModulesServices.createOne({
                          agency: agencyId,
                          directus_users_id: { id: user.id },
                          modules_definition_id: { id: module.id },
                          due_date,
                          assigned_on: new Date(Date.now()),
                          cert_code: String(Date.now()),
                          allowed_attempts: agency_modules_allow_attempts
                            ? agency_modules_allow_attempts
                            : latestModuleVersion.allowed_attempts,
                          expiration_type: expirationType,
                          ...(module?.bundle_id && { bundle_id: module?.bundle_id }),
                        });
                      } else {
                        modulesResponse.push({
                          competency_id: module.id,
                          status: ResponseErrorCode.COMPETENCY_DOES_NOT_EXIST,
                        });
                      }
                    } else {
                      modulesResponse.push({
                        competency_id: module.id,
                        status: ResponseErrorCode.ALREADY_ASSIGNED,
                      });
                    }
                  } catch (e) {
                    logger.error(`${LOG_PREFIX}: ${e}`);
                  }
                });

                userPromises.push(...modulesPromises);
              }

              // Wait for all user-specific promises to complete
              await Promise.all(userPromises);

              if (
                examsResponse.length > 0 ||
                skillChecklistsResponse.length > 0 ||
                documentsResponse.length > 0 ||
                policiesResponse.length > 0 ||
                modulesResponse.length > 0
              ) {
                finalResponse.push({
                  user_id: user.id,
                  ...(examsResponse.length > 0 && { exams: examsResponse }),
                  ...(skillChecklistsResponse.length > 0 && { skillsChecklists: skillChecklistsResponse }),
                  ...(documentsResponse.length > 0 && { documents: documentsResponse }),
                  ...(policiesResponse.length > 0 && { policies: policiesResponse }),
                  ...(modulesResponse.length > 0 && { modules: modulesResponse }),
                });
              }

              examsResponse = [];
              skillChecklistsResponse = [];
              documentsResponse = [];
              policiesResponse = [];
              modulesResponse = [];
            }),
          );

          // Logs all competency assignment
          await assignmentLogger(
            logger,
            LOG_PREFIX,
            bundles,
            allUsers,
            allExams,
            allSkillsChecklists,
            allDocuments,
            allPolicies,
            allModules,
          );

          await emailAssignments(
            env,
            allUsers,
            allExams,
            allSkillsChecklists,
            allDocuments,
            allPolicies,
            allModules,
            agency,
            mailService,
          );

          let responsePayload: any = {};

          if (finalResponse.length > 0) {
            responsePayload.errors = { assignment_errors: [...finalResponse] };
          } else {
            responsePayload.message = "success";
          }

          return res.status(200).send(responsePayload);
        } catch (e) {
          logger.error(`${LOG_PREFIX}: ${e}`);
        }
      } catch (e) {
        logger.error(`${LOG_PREFIX}: ${e}`);
        return res.sendStatus(400);
      }
    },
  );
});
