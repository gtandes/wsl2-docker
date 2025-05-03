import { defineEndpoint } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { EmailAction, UserRole } from "types";
import { body, validationResult } from "express-validator";
import { EmailNotifications } from "../../common/email-notifications";
import { validateCreateUser } from "../../validations/user";
import jwt from "jsonwebtoken";
import { ManagerExpiringCompetenciesService } from "../../common/manager-expiring-competencies-service";

const LOG_PREFIX = "USER";

export default defineEndpoint((router: any, endpointContext: any) => {
  /**
   * retrive current user info
   */
  const { services, getSchema, env, database, logger } = endpointContext;
  const { ItemsService, UsersService } = services;

  router.get("/me", async (req: any, res: any) => {
    try {
      if (req.accountability.role !== UserRole.GenericATS) {
        return res.send(400, { status: 400, message: "Unauthorized" });
      }
      const services = DirectusServices.fromEndpoint(endpointContext, req);
      const accountability = await services.usersService.readOne(req.accountability.user, {
        fields: [
          "id",
          "first_name",
          "last_name",
          "email",
          "agencies.agencies_id.id",
          "agencies.agencies_id.name",
          "role.name",
        ],
      });

      return res.status(200).send({ data: accountability });
    } catch (e) {
      endpointContext.logger.error(`${LOG_PREFIX}: ${e}`);
      return res.send(500, { status: 500, message: e });
    }
  });

  /**
   * Email notification actions
   */
  router.post(
    "/email-notifications",
    body("users").notEmpty(),
    body("actions").notEmpty(),
    body("agency").notEmpty(),
    async (req: any, res: any) => {
      try {
        const { users, actions, agency } = req.body;
        const services = DirectusServices.fromEndpoint(endpointContext, req);
        const { database } = endpointContext;
        if (users.length) {
          await Promise.all(
            users.map((user: any) => {
              if (actions.length) {
                actions.map(async (action: EmailAction) => {
                  const emailNotify = new EmailNotifications(services);

                  switch (action) {
                    case EmailAction.DUE_DATE_REMINDER:
                      await emailNotify.dueDateReminder(user.id);
                      break;
                    case EmailAction.NAGGING:
                      await emailNotify.nagginDueDateReminder(user.id);
                      break;
                    case EmailAction.PENDING_ASSIGNMENT:
                      await emailNotify.pendingAssigmentRemainder(user.id);
                      break;
                    case EmailAction.NEW_ASSIGNMENT:
                      await emailNotify.newAssignmentNotification(user.id, agency, endpointContext);
                      break;
                    case EmailAction.WELCOME:
                      await emailNotify.welcomeNotification(user.id, agency, endpointContext);
                      break;
                    case EmailAction.FORGOT_PASSWORD:
                      await emailNotify.forgotPassword(user.email, endpointContext);
                      break;
                    case EmailAction.SEND_EXPIRING_COMPETENCY_CLINICIAN:
                      await emailNotify.expiringCompetencyReminder(user.id, database);
                      break;
                    case EmailAction.SEND_EXPIRING_COMPETENCY_REPORTS:
                      await emailNotify.sendExpiringCompetenciesReport(user.id, agency, database);
                      break;
                    case EmailAction.DUE_DATE_REPORT_REMINDER:
                      await emailNotify.sendExpiringDueDateReport(user.id, agency, database);
                      break;
                  }
                });
              }
            }),
          );
        }
        return res.status(200).send({ message: "ok" });
      } catch (e) {
        endpointContext.logger.error(`${LOG_PREFIX} Email Notifiations: ${e}`);
        return res.send(500, { status: 500, message: e });
      }
    },
  );

  router.get("/download-report/:token", async (req: any, res: any) => {
    try {
      const token = decodeURIComponent(req.params.token);
      const decoded = jwt.verify(token, env.SECRET, { issuer: "directus" }) as any;
      if (decoded.type !== "competency-report") {
        throw new Error("Invalid token type");
      }

      const managerExpiringComptencyService = new ManagerExpiringCompetenciesService(database);

      const data = await managerExpiringComptencyService.getExpiryCompetencies(
        decoded.userId,
        decoded.agencyId,
        decoded.userRole,
        decoded.allExpiry,
      );

      const csvContent = managerExpiringComptencyService.transformToCSV(data);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Expiring_Competencies_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      res.send(csvContent);
    } catch (error) {
      console.error("Full JWT Verification Error:", error);
      logger.error(`${LOG_PREFIX} CSV GENERATION: ${error}`);
      res.status(401).send("Unauthorized or expired download link");
    }
  });

  router.post("/create", validateCreateUser, async (req: any, res: any) => {
    try {
      // validate the request
      const error = validationResult(req);
      if (!error.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: error.array().map((err) => ({
            message: err.msg,
          })),
        });
      }

      const schema = await getSchema();
      const userService = new UsersService({
        schema,
        accountability: req.accountability,
      });

      const rolesItemsService = new ItemsService("directus_roles", {
        schema,
        accountability: req.accountability,
      });

      // get request inputs
      const {
        email,
        role,
        first_name,
        last_name,
        employee_number,
        edit_assignments,
        details,
        specialties,
        departments,
        locations,
        supervisors,
        agencies,
        competencies,
      } = req.body;

      // get list of roles
      const selectedRole = await rolesItemsService.readOne(role);

      if (!selectedRole) {
        return res.status(422).json({
          success: false,
          message: "Role not found in the system",
          error: "No role selected.",
        });
      }

      // Clean up email input
      const cleanedEmail = email?.trim().toLowerCase();
      // check if user already exists
      const userExists = await userService.getUserByEmail(cleanedEmail);

      if (userExists && [UserRole.AgencyUser, UserRole.UsersManager].includes(userExists?.role?.id as UserRole)) {
        return res.status(409).send({
          success: false,
          error: "Error creating user.",
          message: "User already exists.",
        });
      }

      let commonValues = {};
      if (specialties && specialties.length) {
        commonValues = {
          ...commonValues,
          specialties: specialties?.length
            ? specialties.map((s: any) => ({
                specialties_id: { id: s.id },
              }))
            : undefined,
        };
      }

      if (departments && departments.length) {
        commonValues = {
          ...commonValues,
          departments: departments?.length
            ? departments.map((s: any) => ({
                departments_id: { id: s.id },
              }))
            : undefined,
        };
      }

      if (locations && locations.length) {
        commonValues = {
          ...commonValues,
          locations: locations?.length
            ? locations.map((s: any) => ({
                locations_id: { id: s.id },
              }))
            : undefined,
        };
      }

      if (supervisors && supervisors.length) {
        commonValues = {
          ...commonValues,
          supervisors: supervisors?.length
            ? supervisors.map((s: any) => ({
                directus_users_id: { id: s.id },
              }))
            : undefined,
        };
      }

      let agencyData = [];
      if (agencies && agencies.length) {
        agencyData = agencies.map(
          (agency: { agencies_id: { id: string }; employee_number?: string; bullhorn_id?: string }) => {
            if (agency.bullhorn_id) {
              return {
                agencies_id: { id: agency.agencies_id.id },
                employee_number: agency.employee_number || undefined,
                bullhorn_id: agency.bullhorn_id, // Include Bullhorn ID
                ...commonValues,
              };
            } else {
              return {
                agencies_id: { id: agency.agencies_id.id },
                employee_number: agency.employee_number || undefined,
                ...commonValues,
              };
            }
          },
        );
      }

      const userData = {
        email,
        role,
        first_name,
        last_name,
        employee_number: employee_number || undefined,
        edit_assignments,
        details,
        competencies,
        agencies: agencyData,
      };

      const userId = await userService.createOne(userData);

      return res.status(201).send({ success: true, message: "User account created successfully.", data: userId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).send({
        success: false,
        message: "Error creating user",
        error: errorMessage,
      });
    }
  });
});
