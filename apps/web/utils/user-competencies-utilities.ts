import { CompetencyState, CompetencyType } from "types";
import { Competencies } from "../types/global";
import {
  CompetenciesExamFragment,
  CompetenciesModuleFragment,
  Junction_Directus_Users_Documents,
  Junction_Directus_Users_Policies,
} from "api";

export const competencyParse = (
  data: Competencies,
  type: CompetencyType,
  name: string | null | undefined,
  status: CompetencyState,
  ceu: number | null | undefined,
  import_cert_url?: string,
  import_report_url?: string
): Competencies => {
  return {
    id: data?.id,
    name,
    exams_id: { id: data.exams_id?.id || null },
    sc_definitions_id: { id: data.sc_definitions_id?.id || null },
    modules_definition_id: { id: data.modules_definition_id?.id || null },
    documents_id: { id: data.documents_id?.id || null },
    policies_id: { id: data.policies_id?.id || null },
    attempts_used: data?.attempts_used ? data?.attempts_used : 0,
    allowed_attempts: data?.allowed_attempts ? data?.allowed_attempts : null,
    assigned_on: data?.assigned_on ? data?.assigned_on : null,
    started_on: data?.started_on ? data?.started_on : null,
    ceu,
    expires_on: data?.expires_on || null,
    due_date: data?.due_date || null,
    finished_on: data?.finished_on ? data?.finished_on : null,
    signed_on: data?.signed_on ? data?.signed_on : null,
    score: data?.score ? data?.score : null,
    status: status,
    type,
    import_cert_url,
    import_report_url,
    reassigned: data.reassigned,
    agency: data?.agency,
    expiration_type: data?.expiration_type,
    score_history: data?.score_history,
    approved: data?.approved || false,
  };
};

const isPolicy = (
  item: Junction_Directus_Users_Documents | Junction_Directus_Users_Policies
): item is Junction_Directus_Users_Policies =>
  (<Junction_Directus_Users_Policies>item).signed_on !== undefined;

export const policiesAndDocumentsStatus = (
  item: Junction_Directus_Users_Documents | Junction_Directus_Users_Policies
): CompetencyState => {
  let status: CompetencyState = CompetencyState.EXPIRED;

  const expired = item.expires_on
    ? new Date().getTime() >= new Date(item.expires_on).getTime()
    : false;

  if (isPolicy(item)) {
    if (item.signed_on) {
      status = CompetencyState.SIGNED;
    }

    if (!item?.signed_on) {
      status = CompetencyState.UNSIGNED;
    }
  } else {
    if (item.read) {
      status = CompetencyState.READ;
    }

    if (!item.read) {
      status = CompetencyState.UNREAD;
    }
  }

  if (item.status === CompetencyState.DUE_DATE_EXPIRED) {
    status = CompetencyState.DUE_DATE_EXPIRED;
  }

  if (expired) {
    status = CompetencyState.EXPIRED;
  }
  return status;
};

export function getExamCEU(exam: CompetenciesExamFragment) {
  let ceu;
  if (exam.exams_id?.import_ceu) {
    ceu = Number(exam.exams_id?.import_ceu);
  } else {
    ceu = Number(exam.exam_versions_id?.contact_hour);
  }

  return ceu || null;
}

export function getModuleCEU(module: CompetenciesModuleFragment) {
  let ceu;
  if (module.modules_definition_id?.import_ceu) {
    ceu = Number(module.modules_definition_id?.import_ceu);
  } else {
    ceu = Number(module.modules_definition_id?.last_version?.contact_hour);
  }

  return ceu || null;
}
