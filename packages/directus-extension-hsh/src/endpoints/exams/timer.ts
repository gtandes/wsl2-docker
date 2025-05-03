import { defineEndpoint } from "@directus/extensions-sdk";
import { DBService } from "../../common/services";
import { ExamAssignment } from "./types";
const LOG_PREFIX = "EXAM_TIMER";

export default defineEndpoint((router, { services, logger }) => {
  const { ItemsService } = services;
  router.get("/exam-timer", async (req: any, res: any) => {
    const assignmentId = req.query.assignment_id.toString().trim();
    let attemptDueData: string | null = null;
    let key: string | null = null;
    const cacheAttemptDue: Record<string, string> = {};

    try {
      const db = new DBService(ItemsService, req.schema, { admin: true });
      const assignmentService = db.get("junction_directus_users_exams");

      if (!assignmentId) {
        res.status(400).json({ error: "assignment_id", message: "Assignment and User ID is required" });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });

      const assignment: ExamAssignment = await assignmentService.readOne(assignmentId);

      if (!assignment?.attempt_due) {
        res.write("event: error\n\n");
        res.write(`data: ${JSON.stringify({ error: "Attempt due is required" })}\n\n`);
        res.end();
        return;
      }

      key = `${assignmentId}-${assignment.directus_users_id}`;

      if (!cacheAttemptDue[key]) {
        cacheAttemptDue[key] = assignment?.attempt_due;
      }

      attemptDueData = assignment?.attempt_due;
    } catch (error) {
      logger.info(`Error Found On Query`);
      res.write("event: error\n\n");
      res.write(`data: ${JSON.stringify({ error: "Error fetching data" })}\n\n`);
      res.end();
      return;
    }

    const sendTimeUpdate = async () => {
      try {
        const attemptDue = new Date(cacheAttemptDue[key] ?? "").getTime();
        if (isNaN(attemptDue)) {
          res.write("event: error\n\n");
          res.write(`data: ${JSON.stringify({ error: "Invalid attempt due date" })}\n\n`);
          res.end();
          clearInterval(intervalId);
          return;
        }
        const now = new Date().getTime();
        const timeDiff = attemptDue - now;
        const remainingTime = Math.ceil(timeDiff / 1000);
        if (remainingTime <= 0) {
          if (!res.writableEnded) {
            res.write("event: timeUpdate\n\n");
            res.write(`data: ${JSON.stringify({ timeLeft: remainingTime })}\n\n`);

            res.write("event: examEnded\n");
            res.write(`data: ${JSON.stringify({ message: "Exam time has ended" })}\n\n`);
            res.end();
            clearInterval(intervalId);
          }
        }
        if (!res.writableEnded) {
          res.write("event: timeUpdate\n\n");
          res.write(`data: ${JSON.stringify({ timeLeft: remainingTime })}\n\n`);
        }
      } catch (error) {
        logger.error(`${LOG_PREFIX} - Error: ${error}`);
        clearInterval(intervalId);
        if (!res.writableEnded) {
          res.write("event: error\n\n");
          res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
          res.end();
        }
      }
    };

    await sendTimeUpdate();

    const intervalId = setInterval(sendTimeUpdate, 1000);

    req.on("close", () => {
      clearInterval(intervalId);
      logger.info(`${LOG_PREFIX} - Client disconnected from SSE`);
      res.end();
    });

    req.on("error", (error: Error) => {
      logger.error(`${LOG_PREFIX} - SSE connection error:`, error);
      clearInterval(intervalId);
      res.end();
    });
  });
});
