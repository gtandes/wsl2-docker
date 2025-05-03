import { defineHook } from "@directus/extensions-sdk";
import { HSHImporter } from "./importer";
import { Logger } from "pino";
import { TargetDbService } from "./services/target-db-service";
import { LoggerService } from "./services/logger-service";
import { SourceDbService } from "./services/source-db-service";

export default defineHook(async ({ init, schedule }, { logger, env }) => {
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

  const targetDBService = new TargetDbService(targetDB);
  const sourceDBService = new SourceDbService(sourceDB);
  const loggerService = new LoggerService(targetDB, logger as Logger);
  const importer = new HSHImporter(sourceDBService, targetDBService, loggerService);

  init("cli.after", ({ program }) => {
    program.command("import").action(async ({}, { _ }) => {
      try {
        // await importer.generateMappingsList();
        await importer.importPortals([621], undefined);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
      process.exit(0);
    });
  });

  // schedule("15 */12 * * *", async () => {
  //   try {
  //     const env = process.env.ENV_NAME;
  //     if (env === "migration") {
  //       await SlackMessage("Running full data migration import");
  //       await importer.importPortals(undefined, undefined);
  //       await SlackMessage("Full data migration import complete");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     await SlackMessage(`Full Data migration error \n
  // message: ${JSON.stringify(err.message, null, 2)}\n
  // stack: ${JSON.stringify(err.stack, null, 2)}`);
  //   }
  // });
});

export async function SlackMessage(message: string) {
  if (process.env.ENV_NAME !== "prod") return;

  await fetch("https://hooks.slack.com/services/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", {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });
}
