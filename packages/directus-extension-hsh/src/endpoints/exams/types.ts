export type ExamAssignment = {
  id: string;
  directus_users_id: string;
  status: string;
  exams_id: string;
  allowed_attempts: number;
  attempts_used: number;
  attempt_due: string;
  question_versions_list: string[];
  exam_versions_id: string;
};
