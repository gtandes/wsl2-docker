import { defineEndpoint } from "@directus/extensions-sdk";
import { CompetencyState, CompetencyType, UserRole } from "types";
import { DirectusServices } from "../../common/directus-services";
import { format, subMonths } from "date-fns";
import { createGzip } from "zlib";
import { Readable } from "stream";

const formatDate = (date?: string) => (date ? format(new Date(date), "yyyy-MM-dd") : "");

const fetchAllData = async (
  service: { readByQuery: (arg0: any) => any },
  query: { filter: any; fields: string[] },
  pageSize: number = 100,
) => {
  const allData: any[] = [];
  let page = 1;

  while (true) {
    const result = await service.readByQuery({ ...query, page, per_page: pageSize });
    if (result.length === 0) break;
    allData.push(...result);
    page++;
  }

  return allData;
};

interface CompetencyData {
  directus_users_id: string;
  status: CompetencyState;
  signed_on?: string | null;
  read?: string | null;
}

const fetchCompetencyData = async (
  service: any,
  userIds: string[],
  idAgency: string,
  serviceType: CompetencyType,
): Promise<Set<string>> => {
  const competencyData = await service.readByQuery({
    filter: {
      directus_users_id: { _in: userIds },
      agency: { _eq: idAgency },
    },
    fields: ["directus_users_id", "status", "signed_on", "read"],
    limit: 100000,
  });

  return processCompetencyData(competencyData, serviceType);
};
const processCompetencyData = (data: CompetencyData[], serviceType: CompetencyType): Set<string> => {
  const competencyUserIds = new Set<string>();

  data.forEach(({ status, directus_users_id, signed_on, read }) => {
    switch (serviceType) {
      case CompetencyType.POLICY:
        if (signed_on !== null || read !== null) {
          competencyUserIds.add(directus_users_id);
        }
        break;

      case CompetencyType.DOCUMENT:
        if (read != null) {
          competencyUserIds.add(directus_users_id);
        }
        break;
      case CompetencyType.SKILL_CHECKLIST:
      case CompetencyType.EXAM:
      case CompetencyType.MODULE:
        if (!isPendingStatus(status)) {
          competencyUserIds.add(directus_users_id);
        }
        break;
    }
  });

  return competencyUserIds;
};

const isPendingStatus = (status: CompetencyState): boolean => {
  return [CompetencyState.NOT_STARTED, CompetencyState.PENDING, CompetencyState.EXPIRED].includes(status);
};

const createCSVHeaders = (headers: string[]) => headers.join(",") + "\n";

const createCSVRow = (agencyName: string, user: any, userAgency: any) => {
  const { first_name, last_name, email, role, last_access } = user;
  const { createdOn, status } = userAgency || {};

  return (
    [
      agencyName,
      `${first_name || ""} ${last_name || ""}`,
      email || "",
      role?.name || "",
      status || "",
      formatDate(createdOn),
      formatDate(last_access),
    ].join(",") + "\n"
  );
};

const prepareCSVStream = (res: any, agencyName: string, headers: string[], endpointContext: any) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${agencyName}-billing-report.csv`);
  res.setHeader("Content-Encoding", "gzip");

  const compress = createGzip();
  const readableStream = new Readable({ read() {} });

  readableStream.pipe(compress).pipe(res);
  readableStream.push(createCSVHeaders(headers));

  compress.on("error", (err) => {
    endpointContext.logger.error("Compression Error:", err);
    res.status(500).json({ message: "Compression Error" });
  });

  readableStream.on("error", (err) => {
    endpointContext.logger.error("Stream Error:", err);
    res.status(500).json({ message: "Stream Error" });
  });

  return readableStream;
};

export default defineEndpoint((router, endpointContext) => {
  router.get("/billing-report/:idAgency", async (req, res) => {
    const { idAgency } = req.params;
    const accountability = (req as any).accountability;

    if (accountability.role !== UserRole.HSHAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const services = DirectusServices.fromEndpoint(endpointContext, req);
      const agency = await services.agenciesService.readOne(idAgency, { fields: ["name"] });

      if (!agency) {
        return res.status(404).json({ message: "Agency not found" });
      }

      const userAgencies = await fetchAllData(services.userAgenciesService, {
        filter: { agencies_id: { _eq: idAgency } },
        fields: ["directus_users_id", "date_created", "status"],
      });

      if (!userAgencies.length) {
        return res.status(404).json({ message: "No users found for this agency" });
      }

      const userIds = userAgencies.filter((ua: any) => ua.status !== "archive").map((ua: any) => ua.directus_users_id);

      const twelveMonthsAgo = subMonths(new Date(), 12).toISOString();

      const users = await fetchAllData(services.usersService, {
        filter: {
          id: { _in: userIds },
          last_access: { _gte: twelveMonthsAgo },
          role: { _eq: UserRole.Clinician },
        },
        fields: ["id", "first_name", "last_name", "email", "role.name", "last_access"],
      });

      if (!users.length) {
        return res.status(404).json({ message: "No user details found" });
      }

      const competencyServices = [
        { service: services.examAssignmentsService, type: CompetencyType.EXAM },
        { service: services.skillsChecklistsService, type: CompetencyType.SKILL_CHECKLIST },
        { service: services.modulesAssignmentsService, type: CompetencyType.MODULE },
        { service: services.documentsAssignmentsService, type: CompetencyType.DOCUMENT },
        { service: services.policiesAssignmentsService, type: CompetencyType.POLICY },
      ];

      const competencyUserIds = new Set<string>();
      for (const { service, type } of competencyServices) {
        const serviceUserIds = await fetchCompetencyData(service, userIds, idAgency, type);
        serviceUserIds.forEach((id) => competencyUserIds.add(id));
      }

      const userAgenciesMap = userAgencies.reduce((acc: any, ua: any) => {
        acc[ua.directus_users_id] = { createdOn: ua.date_created, status: ua.status };
        return acc;
      }, {});

      const csvStream = prepareCSVStream(
        res,
        agency.name,
        [
          "Tenant Name",
          "User Name",
          "User Email",
          "User Type",
          "User Status",
          "Account Creation Date",
          "Last Login Date",
        ],
        endpointContext,
      );

      users
        .filter((user: any) => competencyUserIds.has(user.id))
        .forEach((user: any) => {
          const row = createCSVRow(agency.name, user, userAgenciesMap[user.id]);
          csvStream.push(row);
        });

      csvStream.push(null);
      return;
    } catch (error) {
      endpointContext.logger.error("Internal Server Error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });
});
