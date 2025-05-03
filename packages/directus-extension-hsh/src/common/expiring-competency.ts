import { addDays, formatISO } from "date-fns";
import { CompetencyState, DirectusStatus, EmailExpiryCompetency } from "types";

interface ExpiringCompetencyTable {
  table: string;
  name: string;
  contentType: string;
}

export interface ICompetency {
  getUserExpiringCompetency(userId: string): Promise<EmailExpiryCompetency[]>;
  getAllUserExpiringCompetency(): Promise<EmailExpiryCompetency[]>;
}

export class ExpiringCompetency implements ICompetency {
  private database: any;

  private readonly expiringCompetencyTables: ExpiringCompetencyTable[] = [
    { table: "junction_modules_definition_directus_users", name: "modules_definition", contentType: "Module" },
    { table: "junction_directus_users_exams", name: "exams", contentType: "Exam" },
    { table: "junction_directus_users_documents", name: "documents", contentType: "Document" },
    { table: "junction_sc_definitions_directus_users", name: "sc_definitions", contentType: "Skill Checklist" },
    { table: "junction_directus_users_policies", name: "policies", contentType: "Policy" },
  ];

  private readonly today = new Date();
  private readonly nextFortyFiveDays = addDays(this.today, 45);

  constructor(database: any) {
    this.database = database;
  }

  public async getUserExpiringCompetency(userId: string): Promise<EmailExpiryCompetency[]> {
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table, name, contentType }) => {
        const baseResults: EmailExpiryCompetency[] = await this.database(table)
          .select([
            `${table}.due_date`,
            `${table}.status as competency_status`,
            `${table}.expires_on`,
            `${table}.reassigned`,
            `${table}.agency`,
            `${table}.directus_users_id as user_id`,
            table === "junction_directus_users_policies" ? `${name}.name AS title` : `${name}.title as title`,
            "directus_users.first_name",
            "directus_users.last_name",
            "directus_users.last_access",
            "directus_users.email",
            "directus_users.status as directus_users_status",
            "agencies.name as agency_name",
            "agencies.logo",
          ])
          .leftJoin(name, `${table}.${name}_id`, `${name}.id`)
          .leftJoin("directus_users", `${table}.directus_users_id`, "directus_users.id")
          .leftJoin("agencies", `${table}.agency`, "agencies.id")
          .where("expires_on", "<=", formatISO(this.nextFortyFiveDays))
          .whereNotIn("directus_users.status", [
            DirectusStatus.ARCHIVED,
            DirectusStatus.SUSPENDED,
            DirectusStatus.INACTIVE,
          ])
          .where(function (builder: any) {
            builder.where(`${table}.reassigned`, false).orWhere(function (subBuilder: any) {
              subBuilder.where(`${table}.reassigned`, true).whereRaw(`
                    CASE 
                        WHEN NOT EXISTS (
                            SELECT 1 
                            FROM ${table} as newer_assignments 
                            WHERE newer_assignments.directus_users_id = ${table}.directus_users_id 
                            AND newer_assignments.${name}_id = ${table}.${name}_id 
                            AND newer_assignments.assigned_on > ${table}.assigned_on
                            ) THEN true
                        WHEN EXISTS (
                            SELECT 1 
                            FROM ${table} as newer_assignments 
                            WHERE newer_assignments.directus_users_id = ${table}.directus_users_id 
                            AND newer_assignments.${name}_id = ${table}.${name}_id 
                            AND newer_assignments.assigned_on > ${table}.assigned_on
                            AND ${
                              table === "junction_directus_users_policies"
                                ? "newer_assignments.signed_on IS NOT NULL"
                                : table === "junction_directus_users_documents"
                                ? "newer_assignments.read IS NOT NULL"
                                : `newer_assignments.status IN ('${CompetencyState.COMPLETED}', '${CompetencyState.FINISHED}')`
                            }
                            ) THEN false
                        ELSE true
                    END = true`);
            });
          })
          .whereNotIn(`${table}.status`, ["archived"])
          .where("directus_users.id", userId)
          .orderBy("expires_on", "ASC");

        return baseResults.map((result) => ({
          ...result,
          contentType,
        }));
      });

      const results = await Promise.all(queries);

      return results.flat();
    } catch (error) {
      console.error("Error fetching expiring competencies:", error);
      return [];
    }
  }

  public async getAllUserExpiringCompetency(): Promise<EmailExpiryCompetency[]> {
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table, name, contentType }) => {
        const baseResults: EmailExpiryCompetency[] = await this.database(table)
          .select([
            `${table}.due_date`,
            `${table}.status as competency_status`,
            `${table}.expires_on`,
            `${table}.reassigned`,
            `${table}.agency`,
            `${table}.directus_users_id as user_id`,
            table === "junction_directus_users_policies" ? `${name}.name AS title` : `${name}.title as title`,
            "directus_users.first_name",
            "directus_users.last_name",
            "directus_users.last_access",
            "directus_users.email",
            "directus_users.status as directus_users_status",
            "agencies.name as agency_name",
            "agencies.logo",
          ])
          .leftJoin(name, `${table}.${name}_id`, `${name}.id`)
          .leftJoin("directus_users", `${table}.directus_users_id`, "directus_users.id")
          .leftJoin("agencies", `${table}.agency`, "agencies.id")
          .leftJoin(
            "junction_directus_users_agencies",
            `${table}.directus_users_id`,
            "junction_directus_users_agencies.directus_users_id",
          )
          .whereBetween("expires_on", [this.today, formatISO(this.nextFortyFiveDays)])
          .whereNotIn("directus_users.status", [
            DirectusStatus.ARCHIVED,
            DirectusStatus.SUSPENDED,
            DirectusStatus.INACTIVE,
          ])
          .whereNotIn("junction_directus_users_agencies.status", [
            DirectusStatus.ARCHIVED,
            DirectusStatus.SUSPENDED,
            DirectusStatus.INACTIVE,
          ])
          .whereNotIn(`${table}.status`, [DirectusStatus.ARCHIVED])
          .whereRaw(
            `NOT (
              COALESCE((agencies.notifications_settings#>>'{clinician,expiring_competencies_reminder}')::boolean, true) = false
            )`,
          )
          .where(function (builder: any) {
            builder.where(`${table}.reassigned`, false).orWhere(function (subBuilder: any) {
              subBuilder.where(`${table}.reassigned`, true).whereRaw(`
                    CASE 
                        WHEN NOT EXISTS (
                            SELECT 1 
                            FROM ${table} as newer_assignments 
                            WHERE newer_assignments.directus_users_id = ${table}.directus_users_id 
                            AND newer_assignments.${name}_id = ${table}.${name}_id 
                            AND newer_assignments.assigned_on > ${table}.assigned_on
                            ) THEN true
                        WHEN EXISTS (
                            SELECT 1 
                            FROM ${table} as newer_assignments 
                            WHERE newer_assignments.directus_users_id = ${table}.directus_users_id 
                            AND newer_assignments.${name}_id = ${table}.${name}_id 
                            AND newer_assignments.assigned_on > ${table}.assigned_on
                            AND ${
                              table === "junction_directus_users_policies"
                                ? "newer_assignments.signed_on IS NOT NULL"
                                : table === "junction_directus_users_documents"
                                ? "newer_assignments.read IS NOT NULL"
                                : `newer_assignments.status IN ('${CompetencyState.COMPLETED}', '${CompetencyState.FINISHED}')`
                            }
                            ) THEN false
                        ELSE true
                    END = true`);
            });
          })
          .whereNotIn(`${table}.status`, ["archived"])
          .orderBy("expires_on", "ASC");

        return baseResults.map((result) => ({
          ...result,
          contentType,
        }));
      });

      const results = await Promise.all(queries);

      return results.flat();
    } catch (error) {
      console.error("Error fetching expiring competencies:", error);
      return [];
    }
  }
}
export class UserExpiringCompetency {
  private expiringCompetency: ICompetency;

  constructor(database: any, expiringCompetency: ICompetency = new ExpiringCompetency(database)) {
    this.expiringCompetency = expiringCompetency;
  }

  public async getExpiryCompetencies(userId: string): Promise<EmailExpiryCompetency[]> {
    return this.expiringCompetency.getUserExpiringCompetency(userId);
  }

  public async getAllExpiryCompetencies(): Promise<EmailExpiryCompetency[]> {
    return this.expiringCompetency.getAllUserExpiringCompetency();
  }
}
