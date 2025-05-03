// TODO log health check every minute with CloudWatch

import { defineHook } from "@directus/extensions-sdk";
import { CompetencyState } from "types";
import { ExamAssignment } from "../../../src/endpoints/exams/types";

const LogPrefix = "EXAMS_PROGRESS_CRON";

export default defineHook(({ schedule }, { services, database, logger, getSchema }) => {
  const { ItemsService } = services;

  schedule("* * * * *", async () => {
    try {
      logger.info(`${LogPrefix}: Running`);
      const usersExamsService = new ItemsService("junction_directus_users_exams", {
        database,
        schema: await getSchema(),
        accountability: { admin: true },
      });
      const examResultsService = new ItemsService("exam_results", {
        database,
        schema: await getSchema(),
        accountability: { admin: true },
      });

      const assignments = await usersExamsService.readByQuery({
        fields: ["*", "exam_versions_id.is_proctoring", "agency.ia_enable"],
        limit: -1,
        filter: {
          status: {
            _eq: CompetencyState.IN_PROGRESS,
          },
          attempt_due: {
            _lte: "$NOW",
          },
        },
      });

      if (!assignments.length) return;

      let action;
      for (const assignment of assignments) {
        const nextAttempts = assignment.attempts_used + 1;
        const score_history = assignment.score_history || [];
        const examResults = await examResultsService.readByQuery(getExamResultsQuery(assignment));
        const hasAttemptsLeft = assignment.attempts_used + 1 < assignment.allowed_attempts;
        const now = new Date();
        const attempts_used = assignment.attempts_used + 1;
        const correct_answers = examResults.filter((answer: any) => answer.correct);
        const totalCorrectAnswers = correct_answers.length;
        const scorePercentage = Math.ceil((totalCorrectAnswers / assignment.question_versions_list.length) * 100);

        const attemptNextState = hasAttemptsLeft ? CompetencyState.IN_PROGRESS : CompetencyState.FAILED_TIMED_OUT;

        const isProctored = assignment.exam_versions_id.is_proctoring && assignment.agency.ia_enable;

        const assignmentStatus = isProctored ? CompetencyState.IN_REVIEW : attemptNextState;

        score_history.push({
          score: scorePercentage,
          attempt: attempts_used,
          assignment_status: attemptNextState,
          score_status: CompetencyState.FAILED_TIMED_OUT,
        });
        if (nextAttempts >= assignment.allowed_attempts) {
          await usersExamsService.updateOne(assignment.id, {
            status: assignmentStatus,
            attempt_due: null,
            finished_on: now,
            score: scorePercentage,
            score_history,
            attempts_used,
          });
          action = "status is now " + assignmentStatus;
        } else {
          action = `Resetting attempt_due and attempts_used to ${nextAttempts}`;
          await usersExamsService.updateOne(assignment.id, {
            attempts_used: nextAttempts,
            status: assignmentStatus,
            attempt_due: null,
            score: scorePercentage,
            score_history,
          });
        }

        logger.info(`${LogPrefix}: assignment ${assignment.id} updated. Action: ${action}`);
      }
    } catch (e) {
      logger.error(`${LogPrefix}: ${e}`);
    }
  });

  function getExamResultsQuery(assignment: ExamAssignment) {
    return {
      filter: {
        assignment_id: {
          _eq: assignment.id,
        },
        attempt: {
          _eq: assignment.attempts_used,
        },
      },
    };
  }
});
