import { format, formatISO, isValid, parseISO } from "date-fns";
import { CompetencyState, DirectusStatus, ExpiryCompetency, Recipient, UserRole } from "types";

type PaginationOptions = {
  page?: number;
  limit?: number;
};

const roleToSetting: Record<RoleId, string> = {
  "122c0248-4037-49ae-8c82-43a5e7f1d9c5": "agency_admin",
  "05bdccb9-dbff-4a45-bfb7-47abe151badb": "agency_admin",
  "fb7c8da4-685c-11ee-8c99-0242ac120002": "user_manager",
};

export enum CompetencyContentType {
  EXAM = "Exam",
  POLICY = "Policy",
  DOCUMENT = "Document",
  Module = "Module",
  SKILL_CHECKLIST = "Skill Checklist",
}

export interface BaseCompetencyData {
  competency_status: string;
  due_date: string;
  title: string;
  first_name: string;
  last_name: string;
  last_access: string | null;
  email: string;
  directus_users_status: string;
  agency_status: string;
  agency_junction_id: string;
  contentType: CompetencyContentType;
  departments: string[];
  locations: string[];
  supervisors: string[];
}

export interface ExamCompetencyData extends BaseCompetencyData {
  allowed_attempts: number;
  attempts_used: number;
}

export interface PolicyCompetencyData extends BaseCompetencyData {
  signed_on: string | null;
}

export interface DocumentCompetencyData extends BaseCompetencyData {
  read: boolean;
}

export type CompetencyData = ExamCompetencyData | PolicyCompetencyData | DocumentCompetencyData | BaseCompetencyData;

export interface GetUpcomingDueDateResult {
  getUpcomingDueDate(
    agencyId: string,
    userRole: RoleId,
    userId: string,
    options?: PaginationOptions,
  ): Promise<CompetencyData[]>;
}

const isPolicy = (result: CompetencyData): result is PolicyCompetencyData =>
  result.contentType === CompetencyContentType.POLICY;
const isDocument = (result: CompetencyData): result is DocumentCompetencyData =>
  result.contentType === CompetencyContentType.DOCUMENT;

const policiesAndDocumentsStatus = (result: CompetencyData): CompetencyState => {
  let status: CompetencyState = CompetencyState.EXPIRED;
  const expired = result.due_date ? new Date().getTime() >= new Date(result.due_date).getTime() : false;
  if (isPolicy(result)) {
    if (result.signed_on) {
      status = CompetencyState.SIGNED;
    }
    if (!result.signed_on) {
      status = CompetencyState.UNSIGNED;
    }
  } else if (isDocument(result)) {
    if (result.read) {
      status = CompetencyState.READ;
    }
    if (!result.read) {
      status = CompetencyState.UNREAD;
    }
  }
  if (result.competency_status === CompetencyState.DUE_DATE_EXPIRED) {
    status = CompetencyState.DUE_DATE_EXPIRED;
  }
  if (expired) {
    status = CompetencyState.EXPIRED;
  }
  return status;
};

interface EnrichedResult extends Record<string, any> {
  contentType: CompetencyContentType;
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
  transformToCSV(data: CompetencyData[]): string;
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
    {
      table: "junction_modules_definition_directus_users",
      name: "modules_definition",
      contentType: CompetencyContentType.Module,
    },
    { table: "junction_directus_users_exams", name: "exams", contentType: CompetencyContentType.EXAM },
    {
      table: "junction_sc_definitions_directus_users",
      name: "sc_definitions",
      contentType: CompetencyContentType.SKILL_CHECKLIST,
    },
    { table: "junction_directus_users_documents", name: "documents", contentType: CompetencyContentType.DOCUMENT },
    { table: "junction_directus_users_policies", name: "policies", contentType: CompetencyContentType.POLICY },
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
  ): Promise<CompetencyData[]> {
    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const offset = (page - 1) * limit;
    try {
      const queries = this.expiringCompetencyTables.map(async ({ table, name, contentType }) => {
        const baseResults: any = await this.database(table)
          .select([
            `${table}.status as competency_status`,
            `${table}.due_date`,
            ...(table === "junction_directus_users_exams"
              ? [`${table}.allowed_attempts`, `${table}.attempts_used`]
              : []),
            ...(table === "junction_directus_users_policies" ? [`${table}.signed_on`] : []),
            ...(table === "junction_directus_users_documents" ? [`${table}.read`] : []),
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
          .whereNotIn(`${table}.status`, [DirectusStatus.ARCHIVED, CompetencyState.COMPLETED, CompetencyState.FAILED])
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
          .modify((queryBuilder: any) => {
            if (table === "junction_directus_users_policies") {
              queryBuilder.whereNull("signed_on");
            } else if (table === "junction_directus_users_documents") {
              queryBuilder.whereNull("read");
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

            const baseData: BaseCompetencyData = {
              competency_status: result.competency_status,
              due_date: result.due_date,
              title: result.title,
              first_name: result.first_name,
              last_name: result.last_name,
              last_access: result.last_access,
              email: result.email,
              directus_users_status: result.directus_users_status,
              agency_status: result.agency_status,
              agency_junction_id: result.agency_junction_id,
              contentType: contentType as CompetencyContentType,
              departments: departments.map((d) => d.department_name),
              locations: locations.map((l) => l.location_name),
              supervisors: supervisors.map((s) => s.supervisor_name),
            };

            if (contentType === CompetencyContentType.EXAM) {
              return {
                ...baseData,
                allowed_attempts: result.allowed_attempts,
                attempts_used: result.attempts_used,
              } as ExamCompetencyData;
            } else if (contentType === CompetencyContentType.POLICY) {
              return {
                ...baseData,
                signed_on: result.signed_on,
              } as PolicyCompetencyData;
            } else if (contentType === CompetencyContentType.DOCUMENT) {
              return {
                ...baseData,
                read: result.read,
              } as DocumentCompetencyData;
            }

            return baseData;
          }),
        );
        return enrichedResults;
      });
      const results = await Promise.all(queries);
      return results.flat() as CompetencyData[];
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
        allowed_attempts,
        competency_status,
        attempts_used,
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
        this.formatDate(due_date),
        contentType === CompetencyContentType.EXAM || contentType === CompetencyContentType.Module
          ? allowed_attempts ?? 0
          : "-",
        contentType === CompetencyContentType.EXAM || contentType === CompetencyContentType.Module
          ? attempts_used ?? 0
          : "-",
        isPolicy(item) || isDocument(item) ? policiesAndDocumentsStatus(item) : competency_status,
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

  private formatDate(date: unknown): string {
    if (!date) return "";

    try {
      const parsed =
        typeof date === "string"
          ? parseISO(date)
          : date instanceof Date || typeof date === "number"
          ? new Date(date)
          : new Date();
      return isValid(parsed) ? format(parsed, "dd-MM-yyyy") : "";
    } catch {
      return "";
    }
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

  async getExpiryCompetencies(userId: string, agencyId: string, userRole: RoleId): Promise<CompetencyData[]> {
    return this.competencyRepository.getAllUpcomingDueDates(agencyId, userRole, userId, 100);
  }

  async getRecipients(agencyId: string): Promise<Recipient[]> {
    return this.competencyRepository.getAllRecipientsAgency(agencyId);
  }
  async getAgenciesWithClinicianDueDate(): Promise<string[]> {
    return this.competencyRepository.getAgencyWithClinicianDueDate();
  }

  transformToCSV(data: CompetencyData[]): string {
    return this.csvService.transformToCSV(data);
  }
}
