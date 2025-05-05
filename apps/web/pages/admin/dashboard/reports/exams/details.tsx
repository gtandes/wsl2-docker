import React, { useState } from "react";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import {
  Junction_Directus_Users_Exams_Filter,
  useGetAllUserExamLazyQuery,
  useGetAllUserExamQuery,
  UserForReportsFragment,
} from "api";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { exportToCsv2 } from "../../../../../utils/utils";
import { first } from "lodash";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { AnalyticsExamsReports } from "../../../../../components/admin/reports/exams/AnalyticsExamsReports";
import { ExamsList } from "../../../../../components/exams/ExamsList";
import { ExamsReportsExport } from "../../../../../types/reports";
import { formatDateTime } from "../../../../../utils/format";
import { ExamReportLayout } from "../../../../../components/admin/reports/exams/ExamReportLayout";
import { ExamsDetailFilters } from "../../../../../components/admin/reports/exams/ExamsDetailFilters";
import { useAgency } from "../../../../../hooks/useAgency";

const PAGE_SIZE = 10;

function ExamsDetailsReport() {
  const [filters, setFilters] = useState<Junction_Directus_Users_Exams_Filter>(
    {}
  );

  const { currentAgency } = useAgency();

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

  const getDepartments = (
    user: UserForReportsFragment,
    currentAgencyId?: string
  ) => {
    const xcurrentAgency = user.agencies?.find(
      (agency) => agency?.agencies_id?.id! === currentAgencyId
    );

    return xcurrentAgency?.departments?.map((d) => d!.departments_id?.name!)!;
  };
  const getEmployeeNumber = (
    user: UserForReportsFragment,
    currentAgencyId?: string
  ) => {
    const xcurrentAgency: any = user.agencies?.find(
      (agency) => agency?.agencies_id?.id! === currentAgencyId
    );

    return xcurrentAgency?.employee_number ?? "";
  };

  const [fetchExams, { loading: isExporting }] = useGetAllUserExamLazyQuery();

  const usersExamsQuery = useGetAllUserExamQuery({
    variables: {
      limit: PAGE_SIZE,
      offset: page.pageIndex * PAGE_SIZE,
      filter: filters,
    },
    skip: !Object.keys(filters).length,
  });

  const exportReport = async () => {
    const PAGE_SIZE = 500;
    let offset = 0;
    let allExams: any[] = [];

    try {
      let hasMore = true;

      while (hasMore) {
        const { data: reportData } = await fetchExams({
          variables: {
            filter: filters,
            limit: PAGE_SIZE,
            offset: offset,
          },
        });

        const fetchedExams = reportData?.junction_directus_users_exams || [];

        const transformedExams = fetchedExams.map((exam: any) => ({
          name: `${exam.directus_users_id?.first_name} ${exam.directus_users_id?.last_name}`,
          email: exam.directus_users_id?.email,
          title: exam.exams_id?.title,
          expiration: exam.exam_versions_id?.expiration,
          status: exam.status,
          score: exam.score ? `${exam.score} %` : "",
          attempts: `${exam.attempts_used}/${exam.allowed_attempts}`,
          started: formatDateTime(exam.started_on),
          completed: formatDateTime(exam.finished_on),
          expires: formatDateTime(exam.expires_on),
          date_created: formatDateTime(exam.agency?.date_created),
          date_join: formatDateTime(exam.agency?.date_created),
          employee_number: getEmployeeNumber(
            exam.directus_users_id,
            currentAgency?.id
          ),
          department: getDepartments(exam.directus_users_id, currentAgency?.id),
        }));

        allExams = allExams.concat(transformedExams);

        hasMore = fetchedExams.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      exportToCsv2<ExamsReportsExport>("exams-reports", allExams);
    } catch (error) {
      console.error("Error exporting report:", error);
    }
  };

  const usersExams = usersExamsQuery.data?.junction_directus_users_exams || [];
  const totalItems =
    first(usersExamsQuery.data?.junction_directus_users_exams_aggregated)?.count
      ?.id || 0;

  return (
    <ReportLayout>
      <ExamReportLayout>
        <div className="flex flex-col justify-between align-middle md:flex-row">
          <div className="flex flex-row items-baseline gap-2">
            <h1 className="mb-3 text-xl font-semibold">Exams Detail Reports</h1>
            <FilterComboInfoTooltip />
          </div>
          <div className="noprint">
            <Button
              label="Export CSV/report"
              loading={isExporting}
              variant="solid"
              disabled={usersExams.length === 0}
              onClick={exportReport}
            />
          </div>
        </div>
        <div className="mb-8">
          <ExamsDetailFilters setFilters={setFilters} />
          <h2 className="my-4 text-xl font-semibold">Analytics</h2>
          <AnalyticsExamsReports filters={filters} />
          <h2 className="noprint my-4 text-xl font-semibold">List</h2>
          <ExamsList
            examsListData={usersExams}
            isLoading={usersExamsQuery.loading}
            totalItems={totalItems}
            sort={sort}
            setSort={setSort}
            page={page}
            setPage={setPage}
            pageCount={Math.ceil(totalItems)}
            pageSize={PAGE_SIZE}
          />
        </div>
      </ExamReportLayout>
    </ReportLayout>
  );
}

export default withAuth(ExamsDetailsReport, AdminGroup);
