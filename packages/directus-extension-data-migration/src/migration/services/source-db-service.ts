import { Knex } from "knex";
import {
  SourceAssignedSC,
  SourceCourse,
  SourceDepartment,
  SourceDocument,
  SourceLocation,
  SourcePolicy,
  SourcePortal,
  SourceUser,
  TargetMappedCourse,
} from "../types";
import { S3_BUCKET_SOURCE_HOST, S3_BUCKET_TARGET_HOST, START_DATE } from "../importer";

export const PortalIDsInOrder = [
  10, 17, 26, 32, 277, 194, 2, 3, 6, 7, 12, 15, 18, 19, 20, 21, 24, 25, 27, 28, 34, 38, 39, 45, 51, 56, 61, 63, 67, 69,
  74, 80, 85, 89, 99, 102, 109, 113, 116, 123, 124, 128, 129, 131, 135, 136, 137, 138, 141, 142, 149, 151, 152, 154,
  158, 162, 164, 166, 180, 181, 182, 196, 197, 199, 204, 205, 208, 212, 219, 225, 231, 234, 237, 242, 248, 249, 254,
  255, 257, 262, 264, 266, 267, 271, 272, 274, 275, 280, 282, 286, 290, 295, 296, 302, 307, 311, 316, 317, 318, 320,
  322, 323, 326, 333, 336, 337, 338, 339, 346, 350, 352, 358, 371, 372, 375, 376, 382, 383, 387, 388, 391, 392, 400,
  406, 410, 424, 425, 432, 437, 440, 441, 445, 446, 449, 450, 454, 455, 456, 457, 463, 475, 482, 484, 487, 488, 490,
  491, 492, 497, 500, 501, 508, 513, 514, 517, 521, 527, 531, 532, 534, 536, 537, 541, 543, 545, 546, 553, 561, 562,
  564, 565, 566, 570, 571, 573, 584, 587, 589, 590, 595, 596, 598, 600, 601, 603, 606, 607, 612, 613, 615, 618, 619,
  621, 623, 624, 625, 635, 636, 637, 638, 641, 642, 645, 646, 647, 649, 651, 655, 656, 658, 661, 663, 664, 665, 666,
  668, 669, 670, 672, 674, 676, 678, 681, 682, 685, 686, 687, 688, 691, 692, 694, 696, 697, 700, 701, 703, 707, 709,
  711, 712, 713, 714, 715, 716, 717, 719, 720, 722, 723, 724, 725, 726, 729, 730, 732, 733, 734, 738, 739, 741, 744,
  750, 751, 752, 755, 757, 759, 762, 764, 766, 768, 769, 770, 772, 774, 776, 777, 782, 783, 784, 785, 789, 792, 793,
  794, 800, 802, 803, 804, 806, 809, 816, 818, 823, 825, 828, 830, 837, 839, 834, 359,
];

export class SourceDbService {
  db: Knex;
  activePortalsQuery: Knex.QueryBuilder;

  constructor(db: Knex) {
    this.db = db;
    this.activePortalsQuery = this.db("Portals")
      .select(
        "Portals.PortalID",
        "Portals.Portal",
        "Portals.Expiration",
        "Portals.MaxStudents",
        "Portals.BillingCode",
        "Portals.Added",
        "PortalConfiguration.CompanyName",
      )
      .join("PortalConfiguration", "Portals.PortalID", "=", "PortalConfiguration.PortalID")
      .whereIn("Portals.PortalID", PortalIDsInOrder);
  }

  async getPortals(ids: number[]) {
    return this.activePortalsQuery.clone().whereIn("Portals.PortalID", ids) as Promise<SourcePortal[]>;
  }

  async getAllActivePortals() {
    return this.activePortalsQuery.clone() as Promise<SourcePortal[]>;
  }

  async getUniqueExamOrModuleTitles(filterExams: boolean) {
    return this.db("Subscriptions AS s")
      .distinct("c.Title")
      .select("c.CourseID", "c.ExamDuration")
      .join("Portals AS p", "s.PortalID", "=", "p.PortalID")
      .join("Courses AS c", "s.CourseID", "=", "c.CourseID")
      .whereRaw(`c.QuizID is ${filterExams ? "not" : ""} null`)
      .andWhere("s.AssignedDate", ">=", START_DATE)
      .andWhere("p.Expiration", ">", new Date())
      .orderBy("c.Title")
      .groupBy("c.Title") as Promise<SourceCourse[]>;
  }

  async getStudentsByRoles(PortalID: number, roleIDs: number[]) {
    return this.db("Students AS s")
      .select(
        "s.StudentID",
        "s.EmployeeNumber",
        "s.Name",
        "s.Email",
        "s.DeletedAt",
        "s.JoiningDate",
        "s.LastAccess",
        "s.Status",
        "s.RoleID",
        "s.IsEmailDisabled",
        "s.StudentLocationID",
        "s.StudentDepartmentID",
        "s.Phone",
        "s.Address",
        "s.City",
        "st.Name as StateName",
        "s.LicenseExpirationDate",
      )
      .leftOuterJoin("States AS st", "st.StateID", "=", "s.StateID")
      .whereNull("s.DeletedAt")
      .andWhere("s.PortalID", PortalID)
      .andWhereRaw("Email NOT REGEXP 'empower|hs-hire'")
      .whereIn("s.RoleID", roleIDs)
      .orderBy("s.Name") as Promise<SourceUser[]>;
  }

  async getLocations(PortalID: number) {
    return this.db("StudentLocation").select("StudentLocationID", "name").where("PortalID", PortalID) as Promise<
      SourceLocation[]
    >;
  }

  async getDepartments(PortalID: number) {
    return this.db("StudentDepartment").select("StudentDepartmentID", "name").where("PortalID", PortalID) as Promise<
      SourceDepartment[]
    >;
  }

  async getStudentAssignedCourses(StudentID: number, filterExams?: boolean) {
    return this.db("Subscriptions AS s")
      .select(
        "s.SubscriptionID",
        "c.Title",
        "s.ExpiryDate",
        "s.AssignedDate",
        "s.StartDate",
        "s.FinishDate",
        "s.TestTries",
        "s.AllowedAttempts",
        "s.Mandatory",
        "s.Frequency",
        "s.CertUrl",
        "s.CertCode",
        "s.DueDate",
        "s.TestScores",
      )
      .join("Courses AS c", "s.CourseID", "=", "c.CourseID")
      .whereRaw(`c.QuizID is ${filterExams ? "not" : ""} null`)
      .whereNotNull("s.AssignedDate")
      .andWhere("s.StudentID", StudentID)
      .andWhereRaw(
        "s.SubscriptionID in (" +
          "    select max(s.SubscriptionID)" +
          "    from Subscriptions s" +
          `    where s.StudentID = ${StudentID}` +
          "    group by s.CourseRef" +
          "    order by s.CourseRef" +
          ")",
      )
      .andWhere("s.Status", "Assigned")
      .orderBy("c.Title");
  }

  async hydrateAssignmentsWithResults(mappedExams: TargetMappedCourse[]) {
    const examsWithResults: TargetMappedCourse[] = [];
    for (const mappedExam of mappedExams) {
      const examResults = await this.db("StudentQuizAttempts")
        .select("ReportUrl", "AchievedScore", "PassingScore")
        .where("SubscriptionID", mappedExam.SubscriptionID)
        .orderBy("StudentQuizAttemptID", "desc")
        .limit(1)
        .first();

      let AchievedScore = null;
      if (examResults && examResults.AchievedScore) {
        AchievedScore = examResults.AchievedScore;
      } else if (mappedExam.TestScores) {
        AchievedScore = Number(mappedExam.TestScores.split(",").at(-1)) || null;
      }

      examsWithResults.push({
        ...mappedExam,
        ReportUrl:
          examResults && examResults.ReportUrl
            ? examResults.ReportUrl.replace(S3_BUCKET_SOURCE_HOST, S3_BUCKET_TARGET_HOST)
            : null,
        AchievedScore,
        PassingScore: examResults && examResults.PassingScore ? examResults.PassingScore : null,
      });
    }

    return examsWithResults;
  }

  async getUniqueSCTitles() {
    return this.db("SurveySubscriptions AS s")
      .distinct("sv.Name")
      .join("Surveys AS sv", "s.SurveyID", "=", "sv.SurveyID")
      .join("Portals AS p", "s.PortalID", "=", "p.PortalID")
      .andWhere("s.AssignedDate", ">=", START_DATE)
      .andWhere("p.Expiration", ">", new Date())
      .orderBy("sv.Name")
      .pluck("sv.Name") as Promise<string[]>;
  }

  async getStudentAssignedSCs(StudentID: number) {
    return this.db("SurveySubscriptions AS s")
      .select(
        "sv.Name",
        "s.SubscriptionID",
        "s.AssignedDate",
        "s.Frequency",
        "s.DueDate",
        "s.ExpiryDate",
        "s.Status",
        "s.StartDate",
        "s.FinishDate",
        "s.ReportUrl",
        "s.AllowedAttempts",
        "s.Tries",
      )
      .innerJoin("Surveys AS sv", "s.SurveyID", "=", "sv.SurveyID")
      .where("s.StudentID", StudentID)
      .andWhere("s.Status", "Assigned") as Promise<SourceAssignedSC[]>;
  }

  async getStudentAssignedPolicies(StudentID: number) {
    return this.db("Affirmations AS a")
      .select(
        "a.AffirmationID",
        "a.PolicyID",
        "a.PolicyID",
        "a.SignDate",
        "a.SignedPolicyUrl",
        "a.AssignedDate",
        "a.DueDate",
        "a.ExpiryDate",
        "a.Status",
        "a.Frequency",
        "p.Title",
      )
      .join("Policies AS p", "a.PolicyID", "=", "p.PolicyID")
      .where("a.StudentID", StudentID)
      .whereRaw(
        "AffirmationID in (select max(AffirmationID) " +
          "                        from Affirmations " +
          `                        where StudentID = ${StudentID} ` +
          ")",
      )
      .groupBy("a.PolicyID") as Promise<SourcePolicy[]>;
  }

  async getStudentAssignedDocuments(StudentID: number) {
    return this.db("LibraryAssignments AS la")
      .select("ID", "Title", "AssignedDate", "LastAccess")
      .join("Library AS l", "la.LibraryID", "=", "l.DocumentID")
      .where("StudentID", StudentID) as Promise<SourceDocument[]>;
  }

  async getSupervisors(StudentID: number) {
    return this.db("StudentSupervisors AS s")
      .select("s.SupervisorID")
      .where("s.StudentID", StudentID)
      .pluck("SupervisorID");
  }

  async getUniquePolicyTitles() {
    return this.db("Affirmations AS a")
      .distinct("p.Title")
      .join("Policies AS p", "a.PolicyID", "=", "p.PolicyID") as Promise<SourcePolicy[]>;
  }

  async getUniqueDocumentTitles() {
    return this.db("LibraryAssignments AS la")
      .distinct("l.Title")
      .join("Library AS l", "la.LibraryID", "=", "l.DocumentID") as Promise<SourceDocument[]>;
  }
}
