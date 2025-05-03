import { defineHook } from "@directus/extensions-sdk";
import { ExamsEmails } from "./exam-emails";
import { DirectusServices } from "../../../common/directus-services";

export default defineHook(async ({ action }, hookContext) => {
  action("junction_directus_users_exams.items.update", async (params, eventContext) => {
    const services = DirectusServices.fromHook(hookContext, eventContext);

    const assignmentId = params.keys[0];

    const { exam_versions_id } = await services.examAssignmentsService.readOne(assignmentId, {
      fields: ["exam_versions_id.is_proctoring"],
    });

    const isProctoring = exam_versions_id?.is_proctoring ?? false;

    ExamsEmails.send(services, params, hookContext, eventContext, isProctoring);
  });
});
