import { S3_BUCKET_SOURCE_HOST, S3_BUCKET_TARGET_HOST } from "../importer";

import { Knex } from "knex";
import {
  Mapping,
  SourceAssignedSC,
  SourceCourse,
  SourceDepartment,
  SourceLocation,
  SourcePortal,
  SourceUser,
  TargetAgency,
  TargetDocument,
  TargetExam,
  TargetMappedCourse,
  TargetModule,
  TargetPolicy,
  TargetSC,
} from "../types";
import { v4 as uuidv4 } from "uuid";

export class TargetDbService {
  db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  async importAgency(portal: SourcePortal) {
    const timestamp = new Date();
    const newAgency = {
      id: uuidv4(),
      name: portal.CompanyName,
      import_portal_id: portal.PortalID,
      date_created: portal.Added,
      date_updated: timestamp,
      status: "published",
      import_url: portal.Portal,
      expiration: portal.Expiration,
      max_users: portal.MaxStudents,
      billing_code: portal.BillingCode,
    };

    await this.db("agencies")
      .insert(newAgency)
      .onConflict("import_portal_id")
      .merge(["name", "date_updated", "status", "import_url", "expiration", "max_users", "billing_code"]);

    return this.db("agencies")
      .select("id", "name", "import_agency_target_id")
      .where("import_portal_id", portal.PortalID)
      .first() as Promise<TargetAgency>;
  }

  formatDate(date: Date) {
    if (!date) {
      return null;
    }

    const dateString = Date.parse(date.toString());
    return !isNaN(dateString) ? new Date(dateString).toISOString() : null;
  }

  async importUser(user: SourceUser, roleID: string) {
    let newUser = false;
    const email = user.Email.toLowerCase();
    let userExistsID = await this.checkUserExists(email);

    let first_name = "";
    let last_name = "";

    if (user.Name) {
      const name = user.Name.replace("\t", " ");
      first_name = user.Name.substring(0, name.indexOf(" "));
      last_name = user.Name.substring(name.indexOf(" ") + 1);
    }

    const userRecord = {
      id: userExistsID,
      first_name,
      last_name,
      imported: true,
      import_student_id: user.StudentID,
      role: roleID,
      provider: "default",
      address_line_1: user.Address,
      city: user.City,
      phone: user.Phone,
      state: user.StateName,
      last_access: this.formatDate(user.LastAccess),
    };

    if (!userExistsID) {
      newUser = true;
      const newUserID = uuidv4();
      userRecord.id = newUserID;
      await this.db("directus_users").insert({ ...userRecord, email });

      return { id: newUserID, newUser };
    } else {
      await this.db("directus_users").where("id", userExistsID).update(userRecord);
      return { id: userExistsID, newUser: false };
    }
  }

  async linkUserToAgency(user: SourceUser, agency: TargetAgency, userID: string) {
    // Clear agency relation
    await this.db.raw(
      `delete
       from junction_directus_users_agencies
       where agencies_id = ?
         and directus_users_id = ?`,
      [agency.id, userID],
    );

    const now = new Date();
    let agencyStatus = user.Status === "Active" ? "active" : "inactive";
    if (user.DeletedAt) {
      agencyStatus = "inactive";
    }

    const agencyUser = {
      agencies_id: agency.id,
      date_created: user.JoiningDate,
      date_updated: now,
      directus_users_id: userID,
      employee_number: user.EmployeeNumber,
      status: agencyStatus,
      import_student_id: user.StudentID,
    };

    return this.db("junction_directus_users_agencies").insert(agencyUser);
  }

  async linkLocationDepartmentSupervisors(
    user: SourceUser,
    agency: TargetAgency,
    userID: string,
    supervisorIDs: string[],
  ) {
    const agencyJunction = await this.db("junction_directus_users_agencies")
      .select("id")
      .where("agencies_id", agency.id)
      .andWhere("directus_users_id", userID)
      .first();

    if (supervisorIDs.length) {
      for (const supervisorID of supervisorIDs) {
        const supervisor = await this.db("directus_users")
          .select("id")
          .where("import_student_id", supervisorID)
          .first();

        if (!supervisor) {
          continue;
        }

        await this.db("junction_directus_users_agencies_supervisors").insert({
          directus_users_id: supervisor.id,
          junction_directus_users_agencies_id: agencyJunction.id,
        });
      }
    }

    if (user.StudentDepartmentID) {
      const department = await this.db("departments")
        .select("id")
        .where("import_id", user.StudentDepartmentID)
        .andWhere("agency", agency.id)
        .first();

      if (!department) {
        return;
      }

      await this.db("junction_directus_users_agencies_departments").insert({
        departments_id: department.id,
        junction_directus_users_agencies_id: agencyJunction.id,
      });
    }

    if (user.StudentLocationID) {
      const location = await this.db("locations")
        .select("id")
        .where("import_id", user.StudentLocationID)
        .andWhere("agency", agency.id)
        .first();

      if (!location) {
        return;
      }

      await this.db("junction_directus_users_agencies_locations").insert({
        locations_id: location.id,
        junction_directus_users_agencies_id: agencyJunction.id,
      });
    }
  }

  private async checkUserExists(email: string) {
    const user = await this.db("directus_users")
      .select("id")
      // @ts-ignore
      .where(this.db.raw('lower("email")'), email)
      .first();

    return user?.id ?? null;
  }

  async importDepartment(department: SourceDepartment, agency: TargetAgency) {
    const newDepartment = {
      id: uuidv4(),
      name: department.name,
      agency: agency.id,
      import_id: department.StudentDepartmentID,
      status: "published",
    };

    return this.db("departments").insert(newDepartment).onConflict("import_id").merge(["name", "status"]);
  }

  async importLocation(location: SourceLocation, agency: TargetAgency) {
    const locationExists = await this.db("locations")
      .where("agency", agency.id)
      .andWhere("name", location.name)
      .first();

    if (locationExists) {
      return;
    }

    const newLocation = {
      id: uuidv4(),
      name: location.name,
      agency: agency.id,
      import_id: location.StudentLocationID,
      status: "published",
    };

    return this.db("locations").insert(newLocation).onConflict("import_id").merge(["name", "status"]);
  }

  async addMappingsToExistingItems(
    contentType: "exam" | "module" | "skill_checklist" | "policy" | "document",
    existingItems: { id: string | number; title?: string; name?: string }[],
  ) {
    const mappings = await this.getMappings(contentType);
    const titleField = contentType === "policy" ? "name" : "title";

    for (const mapping of mappings) {
      const existingExam = existingItems.find((e) => e[titleField]?.trim() === mapping?.title);

      if (!existingExam) {
        let newExams: any = [{ ...mapping }];
        const targetExam = existingItems.find((e) => e.id === mapping.id);

        if (targetExam) {
          const targetExamName = targetExam?.[titleField];
          // If there are multiple items with the same name, it is very possible that they have agency specific versions
          const examsWithSameName = existingItems.filter((e) => e[titleField] === targetExamName);

          // Create as many new items with the mapped name for all occurrences. Later on the import will first match the agency specific item.
          newExams = examsWithSameName.map((e) => ({ ...e, [titleField]: mapping?.title }));
        }

        existingItems.push(...newExams);
      }
    }

    return existingItems;
  }

  async getExistingExams(getShells = false) {
    if (!getShells) {
      let existingMappedExams = (await this.db("exams AS e")
        .leftJoin("junction_exams_agencies AS ea", "e.id", "ea.exams_id")
        .select("e.id", "e.title", "ea.agencies_id")
        .whereNull("e.import_is_shell")
        .andWhere("e.status", "published")
        .orderBy("e.title")) as TargetExam[];

      existingMappedExams = (await this.addMappingsToExistingItems("exam", existingMappedExams)) as TargetExam[];
      return existingMappedExams;
    } else {
      return this.db("exams").select("id", "title").where("import_is_shell", true) as Promise<TargetExam[]>;
    }
  }

  async getExistingModules(getShells = false) {
    if (!getShells) {
      let existingMappedModules = (await this.db("modules_definition")
        .select("id", "title")
        .whereNull("import_is_shell")
        .andWhereNot("status", "archived")) as TargetModule[];

      existingMappedModules = (await this.addMappingsToExistingItems(
        "module",
        existingMappedModules,
      )) as TargetModule[];

      return existingMappedModules;
    } else {
      return this.db("modules_definition").select("id", "title").where("import_is_shell", true) as Promise<
        TargetModule[]
      >;
    }
  }

  async saveExamAssignments(mappedExams: TargetMappedCourse[], agency: TargetAgency, userID: string) {
    const assignments = [];
    for (const mappedExam of mappedExams) {
      const newAssignment = {
        agency: agency.id,
        allowed_attempts: mappedExam.AllowedAttempts < 0 ? 1 : mappedExam.AllowedAttempts,
        assigned_on: this.formatDate(mappedExam.AssignedDate) || new Date(),
        attempt_due: null,
        attempts_used: mappedExam.TestTries < 0 ? 3 : mappedExam.TestTries,
        cert_code: mappedExam.CertCode,
        cert_expiry_date: mappedExam.ExpiryDate,
        directus_users_id: userID,
        due_date: mappedExam.DueDate,
        exams_id: mappedExam.targetExamID,
        expires_on: mappedExam.ExpiryDate,
        finished_on: mappedExam.FinishDate,
        score: mappedExam.AchievedScore,
        started_on: mappedExam.StartDate,
        status: this.calculateExamAssignmentStatus(mappedExam),
        import_cert_url: mappedExam.CertUrl
          ? mappedExam.CertUrl.replace(S3_BUCKET_SOURCE_HOST, S3_BUCKET_TARGET_HOST)
          : null,
        import_report_url: mappedExam.ReportUrl,
        import_subscription_id: mappedExam.SubscriptionID,
      };

      assignments.push(newAssignment);
    }

    if (assignments.length) {
      await this.db("junction_directus_users_exams").insert(assignments);
    }
  }

  calculateExamAssignmentStatus(mappedExam: TargetMappedCourse) {
    let status = "NOT_STARTED";

    if (mappedExam.StartDate && mappedExam.TestTries > 0) {
      status = "IN_PROGRESS";
    }

    if (mappedExam.ExpiryDate && mappedExam.Frequency === "YEARLY" && mappedExam.ExpiryDate <= new Date()) {
      return "EXPIRED";
    }

    if (mappedExam.FinishDate && mappedExam.AchievedScore >= mappedExam.PassingScore) {
      return "COMPLETED";
    }

    if (
      mappedExam.StartDate &&
      mappedExam.AchievedScore <= mappedExam.PassingScore &&
      mappedExam.TestTries >= mappedExam.AllowedAttempts
    ) {
      status = "FAILED";
    }

    return status;
  }

  calculateModuleAssignmentStatus(mappedExam: TargetMappedCourse) {
    let status = "PENDING";

    if (mappedExam.ExpiryDate && mappedExam.Frequency === "YEARLY" && mappedExam.ExpiryDate <= new Date()) {
      return "DUE_DATE_EXPIRED";
    }

    if (mappedExam.FinishDate && mappedExam.AchievedScore >= mappedExam.PassingScore) {
      return "FINISHED";
    }

    return status;
  }

  getCEUNumber(examDuration: string) {
    if (!examDuration) {
      return null;
    }

    let duration = examDuration.toLowerCase();

    duration = duration.replace("one", "1");
    duration = duration.replace(/[hour|hours]/gm, "");
    duration = duration.trim();
    const durationNumber = Number(duration);

    return durationNumber > 0 ? duration : null;
  }

  async createShellExam(id: string, shellExam: SourceCourse) {
    await this.db("exams").insert({
      id,
      title: shellExam.Title,
      status: "archived",
      import_is_shell: true,
      import_course_id: shellExam.CourseID,
      import_ceu: this.getCEUNumber(shellExam.ExamDuration),
    });
  }

  async getExam(id: string) {
    return this.db("exams").select("id", "title").where("id", id).first();
  }

  async getModule(id: number) {
    return this.db("modules_definition").select("id", "title").where("id", id).first();
  }

  async getExistingSCs(getShells = false) {
    if (!getShells) {
      let existingMappedSCs = (await this.db("sc_definitions AS s")
        .leftJoin("junction_sc_definitions_agencies AS sa", "s.id", "sa.sc_definitions_id")
        .select("s.id", "s.title", "sa.agencies_id")
        .whereNull("s.import_is_shell")
        .andWhere("s.status", "published")) as TargetSC[];

      existingMappedSCs = (await this.addMappingsToExistingItems("skill_checklist", existingMappedSCs)) as TargetSC[];
      return existingMappedSCs;
    }

    return this.db("sc_definitions").select("id", "title").where("import_is_shell", true) as Promise<TargetSC[]>;
  }

  async createShellSC(shellSC: any) {
    return this.db("sc_definitions")
      .insert({ title: shellSC, status: "archived", import_is_shell: true })
      .returning("id");
  }

  async getSC(id: string) {
    return this.db("sc_definitions").select("id", "title").where("id", id).first();
  }

  async saveSCAssignments(targetSCAssignments: SourceAssignedSC[], agency: TargetAgency, directusUserID: any) {
    const assignments = [];

    for (const targetAssignment of targetSCAssignments) {
      let status = "PENDING";

      if (targetAssignment.FinishDate) {
        status = "COMPLETED";
      }

      if (
        targetAssignment.ExpiryDate &&
        targetAssignment.Frequency === "YEARLY" &&
        targetAssignment.ExpiryDate <= new Date()
      ) {
        status = "DUE_DATE_EXPIRED";
      }

      const newAssignment = {
        status,
        agency: agency.id,
        assigned_on: targetAssignment.AssignedDate,
        directus_users_id: directusUserID,
        due_date: targetAssignment.DueDate,
        expiration_date: targetAssignment.ExpiryDate,
        finished_on: targetAssignment.FinishDate,
        sc_definitions_id: targetAssignment.targetSCID,
        import_report_url: targetAssignment.ReportUrl,
        import_survey_subscription_id: targetAssignment.SubscriptionID,
      };

      assignments.push(newAssignment);
    }

    if (assignments.length) {
      await this.db("junction_sc_definitions_directus_users").insert(assignments);
    }
  }

  async removeSCAssignments(agency: TargetAgency, directusUserID: string) {
    await this.db("junction_sc_definitions_directus_users")
      .where("agency", agency.id)
      .andWhere("directus_users_id", directusUserID)
      .del();
  }

  async removeExamAssignments(agency: TargetAgency, directusUserID: string) {
    await this.db("junction_directus_users_exams")
      .where("agency", agency.id)
      .andWhere("directus_users_id", directusUserID)
      .del();
  }

  async removePolicyAssignments(agency: TargetAgency, directusUserID: string) {
    await this.db("junction_directus_users_policies")
      .where("agency", agency.id)
      .andWhere("directus_users_id", directusUserID)
      .del();
  }

  async savePolicyAssignments(newPolicyAssignments: any[]) {
    return this.db("junction_directus_users_policies").insert(newPolicyAssignments);
  }

  async saveDocumentAssignments(newDocumentAssignments: any[]) {
    return this.db("junction_directus_users_documents").insert(newDocumentAssignments);
  }

  async removeDocumentAssignments(agency: TargetAgency, directusUserID: string) {
    return this.db("junction_directus_users_documents")
      .where("agency", agency.id)
      .andWhere("directus_users_id", directusUserID)
      .del();
  }

  async removeModulesAssignments(agency: TargetAgency, directusUserID: string) {
    await this.db("junction_modules_definition_directus_users")
      .where("agency", agency.id)
      .andWhere("directus_users_id", directusUserID)
      .del();
  }

  async createShellModule(shellModule: SourceCourse) {
    return this.db("modules_definition")
      .insert({
        title: shellModule.Title,
        status: "archived",
        import_is_shell: true,
        import_course_id: shellModule.CourseID,
        import_ceu: this.getCEUNumber(shellModule.ExamDuration),
      })
      .returning("id");
  }

  async saveModuleAssignments(mappedModules: TargetMappedCourse[], agency: TargetAgency, directusUserID: any) {
    const assignments = [];
    for (const mappedModule of mappedModules) {
      const status = this.calculateModuleAssignmentStatus(mappedModule);

      const newAssignment = {
        agency: agency.id,
        allowed_attempts: mappedModule.AllowedAttempts,
        approved: status === "FINISHED",
        assigned_on: this.formatDate(mappedModule.AssignedDate) || new Date(),
        attempts_used: mappedModule.TestTries < 0 ? 3 : mappedModule.TestTries,
        cert_code: mappedModule.CertCode,
        directus_users_id: directusUserID,
        due_date: mappedModule.DueDate,
        expires_on: mappedModule.ExpiryDate,
        finished_on: mappedModule.FinishDate,
        // module_version: mappedModule.ModuleVersion, // TODO
        modules_definition_id: mappedModule.targetModuleID,
        score: mappedModule.AchievedScore,
        started_on: mappedModule.StartDate,
        status,
        import_cert_url: mappedModule.CertUrl
          ? mappedModule.CertUrl.replace(S3_BUCKET_SOURCE_HOST, S3_BUCKET_TARGET_HOST)
          : null,
        import_report_url: mappedModule.ReportUrl,
        import_subscription_id: mappedModule.SubscriptionID,
      };

      assignments.push(newAssignment);
    }

    if (assignments.length) {
      await this.db("junction_modules_definition_directus_users").insert(assignments);
    }
  }

  async canImportAgency(PortalID: number) {
    const agency = await this.db("agencies").where("import_portal_id", PortalID).first();

    if (agency.live_since) {
      return false;
    }

    return true;
  }

  async addMappings(contentType: string, mappings: Mapping[]) {
    for (const mapping of mappings) {
      const exists = await this.db("data_migration_mappings")
        .where({ content_type: contentType, source_name: mapping.source_name })
        .first();

      if (!exists) {
        await this.db("data_migration_mappings").insert(mapping);
      }
    }
  }

  async getMappings(type: "exam" | "module" | "skill_checklist" | "policy" | "document") {
    const idField = ["module", "skill_checklist"].includes(type) ? "target_id_number" : "target_id_string";
    const mappings = (await this.db("data_migration_mappings")
      .where("content_type", type)
      .andWhereNot(idField, null)
      .orderBy("source_name")) as Mapping[];

    return mappings.map((mapping) => ({
      title: mapping.source_name,
      id: mapping.target_id_string || mapping.target_id_number,
      agencies_id: null,
    }));
  }

  async getExcludedMappings(type: "exam" | "module" | "skill_checklist" | "policy" | "document") {
    return this.db("data_migration_mappings")
      .select("source_name")
      .where("content_type", type)
      .andWhere("exclude", true)
      .orderBy("source_name")
      .pluck("source_name");
  }

  async getExistingPolicies() {
    let existingPolicies = (await this.db("policies AS p")
      .leftJoin("junction_policies_agencies AS pa", "p.id", "pa.policies_id")
      .select("p.id", "p.name", "pa.agencies_id")
      .where("status", "published")) as TargetPolicy[];

    existingPolicies = (await this.addMappingsToExistingItems("policy", existingPolicies)) as TargetPolicy[];

    return existingPolicies;
  }

  async getExistingDocuments() {
    let existingDocuments = (await this.db("documents AS d")
      .leftJoin("junction_documents_agencies AS da", "d.id", "da.documents_id")
      .select("d.id", "d.title", "da.agencies_id")
      .where("status", "published")) as TargetDocument[];

    existingDocuments = (await this.addMappingsToExistingItems("document", existingDocuments)) as TargetDocument[];

    return existingDocuments;
  }

  async markPortalAsLive(portalID: number) {
    await this.db("agencies").where("import_portal_id", portalID).update({
      live_since: new Date(),
    });
  }

  async getAgency(import_agency_target_id: string) {
    return this.db("agencies")
      .select("id", "name", "import_agency_target_id")
      .where("id", import_agency_target_id)
      .first() as Promise<TargetAgency>;
  }
}
