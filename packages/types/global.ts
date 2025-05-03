export enum CompetencyType {
  EXAM = "Exam",
  POLICY = "Policy",
  DOCUMENT = "Document",
  MODULE = "Module",
  SKILL_CHECKLIST = "Skill Checklist",
}

export enum DirectusStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DRAFT = "draft",
  ARCHIVED = "archived",
  PUBLISHED = "published",
  SUSPENDED = "suspended",
}

export enum CategoryType {
  MODALITY = "modality",
  SPECIALITY = "speciality",
  SUB_SPECIALITY = "sub_speciality",
  QUESTION = "question",
  DOCUMENT = "document",
  POLICY = "policy",
}

export enum CompetencyState {
  INVALID = "INVALID",
  STARTED = "STARTED",
  NOT_STARTED = "NOT_STARTED",
  COMPLETED = "COMPLETED",
  PENDING = "PENDING",
  EXPIRED = "EXPIRED",
  DUE_DATE_EXPIRED = "DUE_DATE_EXPIRED",
  FINISHED = "FINISHED",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "PROCTORING_REVIEW",
  FAILED = "FAILED",
  SIGNED = "SIGNED",
  UNSIGNED = "UNSIGNED",
  READ = "READ",
  UNREAD = "UNREAD",
  FAILED_TIMED_OUT = "FAILED_TIMED_OUT",
}

export enum ScoreStatus {
  PASSED = "PASSED",
}

export enum ExpirationType {
  ONE_TIME = "one-time",
  YEARLY = "yearly",
  BIANNUAL = "bi-annual",
}

export enum UserRole {
  UsersManager = "fb7c8da4-685c-11ee-8c99-0242ac120002",
  AgencyUser = "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
  Clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
  HSHAdmin = "cc987fae-dbb9-4d72-8199-21243fa13c92",
  Developer = "cd4bfb95-9145-4bad-aa88-a3810f15a976",
  GenericATS = "1d46885c-b28e-401b-952e-0dc77a01c1ce",
  CredentialingUser = "05bdccb9-dbff-4a45-bfb7-47abe151badb",
  PlatformUser = "3f9c2b6e-8d47-4a60-bf3c-12e9a0f5d2b8",
}

export enum EmailAction {
  PENDING_ASSIGNMENT = "Send Pending Assignment Reminder",
  DUE_DATE_REMINDER = "Send Due Date Reminder",
  DUE_DATE_REPORT_REMINDER = "Send Due Date Reminder Report",
  NAGGING = "Send “Nagging” Email",
  FORGOT_PASSWORD = "Send Forgot Password",
  NEW_ASSIGNMENT = "Send New Assignment Notification",
  WELCOME = "Send Welcome Email",
  SEND_EXPIRING_COMPETENCY_CLINICIAN = "Send Expiring Competencies",
  SEND_EXPIRING_COMPETENCY_REPORTS = "Send Expiring Competencies Reports",
}

export enum ResponseErrorCode {
  COMPETENCY_DOES_NOT_EXIST = "COMPETENCY_DOES_NOT_EXIST",
  ALREADY_ASSIGNED = "ALREADY_ASSIGNED",
}

export interface Attachment {
  filename: string;
  content: string;
  type: string;
}

export type DirectusUser = {
  directus_users_id: {
    id: string;
    role: string;
    email: string;
  };
  agencies_id: {
    id: string;
  };
};

export type Assignment = {
  assigned_on: string;
  due_date: string;
  expires_on: string;
  status: string;
  allowed_attempts?: number;
  attempts_used?: number;
  directus_users_id: {
    first_name: string;
    last_access: string;
    last_name: string;
    email: string;
    role: string;
    status: string;
    agencies: any;
  };
  agency: {
    employee_number?: string;
    supervisor?: any;
    departments: { name: string }[];
    locations: { name: string }[];
    notifications_settings?: {
      agency_admin?: { [key: string]: boolean };
      user_manager?: { [key: string]: boolean };
    };
    directus_users: DirectusUser[];
    id: string;
  };
  sc_definitions_id?: { title: string };
  modules_definition_id?: { title: string };
  exams_id?: { title: string };
  policies_id?: { name: string };
  documents_id?: { title: string };
};

export interface ExpiryCompetency {
  due_date: Date;
  competency_status: CompetencyState;
  expires_on: Date;
  title: string;
  first_name: string;
  last_name: string;
  last_access: Date;
  email: string;
  directus_users_status: "active" | "inactive" | "archived";
  agency_status: "active" | "inactive" | "suspended";
  emp_no: string;
  agency_junction_id: number;
  departments: string[];
  locations: string[];
  supervisors: string[];
  contentType: string;
}

export interface EmailExpiryCompetency {
  user_id: string;
  due_date: Date;
  competency_status: CompetencyState;
  expires_on: Date;
  title: string;
  first_name: string;
  last_name: string;
  last_access: Date;
  email: string;
  directus_users_status: "active" | "inactive" | "archived";
  agency_status: "active" | "inactive" | "suspended";
  emp_no: string;
  agency_junction_id: number;
  departments: string[];
  locations: string[];
  supervisors: string[];
  logo: string;
  agency_name: string;
  contentType: string;
}

export interface Recipient {
  directus_users_id: string;
  first_name: string;
  last_name: string;
  email: string;
  agency_name: string;
  agency_logo?: string;
  user_role: string;
  notifications_settings?: NotificationsSettings;
}

interface NotificationsSettings {
  clinician?: {
    expiring_competencies_reminder?: boolean;
  };
  agency_admin?: {
    competency_expiration_report?: boolean;
  };
  user_manager?: {
    competency_expiration_report?: boolean;
  };
}

export const DEFAULT_DUE_DATE_DAYS = 14;

export enum UserLogEventType {
  ASSIGNED = "competency.assigned",
  UNASSIGNED = "competency.unassigned",
  ARCHIVED = "competency.archived",
  UPDATED = "competency.updated",
  REASSIGNED = "competency.reassigned",
}
