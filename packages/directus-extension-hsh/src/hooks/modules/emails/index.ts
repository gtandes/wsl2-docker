import { defineHook } from "@directus/extensions-sdk";
import { DirectusServices } from "../../../common/directus-services";
import { modulesEmailsHandler } from "./modules-emails";

export default defineHook(async ({ action }, hookContext) => {
  action("junction_modules_definition_directus_users.items.update", async (params, eventContext) => {
    const services = DirectusServices.fromHook(hookContext, eventContext);
    modulesEmailsHandler.send(services, params, hookContext, eventContext);
  });
});
