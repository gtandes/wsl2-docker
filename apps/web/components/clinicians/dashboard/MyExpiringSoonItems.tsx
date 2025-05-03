import { useGetClinicianDashboardItemsQuery } from "api";
import { Spinner } from "../../Spinner";
import { useMemo } from "react";
import { CompetencyState, CompetencyType, DirectusStatus } from "types";
import { ItemStatusButton } from "./ItemStatusButton";
import { ClinicianDashboardItems } from "../../../types/global";
import { addDays } from "date-fns";
import { formatDateTime } from "../../../utils/format";

export const MyExpiringSoonItems = () => {
  const thirtyDaysInFuture = addDays(new Date(), 30);
  const commonFilter = {
    _and: [
      { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
      { status: { _neq: DirectusStatus.ARCHIVED } },
      {
        _or: [
          {
            status: {
              _in: [CompetencyState.EXPIRED, CompetencyState.DUE_DATE_EXPIRED],
            },
          },
          { due_date: { _lte: thirtyDaysInFuture.toDateString() } },
          { expires_on: { _lte: thirtyDaysInFuture.toDateString() } },
        ],
      },
    ],
  };

  const { data, loading } = useGetClinicianDashboardItemsQuery({
    variables: {
      examsfilter: commonFilter,
      modulesfilter: commonFilter,
      scfilter: commonFilter,
      policiesfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          { assigned_on: { _null: true } },
          {
            _or: [
              { due_date: { _lte: thirtyDaysInFuture.toDateString() } },
              { expires_on: { _lte: thirtyDaysInFuture.toDateString() } },
            ],
          },
        ],
      },
      documentsfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          { read: { _null: true } },
          {
            _or: [
              { due_date: { _lte: thirtyDaysInFuture.toDateString() } },
              { expires_on: { _lte: thirtyDaysInFuture.toDateString() } },
            ],
          },
        ],
      },
    },
  });

  const items = useMemo<ClinicianDashboardItems[]>(() => {
    const expiringItems: ClinicianDashboardItems[] = [];

    const status = (status: CompetencyState) =>
      (status !== CompetencyState.EXPIRED &&
      status !== CompetencyState.DUE_DATE_EXPIRED
        ? "Expiring soon"
        : status) as CompetencyState;

    if (data?.exams.length) {
      const exams = data?.exams.map((exam) => ({
        type: CompetencyType.EXAM,
        title: exam.exams_id?.title,
        due_date: exam.due_date,
        link: `/clinician/exams`,
        status: status(exam.status as CompetencyState),
      }));

      expiringItems.push(...exams);
    }
    if (data?.modules.length) {
      const modules = data?.modules.map((module) => ({
        type: CompetencyType.MODULE,
        title: module.modules_definition_id?.title,
        due_date: module.due_date,
        link: `/clinician/modules`,
        status: status(module.status as CompetencyState),
      }));

      expiringItems.push(...modules);
    }
    if (data?.skills_checklists.length) {
      const sc = data?.skills_checklists.map((sc) => ({
        type: CompetencyType.SKILL_CHECKLIST,
        title: sc.sc_definitions_id?.title,
        due_date: sc.due_date,
        link: `/clinician/skills-checklists`,
        status: status(sc.status as CompetencyState),
      }));

      expiringItems.push(...sc);
    }
    if (data?.policies.length) {
      const policies = data?.policies.map((policy) => ({
        type: CompetencyType.POLICY,
        title: policy.policies_id?.name,
        due_date: policy.due_date,
        link: `/clinician/policies`,
        status: status(policy.status as CompetencyState),
      }));

      expiringItems.push(...policies);
    }
    if (data?.documents.length) {
      const documents = data?.documents.map((document) => ({
        type: CompetencyType.DOCUMENT,
        title: document.documents_id?.title,
        due_date: document.due_date,
        link: `/clinician/documents`,
        status: status(document.status as CompetencyState),
      }));

      expiringItems.push(...documents);
    }
    return expiringItems.sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    );
  }, [data]);

  return (
    <div className="my-2 flex flex-col justify-center gap-0">
      <h1 className="px-5 py-3 text-lg font-bold">Expiring soon</h1>

      {loading ? (
        <div className="m-auto">
          <Spinner />
        </div>
      ) : (
        <>
          {items.map((item, idx) => (
            <div
              className="border-t border-t-gray-50"
              key={`${idx}-${item.title}`}
            >
              <div className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.type}</span>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div>
                    <ItemStatusButton item={item} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-400">
                    Due date {formatDateTime(item.due_date!)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
