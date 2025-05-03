import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { RouterTabs } from "../../../../../components/utils/RouterTabs";
import {
  Junction_Modules_Definition_Directus_Users_Filter,
  useGetReportModulesAssignmentsQuery,
  useGetReportModulesAssignmentsLazyQuery,
} from "api";
import { useState } from "react";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { ReportModulesTable } from "../../../../../components/admin/reports/modules/ModulesTable";
import { formatDateTime } from "../../../../../utils/format";
import { exportToCsv } from "../../../../../utils/utils";
import { ModulesDetailFilters } from "../../../../../components/admin/reports/modules/ModulesDetailFilters";
import { ModuleReportAnalytics } from "../../../../../components/admin/reports/modules/ModuleReportAnalytics";
import { ModuleReportLayout } from "../../../../../components/admin/reports/modules/ModuleReportLayout";

const CSV_ROWS_SIZE = 500;

function ModulesDetailsReport() {
  const PAGE_SIZE = 10;

  const [filters, setFilters] =
    useState<Junction_Modules_Definition_Directus_Users_Filter>();

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "directus_users_id.id",
        desc: true,
      },
    ])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    })
  );

  const modulesQuery = useGetReportModulesAssignmentsQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
      filter: filters,
    },
    skip: !Object.keys(filters || {}).length,
  });

  const assignments = modulesQuery.data?.assignments;

  const totalItems = modulesQuery.data?.totalItems.at(0)?.count?.id || 0;

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const [fetchModules, { loading: isExporting }] =
    useGetReportModulesAssignmentsLazyQuery();

  const exportReport = async () => {
    let allAssignments: any[] = [];
    let offset = 0;

    while (true) {
      const reportData = await fetchModules({
        variables: {
          filter: filters,
          limit: CSV_ROWS_SIZE,
          offset,
        },
      });

      const assignments = reportData.data?.assignments || [];

      if (assignments.length === 0) {
        break;
      }

      allAssignments = [...allAssignments, ...assignments];
      offset += CSV_ROWS_SIZE;
    }

    const dataToExport = allAssignments.flatMap((assignment) => {
      const currentAgency = assignment.directus_users_id?.agencies?.find(
        (agency: any) => agency?.agencies_id?.id === assignment.agency?.id
      );

      return {
        name: `${assignment.directus_users_id?.first_name} ${assignment.directus_users_id?.last_name}`,
        last_access: `${formatDateTime(
          assignment.directus_users_id?.last_access!
        )}`,
        department:
          currentAgency?.departments
            ?.map((department: any) => department?.departments_id?.name)
            .join(", ") || "",
        employee_number: currentAgency?.employee_number,
        specialties: currentAgency?.specialties
          ?.map((specialty: any) => specialty?.specialties_id?.name)
          .join(", "),
        supervisor: currentAgency?.supervisors
          ?.map(
            (supervisor: any) =>
              `${supervisor?.directus_users_id?.first_name} ${supervisor?.directus_users_id?.last_name}`
          )
          .join(", "),
        email: assignment.directus_users_id?.email,
        title: assignment.modules_definition_id?.title,
        expiration: assignment.module_version?.expiration,
        status: assignment.status,
        score: assignment.score ? `${assignment.score} %` : "",
        created_on: `${formatDateTime(assignment.assigned_on!)}`,
        started: `${formatDateTime(assignment.started_on!)}`,
        completed: `${formatDateTime(assignment.finished_on!)}`,
        expires: `${formatDateTime(assignment.due_date!)}`,
        allowed_attempts: assignment.allowed_attempts,
        attempts_used: assignment.attempts_used,
      };
    });

    exportToCsv<any>("modules-reports", dataToExport);
  };

  return (
    <ReportLayout>
      <ModuleReportLayout>
        <div className="flex flex-col justify-between align-middle md:flex-row">
          <div className="flex flex-row items-baseline gap-2">
            <h1 className="mb-3 text-xl font-semibold">
              Modules Detail Reports
            </h1>
            <FilterComboInfoTooltip />
          </div>
          <div className="noprint">
            <Button
              label="Export CSV/report"
              loading={isExporting}
              variant="solid"
              disabled={assignments?.length === 0}
              onClick={exportReport}
            />
          </div>
        </div>
        <div className="mb-8">
          <ModulesDetailFilters setFilters={setFilters} />
          <h2 className="my-4 text-xl font-semibold">Analytics</h2>
          <ModuleReportAnalytics filters={filters} />
          <h2 className="noprint my-4 text-xl font-semibold">List</h2>
          <ReportModulesTable
            assignments={assignments || []}
            page={page}
            setPage={setPage}
            sort={sort}
            setSort={setSort}
            loading={modulesQuery.loading}
            totalItems={totalItems}
            pageCount={totalPages}
          />
        </div>
      </ModuleReportLayout>
    </ReportLayout>
  );
}

export default withAuth(ModulesDetailsReport, AdminGroup);
