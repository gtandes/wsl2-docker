import { addDays, format, formatISO } from "date-fns";
import { DirectusServices } from "../../common/directus-services";
import { ReportType } from "./reports";
import { stringifyCSV } from "../../common/utils";
import { CompetencyState } from "types";

async function retryRequest(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (error.status === 503 && retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function paginateQuery(queryFn: (offset: number, limit: number) => Promise<any>, batchSize = 1000) {
  let offset = 0;
  let allResults: any[] = [];
  let batch: any[] = [];

  do {
    batch = await queryFn(offset, batchSize);
    allResults = allResults.concat(batch);
    offset += batchSize;
  } while (batch.length > 0);

  return allResults;
}

export async function getExamReport(services: DirectusServices, type: ReportType, agency: string, ids: string[]) {
  let csv;

  switch (type) {
    case ReportType.SPECIFIC:
      csv = await handleSpecificReport(services, agency, ids);
      break;

    case ReportType.AGGREGATE:
      csv = await handleAggregateReport(services, agency, ids);
      break;

    default:
      throw new Error("Invalid report type");
  }

  return csv;
}

async function handleSpecificReport(services: DirectusServices, agency: string, ids: string[]) {
  const headers = [
    "TITLE",
    "SPECIALTY",
    "DEPARTMENT",
    "LOCATION",
    "EMAIL",
    "TENANT",
    "QUESTION",
    "CORRECT",
    "QUESTION CATEGORY",
  ];

  const body: string[][] = [];

  const examsResults = await paginateQuery(async (offset, limit) =>
    retryRequest(() =>
      services.examResultsService.readByQuery({
        fields: [
          "id",
          "correct",
          "exams_id.title",
          "questions_id.title",
          "questions_id.category.title",
          "assignment_id.agency.id",
          "assignment_id.agency.name",
          "assignment_id.directus_users_id.email",
          "assignment_id.directus_users_id.agencies.agencies_id.id",
          "assignment_id.directus_users_id.agencies.agencies_id.name",
          "assignment_id.directus_users_id.agencies.specialties.specialties_id.name",
          "assignment_id.directus_users_id.agencies.locations.locations_id.name",
          "assignment_id.directus_users_id.agencies.departments.departments_id.name",
          "assignment_id.reassigned",
        ],
        filter: {
          ...(agency !== "all" && { assignment_id: { agency: { id: { _eq: agency } } } }),
          exams_id: { id: { _in: ids } },
          assignment_id: { assigned_on: { _between: [formatISO(addDays(new Date(), -90)), formatISO(new Date())] } },
        },
        sort: ["-assignment_id.assigned_on"],
        limit,
        offset,
      }),
    ),
  );

  examsResults.forEach((examResult: any) => {
    const examAgency = examResult.assignment_id.directus_users_id.agencies.find(
      (agency: any) => agency.agencies_id?.id === examResult.assignment_id?.agency?.id,
    );

    let locations: string[] = [];
    let departments: string[] = [];
    let specialties: string[] = [];

    if (examAgency) {
      locations = examAgency.locations.map((location: any) => location.locations_id?.name);
      departments = examAgency.departments.map((department: any) => department.departments_id?.name);
      specialties = examAgency.specialties.map((specialty: any) => specialty.specialties_id?.name);
    }

    body.push([
      `${
        examResult.assignment_id.reassigned ? `${examResult.exams_id?.title} (REASSIGNED)` : examResult.exams_id?.title
      }`,
      specialties.join(", "),
      departments.join(", "),
      locations.join(", "),
      examResult.assignment_id?.directus_users_id?.email,
      examResult.assignment_id?.agency?.name,
      examResult.questions_id?.title,
      examResult.correct ? "Y" : "N",
      examResult.questions_id?.category?.title,
    ]);
  });

  return stringifyCSV(headers, body);
}

async function handleAggregateReport(services: DirectusServices, agency: string, ids: string[]) {
  const headers = [
    "TITLE",
    "ASSIGNED",
    "COMPLETED",
    "ASSIGNMENT_STATUS",
    "SCORE_STATUS",
    "TENANT",
    "EMAIL",
    "LOCATION",
    "DEPARTMENT",
    "SPECIALTY",
    "SUPERVISORS",
    "CATEGORY 1",
    "CATEGORY 2",
    "CATEGORY 3",
    "SCORE",
    "TIME_IN_SECONDS",
    "ATTEMPTS",
  ];

  const body: string[][] = [];

  const examsAssignments = await paginateQuery(async (offset, limit) =>
    retryRequest(() =>
      services.examAssignmentsService.readByQuery({
        fields: [
          "id",
          "assigned_on",
          "finished_on",
          "status",
          "score",
          "attempts_used",
          "agency.id",
          "agency.name",
          "reassigned",
          "score_history",
          "exams_id.title",
          "exams_id.modality.title",
          "exams_id.specialties.categories_id.title",
          "exams_id.subspecialties.categories_id.title",
          "directus_users_id.email",
          "directus_users_id.agencies.supervisors.directus_users_id.email",
          "directus_users_id.agencies.locations.locations_id.name",
          "directus_users_id.agencies.departments.departments_id.name",
          "directus_users_id.agencies.specialties.specialties_id.name",
          "directus_users_id.agencies.agencies_id.id",
          "directus_users_id.agencies.agencies_id.name",
        ],
        filter: {
          ...(agency !== "all" && { agency: { id: { _eq: agency } } }),
          ...(ids.length > 0 && { exams_id: { id: { _in: ids } } }),
          assigned_on: { _between: [formatISO(addDays(new Date(), -90)), formatISO(new Date())] },
        },
        sort: ["-assigned_on"],
        limit,
        offset,
      }),
    ),
  );

  for (const assignment of examsAssignments) {
    const examResults = await paginateQuery(async (offset, limit) =>
      retryRequest(() =>
        services.examResultsService.readByQuery({
          fields: ["id", "time_taken", "assignment_id.id"],
          filter: {
            assignment_id: { id: { _eq: assignment.id } },
          },
          sort: ["-assignment_id.assigned_on"],
          limit,
          offset,
        }),
      ),
    );

    let timeTaken = examResults.reduce((acc: number, result: any) => acc + result.time_taken, 0);

    let supervisors: string[] = [];
    let locations: string[] = [];
    let departments: string[] = [];
    let specialties: string[] = [];

    const examAgency = assignment.directus_users_id.agencies.find(
      (agency: any) => agency.agencies_id?.id === assignment?.agency?.id,
    );

    if (examAgency) {
      supervisors = examAgency.supervisors.map((supervisor: any) => supervisor.directus_users_id.email);
      locations = examAgency.locations.map((location: any) => location.locations_id.name);
      departments = examAgency.departments.map((department: any) => department.departments_id.name);
      specialties = examAgency.specialties.map((specialty: any) => specialty.specialties_id.name);
    }

    const getCsvData = (assignment_status: CompetencyState, score_status: string, score: number, attempt: number) => [
      `${assignment.reassigned ? `${assignment.exams_id?.title} (REASSIGNED)` : assignment.exams_id?.title}`,
      assignment.assigned_on ? format(new Date(assignment.assigned_on), "yyyy-MM-dd") : "",
      assignment.finished_on ? format(new Date(assignment.finished_on), "yyyy-MM-dd") : "",
      assignment_status,
      score_status,
      assignment.agency?.name,
      assignment.directus_users_id?.email,
      locations.join(", "),
      departments.join(", "),
      specialties.join(", "),
      supervisors.join(", "),
      assignment.exams_id?.modality?.title,
      assignment.exams_id?.specialties?.categories_id?.title,
      assignment.exams_id?.subspecialties?.categories_id?.title,
      score ? `${score}%` : "N/A",
      `${timeTaken}`,
      `${attempt}`,
    ];

    if (assignment.score_history) {
      assignment.score_history.map(
        (history: { score: number; attempt: number; assignment_status: CompetencyState; score_status: string }) => {
          body.push(getCsvData(history.assignment_status, history.score_status, history.score, history.attempt));
        },
      );
    } else {
      body.push(getCsvData(assignment.status, assignment.status, assignment.score || "0", assignment.attempts_used));
    }
  }

  return stringifyCSV(headers, body);
}
