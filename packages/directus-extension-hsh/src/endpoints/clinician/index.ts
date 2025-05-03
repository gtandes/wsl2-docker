import { defineEndpoint } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { body } from "express-validator";
import { DirectusStatus, UserRole } from "types";

const LOG_PREFIX = "CLINICIANS";

export default defineEndpoint((router, endpointContext) => {
  /**
   * create clinician and link it to an agency
   */
  router.post(
    "/",
    body("first_name").notEmpty().trim(),
    body("last_name").notEmpty().trim(),
    body("email").notEmpty().trim().isEmail(),
    body("agencies_id").notEmpty().trim(),
    async (req: any, res: any) => {
      try {
        if (req.accountability.role !== UserRole.GenericATS) {
          return res.send(400, { status: 400, message: "Unauthorized" });
        }
        if (!req.body.first_name) {
          return res.send(401, { status: 401, message: "First Name is required" });
        }
        if (!req.body.last_name) {
          return res.send(401, { status: 401, message: "Last Name is required" });
        }
        if (!req.body.email) {
          return res.send(401, { status: 401, message: "Email is required" });
        }
        if (!req.body.agencies_id) {
          return res.send(401, { status: 401, message: "The Agency id is required" });
        }
        let userId: string = "";
        req.accountability.admin = true;
        const services = DirectusServices.fromEndpoint(endpointContext, req);
        const { first_name, last_name, email, agencies_id } = req.body;

        /** check agencies allowed */
        const accountability = await services.usersService.readOne(req.accountability.user, {
          fields: ["agencies.agencies_id.id"],
        });
        const atsUserAgencies = accountability.agencies.map((agency: any) => agency.agencies_id.id);

        if (!atsUserAgencies.includes(agencies_id)) {
          return res.send(401, { status: 401, message: "Agency not allowed" });
        }

        const user = await services.usersService.readByQuery({
          filter: { email: { _eq: email } },
          fields: ["id", "agencies.agencies_id.id"],
        });

        if (!user.length) {
          userId = await services.usersService.createOne({
            first_name,
            last_name,
            email,
            role: UserRole.Clinician,
            agencies: [{ agencies_id: agencies_id }],
          });
        }

        if (user.length) {
          userId = user[0].id;
          const userAgencies = user[0].agencies.map((agency: any) => agency.agencies_id.id);

          if (userAgencies.includes(agencies_id)) {
            return res.send(206, { status: 206, directus_user_id: userId, message: "User already linked" });
          }

          await services.userAgenciesService.createOne({
            agencies_id,
            directus_users_id: user[0].id,
            status: DirectusStatus.ACTIVE,
          });
        }

        return res.status(200).send({
          data: {
            status: DirectusStatus.ACTIVE,
            agencies_id,
            directus_users_id: userId,
          },
        });
      } catch (e) {
        endpointContext.logger.error(`${LOG_PREFIX}: ${e}`);
        return res.status(500).send({ status: 500, message: e });
      }
    },
  );

  /**
   * retrive clinicians with assignments
   */
  router.get("/assignments", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.GenericATS) {
        return res.send(400, { status: 400, message: "Unauthorized" });
      }
      const { page, limit } = req.query;
      const services = DirectusServices.fromEndpoint(endpointContext, req);
      const accountability = await services.usersService.readOne(req.accountability.user, {
        fields: ["agencies.agencies_id.id"],
      });
      const userAgencies = accountability?.agencies?.map((agency: any) => agency.agencies_id.id) || [];
      const filter = {
        _and: [{ role: { _eq: UserRole.Clinician } }, { agencies: { agencies_id: { id: { _in: userAgencies } } } }],
      };
      const clinicians = await services.usersService.readByQuery({
        fields: [
          "id",
          "first_name",
          "last_name",
          "email",
          "agencies.agencies_id.id",
          "agencies.agencies_id.name",
          "exams.exams_id.id",
          "exams.exams_id.title",
          "exams.score",
          "exams.exam_versions_id.contact_hour",
          "exams.status",
          "exams.finished_on",
          "exams.due_date",
          "exams.started_on",
          "modules.modules_definition_id.id",
          "modules.modules_definition_id.title",
          "modules.modules_definition_id.title",
          "modules.status",
          "modules.finished_on",
          "modules.score",
          "modules.assigned_on",
          "modules.started_on",
          "modules.due_date",
          "modules.expires_on",
          "modules.module_version.contact_hour",
          "sc_definitions.sc_definitions_id.id",
          "sc_definitions.sc_definitions_id.title",
          "sc_definitions.status",
          "sc_definitions.assigned_on",
          "sc_definitions.due_date",
          "sc_definitions.finished_on",
          "sc_definitions.expires_on",
          "documents.documents_id.id",
          "documents.documents_id.title",
          "documents.read",
          "documents.due_date",
          "documents.assigned_on",
          "documents.assigned_on",
          "documents.expires_on",
          "policies.policies_id.id",
          "policies.signed_on",
          "policies.read",
          "policies.assigned_on",
          "policies.due_date",
          "policies.expires_on",
        ],
        filter,
        ...(limit && { limit: Number(limit) }),
        ...(page && { page: Number(page) }),
      });

      const totalRecords = await services.usersService.readByQuery({
        filter,
        aggregate: {
          count: ["id"],
        },
      });
      return res.status(200).send({ data: clinicians, total: totalRecords.at(0).count.id, page, limit });
    } catch (e) {
      endpointContext.logger.error(`${LOG_PREFIX}: ${e}`);
      return res.status(500).send({ status: 500, message: e });
    }
  });
});
