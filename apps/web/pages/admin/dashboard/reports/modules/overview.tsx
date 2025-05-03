import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { RouterTabs } from "../../../../../components/utils/RouterTabs";
import {
  Modules_Definition_Filter,
  useGetOverviewModulesReportLazyQuery,
} from "api";
import { useState } from "react";
import { CompetencyState } from "types";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { AnalyticsModulesOverviewReports } from "../../../../../components/admin/reports/modules/AnalyticsModulesOverviewReports";
import { ModulesOverviewFilters } from "../../../../../components/admin/reports/modules/ModulesOverviewFilters";
import ModulesOverviewTable from "../../../../../components/admin/reports/modules/ModulesOverviewTable";
import { averageScore, exportToCsv } from "../../../../../utils/utils";
import { ModuleReportLayout } from "../../../../../components/admin/reports/modules/ModuleReportLayout";

interface User {
  id: string;
  status: CompetencyState;
  approved: boolean;
  score?: number;
  due_date?: string;
}

interface ModulesDefinition {
  title?: string | null;
  directus_users?: User[];
}

const PAGE_SIZE = 500;

function ModulesOverviewReport() {
  const [filters, setFilters] = useState<Modules_Definition_Filter>();

  const [overviewExportQuery, { loading: overviewExportLoading }] =
    useGetOverviewModulesReportLazyQuery();

  const exportReport = async () => {
    let allModules: any[] = [];
    let offset = 0;

    while (true) {
      const reportData = await overviewExportQuery({
        variables: { filter: filters, limit: PAGE_SIZE, offset },
      });

      const modules = reportData.data?.modules_definition || [];
      allModules = [...allModules, ...modules];

      if (modules.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }

    const dataToExport = allModules.map((mo: ModulesDefinition) => {
      const totalAssignments = mo.directus_users?.length || 0;
      const totalCompleted =
        mo.directus_users?.filter(
          (user: User) => user?.status === CompetencyState.FINISHED
        ).length || 0;
      const totalApproved =
        mo.directus_users?.reduce(
          (prev: number, curr: User) => (curr?.approved ? prev + 1 : prev), // Explicit types for prev and curr
          0
        ) || 0;

      return {
        title: mo.title,
        "Not started":
          mo.directus_users?.reduce(
            (prev: number, curr: User) =>
              curr?.status === CompetencyState.PENDING ? prev + 1 : prev,
            0
          ) || 0,
        "In progress":
          mo.directus_users?.reduce(
            (prev: number, curr: User) =>
              curr?.status === CompetencyState.STARTED ? prev + 1 : prev,
            0
          ) || 0,
        Passed:
          mo.directus_users?.reduce(
            (prev: number, curr: User) =>
              curr?.status === CompetencyState.FINISHED ? prev + 1 : prev,
            0
          ) || 0,
        Expired:
          mo.directus_users?.reduce(
            (prev: number, curr: User) =>
              curr?.due_date &&
              new Date(curr?.due_date).getTime() <= new Date().getTime()
                ? prev + 1
                : prev,
            0
          ) || 0,
        "Completion status": `${totalCompleted}/${totalAssignments} (${
          Math.round((totalCompleted * 100) / totalAssignments) || 0
        }%)`,
        "Average approved": `${totalApproved}/${totalAssignments}`,
        "Average score": `${averageScore(
          totalAssignments,
          mo.directus_users?.flatMap((user: User) => ({ score: user?.score }))
        ).toFixed()}%`,
      };
    });

    exportToCsv("overview-modules-reports", dataToExport);
  };

  return (
    <ReportLayout>
      <ModuleReportLayout>
        <div className="flex flex-col justify-between align-middle md:flex-row">
          <div className="flex flex-row items-baseline gap-2">
            <h1 className="mb-3 text-xl font-semibold">
              Modules Overview Reports
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
          <ModulesOverviewFilters setFilters={setFilters} />
          <h2 className="my-4 text-xl font-semibold">Analytics</h2>
          <AnalyticsModulesOverviewReports filters={filters} />
          <h2 className="noprint my-4 text-xl font-semibold">List</h2>
          <ModulesOverviewTable filter={filters} />
        </div>
      </ModuleReportLayout>
    </ReportLayout>
  );
}

export default withAuth(ModulesOverviewReport, AdminGroup);
