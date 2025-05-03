import { Documents_Filter, useGetOverviewDocumentsReportLazyQuery } from "api";
import { useState } from "react";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import AnalyticsDocumentsOverviewReports from "../../../../../components/admin/reports/documents/AnalyticsDocumentsOverviewReports";
import DocumentsOverviewTable from "../../../../../components/admin/reports/documents/DocumentsOverviewTable";
import { DocumentsReportLayout } from "../../../../../components/admin/reports/documents/DocumentsReportLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { exportToCsv } from "../../../../../utils/utils";
import { DocumentsOverviewFilters } from "../../../../../components/admin/reports/documents/DocumentsOverviewFilters";
import { notify } from "../../../../../components/Notification";

function DocumentsOverview() {
  const [filters, setFilters] = useState<Documents_Filter>();

  const [overviewExportQuery, { loading: overviewExportLoading }] =
    useGetOverviewDocumentsReportLazyQuery();

  const exportReport = async () => {
    const BATCH_SIZE = 500;
    let allDataToExport: any[] = [];
    let offset = 0;
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        const reportData = await overviewExportQuery({
          variables: {
            filter: filters,
            limit: BATCH_SIZE,
            offset: offset,
          },
        });

        const dataBatch = reportData.data?.documents.map((doc) => {
          const totalAssignments = doc.directus_users?.length;
          const read = doc.directus_users?.filter((docu) => docu?.read).length;
          const unread = doc.directus_users?.filter(
            (docu) => !docu?.read
          ).length;

          return {
            name: doc.title,
            "Average read": `${read}/${totalAssignments} (${
              Math.round((read! * 100) / totalAssignments!) || 0
            }%)`,
            "Average unread": `${unread}/${totalAssignments} (${
              Math.round((unread! * 100) / totalAssignments!) || 0
            }%)`,
            Expired: doc.directus_users?.length
              ? doc.directus_users.reduce(
                  (prev, curr) =>
                    curr?.expires_on &&
                    new Date(curr?.expires_on).getTime() <= new Date().getTime()
                      ? prev + 1
                      : prev,
                  0
                )
              : 0,
          };
        }) as any[];

        allDataToExport = [...allDataToExport, ...dataBatch];

        hasMoreData = dataBatch.length === BATCH_SIZE;
        offset += BATCH_SIZE;
      }

      exportToCsv<any[]>("overview-documents-reports", allDataToExport);
    } catch (error) {
      notify({ type: "error", description: "Failed to export report" });
    }
  };

  return (
    <DocumentsReportLayout>
      <div className="flex flex-col justify-between align-middle md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">
            Documents Overview Reports
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
        <DocumentsOverviewFilters setFilters={setFilters} />
        <h2 className="my-4 text-xl font-semibold">Analytics</h2>
        <AnalyticsDocumentsOverviewReports filters={filters} />
        <h2 className="noprint my-4 text-xl font-semibold">List</h2>
        <DocumentsOverviewTable filter={filters} />
      </div>
    </DocumentsReportLayout>
  );
}

export default withAuth(DocumentsOverview, AdminGroup);
