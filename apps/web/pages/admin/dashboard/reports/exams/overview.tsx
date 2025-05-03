import React, { useState } from "react";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import { Exams_Filter, useGetOverviewExamsReportLazyQuery } from "api";
import { CompetencyState } from "types";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { AnalyticsExamsOverviewReports } from "../../../../../components/admin/reports/exams/AnalyticsExamsOverviewReports";
import ExamsOverviewTable from "../../../../../components/admin/reports/exams/ExamsOverviewTable";
import { averageScore, exportToCsv } from "../../../../../utils/utils";
import { ExamsOverviewFilters } from "../../../../../components/admin/reports/exams/ExamsOverviewFilters";
import { ExamReportLayout } from "../../../../../components/admin/reports/exams/ExamReportLayout";

function ExamsReports() {
  const [filters, setFilters] = useState<Exams_Filter>();

  const [overviewExportQuery, { loading: overviewExportLoading }] =
    useGetOverviewExamsReportLazyQuery();

  const PAGE_SIZE = 500;

  const exportReport = async () => {
    let hasMore = true;
    let offset = 0;
    const csvRows: any[] = [];

    while (hasMore) {
      const reportData = await overviewExportQuery({
        variables: {
          filter: filters,
          limit: PAGE_SIZE,
          offset,
        },
      });

      const fetchedExams = reportData.data?.exams || [];

      const dataToExport = fetchedExams.map((ex) => {
        const totalAssignments = ex.directus_users?.length || 0;
        const totalCompleted = ex.directus_users?.filter(
          (ex) =>
            ex?.status === CompetencyState.COMPLETED ||
            ex?.status === CompetencyState.FAILED
        ).length;

        const totalAttemps = ex.exam_versions?.[0]?.allowed_attempts || 0;
        const totalAttempsUsed = ex.directus_users?.reduce(
          (prev, curr) => prev + curr?.attempts_used! || 0,
          0
        );

        return {
          title: ex.title,
          "Not started": ex.directus_users?.length
            ? ex.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.NOT_STARTED ? prev + 1 : 0,
                0
              )
            : 0,
          "In progress": ex.directus_users?.length
            ? ex.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.IN_PROGRESS ? prev + 1 : 0,
                0
              )
            : 0,
          Passed: ex.directus_users?.length
            ? ex.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.COMPLETED ? prev + 1 : 0,
                0
              )
            : 0,
          Failed: ex.directus_users?.length
            ? ex.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.FAILED ? prev + 1 : 0,
                0
              )
            : 0,
          Expired: ex.directus_users?.length
            ? ex.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.EXPIRED ? prev + 1 : 0,
                0
              )
            : 0,
          "Completion status": `${totalCompleted}/${totalAssignments} (${
            Math.round((totalCompleted! * 100) / totalAssignments!) || 0
          }%)`,
          "Average attempts": `${totalAttempsUsed}/${totalAttemps}`,
          "Average score": `${averageScore(
            totalAssignments,
            ex.directus_users
              ?.filter(
                (eu) =>
                  eu?.status !== CompetencyState.INVALID &&
                  eu?.status !== CompetencyState.IN_REVIEW
              )
              .flatMap((eu) => ({ score: eu?.score }))
          ).toFixed()}%`,
        };
      });

      csvRows.push(...dataToExport);

      hasMore = fetchedExams.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    exportToCsv<any[]>("overview-exams-reports", csvRows);
  };

  return (
    <ReportLayout>
      <ExamReportLayout>
        <div className="flex flex-col justify-between align-middle md:flex-row">
          <div className="flex flex-row items-baseline gap-2">
            <h1 className="mb-3 text-xl font-semibold">
              Exams Overview Reports
            </h1>
            <FilterComboInfoTooltip />
          </div>
          <div className="noprint">
            <Button
              label="Export CSV/report"
              loading={overviewExportLoading}
              variant="solid"
              onClick={exportReport}
            />
          </div>
        </div>
        <div className="mb-8">
          <ExamsOverviewFilters setFilters={setFilters} />
          <h2 className="my-4 text-xl font-semibold">Analytics</h2>
          <AnalyticsExamsOverviewReports filters={filters} />
          <h2 className="noprint my-4 text-xl font-semibold">List</h2>
          <ExamsOverviewTable filter={filters} />
        </div>
      </ExamReportLayout>
    </ReportLayout>
  );
}

export default withAuth(ExamsReports, AdminGroup);
