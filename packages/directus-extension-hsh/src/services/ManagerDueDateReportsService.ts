import { format, formatISO } from "date-fns";
import { DirectusStatus, ExpiryCompetency, Recipient, UserRole } from "types";

type PaginationOptions = {
  page?: number;
  limit?: number;
};

const roleToSetting: Record<RoleId, string> = {
  "122c0248-4037-49ae-8c82-43a5e7f1d9c5": "agency_admin",
  "05bdccb9-dbff-4a45-bfb7-47abe151badb": "agency_admin",
  "fb7c8da4-685c-11ee-8c99-0242ac120002": "user_manager",
};

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

export interface ICsvService {
  transformToCSV(data: ExpiryCompetency[]): string;
}

type RoleId = UserRole.AgencyUser | UserRole.UsersManager | UserRole.CredentialingUser;
interface ExpiringCompetencyTable {
  table: string;
  name: string;
  contentType: string;
}

export interface ICompetencyRepository {
  getAllUpcomingDueDates(agencyId: string, userRole: RoleId, userId: string, limit: number): Promise<any[]>;
  getUpcomingDueDate(
    agencyId: string,
    userRole: RoleId,
    userId: string,
    paginationOptions?: PaginationOptions,
  ): Promise<any[]>;
  getRecipientsAgency(agencyId: string, paginationOptions?: PaginationOptions): Promise<Recipient[]>;
  getAllRecipientsAgency(agencyId: string): Promise<Recipient[]>;
  getAgencyWithClinicianDueDate(): Promise<string[]>;
}

export class CompetencyRepository implements ICompetencyRepository {
  private database: any;

  private readonly expiringCompetencyTables: ExpiringCompetencyTable[] = [
    { table: "junction_modules_definition_directus_users", name: "modules_definition", contentType: "Module" },
    { table: "junction_directus_users_exams", name: "exams", contentType: "Exam" },
    { table: "junction_sc_definitions_directus_users", name: "sc_definitions", contentType: "Skill Checklist" },
    { table: "junction_directus_users_documents", name: "documents", contentType: "Document" },
    { table: "junction_directus_users_policies", name: "policies", contentType: "Policy" },
  ];

  constructor(database: any) {
    this.database = database;
  }

  async getAgencyWithClinicianDueDate(): Promise<string[]> {
    const today = new Date();

    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table }) => {
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
          .whereBetween("due_date", [formatISO(today), formatISO(twoWeeksLater)])
          .whereRaw(
            `COALESCE((agencies.notifications_settings #>> '{clinician,due_date_reminder}')::boolean, true) = true`,
          );

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

  async getRecipientsAgency(agencyId: string, { page = 1, limit = 100 }: PaginationOptions = {}): Promise<Recipient[]> {
    const offset = (page - 1) * limit;
    const agenciesAdmin = Object.keys(roleToSetting);

    return this.database("directus_users")
      .select([
        "directus_users.id as directus_users_id",
        "directus_users.first_name",
        "directus_users.last_name",
        "directus_users.email",
        "directus_users.role as user_role",
        "agencies.name AS agency_name",
        "agencies.logo AS agency_logo",
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
      .whereNotIn("agencies.status", [DirectusStatus.ARCHIVED, DirectusStatus.SUSPENDED, DirectusStatus.INACTIVE])
      .limit(limit)
      .offset(offset);
  }

  async getAllRecipientsAgency(agencyId: string): Promise<Recipient[]> {
    const limit = 100;
    let page = 1;
    let hasMore = true;
    const allRecipients: Recipient[] = [];

    while (hasMore) {
      const recipients = await this.getRecipientsAgency(agencyId, { page, limit });
      allRecipients.push(...recipients);
      hasMore = recipients.length === limit;
      page++;
    }

    return allRecipients;
  }

  async getAllUpcomingDueDates(agencyId: string, userRole: RoleId, userId: string, limit = 100): Promise<any[]> {
    let page = 1;
    const allResults: any[] = [];

    while (true) {
      const results = await this.getUpcomingDueDate(agencyId, userRole, userId, { page, limit });

      if (results.length === 0) break;

      allResults.push(...results);
      page++;
    }

    return allResults;
  }

  async getUpcomingDueDate(
    agencyId: string,
    userRole: RoleId,
    userId: string,
    { page = 1, limit = 50 }: PaginationOptions = {},
  ): Promise<any[]> {
    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const offset = (page - 1) * limit;
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table, name, contentType }) => {
        const baseResults: any = await this.database(table)
          .select([
            `${table}.status as competency_status`,
            `${table}.expires_on`,
            `${table}.due_date`,
            ...(table === "junction_directus_users_exams"
              ? [`${table}.allowed_attempts`, `${table}.attempts_used`]
              : []),
            table === "junction_directus_users_policies" ? `${name}.name AS title` : `${name}.title as title`,
            "directus_users.first_name",
            "directus_users.last_name",
            "directus_users.last_access",
            "directus_users.email",
            "directus_users.status as directus_users_status",
            "junction_directus_users_agencies.status as agency_status",
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
          .whereBetween("due_date", [formatISO(today), formatISO(twoWeeksLater)])
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
          .orderBy("due_date", "ASC")
          .limit(limit)
          .offset(offset);

        const enrichedResults: EnrichedResult[] = await Promise.all(
          baseResults.map(async (result: any) => {
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
      console.error("An error occurred while fetching upcoming due dates: ", error);
      return [];
    }
  }
}

export class CsvService implements ICsvService {
  private readonly headers: string[] = [
    "Date/Time Generated",
    "First Name",
    "Last Name",
    "Email",
    "User Last Access",
    "Department",
    "Location",
    "Specialties",
    "Supervisors",
    "Content Title",
    "Content Type",
    "Due Date",
    "Expiry Date",
    "Allowed Attempts",
    "Number of Attempts Used",
    "Status",
  ];

  public transformToCSV(data: any[]): string {
    const csvRows = data.map((item) => {
      const {
        first_name,
        last_name,
        email,
        last_access,
        departments,
        locations,
        supervisors,
        title,
        contentType,
        due_date,
        expires_on,
        allowed_attempts,
        competency_status,
      } = item;

      const row = [
        format(new Date(), "dd-MM-yyyy"),
        first_name || "",
        last_name || "",
        email || "",
        last_access || "",
        departments.join("; "),
        locations.join("; "),
        item.specialties?.join("; ") || "",
        supervisors.join("; ") || "",
        title || "",
        contentType || "",
        due_date ? format(new Date(due_date), "dd-MM-yyyy") : "",
        expires_on ? format(new Date(expires_on), "dd-MM-yyyy") : "",
        allowed_attempts || 0,
        item.attempts_used || 0,
        competency_status,
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

export class ManagerDueDateReportsService {
  private csvService: ICsvService;
  private competencyRepository: ICompetencyRepository;

  constructor(
    database: any,
    csvService: ICsvService = new CsvService(),
    competencyRepository: ICompetencyRepository = new CompetencyRepository(database),
  ) {
    this.csvService = csvService;
    this.competencyRepository = competencyRepository;
  }

  async getExpiryCompetencies(userId: string, agencyId: string, userRole: RoleId): Promise<ExpiryCompetency[]> {
    return this.competencyRepository.getAllUpcomingDueDates(agencyId, userRole, userId, 100);
  }

  async getRecipients(agencyId: string): Promise<Recipient[]> {
    return this.competencyRepository.getAllRecipientsAgency(agencyId);
  }
  async getAgenciesWithClinicianDueDate(): Promise<string[]> {
    return this.competencyRepository.getAgencyWithClinicianDueDate();
  }

  transformToCSV(data: ExpiryCompetency[]): string {
    return this.csvService.transformToCSV(data);
  }
}
