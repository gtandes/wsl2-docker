import { defineEndpoint } from "@directus/extensions-sdk";
import { DirectusServices } from "../../common/directus-services";
import { createGzip } from "zlib";
import { getExamReport } from "./exams-reports";
import { getSkillsChecklistReport } from "./skills-checklist-reports";
import { UserRole } from "types";

enum ContentType {
  EXAM = "exam",
  SKILLS_CHECKLIST = "skills-checklist",
  MODULES = "modules",
  POLICY = "policy",
  DOCUMENT = "document",
}

export enum ReportType {
  SPECIFIC = "specific",
  AGGREGATE = "aggregate",
}

export default defineEndpoint((router, endpointContext) => {
  router.get("/reports/:contentType", async (req, res) => {
    const services = DirectusServices.fromEndpoint(endpointContext, req);

    const accountability = (req as any).accountability;

    const contentType = req.params.contentType;
    const reportType = req.query.type as ReportType;

    if (!contentType) {
      return res.status(400).json({
        message: "Content Type is required",
      });
    }

    if (!reportType) {
      return res.status(400).json({
        message: "Report Type is required",
      });
    }

    const agency = (req.query.agency || "all") as string;

    const ids = ((req.query.ids as string) || "").split(",").filter((id) => id.length > 0);

    if (reportType === ReportType.SPECIFIC && ids.length === 0) {
      return res.status(400).json({
        message: "At least one ID is required for specific report type",
      });
    }

    if (![UserRole.HSHAdmin, UserRole.AgencyUser, UserRole.UsersManager].includes(accountability.role)) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    let csv = "";

    try {
      switch (contentType) {
        case ContentType.SKILLS_CHECKLIST:
          csv = await getSkillsChecklistReport(services, reportType, agency, ids);
          break;

        case ContentType.EXAM:
          csv = await getExamReport(services, reportType, agency, ids);
          break;

        default:
          return res.status(400).json({
            message: "Invalid Content Type",
          });
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${contentType}.csv`);
      res.setHeader("Content-Encoding", "gzip");

      const compress = createGzip();
      compress.write(csv);
      compress.pipe(res);
      return compress.end();
    } catch (error) {
      endpointContext.logger.error(error);
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
  });
});
