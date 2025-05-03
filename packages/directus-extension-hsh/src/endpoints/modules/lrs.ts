import { defineEndpoint } from "@directus/extensions-sdk";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { CompetencyState, controlExpiration } from "types";
import { DirectusServices } from "../../common/directus-services";

enum Verbs {
  PASSED = "passed",
  FAILED = "failed",
  ATTEMPTED = "attempted",
}

export default defineEndpoint(async (router, ctx) => {
  const targetURL = `${ctx.env.LRS_HOST}/xapi`;

  const apiProxy = createProxyMiddleware({
    target: targetURL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const newPath = path.replace(`/modules/lrs/${req.params.assignmentId}`, "");
      return newPath;
    },
    timeout: 60000,
    onProxyReq: fixRequestBody,
  });

  router.use("/lrs/:assignmentId", async (req, res, next) => {
    const fallback = () => apiProxy(req, res, next);

    try {
      if (!req.body) return fallback();

      const verbId: string | undefined = req.body?.verb?.id || "";
      if (!verbId) return fallback();

      const verb = verbId.toLowerCase().split("/").pop() as Verbs;
      if (![Verbs.PASSED, Verbs.FAILED, Verbs.ATTEMPTED].includes(verb)) return fallback();

      if ([Verbs.PASSED, Verbs.FAILED].includes(verb)) {
        const min = req.body?.result?.score?.min;
        const max = req.body?.result?.score?.max;
        const raw = req.body?.result?.score?.raw;

        if (min === undefined || max === undefined || raw === undefined) {
          return fallback();
        }
      }

      const userId: string = req.body.actor?.name;
      if (!userId) throw new Error("Missing user id");

      (req as any).accountability.user = userId;
      (req as any).accountability.admin = true;

      const { modulesAssignmentsService } = DirectusServices.fromEndpoint(ctx, req);
      const assignmentId = req.params.assignmentId;

      const assignment = await modulesAssignmentsService.readOne(assignmentId, {
        fields: ["*", "attempts.*"],
      });

      const currentAttempt = assignment.attempts.sort((a: any, b: any) => {
        return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
      })[0];

      const assignmentStatus = assignment.status;
      const currentDate = new Date();

      let updatePayload;

      if (verb === Verbs.ATTEMPTED && currentAttempt.status === CompetencyState.PENDING) {
        updatePayload = {
          status: CompetencyState.STARTED,
          started_on: currentDate,
          attempts_used: assignment.attempts_used + 1,
          last_attempt: {
            id: currentAttempt.id,
            status: CompetencyState.STARTED,
            started_on: currentDate,
          },
        };
      } else if ([Verbs.FAILED, Verbs.PASSED].includes(verb) && assignmentStatus !== CompetencyState.FINISHED) {
        const min = req.body?.result?.score?.min;
        const max = req.body?.result?.score?.max;
        const raw = req.body?.result?.score?.raw;

        const scaledScore = (raw - min) / (max - min);
        let score = scaledScore * 100;

        if (isNaN(score)) score = 0;

        const expires_on = controlExpiration(assignment.expiration_type, currentDate);

        updatePayload = {
          status: CompetencyState.FINISHED,
          finished_on: currentDate,
          approved: verb === Verbs.PASSED,
          score,
          ...(verb === Verbs.PASSED && { expires_on }),
          last_attempt: {
            id: currentAttempt.id,
            score,
            status: CompetencyState.FINISHED,
            finished_on: currentDate,
          },
        };
      }

      if (updatePayload) {
        await modulesAssignmentsService.updateOne(assignmentId, updatePayload);
      }
    } catch (error) {
      console.error(error);
    }

    return fallback();
  });
});
