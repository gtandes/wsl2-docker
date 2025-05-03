import { useGetClinicianDashboardItemsQuery } from "api";
import { Spinner } from "../../Spinner";
import { useMemo } from "react";
import { CompetencyState, CompetencyType, DirectusStatus } from "types";
import { ClinicianDashboardItems } from "../../../types/global";
import { ItemStatusButton } from "./ItemStatusButton";
import { format, parseISO } from "date-fns";
import { getFormattedDueDate } from "../../../utils/format";

export const MyPendingItems = () => {
  const { data, loading } = useGetClinicianDashboardItemsQuery({
    variables: {
      examsfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          {
            status: {
              _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS],
            },
          },
        ],
      },
      modulesfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          {
            status: { _in: [CompetencyState.PENDING, CompetencyState.STARTED] },
          },
        ],
      },
      scfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          { status: { _in: [CompetencyState.PENDING] } },
        ],
      },
      policiesfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          { signed_on: { _null: true } },
          { status: { _neq: DirectusStatus.ARCHIVED } },
        ],
      },
      documentsfilter: {
        _and: [
          { directus_users_id: { id: { _eq: "$CURRENT_USER" } } },
          { read: { _null: true } },
          { status: { _neq: DirectusStatus.ARCHIVED } },
        ],
      },
    },
  });

  const items = useMemo<ClinicianDashboardItems[]>(() => {
    const pendingItems: ClinicianDashboardItems[] = [];

    if (data?.exams.length) {
      const exams = data?.exams.map((exam) => ({
        type: CompetencyType.EXAM,
        title: exam.exams_id?.title,
        due_date: exam.due_date,
        link: `/clinician/exams`,
        status: exam.status as CompetencyState,
      }));

      pendingItems.push(...exams);
    }
    if (data?.modules.length) {
      const modules = data?.modules.map((module) => ({
        type: CompetencyType.MODULE,
        title: module.modules_definition_id?.title,
        due_date: module.due_date,
        link: `/clinician/modules`,
        status: module.status as CompetencyState,
      }));

      pendingItems.push(...modules);
    }
    if (data?.skills_checklists.length) {
      const sc = data?.skills_checklists.map((sc) => ({
        type: CompetencyType.SKILL_CHECKLIST,
        title: sc.sc_definitions_id?.title,
        due_date: sc.due_date,
        link: `/clinician/skills-checklists`,
        status: sc.status as CompetencyState,
      }));

      pendingItems.push(...sc);
    }
    if (data?.policies.length) {
      const policies = data?.policies.map((policy) => ({
        type: CompetencyType.POLICY,
        title: policy.policies_id?.name,
        due_date: policy.due_date,
        link: `/clinician/policies`,
        status: CompetencyState.UNSIGNED,
      }));

      pendingItems.push(...policies);
    }
    if (data?.documents.length) {
      const documents = data?.documents.map((document) => ({
        type: CompetencyType.DOCUMENT,
        title: document.documents_id?.title,
        due_date: document.due_date,
        link: `/clinician/documents`,
        status: CompetencyState.UNREAD,
      }));

      pendingItems.push(...documents);
    }

    return pendingItems.sort((a, b) => {
      const aDueDate = a.due_date;
      const bDueDate = b.due_date;
      if (aDueDate && bDueDate) {
        return new Date(aDueDate).getTime() - new Date(bDueDate).getTime();
      }
      return 0;
    });
  }, [data]);

  return (
    <div className="my-2 flex flex-col justify-center gap-0">
      <h1 className="px-5 py-3 text-lg font-bold">Pending items</h1>

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
                    Due date {getFormattedDueDate(item.due_date)}
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
