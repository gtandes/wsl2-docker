import { CompetencyState, CompetencyType, ExpirationType } from "types";

export type Agency = {
  id: string;
  name: string;
  custom_allowed_attempts_exams: number;
  custom_allowed_attempts_modules: number;
  notifications_settings: NotificationsSettings | null;
  automatic_notifications_email: string | null;
  default_expiration: ExpirationType;
  default_due_date: number;
  max_licenses: number | null;
  sc_allow_na_option: boolean;
  self_assigment_allow: boolean;
  logo: {
    id: string | undefined;
    src: string | null;
  };
  certificate_logo: {
    id: string | undefined;
    src: string | null;
  };
  enable_certificate_logo: boolean | null | undefined;
  ia_enable: boolean | null | undefined;
  ia_app_id: string | null | undefined;
  ia_api_key: string | null | undefined;
  webhook_enable: boolean | null | undefined;
  webhook_url: string | null | undefined;
  webhook_token: string | null | undefined;
  webhook_secret: string | null | undefined;
  bh_enable: boolean | null | undefined;
};

export type Competencies = {
  id?: string;
  import_cert_url?: string;
  import_report_url?: string;
  reassigned?: boolean;
  exams_id?: { id: string | null | undefined };
  sc_definitions_id?: { id: number | null | undefined };
  modules_definition_id?: { id: number | null | undefined };
  documents_id?: { id: string | null | undefined };
  policies_id?: { id: string | null | undefined };
  name: string | null | undefined;
  type?: CompetencyType;
  ceu: number | null | undefined;
  attempts_used: number | null | undefined;
  allowed_attempts: number | null | undefined;
  assigned_on: Date | null | undefined;
  started_on: Date | null | undefined;
  expires_on?: Date | null | undefined;
  due_date: Date | null | undefined;
  finished_on: Date | null | undefined;
  score: number | null | undefined;
  status: string | null | undefined;
  signed_on: Date | null | undefined;
  agency: { id: string | null | undefined; name: string | null | undefined };
  expiration_type: string | null | undefined;
  score_history?:
  | { attempt: number; score: number; score_status?: string }[]
  | null
  | undefined;
  approved?: Boolean | null | undefined;
};

export type NotificationsSettings = {
  user_manager: {
    exam_completion: boolean;
    exam_completion_after_final_attempt: boolean;
    module_completion: boolean;
    module_completion_after_final_attempt: boolean;
    sc_submitted: boolean;
    policy_signed: boolean;
    document_read: boolean;
    competency_due_report: boolean;
    competency_expiration_report: boolean;
    invalid_email: boolean;
  };
  agency_admin: {
    exam_completion: boolean;
    exam_completion_after_final_attempt: boolean;
    module_completion: boolean;
    module_completion_after_final_attempt: boolean;
    sc_submitted: boolean;
    policy_signed: boolean;
    document_read: boolean;
    competency_due_report: boolean;
    competency_expiration_report: boolean;
    invalid_email: boolean;
  };
  clinician: {
    pending_assignment_reminder: boolean;
    expiring_competencies_reminder: boolean;
    due_date_reminder: boolean;
    nagging_email: boolean;
    forgot_password: boolean;
    new_assignment: boolean;
    welcome_email: boolean;
    success_failure: boolean;
    invalid_email: boolean;
  };
};

type ExamParserQuestionsAnswers = {
  id: string;
  answer: string;
  correct_answer: boolean;
};

type SkillChecklistParserSkills = {
  title: string;
  proficiency?: number | null;
  skill?: number | null;
  frequency?: number | null;
};

export type ExamParserData = {
  questionText: string;
  questionCategory: string;
  correctAnswer: string;
  answers: (ExamParserQuestionsAnswers | undefined)[];
};
export type SkillChecklistParserData = {
  section: string;
  items: (SkillChecklistParserSkills | undefined)[];
};

export type SkillChecklistsQuestion = {
  question: string;
  sections: Array<SkillChecklistsSection>;
};

export type SkillChecklistsSection = {
  title: string;
  excludeFromScore?: boolean;
  items: Array<SkillChecklistsItem>;
};

export type SkillChecklistsItem = {
  title: string;
  skill?: number;
  proficiency?: number;
  frequency?: number;
};

export type SkillChecklistAverages = {
  skillAverage?: number;
  frequencyAverage?: number;
  proficiencyAverage?: number;
  overallAvg: number;
};

export type ClinicianDashboardItems = {
  type: CompetencyType;
  title: string | null | undefined;
  due_date: Date | null | undefined;
  link: string;
  status: CompetencyState;
};

export const usersStatusOptions = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Suspended", value: "suspended" },
  { label: "Archived", value: "archived" },
];
export const usersAgencyStatusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export const MIGRATION_START_DATE = "2024-02-28 23:59:59";

export const COMBOBOX_RESULTS_AMOUNT = 100;

export const SkillChecklistQuestionDefaultValue = `PLEASE RATE YOUR LEVEL OF SKILLS & FREQUENCY OF PERFORMANCE FOR THE FOLLOWING PROCEDURES/SKILLS:

Proficiency

1. I have never done the stated task.
2. I have performed the task/skill infrequently; I require more experience/practice to feel comfortable and proficient.
3. I have performed the task/skill several times and feel moderately comfortable functioning independently but would require a resource person nearby.
4. I have performed the task/skill frequently and would feel very comfortable and proficient performing it without supervision or practice.

Frequency

1. 5 or less Annually
2. 5 or less Quarterly
3. 5 or less Monthly
4. 1 to 5 times Daily/Weekly`;

export const SkillChecklistNewFormatQuestion = `PLEASE RATE YOUR LEVEL OF PROFICIENCY IN PERFORMING THE FOLLOWING PROCEDURES AND SKILLS:

Proficiency

1. I have never done or have minimal experience with the stated task.
2. I have performed the task/skill infrequently (5 or fewer times Quarterly); I require more experience/practice to feel comfortable and proficient.
3. I have performed the task/skill several times (5 or fewer times a month) and feel moderately comfortable functioning independently, but would require a resource person nearby.
4. I have performed the task/skill frequently (1-5 times Daily/Weekly) and would feel comfortable performing it proficiently without supervision or practice.`;
