export type ErrorLog = {
  message: string;
  stack: string;
  name: string;
  cause: string;
};

export type SourcePortal = {
  PortalID: number;
  CompanyName: string;
  Portal: string;
  Expiration: Date;
  MaxStudents: number;
  BillingCode: string;
  Added: Date;
};

export type SourceDepartment = {
  StudentDepartmentID: number;
  name: string;
};

export type SourceLocation = {
  StudentLocationID: number;
  name: string;
};

export type SourceUser = {
  StudentID: number;
  EmployeeNumber: string;
  Name: string;
  Email: string;
  DeletedAt: Date;
  JoiningDate: Date;
  LastAccess: Date;
  Status: string;
  RoleID: number;
  IsEmailDisabled: boolean;
  StudentLocationID: number;
  StudentDepartmentID: number;
  Phone: string;
  Address: string;
  City: string;
  StateName: string;
  LicenseExpirationDate: Date;
};

export type TargetAgency = {
  id: string;
  name: string;
  import_agency_target_id?: string;
};

export interface SourceCourse {
  Title: string;
  CourseID: number;
  ExamDuration: string;
}

export interface SourceAssignedCourse {
  SubscriptionID: number;
  Title: string;
  ExpiryDate: Date;
  AssignedDate: Date;
  StartDate: Date;
  FinishDate: Date;
  TestTries: number;
  AllowedAttempts: number;
  Mandatory: boolean;
  Frequency: string;
  CertUrl: string;
  CertCode: number;
  DueDate: Date;
  TestScores?: string;
  ReportUrl?: string;
}

export interface SourceAssignedSC {
  Name: string;
  SubscriptionID: number;
  AssignedDate: Date;
  Frequency: string;
  DueDate: Date;
  ExpiryDate: Date;
  Status: string;
  StartDate: Date;
  FinishDate: Date;
  ReportUrl: string;
  AllowedAttempts: number;
  Tries: number;
  targetSCID?: number;
}

export interface TargetMappedCourse extends SourceAssignedCourse {
  targetExamID?: string;
  targetModuleID?: number;
  AchievedScore?: number;
  PassingScore?: number;
}

export type TargetExam = {
  id: string;
  title: string;
  agencies_id: string;
  import_course_id: number;
  import_ceu: number | null;
  date_created: Date;
  date_updated: Date;
};

export type TargetModule = {
  id: number;
  title: string;
  import_course_id: number;
  import_ceu: number | null;
  date_created: Date;
  date_updated: Date;
};

export type TargetSC = {
  id: number;
  title: string;
  agencies_id: string;
};

export type SourcePolicy = {
  AffirmationID: number;
  PolicyID: number;
  SignDate: Date;
  SignedPolicyUrl: string;
  AssignedDate: Date;
  DueDate: Date;
  ExpiryDate: Date;
  Status: string;
  Frequency: string;
  Title: string;
  targetPolicyID?: number;
};

export type SourceDocument = {
  ID: number;
  Title: string;
  AssignedDate: Date;
  LastAccess: Date;
  targetDocumentID?: string;
};

export interface TargetPolicy {
  id: string;
  name: string;
  agencies_id?: string;
}

export interface TargetDocument {
  id: string;
  title: string;
  agencies_id?: string;
}

export interface Mapping {
  content_type: "exam" | "module" | "skill_checklist" | "policy" | "document";
  source_name: string;
  target_id_string?: string;
  target_id_number?: number;
}
