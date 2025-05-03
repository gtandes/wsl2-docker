import jwt from "jsonwebtoken";
import { addDays, formatISO } from "date-fns";
import { CompetencyState, DirectusStatus, ExpiryCompetency, UserRole, Recipient } from "types";

export type RoleId = UserRole.AgencyUser | UserRole.UsersManager | UserRole.CredentialingUser;

interface Payload {
  userId: string;
  userRole: string;
  agencyId: string;
  allExpiry: boolean;
  type: string;
}

export const roleToSetting: Record<RoleId, string> = {
  "122c0248-4037-49ae-8c82-43a5e7f1d9c5": "agency_admin",
  "05bdccb9-dbff-4a45-bfb7-47abe151badb": "agency_admin",
  "fb7c8da4-685c-11ee-8c99-0242ac120002": "user_manager",
};

interface ExpiringCompetencyTable {
  table: string;
  name: string;
  contentType: string;
}

interface EnrichedResult extends ExpiryCompetency {
  contentType: string;
  departments: string[];
  locations: string[];
  supervisors: string[];
}

interface AgencyResult {
  agency_id: string;
}

interface DepartmentResult {
  department_name: string;
}

interface LocationResult {
  location_name: string;
}

interface SupervisorResult {
  supervisor_name: string;
}

export interface ICompetencyRepository {
  getExpiryCompetencies(
    userId: string,
    agencyId: string,
    userRole: RoleId,
    allExpiry?: boolean,
  ): Promise<ExpiryCompetency[]>;
  getAgencyWithExpiryCompetencies(): Promise<string[]>;
  getRecipientsAgency(agencyId: string): Promise<Recipient[]>;
}

export interface ITokenService {
  createDownloadToken(
    userId: string,
    userRole: string,
    agencyId: string,
    secret: string,
    allExpiry?: boolean,
  ): string | null;
}

export interface ICsvService {
  transformToCSV(data: ExpiryCompetency[]): string;
}

export class CompetencyRepository implements ICompetencyRepository {
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

  public async getExpiryCompetencies(
    userId: string,
    agencyId: string,
    userRole: RoleId,
    allExpiry: boolean = false,
  ): Promise<ExpiryCompetency[]> {
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table, name, contentType }) => {
        const baseResults: ExpiryCompetency[] = await this.database(table)
          .select([
            `${table}.status as competency_status`,
            `${table}.expires_on`,
            `${table}.reassigned`,
            table === "junction_directus_users_policies" ? `${name}.name AS title` : `${name}.title as title`,
            "directus_users.first_name",
            "directus_users.last_name",
            "directus_users.last_access",
            "directus_users.email",
            "directus_users.status as directus_users_status",
            "junction_directus_users_agencies.status as agency_status",
            "junction_directus_users_agencies.employee_number as emp_no",
            "junction_directus_users_agencies.id as agency_junction_id",
          ])
          .join(name, `${table}.${name}_id`, `${name}.id`)
          .join("directus_users", (queryBuilder: any) => {
            queryBuilder
              .on(`${table}.directus_users_id`, "=", "directus_users.id")
              .andOn(
                this.database.raw(
                  `directus_users.status NOT IN ('${DirectusStatus.INACTIVE}', '${DirectusStatus.ARCHIVED}', '${DirectusStatus.SUSPENDED}')`,
                ),
              );
          })
          .join("junction_directus_users_agencies", (queryBuilder: any) => {
            queryBuilder
              .on(`${table}.directus_users_id`, "=", "junction_directus_users_agencies.directus_users_id")
              .andOn(
                this.database.raw(
                  `junction_directus_users_agencies.status NOT IN ('${DirectusStatus.INACTIVE}', '${DirectusStatus.ARCHIVED}', '${DirectusStatus.SUSPENDED}')`,
                ),
              );
          })
          .where(`${table}.agency`, agencyId)
          .whereNotIn("directus_users.status", [
            DirectusStatus.ARCHIVED,
            DirectusStatus.SUSPENDED,
            DirectusStatus.INACTIVE,
          ])
          .whereNotIn(`${table}.status`, [DirectusStatus.ARCHIVED])
          .modify((queryBuilder: any) => {
            if (allExpiry) {
              queryBuilder.where("expires_on", "<=", formatISO(this.nextFortyFiveDays));
            } else {
              queryBuilder.whereBetween("expires_on", [formatISO(this.today), formatISO(this.nextFortyFiveDays)]);
            }
          })
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
              END = true
            `);
            });
          })
          .modify((queryBuilder: any) => {
            if (userRole === UserRole.UsersManager) {
              queryBuilder.whereExists(function (innerQueryBuilder: any) {
                return innerQueryBuilder
                  .from("junction_directus_users_agencies_supervisors")
                  .join(
                    "directus_users",
                    "junction_directus_users_agencies_supervisors.directus_users_id",
                    "directus_users.id",
                  )
                  .where("directus_users.id", userId)
                  .andWhereRaw(
                    "junction_directus_users_agencies_supervisors.junction_directus_users_agencies_id = junction_directus_users_agencies.id",
                  );
              });
            } else {
              queryBuilder.where("junction_directus_users_agencies.agencies_id", agencyId);
            }
          })
          .orderByRaw("COALESCE(junction_directus_users_agencies.employee_number, '') ASC")
          .orderBy("expires_on", "ASC");

        const enrichedResults: EnrichedResult[] = await Promise.all(
          baseResults.map(async (result) => {
            const departments: DepartmentResult[] = await this.database("departments")
              .select("departments.name as department_name")
              .join(
                "junction_directus_users_agencies_departments",
                "departments.id",
                "junction_directus_users_agencies_departments.departments_id",
              )
              .where(
                "junction_directus_users_agencies_departments.junction_directus_users_agencies_id",
                result.agency_junction_id,
              );

            const locations: LocationResult[] = await this.database("locations")
              .select("locations.name as location_name")
              .join(
                "junction_directus_users_agencies_locations",
                "locations.id",
                "junction_directus_users_agencies_locations.locations_id",
              )
              .where(
                "junction_directus_users_agencies_locations.junction_directus_users_agencies_id",
                result.agency_junction_id,
              );

            const supervisors: SupervisorResult[] = await this.database("directus_users")
              .select(this.database.raw("first_name || ' ' || last_name as supervisor_name"))
              .join(
                "junction_directus_users_agencies_supervisors",
                "directus_users.id",
                "junction_directus_users_agencies_supervisors.directus_users_id",
              )
              .where(
                "junction_directus_users_agencies_supervisors.junction_directus_users_agencies_id",
                result.agency_junction_id,
              );

            return {
              ...result,
              contentType,
              departments: departments.map((d) => d.department_name),
              locations: locations.map((l) => l.location_name),
              supervisors: supervisors.map((s) => s.supervisor_name),
            };
          }),
        );

        return enrichedResults;
      });

      const results = await Promise.all(queries);
      return results.flat();
    } catch (error) {
      console.error("Error fetching expiring competencies:", error);
      return [];
    }
  }

  public async getAgencyWithExpiryCompetencies(): Promise<string[]> {
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table, name }) => {
        const results: AgencyResult[] = await this.database
          .distinct("junction_directus_users_agencies.agencies_id as agency_id")
          .from(table)
          .join("directus_users", (queryBuilder: any) => {
            queryBuilder
              .on(`${table}.directus_users_id`, "=", "directus_users.id")
              .andOn(
                this.database.raw(
                  `directus_users.status NOT IN ('${DirectusStatus.INACTIVE}', '${DirectusStatus.ARCHIVED}', '${DirectusStatus.SUSPENDED}')`,
                ),
              );
          })
          .join("junction_directus_users_agencies", (queryBuilder: any) => {
            queryBuilder
              .on(`${table}.directus_users_id`, "=", "junction_directus_users_agencies.directus_users_id")
              .andOn(
                this.database.raw(
                  `junction_directus_users_agencies.status NOT IN ('${DirectusStatus.INACTIVE}', '${DirectusStatus.ARCHIVED}', '${DirectusStatus.SUSPENDED}')`,
                ),
              );
          })
          .join("agencies", `${table}.agency`, "agencies.id")
          .whereBetween("expires_on", [formatISO(this.today), formatISO(this.nextFortyFiveDays)])
          .whereRaw(
            `NOT (
              COALESCE((agencies.notifications_settings#>>'{user_manager,competency_expiration_report}')::boolean, true) = false AND 
              COALESCE((agencies.notifications_settings#>>'{agency_admin,competency_expiration_report}')::boolean, true) = false
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
              END = true
            `);
            });
          });

        return results;
      });

      const results = await Promise.all(queries);
      const allAgencyIds = results
        .flat()
        .map((result) => result.agency_id)
        .filter((id): id is string => id != null);

      const uniqueAgencyIds = [...new Set(allAgencyIds)];

      return uniqueAgencyIds;
    } catch (error) {
      console.error("Error gathering recipients for email notifications:", error);
      return [];
    }
  }

  public async getRecipientsAgency(agencyId: string): Promise<Recipient[]> {
    const agenciesAdmin = Object.keys(roleToSetting);

    const userRecipients: Recipient[] = await this.database("directus_users")
      .select([
        "directus_users.id as directus_users_id",
        "directus_users.first_name",
        "directus_users.last_name",
        "directus_users.email",
        "directus_users.role as user_role",
        "agencies.name AS agency_name",
        "agencies.logo AS agency_logo",
        "agencies.notifications_settings",
      ])
      .leftJoin(
        "junction_directus_users_agencies",
        "directus_users.id",
        "junction_directus_users_agencies.directus_users_id",
      )
      .leftJoin("agencies", "junction_directus_users_agencies.agencies_id", "agencies.id")
      .where("agencies.id", agencyId)
      .whereIn("directus_users.role", agenciesAdmin)
      .whereNotIn("directus_users.status", [DirectusStatus.ARCHIVED, DirectusStatus.SUSPENDED, DirectusStatus.INACTIVE])
      .whereNotIn("agencies.status", [DirectusStatus.ARCHIVED, DirectusStatus.SUSPENDED, DirectusStatus.INACTIVE]);

    return userRecipients;
  }
}

export class TokenService implements ITokenService {
  public createDownloadToken(
    userId: string,
    userRole: string,
    agencyId: string,
    secret: string,
    allExpiry: boolean = false,
  ): string | null {
    const payload: Payload = {
      userId,
      userRole,
      agencyId,
      allExpiry,
      type: "competency-report",
    };

    const downloadToken = jwt.sign(payload, secret, { expiresIn: "3d", issuer: "directus" });
    return encodeURIComponent(downloadToken);
  }
}

export class CsvService implements ICsvService {
  private readonly headers: string[] = [
    "Employee Number",
    "First Name",
    "Last Name",
    "Email",
    "Last User Access",
    "Supervisors",
    "Departments",
    "Locations",
    "Content Title",
    "Content Type",
    "Completion Status",
    "Expiration Date",
  ];

  public transformToCSV(data: ExpiryCompetency[]): string {
    const csvRows = data.map((competency) => {
      const row = [
        competency.emp_no,
        competency.first_name,
        competency.last_name,
        competency.email,
        competency.last_access ? new Date(competency.last_access).toLocaleDateString() : "",
        competency.supervisors.join("; "),
        competency.departments.join("; "),
        competency.locations.join("; "),
        competency.title,
        competency.contentType,
        competency.competency_status,
        competency.expires_on ? new Date(competency.expires_on).toLocaleDateString() : "",
      ];

      return row.map(this.formatCsvField);
    });

    const csvContent = [this.headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
    return csvContent;
  }

  private formatCsvField(value: unknown): string {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
}

export class ManagerExpiringCompetenciesService {
  private tokenService: ITokenService;
  private csvService: ICsvService;
  private competencyRepository: ICompetencyRepository;

  constructor(
    database: any,
    tokenService: ITokenService = new TokenService(),
    csvService: ICsvService = new CsvService(),
    competencyRepository: ICompetencyRepository = new CompetencyRepository(database),
  ) {
    this.tokenService = tokenService;
    this.csvService = csvService;
    this.competencyRepository = competencyRepository;
  }

  public createDownloadToken = (
    userId: string,
    userRole: string,
    agencyId: string,
    secret: string,
    allExpiry?: boolean,
  ): string | null => {
    return this.tokenService.createDownloadToken(userId, userRole, agencyId, secret, allExpiry);
  };

  public transformToCSV(data: ExpiryCompetency[]): string {
    return this.csvService.transformToCSV(data);
  }

  public async getExpiryCompetencies(
    userId: string,
    agencyId: string,
    userRole: RoleId,
    allExpiry: boolean = false,
  ): Promise<ExpiryCompetency[]> {
    return this.competencyRepository.getExpiryCompetencies(userId, agencyId, userRole, allExpiry);
  }

  public async getAgencyWithExpiryCompetencies(): Promise<string[]> {
    return this.competencyRepository.getAgencyWithExpiryCompetencies();
  }

  public async getRecipientsAgency(agencyId: string): Promise<Recipient[]> {
    return this.competencyRepository.getRecipientsAgency(agencyId);
  }
}
