import { CompetencyState } from "types";

export interface ExamQuestionResult {
  id: number;
  answer: {
    id: string;
  };
  exam_status: string;
  correct: boolean;
  questions_id_id: string;
  exam_title: string;
  exam_id: number;
  question_versions_id_answer: {
    id: string;
  };
  question_versions_id_question: {
    question_text: string;
    answers: QuestionsAnswer[];
  };
}

export interface QuestionStat {
  totalAttempts: number;
  examtitle?: string;
  questionTitle?: string;
  status: string;
  optionTallies: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  correctOption: string;
}

interface QuestionsAnswer {
  id: string;
  sort: number;
  answer_text: string;
}

interface ExamResultsFilter {
  title?: string;
  agency?: string;
  selectedQuestion?: string;
  startDate: Date;
  endDate: Date;
}

function getAnswerLetter(sort: number): keyof QuestionStat["optionTallies"] {
  const mapping = { 0: "A", 1: "B", 2: "C", 3: "D" } as const;
  return mapping[sort as keyof typeof mapping];
}

export interface IExamQuestionPassService {
  getExamQuestionResults(filter: ExamResultsFilter): Promise<ExamQuestionResult[]>;
  getExamResultCount(filter: ExamResultsFilter): Promise<number>;
  processExamResults(examResults: ExamQuestionResult[]): Promise<Map<string, QuestionStat>>;
}

export class ExamQuestionPassService implements IExamQuestionPassService {
  DatabaseService: any;
  loggerService: any;
  constructor(DatabaseService: any, loggerService: any) {
    this.DatabaseService = DatabaseService;
    this.loggerService = loggerService;
  }

  async processExamResults(examResults: ExamQuestionResult[]): Promise<Map<string, QuestionStat>> {
    const PROCESS_CHUNK_SIZE = examResults.length > 1000 ? 10000 : 1000;
    const questionStats = new Map<string, QuestionStat>();

    for (let i = 0; i < examResults.length; i += PROCESS_CHUNK_SIZE) {
      const chunk = examResults.slice(i, i + PROCESS_CHUNK_SIZE);

      chunk.forEach((result) => {
        const questionId = result.questions_id_id;
        const resultQuestion = result.question_versions_id_question;

        if (!questionId || !resultQuestion) return;

        try {
          const userChoiceId = result.answer.id;
          const correctAnswerId = result?.question_versions_id_answer?.id;
          const correctAnswer = resultQuestion.answers.find((a) => a.id === correctAnswerId);
          const correctLetter = correctAnswer ? getAnswerLetter(correctAnswer.sort) : "";

          const stat = questionStats.get(questionId) || {
            totalAttempts: 0,
            questionTitle: resultQuestion.question_text,
            optionTallies: { A: 0, B: 0, C: 0, D: 0 },
            status: result.exam_status,
            examTitle: result.exam_title,
            correctOption: correctLetter,
          };

          stat.totalAttempts++;

          if (result.answer) {
            const userSelectedAnswer = resultQuestion?.answers?.find((a) => a.id === userChoiceId);
            if (userSelectedAnswer) {
              const letter = getAnswerLetter(userSelectedAnswer.sort) as keyof QuestionStat["optionTallies"];
              if (letter) {
                stat.optionTallies[letter]++;
              }
            }
          }

          questionStats.set(questionId, stat);
        } catch (error) {
          this.loggerService.error(`Error processing question ID ${questionId}: ${error}`);
        }
      });

      await new Promise((resolve) => setImmediate(resolve));
    }

    return questionStats;
  }

  async getExamResultCount(filter: ExamResultsFilter): Promise<number> {
    const { title, agency, selectedQuestion, startDate, endDate } = filter;

    try {
      const [{ count }] = await this.DatabaseService("junction_directus_users_exams")
        .count("* as count")
        .leftJoin("exam_results", "junction_directus_users_exams.id", "exam_results.assignment_id")
        .modify((queryBuilder: any) => {
          if (title) queryBuilder.where("junction_directus_users_exams.exams_id", title);
          if (agency) queryBuilder.where("junction_directus_users_exams.agency", agency);
          if (selectedQuestion) queryBuilder.where("exam_results.questions_id", selectedQuestion);
          if (startDate && endDate) {
            queryBuilder.whereBetween("junction_directus_users_exams.finished_on", [startDate, endDate]);
          }
        });

      return Number(count);
    } catch (error) {
      this.loggerService.error("Error in getExamResultCount:", error);
      throw error;
    }
  }

  async getExamQuestionResults(filter: ExamResultsFilter): Promise<ExamQuestionResult[]> {
    const { title, agency, selectedQuestion, startDate, endDate } = filter;
    const MAX_RECORDS = 2_500_000;
    let allResults: ExamQuestionResult[] = [];

    try {
      const count = await this.getExamResultCount(filter);
      const totalRecords = Math.min(Number(count), MAX_RECORDS);
      let processedRecords = 0;
      let lastId = 0;
      const BATCH_SIZE = totalRecords > 10_000 ? 50_000 : 5000;

      while (processedRecords < totalRecords) {
        const batchResults = await this.DatabaseService("junction_directus_users_exams")
          .select([
            "junction_directus_users_exams.id",
            "exam_results.answer",
            "exam_results.correct",
            "exam_results.questions_id as questions_id_id",
            "exams.title as exam_title",
            "exams.status as exam_status",
            "question_versions.answer as question_versions_id_answer",
            "question_versions.question as question_versions_id_question",
          ])
          .leftJoin("exam_results", "junction_directus_users_exams.id", "exam_results.assignment_id")
          .leftJoin("exams", "junction_directus_users_exams.exams_id", "exams.id")
          .leftJoin("question_versions", "exam_results.question_versions_id", "question_versions.id")
          .where("junction_directus_users_exams.id", ">", lastId)
          .modify((queryBuilder: any) => {
            if (title) queryBuilder.where("junction_directus_users_exams.exams_id", title);
            if (agency) queryBuilder.where("junction_directus_users_exams.agency", agency);
            if (selectedQuestion) queryBuilder.where("exam_results.questions_id", selectedQuestion);
            if (startDate && endDate) {
              queryBuilder.whereBetween("junction_directus_users_exams.finished_on", [startDate, endDate]);
            }
          })
          .orderBy("junction_directus_users_exams.id")
          .limit(BATCH_SIZE);

        if (batchResults.length === 0) break;

        lastId = batchResults[batchResults.length - 1].id;
        allResults = allResults.concat(batchResults);
        processedRecords += batchResults.length;

        if (allResults.length >= MAX_RECORDS) {
          allResults = allResults.slice(0, MAX_RECORDS);
          break;
        }
      }

      return allResults;
    } catch (error) {
      this.loggerService.error("Error in getExamResult:", error);
      throw error;
    }
  }
}
