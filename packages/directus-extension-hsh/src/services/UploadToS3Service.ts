/* eslint-disable turbo/no-undeclared-env-vars */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { PassThrough, Readable } from "stream";
import fs from "fs";
import mime from "mime-types";
import mustache from "mustache";
import { template } from "./template";
import puppeteer from "puppeteer";
import path from "path";
import { CompetencyState } from "types";

class S3Service {
  private s3: S3Client;
  private bucketName: string;
  private region: string;
  private LOG_PREFIX: string = "CERTIFICATE-GENERATION";

  constructor() {
    this.region = process.env.STORAGE_LOCAL_REGION || "";
    this.bucketName = process.env.S3_CERTIFICATE_BUCKET_NAME || "";

    const credentials =
      process.env.S3_SECRET_ACCESS_KEY && process.env.S3_ACCESS_ID_KEY
        ? {
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
            accessKeyId: process.env.S3_ACCESS_ID_KEY || "",
          }
        : undefined;

    this.s3 = new S3Client({
      region: process.env["STORAGE_LOCAL_REGION"],
      credentials,
    });
  }

  async uploadCertificate(filePath: string, key: string): Promise<string> {
    console.log({
      accessKeyId: process.env.S3_ACCESS_ID_KEY!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    });

    const fileStream = fs.createReadStream(filePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ACL: "private",
    });

    await this.s3.send(command);
    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    return fileUrl;
  }

  async cleanupCertificateFiles(filePath: string): Promise<void> {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`${this.LOG_PREFIX} : Error deleting file: ${err.message}`);
      } else {
        console.log(`${this.LOG_PREFIX} : File deleted successfully. ${filePath}`);
      }
    });

    fs.rm(`${__dirname}/users`, { recursive: true }, (err) => {
      if (err) {
        console.error(`${this.LOG_PREFIX} : Error deleting folder: ${err.message}`);
      } else {
        console.log(`${this.LOG_PREFIX} : Folder and its contents deleted successfully.`);
      }
    });
  }

  async streamCertificate(key: string, res: any): Promise<void> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3.send(command);

      res.setHeader("Content-Type", response.ContentType || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${key}"`);

      const passThrough = new PassThrough();

      const readableStream = response.Body as Readable;

      if (typeof readableStream.pipe === "function") {
        readableStream.pipe(passThrough).pipe(res);
      } else {
        throw new Error(`${this.LOG_PREFIX} : Response body is not a readable stream`);
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} : Error fetching certificate:`, error);
      res.status(500).json({ error: "Could not fetch certificate" });
    }
  }

  async generateCertificatePdf(database: any, competencyType: string, assignmentId: string | number) {
    const dbReference = this.getDbReference(competencyType);

    if (!dbReference) {
      console.error(`${this.LOG_PREFIX} : Invalid competency type: ${competencyType}`);
      return null;
    }

    if (!assignmentId || (typeof assignmentId !== "string" && typeof assignmentId !== "number")) {
      console.error(`${this.LOG_PREFIX} : Invalid assignmentId: ${assignmentId}`);
      return null;
    }

    try {
      const result = await this.fetchCertificateData(database, dbReference, assignmentId);

      if (!result) {
        console.error(`${this.LOG_PREFIX} : No data found for assignmentId: ${assignmentId}`);
        return null;
      }

      if (result.status !== CompetencyState.COMPLETED && result.status !== CompetencyState.FINISHED) {
        console.error(`${this.LOG_PREFIX} : Competency assignment is not completed.`);
        return null;
      }

      result.logoPath = result.file_id ? `${process.env.PUBLIC_URL}/assets/${result.file_id}` : "";

      result.contact_hour = result.contact_hour || 0;

      this.formatCertificateDates(result);

      const htmlContent = mustache.render(template, result);

      const fileKey = `users/${result.directus_users_id}/${competencyType}/${assignmentId}.pdf`;

      const pdfPath = path.join(__dirname, fileKey);

      const outputDir = path.dirname(pdfPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // const browser = await puppeteer.launch({ headless: true });
      const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // Prevents memory issues
          "--disable-gpu", // No need for GPU rendering
        ],
        protocolTimeout: 120000,
      });

      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(120000); // 2 minutes
      await page.setDefaultTimeout(120000);

      await page.setContent(htmlContent);

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        scale: 0.9,
        landscape: false,
        displayHeaderFooter: false,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      page.on("error", (err) => console.log("Error: ", err));
      page.on("pageerror", (err) => console.log("Page Error: ", err));

      await browser.close();

      const uploadResult = await this.uploadCertificate(pdfPath, fileKey);
      return { pdfPath, uploadResult };
    } catch (error) {
      console.error(`${this.LOG_PREFIX} : Error generating certificate PDF:`, error);
      return null;
    }
  }

  private getDbReference(competencyType: string) {
    if (competencyType === "exam") {
      return {
        baseTable: "junction_directus_users_exams",
        entityTable: "exams",
        versionTable: "exam_versions",
        baseTableVersion: "exam_versions_id",
      };
    }

    if (competencyType === "module") {
      return {
        baseTable: "junction_modules_definition_directus_users",
        entityTable: "modules_definition",
        versionTable: "modules_versions",
        baseTableVersion: "module_version",
      };
    }

    return null;
  }

  private async fetchCertificateData(database: any, dbReference: any, assignmentId: string | number) {
    return database(dbReference.baseTable)
      .select(
        "a.name as agency_name",
        database.raw("CONCAT(du.first_name, ' ', du.last_name) as full_name"),
        "entity.title",
        "score",
        "cert_code",
        "finished_on",
        "expires_on as expiration_date",
        "version.contact_hour",
        "directus_users_id",
        "df.id as file_id",
        `${dbReference.baseTable}.status`,
      )
      .leftJoin("agencies as a", "a.id", `${dbReference.baseTable}.agency`)
      .leftJoin("directus_users as du", "du.id", `${dbReference.baseTable}.directus_users_id`)
      .leftJoin(
        `${dbReference.versionTable} as version`,
        "version.id",
        `${dbReference.baseTable}.${dbReference.baseTableVersion}`,
      )
      .leftJoin(
        `${dbReference.entityTable} as entity`,
        "entity.id",
        `${dbReference.baseTable}.${dbReference.entityTable}_id`,
      )
      .leftJoin("directus_files as df", "df.id", "a.logo")
      .where(`${dbReference.baseTable}.id`, assignmentId)
      .first();
  }

  private formatCertificateDates(result: any) {
    const formatDate = (dateString: string, daysToSubtract: number = 0) => {
      const date = new Date(dateString);
      date.setDate(date.getDate() - daysToSubtract);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    if (result.finished_on) {
      result.finished_on = formatDate(result.finished_on);
    }

    if (result.expiration_date) {
      result.expiration_date = formatDate(result.expiration_date, 2);
    }
  }
}

export default new S3Service();
