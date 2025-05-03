import { defineEndpoint } from "@directus/extensions-sdk";
import shuffle from "lodash/shuffle";
import { addMinutes, parseISO } from "date-fns";
import { ExamAssignment } from "./types";
import { body, validationResult } from "express-validator";
import { DBService } from "../../common/services";
import { CompetencyState } from "types";

const LOG_PREFIX = "EXAM START";

export default defineEndpoint((router, { services, logger }) => {
  const { ItemsService } = services;

  router.post("/start", body("assignment_id").notEmpty(), async (req: any, res: any) => {
    if (!req.accountability.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Input Validation Failed.", errors: errors.array() });
    }

    const { assignment_id } = req.body;
    const db = new DBService(ItemsService, req.schema, req.accountability);

    try {
      const [
        assignmentService,
        examsService,
        examVersionsService,
        questionVersionsService,
        questionsService,
        questionJunctionService,
      ] = await Promise.all([
        db.get("junction_directus_users_exams"),
        db.get("exams"),
        db.get("exam_versions"),
        db.get("question_versions"),
        db.get("questions"),
        db.get("junction_exam_versions_questions"),
      ]);

      const assignment: ExamAssignment = await assignmentService.readOne(assignment_id);

      if (!assignment || assignment.directus_users_id !== req.accountability.user) {
        return res
          .status(403)
          .json({ message: `Incorrect assignment ${assignment_id} for user ${req.accountability.user}` });
      }

      if (![CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS].includes(assignment?.status as CompetencyState)) {
        return res
          .status(400)
          .json({ message: `Cannot start assignment ${assignment_id}. Status ${assignment?.status}` });
      }

      const [exam, examVersions] = await Promise.all([
        examsService.readOne(assignment?.exams_id),
        examVersionsService.readByQuery({
          fields: ["*"],
          filter: {
            exam: { _eq: assignment?.exams_id },
          },
          sort: ["-date_created"],
          limit: 1,
        }),
      ]);

      const examVersion = examVersions[0];

      const examVersionQuestionList = await questionJunctionService.readByQuery({
        fields: ["questions_id"],
        filter: {
          exam_versions_id: { _eq: examVersion.id },
        },
        limit: 500,
      });

      if (!exam || !examVersion) {
        return res.status(404).json({ message: `Cannot start ${assignment_id}. Exam and/or exam version not found` });
      }

      const isShuffled = examVersion.shuffle_questions;
      const totalQuestionsToGive = examVersion.questions_to_give;

      const questionIds = examVersionQuestionList.map((q: any) => q.questions_id);

      const questionDetailsMap = new Map();

      const allQuestions = await questionsService.readByQuery({
        fields: ["*"],
        filter: {
          id: {
            _in: questionIds.slice(0, 500),
          },
        },
        limit: 500,
      });

      allQuestions.forEach((q: any) => {
        questionDetailsMap.set(q.id, q);
      });

      const questionsByCategory: { [key: string]: string[] } = {};
      for (const question of examVersionQuestionList) {
        const fullQuestion = questionDetailsMap.get(question.questions_id);
        if (!fullQuestion) continue;

        const category = fullQuestion.category || "uncategorized";
        if (!questionsByCategory[category]) {
          questionsByCategory[category] = [];
        }
        questionsByCategory[category].push(question.questions_id);
      }

      if (isShuffled) {
        Object.keys(questionsByCategory).forEach((category) => {
          questionsByCategory[category] = shuffle(questionsByCategory[category]);
        });
      }

      const categories = Object.keys(questionsByCategory);
      const distributionCount: { [key: string]: number } = {};
      let remainingQuestions = totalQuestionsToGive;
      const baseQuestionsPerCategory = Math.floor(totalQuestionsToGive / categories.length);

      for (const category of categories) {
        const availableQuestions = questionsByCategory[category]?.length || 0;
        distributionCount[category] = Math.min(baseQuestionsPerCategory, availableQuestions);
        remainingQuestions -= distributionCount[category];
      }

      while (remainingQuestions > 0) {
        let distributedInPass = false;
        const shuffledCategories = shuffle(categories);

        for (const category of shuffledCategories) {
          const currentlyAssigned = distributionCount[category] ?? 0;
          const availableQuestions = questionsByCategory[category]?.length ?? 0;

          if (currentlyAssigned < availableQuestions) {
            distributionCount[category] = (distributionCount[category] || 0) + 1;
            remainingQuestions--;
            distributedInPass = true;

            if (remainingQuestions === 0) break;
          }
        }

        if (!distributedInPass) {
          return res.status(400).json({
            message: "Cannot distribute all questions. Not enough questions available across categories.",
          });
        }
      }

      let selectedQuestionIds: string[] = [];
      for (const category of categories) {
        const numQuestionsToSelect = distributionCount[category];
        const categoryQuestions = questionsByCategory[category];

        if (categoryQuestions) {
          selectedQuestionIds = [...selectedQuestionIds, ...categoryQuestions.slice(0, numQuestionsToSelect)];
        }
      }

      if (isShuffled) {
        selectedQuestionIds = shuffle(selectedQuestionIds);
      }

      const questionVersionsQuery = await questionVersionsService.readByQuery({
        fields: ["id", "question_id"],
        filter: {
          question_id: { _in: selectedQuestionIds },
        },
        sort: ["-date_created"],
      });

      const latestVersionsMap = new Map();
      for (const version of questionVersionsQuery) {
        if (!latestVersionsMap.has(version.question_id)) {
          latestVersionsMap.set(version.question_id, version.id);
        }
      }

      const questionVersionsList = selectedQuestionIds.map((qId) => latestVersionsMap.get(qId)).filter(Boolean);

      if (!questionVersionsList.length) {
        return res.status(400).json({ message: `Assignment ${assignment_id}. Question versions empty` });
      }

      let payload;
      if (assignment?.status === CompetencyState.NOT_STARTED) {
        payload = {
          status: CompetencyState.IN_PROGRESS,
          exam_versions_id: examVersion.id,
          question_versions_list: questionVersionsList,
          attempt_due: addMinutes(new Date(), questionVersionsList.length * 3),
          started_on: new Date(),
        };
      } else {
        if (Number(assignment?.attempts_used) >= Number(assignment?.allowed_attempts)) {
          return res.status(400).json({ message: `Assignment ${assignment_id}. Max attempts reached` });
        }

        const totalQuestions = questionVersionsList.length;
        const minutes = totalQuestions * 3;
        const addedMinutesDate = addMinutes(
          assignment.attempt_due ? new Date(assignment?.attempt_due) : new Date(Date.now()),
          minutes,
        );

        payload = {
          attempt_due: addedMinutesDate,
          question_versions_list: questionVersionsList,
          exam_versions_id: assignment.exam_versions_id || examVersion.id,
        };
      }

      await assignmentService.updateOne(assignment_id, payload);
      return res.status(200).json({
        startedOn: payload.started_on ? parseISO(payload.started_on.toISOString()) : null,
        attemptDue: payload.attempt_due ? parseISO(payload.attempt_due.toISOString()) : null,
      });
    } catch (e: any) {
      logger.error(`${LOG_PREFIX}: ${e.message || e}`);
      return res.status(400).json({ message: e.message || "Error starting exam" });
    }
  });
});
