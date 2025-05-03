import {
  EndpointExtensionContext,
  EventContext,
  HookExtensionContext,
  Accountability,
  SchemaOverview,
} from "@directus/types";

export class DirectusServices {
  public readonly mailService: any;
  public readonly revisionsService: any;
  public readonly modulesAssignmentsService: any;
  public readonly policiesAssignmentsService: any;
  public readonly usersService: any;
  public readonly documentsAssignmentsService: any;
  public readonly examAssignmentsService: any;
  public readonly examResultsService: any;
  public readonly skillsChecklistsService: any;
  public readonly agenciesService: any;
  public readonly userAgenciesService: any;
  public readonly userDirectusService: any;

  private constructor(schema: SchemaOverview | null, knex: any, services: any, accountability?: Accountability | null) {
    this.mailService = new services.MailService({
      schema,
      knex,
      accountability,
    });

    this.revisionsService = new services.ItemsService("directus_revisions", {
      schema,
      knex,
      accountability,
    });

    this.modulesAssignmentsService = new services.ItemsService("junction_modules_definition_directus_users", {
      schema,
      knex,
      accountability,
    });

    this.policiesAssignmentsService = new services.ItemsService("junction_directus_users_policies", {
      schema,
      knex,
      accountability,
    });

    this.usersService = new services.ItemsService("directus_users", {
      schema,
      knex,
      accountability,
    });

    this.documentsAssignmentsService = new services.ItemsService("junction_directus_users_documents", {
      schema,
      knex,
      accountability,
    });

    this.examAssignmentsService = new services.ItemsService("junction_directus_users_exams", {
      schema,
      knex,
      accountability,
    });

    this.skillsChecklistsService = new services.ItemsService("junction_sc_definitions_directus_users", {
      schema,
      knex,
      accountability,
    });

    this.agenciesService = new services.ItemsService("agencies", {
      schema,
      knex,
      accountability,
    });

    this.examResultsService = new services.ItemsService("exam_results", {
      schema,
      knex,
      accountability,
    });
    this.userAgenciesService = new services.ItemsService("junction_directus_users_agencies", {
      schema,
      knex,
      accountability,
    });
    this.userDirectusService = new services.UsersService({
      schema,
      knex,
      accountability,
    });
  }

  static fromHook(hookContext: HookExtensionContext, eventContext: EventContext) {
    return new DirectusServices(
      eventContext.schema,
      eventContext.database,
      hookContext.services,
      eventContext.accountability,
    );
  }

  static fromEndpoint(endpointCtx: EndpointExtensionContext, req: any) {
    return new DirectusServices(req.schema, endpointCtx.database, endpointCtx.services, req.accountability);
  }

  static async fromSchedule(scheduleCtx: HookExtensionContext) {
    const schema = await scheduleCtx.getSchema();
    const database = scheduleCtx.database;
    const services = scheduleCtx.services;

    return new DirectusServices(schema, database, services);
  }
}
