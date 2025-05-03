import { UserRole } from "./roles";

export interface Tab {
  name: string;
  href: string;
  current: boolean;
  allowed_roles?: UserRole[];
}

export enum ReportTabs {
  MODULES = "Modules",
  EXAMS = "Exams",
  SKILLS_CHECKLIST = "Skills Checklist",
  POLICIES = "Policies",
  DOCUMENTS = "Documents",
  USER_GROUPS = "User & Groups",
}
