import {
  Sc_Definitions_Filter,
  useGetOverviewSkillsChecklistsReportLazyQuery,
} from "api";
import { useState } from "react";
import { CompetencyState } from "types";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import AnalyticsSkillsChecklistsOverviewReports from "../../../../../components/admin/reports/skill-checklist/AnalyticsSkillsChecklistsOverviewReports";
import SkillsCheckListsOverviewTable from "../../../../../components/admin/reports/skill-checklist/SkillsCheckListsOverviewTable";
import { SkillsChecklistOverviewFilters } from "../../../../../components/admin/reports/skill-checklist/SkillsChecklistOverviewFilters";
import { SkillsChecklistReportLayout } from "../../../../../components/admin/reports/skill-checklist/SkillsChecklistReportLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { exportToCsv } from "../../../../../utils/utils";
import { notify } from "../../../../../components/Notification";

function SkillsChecklistOverview() {
  const [filters, setFilters] = useState<Sc_Definitions_Filter>();

  const [overviewExportQuery, { loading: overviewExportLoading }] =
    useGetOverviewSkillsChecklistsReportLazyQuery();

  const exportReport = async () => {
    const LIMIT_BATCH_SIZE = 500;
    let offset = 0;
    let allData: any[] = [];

    try {
      let hasMore = true;
      while (hasMore) {
        const { data: reportData } = await overviewExportQuery({
          variables: {
            filter: filters,
            limit: LIMIT_BATCH_SIZE,
            offset: offset,
          },
        });

        const fetchedData = reportData?.sc_definitions || [];

        const transformedData = fetchedData.map((sc) => {
          const totalAssignments = sc.directus_users?.length;
          const totalCompleted = sc.directus_users?.filter(
            (scl) => scl?.status === CompetencyState.COMPLETED
          ).length;

          return {
            title: sc.title,
            "Not started": sc.directus_users?.length
              ? sc.directus_users.reduce(
                  (prev, curr) =>
                    curr?.status === CompetencyState.PENDING ? prev + 1 : prev,
                  0
                )
              : 0,
            Expired: sc.directus_users?.length
              ? sc.directus_users.reduce(
                  (prev, curr) =>
                    curr?.expires_on &&
                    new Date(curr?.expires_on).getTime() <= new Date().getTime()
                      ? prev + 1
                      : prev,
                  0
                )
              : 0,
            "Completion status": `${totalCompleted}/${totalAssignments} (${
              Math.round((totalCompleted! * 100) / totalAssignments!) || 0
            }%)`,
          };
        });

        allData = allData.concat(transformedData);
        hasMore = fetchedData.length === LIMIT_BATCH_SIZE;
        offset += LIMIT_BATCH_SIZE;
      }

      exportToCsv<any[]>("overview-skills-checklists-reports", allData);
    } catch (error: any) {
      notify({ type: "error", description: "error generating report" });
    }
  };

  return (
    <SkillsChecklistReportLayout>
      <div className="flex flex-col justify-between align-middle md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">
            Skills Checklists Overview Reports
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
        <SkillsChecklistOverviewFilters setFilters={setFilters} />
        <h2 className="my-4 text-xl font-semibold">Analytics</h2>
        <AnalyticsSkillsChecklistsOverviewReports filters={filters} />
        <h2 className="noprint my-4 text-xl font-semibold">List</h2>
        <SkillsCheckListsOverviewTable filter={filters} />
      </div>
    </SkillsChecklistReportLayout>
  );
}

export default withAuth(SkillsChecklistOverview, AdminGroup);
