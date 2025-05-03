import { UserRole } from "types";

// Define the auth_data and tags as they're JSON fields
interface AuthData {
  // Add specific auth data fields here
  [key: string]: any;
}

interface Tags {
  [key: string]: any;
}

// Define the avatar object type
interface Avatar {
  // Add specific avatar fields here
  [key: string]: any;
}

export interface CreateUserRequest {
  email: string;
  role: UserRole;

  // Optional fields
  first_name?: string;
  last_name?: string;
  password?: string;
  address_line_1?: string;
  address_line_2?: string;
  agencies?: Array<any>; // You might want to define a specific Agency interface
  auth_data?: AuthData;
  avatar?: Avatar;
  city?: string;
  description?: string;
  documents?: Array<any>; // You might want to define a specific Document interface
  email_notifications?: boolean;
  exams?: Array<any>; // You might want to define a specific Exam interface
  external_identifier?: string;
  id?: string;
  import_student_id?: number;
  imported?: boolean;
  language?: string;
  last_access?: Date;
  last_page?: string;
  location?: string;
  modules?: Array<any>; // You might want to define a specific Module interface
  phone?: string;
  policies?: Array<any>; // You might want to define a specific Policy interface
  provider?: string;
  sc_definitions?: Array<any>; // You might want to define a specific SCDefinition interface
  state?: string;
  status?: string;
  tags?: Tags;
  tfa_secret?: string;
  theme?: string;
  title?: string;
  token?: string;
  zip?: string;
}

export interface CreateUserAgencies {
  agencies_id?: string;
  date_created?: Date;
  date_updated?: Date;
  departments?: Array<{
    departments_id?: string;
  }>;
  directus_users_id?: string;
  employee_number?: string;
  id?: string;
  import_student_id?: number;
  locations?: Array<{
    locations_id?: string;
  }>;
  specialties?: Array<{
    specialties_id?: string;
  }>;
  status?: string;
  supervisors?: Array<{
    directus_users_id?: string;
  }>;
}
