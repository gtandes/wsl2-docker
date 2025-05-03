export type DocumentExport = {
  clinician: string;
  title: string;
  assignmentStatus: string;
  readDate: string;
  expirationDate: string;
};
export type SkillChecklistExport = {
  employeeNumbers: string;
  clinician: string;
  email: string;
  title: string;
  assignmentStatus: string;
  finishedDate: string;
  expirationDate: string;
};
export type ExamsReportsExport = {
  name: string;
  expiration: string;
  title: string;
  status: string;
  score: string;
  attempts: string;
  started: string;
  completed: string;
  expires: string;
  date_created: string;
  date_join: string;
  employee_number: string;
};
export type UsersAndGroupsReportsExport = {
  name: string;
  email: string;
  globalStatus: string;
  modulesStatus: string;
  policiesStatus: string;
  examsStatus: string;
  skillsChecklistStatus: string;
  documentsStatus: string;
  lastAccess: string;
  departments: string;
  locations: string;
  specialties: string;
  supervisors: string;
};

export type UsersAndGroupsNonCompliantReportsExport = {
  department: string;
  location: string;
  speciality: string;
  supervisors: string;
  clinicianFirstName: string;
  clinicianLastName: string;
  email: string;
  contentType: string;
  contentTitle: string;
  assignmentDate: string;
  dueDate: string;
  assignmentStatus: string;
  expirationDate: string;
};

export type PoliciesReportsExport = {
  clinician: string;
  title: string;
  status: string;
  signed_on: string;
  expires_on: string;
};
export type UserDetailsReportsExport = {
  title: string;
  frequency: string;
  status: string;
  score: string;
  attempts: string;
  started: string;
  completed: string;
  expires: string;
};
