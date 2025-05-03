import { Policies_Filter, useGetOverviewPoliciesReportLazyQuery } from "api";
import { useState } from "react";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { AnalyticsPoliciesOverviewReports } from "../../../../../components/admin/reports/policies/AnalyticsPoliciesOverviewReport";
import PoliciesOverviewTable from "../../../../../components/admin/reports/policies/PoliciesOverviewTable";
import { PoliciesReportLayout } from "../../../../../components/admin/reports/policies/PoliciesReportLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { exportToCsv } from "../../../../../utils/utils";
import { PoliciesOverviewFilters } from "../../../../../components/admin/reports/policies/PoliciesOverviewFilters";
import { notify } from "../../../../../components/Notification";

function PoliciesOverview() {
  const [filters, setFilters] = useState<Policies_Filter>();

  const [overviewExportQuery, { loading: overviewExportLoading }] =
    useGetOverviewPoliciesReportLazyQuery();

  const exportReport = async () => {
    const PAGE_SIZE = 500;
    let offset = 0;
    let allPolicies: any[] = [];

    try {
      let hasMore = true;
      while (hasMore) {
        const reportData = await overviewExportQuery({
          variables: { filter: filters, limit: PAGE_SIZE, offset },
        });

        const fetchedPolicies = reportData.data?.policies || [];
        const transformedPolicies = fetchedPolicies.map((po) => {
          const totalAssignments = po.directus_users?.length || 0;
          const read =
            po.directus_users?.filter((pol) => pol?.read).length || 0;
          const unread = totalAssignments - read;
          const signed =
            po.directus_users?.filter((pol) => pol?.signed_on).length || 0;
          const unsigned = totalAssignments - signed;

          return {
            name: po.name,
            "Average read": `${read}/${totalAssignments} (${
              Math.round((read * 100) / totalAssignments) || 0
            }%)`,
            "Average unread": `${unread}/${totalAssignments} (${
              Math.round((unread * 100) / totalAssignments) || 0
            }%)`,
            "Average signed": `${signed}/${totalAssignments} (${
              Math.round((signed * 100) / totalAssignments) || 0
            }%)`,
            "Average unsigned": `${unsigned}/${totalAssignments} (${
              Math.round((unsigned * 100) / totalAssignments) || 0
            }%)`,
            Expired: totalAssignments
              ? po.directus_users?.reduce(
                  (prev, curr) =>
                    curr?.expires_on &&
                    new Date(curr?.expires_on).getTime() <= new Date().getTime()
                      ? prev + 1
                      : prev,
                  0
                )
              : 0,
          };
        });

        allPolicies = allPolicies.concat(transformedPolicies);

        hasMore = fetchedPolicies.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      exportToCsv<any[]>("overview-policies-reports", allPolicies);
    } catch (error: any) {
      notify({ type: "error", description: "error generating report" });
    }
  };

  return (
    <PoliciesReportLayout>
      <div className="flex flex-col justify-between align-middle md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">
            Policies Overview Reports
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
        <PoliciesOverviewFilters setFilters={setFilters} />
        <h2 className="my-4 text-xl font-semibold">Analytics</h2>
        <AnalyticsPoliciesOverviewReports filters={filters} />
        <h2 className="noprint my-4 text-xl font-semibold">List</h2>
        <PoliciesOverviewTable filter={filters} />
      </div>
    </PoliciesReportLayout>
  );
}

export default withAuth(PoliciesOverview, AdminGroup);
