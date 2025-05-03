import { v4 as uuidv4 } from "uuid";
import {
  ErrorLog,
  Mapping,
  SourceAssignedCourse,
  SourceAssignedSC,
  SourceCourse,
  SourceDocument,
  SourcePortal,
  SourceUser,
  TargetAgency,
  TargetDocument,
  TargetExam,
  TargetMappedCourse,
  TargetModule,
  TargetPolicy,
  TargetSC,
} from "./types";
import { TargetDbService } from "./services/target-db-service";
import { LoggerService } from "./services/logger-service";
import { PortalIDsInOrder, SourceDbService } from "./services/source-db-service";
import { rolesMapping } from "./roles";
import { SlackMessage } from "./index";

export const START_DATE = "2018-01-01";

export const S3_BUCKET_SOURCE_HOST = "s3.amazonaws.com/hshresources";
export const S3_BUCKET_TARGET_HOST = "hshresources-ancc.s3.us-west-2.amazonaws.com";

export class HSHImporter {
  sourceDBService: SourceDbService;
  targetDBService: TargetDbService;
  loggerService: LoggerService;
  migrationID: string;
  portal: SourcePortal;
  agency: TargetAgency;
  private existingMappedExams: TargetExam[];
  private existingShellExams: TargetExam[];
  private existingMappedSCs: TargetSC[];
  private existingShellSCs: TargetSC[];
  private unmappedPolicies: Set<string> = new Set();
  private unmappedExams: Set<string> = new Set();
  private shellExams: Set<string> = new Set();
  private shellSCs: Set<string> = new Set();
  private unmappedSCs: Set<string> = new Set();
  private unmappedDocuments: Set<string> = new Set();
  private existingMappedModules: TargetModule[];
  private existingShellModules: TargetModule[];
  private shellModules: Set<string> = new Set();
  private unmappedModules: Set<string> = new Set();
  private excludedExams: string[];
  private excludedModules: string[];
  private excludedSCs: string[];
  private excludedPolicies: string[];
  private existingPolicies: TargetPolicy[];
  private existingDocuments: TargetDocument[];
  private excludedDocuments: string[];

  constructor(sourceDB: SourceDbService, targetDbService: TargetDbService, logger: LoggerService) {
    this.sourceDBService = sourceDB;
    this.targetDBService = targetDbService;
    this.loggerService = logger;
  }

  parseHrtimeToSeconds(hrtime: number[]) {
    return (hrtime[0] + hrtime[1] / 1e9).toFixed(3);
  }

  async importPortalEntities() {
    const startTime = process.hrtime();

    const portals = await this.sourceDBService.getAllActivePortals();

    if (!portals.length) {
      await this.loggerService.log(this.migrationID, "No portals found", "warn");
      return;
    }

    try {
      for (const portal of portals) {
        this.portal = portal;
        await this.importAgency();
      }
    } catch (err) {
      await this.loggerService.log(
        this.migrationID,
        `Error importing portal id ${this.portal.PortalID}, ${this.portal.Portal}`,
        "error",
        err as ErrorLog,
      );
      throw err;
    }

    await this.loggerService.log(this.migrationID, "Done");
    const elapsedSeconds = this.parseHrtimeToSeconds(process.hrtime(startTime));
    await this.loggerService.log(this.migrationID, `Time taken: ${elapsedSeconds} seconds`);
  }

  async importPortals(portalIDs?: number[], migrationID?: string) {
    this.migrationID = migrationID;
    const startTime = process.hrtime();

    let portals = portalIDs
      ? await this.sourceDBService.getPortals(portalIDs)
      : await this.sourceDBService.getAllActivePortals();

    if (!portals.length) {
      await this.loggerService.log(this.migrationID, "No portals found", "warn");
      return;
    }

    await this.loadExams();
    await this.loadModules();
    await this.loadSCs();
    await this.loadPolicies();
    await this.loadDocuments();

    try {
      for (const portalID of PortalIDsInOrder) {
        const portal = portals.find((p) => p.PortalID === portalID);
        if (!portal) continue;

        this.portal = portal;
        const agencyCanBeImported = await this.targetDBService.canImportAgency(this.portal.PortalID);

        if (!agencyCanBeImported) {
          await this.loggerService.log(
            this.migrationID,
            `Agency ${this.portal.CompanyName}, PortalID ${this.portal.PortalID} already imported`,
            "warn",
          );
          continue;
        }

        await this.importAgency();
        await this.importLocations();
        await this.importDepartments();
        await this.importAdmins();
        await this.importClinicians();
      }
    } catch (err) {
      await this.loggerService.log(
        this.migrationID,
        `Error importing portal id ${this.portal.PortalID}, ${this.portal.Portal}`,
        "error",
        err as ErrorLog,
      );
      throw err;
    }

    await this.loggerService.log(this.migrationID, "Done");
    await this.logUnmapped("shell exam", this.shellExams);
    await this.logUnmapped("unmapped exam", this.unmappedExams);
    await this.logUnmapped("shell sc", this.shellSCs);
    await this.logUnmapped("unmapped sc", this.unmappedSCs);
    await this.logUnmapped("unmapped policy", this.unmappedPolicies);
    await this.logUnmapped("unmapped document", this.unmappedDocuments);
    await this.logUnmapped("shell module", this.shellModules);
    await this.logUnmapped("unmapped module", this.unmappedModules);

    const elapsedSeconds = this.parseHrtimeToSeconds(process.hrtime(startTime));
    await this.loggerService.log(this.migrationID, `Time taken: ${elapsedSeconds} seconds`);
    this.unmappedExams.clear();
    this.shellExams.clear();
    this.unmappedSCs.clear();
    this.shellSCs.clear();
    this.unmappedPolicies.clear();
  }

  async logUnmapped(
    type:
      | "shell exam"
      | "unmapped exam"
      | "shell module"
      | "unmapped module"
      | "shell sc"
      | "unmapped sc"
      | "unmapped policy"
      | "unmapped document",
    set: Set<string>,
  ) {
    if (set.size) {
      await this.loggerService.log(this.migrationID, `Total ${type}: ${set.size}`, "warn");
      // @ts-ignore
      for (const item of set) {
        await this.loggerService.log(this.migrationID, `  ${type}: ${item}`, "warn");
      }
    }
  }

  private async importAgency() {
    this.agency = await this.targetDBService.importAgency(this.portal);

    // TODO implement once schema is ready
    if (["Epic Specialty Cardiovascular Staffing", "Epic Specialty Oncology Staffing"].includes(this.agency.name)) {
      this.agency.id = "7a4a46ec-d5ea-4a1c-bcf5-a3375ac425fd";
    }
    // if (this.agency.import_agency_target_id) {
    //   this.agency.id = this.agency.import_agency_target_id;
    // }
  }

  private async importAdmins() {
    const agencyAdmin = rolesMapping.filter((role) => role.name === "Agency Admin")[0];
    const usersManager = rolesMapping.filter((role) => role.name === "Users Manager")[0];
    const subAdmin = rolesMapping.filter((role) => role.name === "Sub Admin")[0];

    const adminStudents = await this.sourceDBService.getStudentsByRoles(this.portal.PortalID, [
      agencyAdmin.sourceID,
      usersManager.sourceID,
      subAdmin.sourceID,
    ]);

    for (const sourceUser of adminStudents) {
      let roleID = agencyAdmin.id;

      if (sourceUser.RoleID === usersManager.sourceID) {
        roleID = usersManager.id;
      }

      if (sourceUser.RoleID === subAdmin.sourceID) {
        roleID = subAdmin.id;
      }

      const { id: directusUserID, newUser } = await this.targetDBService.importUser(sourceUser, roleID);
      if (newUser) {
        await this.targetDBService.linkUserToAgency(sourceUser, this.agency, directusUserID);
      }
    }
  }

  private async importClinicians() {
    const clinician = rolesMapping.filter((role) => role.name === "Clinician")[0];
    const clinicianStudents = await this.sourceDBService.getStudentsByRoles(this.portal.PortalID, [clinician.sourceID]);
    let message = `Agency ${this.portal.CompanyName}, PortalID ${this.portal.PortalID}, total clinicians: ${clinicianStudents.length}`;

    // TODO enable when Prod has schema
    // if (this.agency.import_agency_target_id) {
    //   const targetAgency = await this.targetDBService.getAgency(this.agency.import_agency_target_id);
    //   if (targetAgency) {
    //     message += `, target agency: ${targetAgency.name}`;
    //   }
    // }

    await SlackMessage(message);
    await this.loggerService.log(this.migrationID, message);
    const clinicianRole = rolesMapping.filter((role) => role.name === "Clinician")[0];

    for (const sourceUser of clinicianStudents) {
      const { id: directusUserID } = await this.targetDBService.importUser(sourceUser, clinicianRole.id);

      await this.targetDBService.linkUserToAgency(sourceUser, this.agency, directusUserID);

      const supervisors = await this.sourceDBService.getSupervisors(sourceUser.StudentID);
      if (sourceUser.StudentDepartmentID || sourceUser.StudentLocationID || supervisors.length) {
        await this.targetDBService.linkLocationDepartmentSupervisors(
          sourceUser,
          this.agency,
          directusUserID,
          supervisors,
        );
      }

      if (sourceUser.Status !== "Active") {
        continue;
      }

      await this.importExamAssignments(sourceUser, directusUserID);
      await this.importSCAssignments(sourceUser, directusUserID);
      await this.importPolicyAssignments(sourceUser, directusUserID);
      await this.importDocumentAssignments(sourceUser, directusUserID);
      await this.importModuleAssignments(sourceUser, directusUserID);
    }

    return clinicianStudents.length;
  }

  private async importLocations() {
    const locations = await this.sourceDBService.getLocations(this.portal.PortalID);

    for (const location of locations) {
      await this.targetDBService.importLocation(location, this.agency);
    }
  }

  private async importDepartments() {
    const departments = await this.sourceDBService.getDepartments(this.portal.PortalID);

    for (const department of departments) {
      await this.targetDBService.importDepartment(department, this.agency);
    }
  }

  private async importExamAssignments(sourceUser: SourceUser, directusUserID: any) {
    const examAssignments = (await this.sourceDBService.getStudentAssignedCourses(
      sourceUser.StudentID,
      true,
    )) as SourceAssignedCourse[];
    const examAssignmentsWithTargetIDs: TargetMappedCourse[] = [];

    await this.targetDBService.removeExamAssignments(this.agency, directusUserID);

    for (const examAssignment of examAssignments) {
      if (this.excludedExams.includes(examAssignment.Title)) {
        continue;
      }

      const existingAgencyExam = this.existingMappedExams.find(
        (e) => e.title.trim() === examAssignment.Title.trim() && e.agencies_id === this.agency.id,
      );

      if (existingAgencyExam) {
        examAssignmentsWithTargetIDs.push({ ...examAssignment, targetExamID: existingAgencyExam.id });
        continue;
      }

      const existingGlobalExam = this.existingMappedExams.find(
        (e) => e.title.trim() === examAssignment.Title.trim() && e.agencies_id === null,
      );

      if (existingGlobalExam) {
        examAssignmentsWithTargetIDs.push({ ...examAssignment, targetExamID: existingGlobalExam.id });
        continue;
      }

      const existingShell = this.existingShellExams.filter((e) => e.title === examAssignment.Title)[0];
      if (existingShell) {
        if (!this.shellExams.has(examAssignment.Title)) {
          this.shellExams.add(examAssignment.Title);
          await this.loggerService.log(this.migrationID, `exam shell: "${examAssignment.Title}"`, "warn");
        }
        examAssignmentsWithTargetIDs.push({ ...examAssignment, targetExamID: existingShell.id });
        continue;
      }

      if (!this.unmappedExams.has(examAssignment.Title)) {
        this.unmappedExams.add(examAssignment.Title);
        await this.loggerService.log(this.migrationID, `exam unmapped: "${examAssignment.Title}"`, "warn");
      }
    }

    const examAssignmentsWithResults = await this.sourceDBService.hydrateAssignmentsWithResults(
      examAssignmentsWithTargetIDs,
    );

    await this.targetDBService.saveExamAssignments(examAssignmentsWithResults, this.agency, directusUserID);
  }

  private async loadModules() {
    const allModules = await this.sourceDBService.getUniqueExamOrModuleTitles(false);
    this.existingMappedModules = await this.targetDBService.getExistingModules(false);
    this.excludedModules = await this.targetDBService.getExcludedMappings("module");
    this.existingShellModules = await this.targetDBService.getExistingModules(true);
    const allExistingModules = [...this.existingMappedModules, ...this.existingShellModules];

    const shellModulesToCreate: SourceCourse[] = [];
    for (const moduleTitle of allModules) {
      if (!allExistingModules.find((existingModule) => existingModule.title === moduleTitle.Title)) {
        shellModulesToCreate.push(moduleTitle);
      }
    }

    await this.loggerService.log(
      this.migrationID,
      `Loading modules: mapped ${this.existingMappedModules.length}, shells: ${this.existingShellModules.length}, shells to create: ${shellModulesToCreate.length}`,
    );

    for (const shellModule of shellModulesToCreate) {
      const record = await this.targetDBService.createShellModule(shellModule);
      const module = await this.targetDBService.getModule(record.at(0).id);
      this.existingShellModules.push(module);
    }
  }

  private async loadExams() {
    const allExams = await this.sourceDBService.getUniqueExamOrModuleTitles(true);
    this.existingMappedExams = await this.targetDBService.getExistingExams(false);
    this.excludedExams = await this.targetDBService.getExcludedMappings("exam");
    this.existingShellExams = await this.targetDBService.getExistingExams(true);
    const allExistingExams = [...this.existingMappedExams, ...this.existingShellExams];

    const shellExamsToCreate: SourceCourse[] = [];
    for (const exam of allExams) {
      if (!allExistingExams.find((existingExam) => existingExam.title === exam.Title)) {
        shellExamsToCreate.push(exam);
      }
    }
    await this.loggerService.log(
      this.migrationID,
      `Loading exams: mapped ${this.existingMappedExams.length}, shells: ${this.existingShellExams.length}, shells to create: ${shellExamsToCreate.length}`,
    );

    for (const shellExam of shellExamsToCreate) {
      const id = uuidv4();
      await this.targetDBService.createShellExam(id, shellExam);
      const exam = await this.targetDBService.getExam(id);
      this.existingShellExams.push(exam);
    }
  }

  private async loadSCs() {
    const allSCs = await this.sourceDBService.getUniqueSCTitles();
    this.existingMappedSCs = await this.targetDBService.getExistingSCs(false);
    this.excludedSCs = await this.targetDBService.getExcludedMappings("skill_checklist");
    this.existingShellSCs = await this.targetDBService.getExistingSCs(true);
    const allExistingSCs = [...this.existingMappedSCs, ...this.existingShellSCs];

    const shellSCsToCreate = [];
    for (const scTitle of allSCs) {
      if (!allExistingSCs.find((existingSC) => existingSC.title === scTitle)) {
        shellSCsToCreate.push(scTitle);
      }
    }

    await this.loggerService.log(
      this.migrationID,
      `Loading scs: mapped ${this.existingMappedSCs.length}, shells: ${this.existingShellSCs.length}, shells to create: ${shellSCsToCreate.length}`,
    );

    for (const shellSCTitle of shellSCsToCreate) {
      const record = await this.targetDBService.createShellSC(shellSCTitle);
      const sc = await this.targetDBService.getSC(record.at(0).id);
      this.existingShellSCs.push(sc);
    }
  }

  private async importSCAssignments(sourceUser: SourceUser, directusUserID: any) {
    const scAssignments = await this.sourceDBService.getStudentAssignedSCs(sourceUser.StudentID);

    await this.targetDBService.removeSCAssignments(this.agency, directusUserID);

    const targetSCAssignments: SourceAssignedSC[] = [];
    for (const scAssignment of scAssignments) {
      const assignmentTitle = scAssignment.Name.trim();

      if (this.excludedSCs.includes(assignmentTitle)) {
        continue;
      }

      const existingAgencySC = this.existingMappedSCs.find(
        (e) => e.title.trim() === assignmentTitle && e.agencies_id === this.agency.id,
      );

      if (existingAgencySC) {
        targetSCAssignments.push({ ...scAssignment, targetSCID: existingAgencySC.id });
        continue;
      }

      const existingGlobalSC = this.existingMappedSCs.find(
        (e) => e.title.trim() === assignmentTitle && e.agencies_id === null,
      );

      if (existingGlobalSC) {
        targetSCAssignments.push({ ...scAssignment, targetSCID: existingGlobalSC.id });
        continue;
      }

      const existingShell = this.existingShellSCs.filter((e) => e.title === scAssignment.Name)[0];
      if (existingShell) {
        if (!this.shellSCs.has(scAssignment.Name)) {
          this.shellSCs.add(scAssignment.Name);
          await this.loggerService.log(this.migrationID, `sc shell "${scAssignment.Name}"`, "warn");
        }

        targetSCAssignments.push({ ...scAssignment, targetSCID: existingShell.id });
        continue;
      }

      if (!this.unmappedSCs.has(scAssignment.Name)) {
        this.unmappedSCs.add(scAssignment.Name);
        await this.loggerService.log(this.migrationID, `unmapped SC "${scAssignment.Name}"`, "warn");
      }
    }

    await this.targetDBService.saveSCAssignments(targetSCAssignments, this.agency, directusUserID);
  }

  private async importPolicyAssignments(sourceUser: SourceUser, directusUserID: any) {
    const policyAssignments = await this.sourceDBService.getStudentAssignedPolicies(sourceUser.StudentID);
    await this.targetDBService.removePolicyAssignments(this.agency, directusUserID);
    const policyAssignmentsToCreate = [];
    for (const policyAssignment of policyAssignments) {
      if (this.excludedPolicies.includes(policyAssignment.Title)) {
        continue;
      }

      const foundAgencyPolicy = this.existingPolicies.find(
        (p) => p.name === policyAssignment.Title && p.agencies_id === this.agency.id,
      );
      if (foundAgencyPolicy) {
        policyAssignmentsToCreate.push({ ...policyAssignment, targetPolicyID: foundAgencyPolicy.id });
        continue;
      }

      const foundGlobalPolicy = this.existingPolicies.find((p) => p.name === policyAssignment.Title && !p.agencies_id);
      if (foundGlobalPolicy) {
        policyAssignmentsToCreate.push({ ...policyAssignment, targetPolicyID: foundGlobalPolicy.id });
        continue;
      }

      if (!this.unmappedPolicies.has(policyAssignment.Title)) {
        this.unmappedPolicies.add(policyAssignment.Title);
        await this.loggerService.log(
          this.migrationID,
          `policy unmapped "${policyAssignment.Title}" ${policyAssignment.PolicyID}`,
          "warn",
        );
      }
    }

    const newPolicyAssignments = [];
    for (const policyAssignment of policyAssignmentsToCreate) {
      const newPolicyAssignment = {
        agency: this.agency.id,
        assigned_on: policyAssignment.AssignedDate,
        directus_users_id: directusUserID,
        due_date: policyAssignment.DueDate,
        expires_on: policyAssignment.ExpiryDate,
        policies_id: policyAssignment.targetPolicyID,
        read: policyAssignment.SignDate,
        signed_on: policyAssignment.SignDate,
        status: policyAssignment.ExpiryDate > new Date() ? "published" : "DUE_DATE_EXPIRED",
        import_affirmation_id: policyAssignment.AffirmationID,
      };
      newPolicyAssignments.push(newPolicyAssignment);
    }

    if (newPolicyAssignments.length) {
      await this.targetDBService.savePolicyAssignments(newPolicyAssignments);
    }
  }

  private async importDocumentAssignments(sourceUser: SourceUser, directusUserID: any) {
    const documentAssignments = await this.sourceDBService.getStudentAssignedDocuments(sourceUser.StudentID);
    await this.targetDBService.removeDocumentAssignments(this.agency, directusUserID);

    const documentAssignmentsToCreate: SourceDocument[] = [];
    for (const documentAssignment of documentAssignments) {
      if (this.excludedDocuments.includes(documentAssignment.Title)) {
        continue;
      }

      const foundAgencyDocument = this.existingDocuments.find(
        (p) => p.title === documentAssignment.Title && p.agencies_id === this.agency.id,
      );
      if (foundAgencyDocument) {
        documentAssignmentsToCreate.push({ ...documentAssignment, targetDocumentID: foundAgencyDocument.id });
        continue;
      }

      const foundGlobalDocument = this.existingDocuments.find(
        (p) => p.title === documentAssignment.Title && !p.agencies_id,
      );
      if (foundGlobalDocument) {
        documentAssignmentsToCreate.push({ ...documentAssignment, targetDocumentID: foundGlobalDocument.id });
        continue;
      }

      if (!this.unmappedDocuments.has(documentAssignment.Title)) {
        this.unmappedDocuments.add(documentAssignment.Title);
        await this.loggerService.log(this.migrationID, `document unmapped "${documentAssignment.Title}"`, "warn");
      }
    }

    const newDocumentAssignments = [];
    for (const documentAssignment of documentAssignmentsToCreate) {
      const newDocumentAssignment = {
        agency: this.agency.id,
        assigned_on: documentAssignment.AssignedDate,
        directus_users_id: directusUserID,
        documents_id: documentAssignment.targetDocumentID,
        read: documentAssignment.LastAccess,
        status: documentAssignment.LastAccess ? "READ" : "UNREAD",
        import_library_assignment_id: documentAssignment.ID,
      };
      newDocumentAssignments.push(newDocumentAssignment);
    }

    if (newDocumentAssignments.length) {
      await this.targetDBService.saveDocumentAssignments(newDocumentAssignments);
    }
  }

  private async importModuleAssignments(sourceUser: SourceUser, directusUserID: any) {
    const moduleAssignments = (await this.sourceDBService.getStudentAssignedCourses(
      sourceUser.StudentID,
      false,
    )) as SourceAssignedCourse[];

    await this.targetDBService.removeModulesAssignments(this.agency, directusUserID);

    const moduleAssignmentsWithTargetIDs: TargetMappedCourse[] = [];

    for (const moduleAssignment of moduleAssignments) {
      if (this.excludedModules.includes(moduleAssignment.Title)) {
        continue;
      }

      const moduleTitle = moduleAssignment.Title.trim();
      const existingModule = this.existingMappedModules.find((e) => e.title.trim() === moduleTitle);

      if (existingModule) {
        moduleAssignmentsWithTargetIDs.push({ ...moduleAssignment, targetModuleID: existingModule.id });
        continue;
      }

      const existingShell = this.existingShellModules.filter((e) => e.title === moduleAssignment.Title)[0];
      if (existingShell) {
        if (!this.shellModules.has(moduleAssignment.Title)) {
          this.shellModules.add(moduleAssignment.Title);
          await this.loggerService.log(this.migrationID, `shell module "${moduleAssignment.Title}"`, "warn");
        }
        moduleAssignmentsWithTargetIDs.push({ ...moduleAssignment, targetModuleID: existingShell.id });
        continue;
      }

      if (!this.unmappedModules.has(moduleAssignment.Title)) {
        this.unmappedModules.add(moduleAssignment.Title);
        await this.loggerService.log(this.migrationID, `unmapped module "${moduleAssignment.Title}"`, "warn");
      }
    }

    const moduleAssignmentsWithResults = await this.sourceDBService.hydrateAssignmentsWithResults(
      moduleAssignmentsWithTargetIDs,
    );

    await this.targetDBService.saveModuleAssignments(moduleAssignmentsWithResults, this.agency, directusUserID);
  }

  async generateMappingsList() {
    console.log("Generating mappings list");
    const sourceExams = await this.sourceDBService.getUniqueExamOrModuleTitles(true);
    const targetExams = await this.targetDBService.getExistingExams(false);

    const examMappings: Mapping[] = sourceExams.map((e) => {
      const existingExam = targetExams.find((t) => t.title === e.Title);
      return {
        content_type: "exam",
        source_name: e.Title.trim(),
        target_id_string: existingExam ? existingExam.id : null,
      };
    });
    await this.targetDBService.addMappings("exam", examMappings);

    const targetModules = await this.targetDBService.getExistingModules(false);
    const sourceModules = await this.sourceDBService.getUniqueExamOrModuleTitles(false);
    const moduleMappings: Mapping[] = sourceModules.map((e) => {
      const existingModule = targetModules.find((t) => t.title === e.Title);
      return {
        content_type: "module",
        source_name: e.Title.trim(),
        target_id_number: existingModule ? existingModule.id : null,
      };
    });
    await this.targetDBService.addMappings("module", moduleMappings);

    const sourceSCs = await this.sourceDBService.getUniqueSCTitles();
    const targetSCs = await this.targetDBService.getExistingSCs(false);
    const scMappings: Mapping[] = sourceSCs.map((e) => {
      const existingSC = targetSCs.find((t) => t.title === e);
      return {
        content_type: "skill_checklist",
        source_name: e.trim(),
        target_id_number: existingSC ? existingSC.id : null,
      };
    });
    await this.targetDBService.addMappings("skill_checklist", scMappings);

    const sourcePolicies = await this.sourceDBService.getUniquePolicyTitles();
    const policyMappings: Mapping[] = sourcePolicies.map((e) => {
      return {
        content_type: "policy",
        source_name: e.Title.trim(),
      };
    });
    await this.targetDBService.addMappings("policy", policyMappings);

    const sourceDocuments = await this.sourceDBService.getUniqueDocumentTitles();
    const documentMappings: Mapping[] = sourceDocuments.map((e) => {
      return {
        content_type: "document",
        source_name: e.Title.trim(),
      };
    });
    await this.targetDBService.addMappings("document", documentMappings);
    console.log("Done generating mappings list");
  }

  private async loadPolicies() {
    this.existingPolicies = await this.targetDBService.getExistingPolicies();
    this.excludedPolicies = await this.targetDBService.getExcludedMappings("policy");
    await this.loggerService.log(this.migrationID, `Loading policies: mapped ${this.existingPolicies.length}`);
  }

  private async loadDocuments() {
    this.existingDocuments = await this.targetDBService.getExistingDocuments();
    this.excludedDocuments = await this.targetDBService.getExcludedMappings("document");
    await this.loggerService.log(this.migrationID, `Loading documents: mapped ${this.existingDocuments.length}`);
  }
}
