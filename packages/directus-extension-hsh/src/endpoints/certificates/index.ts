import { defineEndpoint } from "@directus/extensions-sdk";
import S3Service from "../../services/UploadToS3Service.js";
import { UserRole } from "types";
import path from "path";
import { fileURLToPath } from "url";

const LOG_PREFIX = "CERTIFICATES";

export default defineEndpoint((router, { database }) => {
  const filename = fileURLToPath(import.meta.url);
  const dirname = path.dirname(filename);

  globalThis.__filename = filename;
  globalThis.__dirname = dirname;

  router.post("/upload-cert", async (req: any, res: any) => {
    try {
      const { type, assignmentId } = req.query;
      if (!type || !assignmentId) {
        return res.status(400).json({ error: "Missing required query parameters: type or assignmentId" });
      }

      const file = await S3Service.generateCertificatePdf(database, type, assignmentId);

      if (!file) {
        return res.status(500).json({ error: "Failed to generate certificate PDF" });
      }

      return res.status(200).json({ message: `Uploaded: ${file}` });
    } catch (error) {
      console.error(`${LOG_PREFIX} : Error during certificate upload:`, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/view-cert", async (req: any, res: any) => {
    if (!req.accountability.user) {
      return res.status(403).json({ message: "Access forbidden." });
    }

    try {
      const { userId, type, assignmentId } = req.query;

      if (req.accountability.user !== userId && req.accountability.role === UserRole.Clinician) {
        return res.status(403).json({ message: "Access forbidden." });
      }

      if (!userId || !type || !assignmentId) {
        return res.status(400).json({ error: "Missing certificate key" });
      }

      const key = `users/${userId}/${type}/${assignmentId}.pdf`;

      await S3Service.streamCertificate(key as string, res);
    } catch (error) {
      console.error(`${LOG_PREFIX} : Error fetching certificate:`, error);
      res.status(500).json({ error: "Could not fetch certificate" });
    }
  });
});
