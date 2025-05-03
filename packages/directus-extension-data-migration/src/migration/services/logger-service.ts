import { Knex } from "knex";
import type { Logger } from "pino";
import { ErrorLog } from "../types";
export class LoggerService {
  db: Knex;
  logger: Logger;

  constructor(db: Knex, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async log(migrationID: string, message: string, level: string = "info", error?: ErrorLog) {
    const logMessage = `Data migration: ${message}`;
    this.logger[level](logMessage);

    if (!migrationID) return;

    await this.db("data_migration_records").insert({
      date_created: new Date(),
      data_migration: migrationID,
      level,
      message: logMessage,
      error,
    });
  }
}
