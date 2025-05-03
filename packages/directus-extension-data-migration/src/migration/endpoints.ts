import { defineEndpoint } from "@directus/extensions-sdk";
import { param } from "express-validator";
import { TargetDbService } from "./services/target-db-service";
import { SourceDbService } from "./services/source-db-service";
import { LoggerService } from "./services/logger-service";
import { Logger } from "pino";
import { HSHImporter } from "./importer";
import { v4 as uuidv4 } from "uuid";

export default defineEndpoint((router, { env, logger }) => {
  const sourceDB = require("knex")({
    client: "mysql",
    connection: {
      host: env["DATA_MIGRATION_DB_HOST"],
      port: env["DATA_MIGRATION_DB_PORT"],
      user: env["DATA_MIGRATION_DB_USER"],
      database: env["DATA_MIGRATION_DB_NAME"],
      password: env["DATA_MIGRATION_DB_PASSWORD"],
    },
  });

  const targetDB = require("knex")({
    client: "postgres",
    connection: {
      host: env["DB_HOST"],
      port: env["DB_PORT"],
      user: env["DB_USER"],
      database: env["DB_DATABASE"],
      password: env["DB_PASSWORD"],
    },
  });

  const adminRoleId = "cc987fae-dbb9-4d72-8199-21243fa13c92";
  const targetDBService = new TargetDbService(targetDB);
  const sourceDBService = new SourceDbService(sourceDB);
  const loggerService = new LoggerService(targetDB, logger as Logger);
  const importer = new HSHImporter(sourceDBService, targetDBService, loggerService);

  const checkIsRole = async (_req: any, res: any, role: string, next: any) => {
    const userRole = _req.accountability.role;

    if (userRole !== role) {
      res.statusMessage = "Invalid role";
      res.status(500).end();
      return;
    }

    next();
  };

  router.get("/agency", param("agency_id").notEmpty(), async (_req: any, res: any) => {
    await checkIsRole(_req, res, adminRoleId, async () => {
      const env = process.env.ENV_NAME;
      const isProd = env === "prod";

      if (!["migration", "prod", "local"].includes(env)) {
        res.statusMessage = "Invalid environment";
        res.status(500).end();
        return;
      }

      const portalID = _req.query.agency_id;

      if (!portalID) {
        res.statusMessage = "Invalid PortalID";
        res.status(500).end();
        return;
      }

      const runningImport = await targetDB("data_migrations").select("id").where("running", true).first();
      if (runningImport) {
        res.statusMessage = "Import running";
        res.status(400).end();
        return;
      }

      const migrationID = uuidv4();
      await targetDB("data_migrations").insert({
        id: migrationID,
        date_created: new Date(),
        running: true,
        import_portal_id: portalID,
      });

      const markImportComplete = async () => {
        await targetDB("data_migrations")
          .update({
            running: false,
          })
          .where("id", migrationID);
      };

      res.status(200).end();
      try {
        await importer.importPortals([portalID], migrationID);

        if (isProd) {
          await targetDBService.markPortalAsLive(portalID);
        }

        await new Promise((r) => setTimeout(r, 6000));
      } catch (err) {
        console.error(err);
      } finally {
        await markImportComplete();
      }
    });
  });

  router.get("/full-migration", async (_req: any, res: any) => {
    const env = process.env.ENV_NAME;

    if (env !== "migration") {
      res.statusMessage = "Invalid environment";
      res.status(500).end();
      return;
    }

    res.status(200).end();

    try {
      await importer.importPortals(undefined, undefined);
    } catch (err) {
      console.error(err);
    }
  });

  router.get("/generate-mappings", async (_req: any, res: any) => {
    if (!["prod", "local"].includes(process.env.ENV_NAME)) {
      res.statusMessage = "Invalid environment";
      res.status(500).end();
      return;
    }

    res.status(200).end();

    try {
      await importer.generateMappingsList();
    } catch (err) {
      console.error(err);
    }
  });
});
