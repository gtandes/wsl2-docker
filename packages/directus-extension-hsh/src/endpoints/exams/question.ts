import { defineEndpoint } from "@directus/extensions-sdk";
import { ExamAssignment } from "./types";
import { query, body, validationResult } from "express-validator";
import { DBService } from "../../common/services";
import crypto from "crypto";
import { CompetencyState, controlExpiration } from "types";
import { v4 as uuidv4 } from "uuid";
import _ from "lodash";
import { differenceInSeconds } from "date-fns";

const LOG_PREFIX = "EXAM QUESTION";

type TOptions = {
  id?: string;
  sort?: number;
  answer_text?: string;
};

export default defineEndpoint((router, { services, logger, database }) => {
  const { ItemsService } = services;

  router.get("/question", query("assignment_id").notEmpty(), async (_req: any, res: any) => {
    if (!_req.accountability.user) {
      return res.sendStatus(403);
    }
    let trx;
    try {
      if (!_req.accountability.user) throw new Error(`Unauthorized`);

      trx = await database.transaction();
      const db = new DBService(ItemsService, _req.schema, _req.accountability);
      db.setTransaction(trx);

      const adminDb = new DBService(ItemsService, _req.schema, { admin: true });
      adminDb.setTransaction(trx);

      const assignmentService = db.get("junction_directus_users_exams");
      const examResultsService = db.get("exam_results");
      const questionsService = db.get("questions");
      const questionVersionsService = db.get("question_versions");
      const updateQuestionVersionsService = adminDb.get("question_versions");

      const { assignment_id } = _req.query;
      const assignment: ExamAssignment = await assignmentService.readOne(assignment_id);
      validateAssignment(assignment, _req.accountability.user);

      const examResults = await examResultsService.readByQuery(getExamResultsQuery(assignment));
      const nextQuestion = assignment.question_versions_list.at(examResults.length);
      if (!nextQuestion) {
        throw new Error(`No next question for assignment ${assignment_id}.`);
      }

      const questionVersion = await questionVersionsService.readOne(nextQuestion, { fields: ["*", "image.id"] });
      if (!questionVersion) {
        throw new Error(`Question versions Id ${nextQuestion} for assignment ${assignment.id} not found`);
      }
      const question = await questionsService.readOne(questionVersion.question_id, { fields: ["*", "category.title"] });

      const questionDetails = questionVersion.question;
      const answer = questionVersion.answer;
      const correctAnswerId = answer.id;
      const answerIds = questionDetails.answers.map((option: TOptions) => option.id);
      const answerIdIsInOptions = answerIds.includes(correctAnswerId);

      const validatedQuestionOptions = questionDetails.answers.map((option: TOptions) => {
        if (option.id && option.id?.toString().trim() !== "") {
          return option;
        }

        const id = answerIdIsInOptions ? uuidv4() : correctAnswerId;
        return { ...option, id };
      });

      const areOptionsIdentical = _.isEqual(questionDetails.answers, validatedQuestionOptions);

      let validQuestionDetails = questionVersion.question;
      if (!areOptionsIdentical) {
        validQuestionDetails = { ...questionDetails, answers: validatedQuestionOptions };
        await updateQuestionVersionsService.updateOne(nextQuestion, { question: validQuestionDetails });
      }

      const responseQuestion = {
        id: questionVersion.id,
        question: validQuestionDetails,
        question_id: questionVersion.question_id,
        question_index: examResults.length,
        category: question.category?.title,
        image: questionVersion.image?.id,
        exam_result_length: examResults.length,
      };

      await trx.commit();

      res.send(responseQuestion);
      return;
    } catch (e) {
      if (trx) await trx.rollback();
      logger.error(`${LOG_PREFIX}: ${e}. Request: ${JSON.stringify(_req.query)}`);
      res.sendStatus(400);
      return;
    }
  });

  router.post(
    "/question",
    body("assignment_id").notEmpty(),
    body("question_version_id").notEmpty(),
    body("answer_id").notEmpty(),
    body("time_taken").notEmpty(),
    async (req: any, res: any) => {
      const validationErrors = validationResult(req);
      if (!validationErrors.isEmpty()) {
        return res.status(400).json({
          errors: validationErrors.array(),
          message: "Validation failed",
        });
      }

      let trx;

      try {
        if (!req.accountability.user) {
          throw new Error(`Unauthorized`);
        }

        trx = await database.transaction();

        const db = new DBService(ItemsService, req.schema, req.accountability);
        db.setTransaction(trx);

        const assignmentService = db.get("junction_directus_users_exams");
        const examResultsService = db.get("exam_results");
        const examVersionsService = db.get("exam_versions");
        const agencyService = db.get("agencies");
        const questionVersionsService = db.get("question_versions");
        const { assignment_id, question_version_id, answer_id, time_taken } = req.body;
        const assignment = await assignmentService.readOne(assignment_id);
        const examResults = await examResultsService.readByQuery(getExamResultsQuery(assignment));
        const alreadyAnswered = examResults.find((answer: any) => answer.question_versions_id === question_version_id);
        const questionVersion = await questionVersionsService.readOne(question_version_id);

        const latestAttempt = examResults
          .filter((result: any) => result.attempt === assignment.attempts_used)
          .sort((a: any, b: any) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];

        const timeTaken = latestAttempt
          ? differenceInSeconds(new Date(), new Date(latestAttempt.date_created))
          : time_taken;

        if (!assignment) {
          throw new Error(`Assignment not found`);
        }

        const agencyDetails = await agencyService.readOne(assignment.agency);

        if (!questionVersion) {
          throw new Error(`Question versions Id ${question_version_id} for assignment ${assignment_id} not found`);
        }

        const correct = questionVersion.answer.id === answer_id;

        if (examResults.length && alreadyAnswered) {
          await examResultsService.updateOne(alreadyAnswered.id, {
            correct,
            time_taken: timeTaken,
          });
        } else {
          await examResultsService.createOne({
            answer: { id: answer_id },
            assignment_id: assignment.id,
            exams_id: assignment.exams_id,
            attempt: assignment.attempts_used,
            question_versions_id: questionVersion.id,
            questions_id: questionVersion.question_id,
            exam_versions_id: assignment.exam_versions_id,
            correct,
            time_taken: timeTaken,
          });
        }

        if (examResults.length + 1 === assignment.question_versions_list.length) {
          const examVersion = await examVersionsService.readOne(assignment.exam_versions_id);

          const isProctored = agencyDetails?.ia_enable && examVersion?.is_proctoring;

          const correct_answers = examResults.filter((answer: any) => answer.correct);
          const totalCorrectAnswers = correct_answers.length + (correct ? 1 : 0);
          const scorePercentage = Math.ceil((totalCorrectAnswers / assignment.question_versions_list.length) * 100);

          const now = new Date();
          const hasAttemptsLeft = assignment.attempts_used + 1 < assignment.allowed_attempts;
          const attempts_used = assignment.attempts_used + 1;

          const score_history = assignment.score_history || [];

          const assignment_status =
            scorePercentage >= examVersion?.passing_score
              ? CompetencyState.COMPLETED
              : hasAttemptsLeft
              ? CompetencyState.IN_PROGRESS
              : CompetencyState.FAILED;

          const score_status = scorePercentage >= examVersion.passing_score ? "PASSED" : CompetencyState.FAILED;
          score_history.push({ score: scorePercentage, attempt: attempts_used, assignment_status, score_status });

          if (scorePercentage >= examVersion.passing_score) {
            await assignmentService.updateOne(assignment_id, {
              status: isProctored ? CompetencyState.IN_REVIEW : CompetencyState.COMPLETED,
              finished_on: now,
              cert_code: crypto.randomBytes(7).toString("hex"),
              cert_expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              score: scorePercentage,
              score_history,
              attempts_used,
              expires_on: controlExpiration(assignment.expiration_type, now),
            });
          } else {
            let nextStatus: CompetencyState;

            if (isProctored) {
              nextStatus = CompetencyState.IN_REVIEW;
            } else {
              nextStatus = hasAttemptsLeft ? CompetencyState.IN_PROGRESS : CompetencyState.FAILED;
            }

            await assignmentService.updateOne(assignment_id, {
              status: nextStatus,
              attempt_due: null,
              finished_on: now,
              score: scorePercentage,
              score_history,
              attempts_used,
            });
          }
        }
        await trx.commit();

        const responseQuestion = {
          exam_result_length: examResults.length,
        };

        return res.status(200).json(responseQuestion);
      } catch (e) {
        if (trx) await trx.rollback();
        logger.error(`${LOG_PREFIX}: ${e}. Request body: ${JSON.stringify(req.body)}`);
        res.sendStatus(400);
      }
    },
  );
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

function validateAssignment(assignment: ExamAssignment, userId: string) {
  if (!assignment || assignment.directus_users_id !== userId) {
    throw new Error(` Error fetching exam assignment ${assignment.id} for user ${userId}`);
  }

  if (assignment?.status !== "IN_PROGRESS") {
    throw new Error(`Can not save answer for assignment ${assignment.id}. Status ${assignment?.status}`);
  }

  if (assignment.attempts_used > assignment.allowed_attempts) {
    throw new Error(`No attempts left for assignment ${assignment.id}. Attempts used ${assignment.attempts_used}`);
  }

  const attemptDueEpoch = new Date(assignment.attempt_due).getTime() / 1000;
  const nowEpoch = new Date().getTime() / 1000;
  if (attemptDueEpoch <= nowEpoch) {
    throw new Error(`No time left for assignment ${assignment.id}. Attempt due ${assignment.attempt_due}`);
  }
}
