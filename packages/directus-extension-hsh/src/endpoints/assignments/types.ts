import { ExpirationType } from "types";

type CommonID = {
  id: string;
};
type AssigmentExam = {
  exams_id: CommonID;
  status: string;
};
type AssigmentScDefinition = {
  sc_definitions_id: CommonID;
};
type AssigmentDocument = {
  documents_id: CommonID;
};
type AssigmentModule = {
  modules_definition_id: CommonID;
};
type AssigmentPolicy = {
  policies_id: CommonID;
};

export type AssignmentUser = {
  id: string;
  firts_name: string;
  last_name: string;
  email: string;
  exams: AssigmentExam[];
  sc_definitions: AssigmentScDefinition[];
  documents: AssigmentDocument[];
  modules: AssigmentModule[];
  policies: AssigmentPolicy[];
};

export type AssignmentBundle = {
  id: string;
  name: string;
  agency: string;
  status: string;
};

export type UsersBy = {
  users: any[];
  departments: any[];
  locations: any[];
  specialties: any[];
  supervisors: any[];
};

export type CompetencyUpdateDetails = {
  due_date?: String;
  expiration_date?: Date;
  allowed_attempts?: Number;
};

export type TCompetencyDetails = {
  due_date: Date;
  expiration: ExpirationType;
  allowed_attempts?: number | null;
};
