import { ColumnDef } from "@tanstack/react-table";
import {
  Junction_Directus_Users_Documents_Filter,
  useGetAllDocumentsAssignmentsQuery,
  useGetDocumentsAssignmentsLazyQuery,
  DocumentsAssigmentsFragment,
} from "api";
import { format } from "date-fns";
import Link from "next/link";
import { useState, useMemo } from "react";
import { CompetencyState } from "types";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import AnalyticsDocumentsReports from "../../../../../components/admin/reports/documents/AnalyticsDocumentsReports";
import { DocumentsReportLayout } from "../../../../../components/admin/reports/documents/DocumentsReportLayout";
import { useAdminTable } from "../../../../../hooks/useAdminTable";

import { withAuth } from "../../../../../hooks/withAuth";
import { DocumentExport } from "../../../../../types/reports";
import { AdminGroup } from "../../../../../types/roles";
import { exportToCsv } from "../../../../../utils/utils";
import { formatDateTimeSplitted } from "../../../../../utils/format";
import { DocumentsDetailsFilters } from "../../../../../components/admin/reports/documents/DocumentsDetailsFilters";
import { notify } from "../../../../../components/Notification";

const PAGE_SIZE = 10;

const getDateRow = (datetime: string | Date) => {
  const { date } = formatDateTimeSplitted(datetime as string);
  return <div>{date}</div>;
};

function DocumentsDetails() {
  const [filters, setFilters] =
    useState<Junction_Directus_Users_Documents_Filter>({});

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "assigned_on",
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

  const documentsAssignmentsQuery = useGetAllDocumentsAssignmentsQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
      filter: filters,
    },
    skip: !Object.keys(filters).length,
  });

  const [assigmentsQuery, { loading: assigmentsLoading }] =
    useGetDocumentsAssignmentsLazyQuery();

  const totalAssignments = useMemo(
    () =>
      documentsAssignmentsQuery.data
        ?.junction_directus_users_documents_aggregated[0].count?.id || 0,
    [documentsAssignmentsQuery]
  );
  const exportReport = async () => {
    const BATCH_SIZE = 500;
    let allDataToExport: DocumentExport[] = [];
    let offset = 0;
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        const reportData = await assigmentsQuery({
          variables: {
            filter: filters,
            limit: BATCH_SIZE,
            offset: offset,
          },
        });

        const dataBatch =
          reportData.data?.junction_directus_users_documents.map((jd) => ({
            clinician: `${jd.directus_users_id?.first_name} ${jd.directus_users_id?.last_name}`,
            title: jd.documents_id?.title,
            assignmentStatus: jd.documents_id?.status,
            readDate: jd.read
              ? format(new Date(jd.read), "LL LLL yyyy")
              : "Unread",
            expirationDate: jd.expires_on
              ? format(new Date(jd.expires_on), "LL LLL yyyy hh:mm aa")
              : "N/A",
          })) as DocumentExport[];

        allDataToExport = [...allDataToExport, ...dataBatch];

        hasMoreData = dataBatch.length === BATCH_SIZE;
        offset += BATCH_SIZE;
      }

      exportToCsv<DocumentExport>("document-reports", allDataToExport);
    } catch (error) {
      notify({ type: "error", description: "Failed to export report" });
    }
  };

  const columns: ColumnDef<DocumentsAssigmentsFragment>[] = useMemo(() => {
    return [
      {
        header: "Clinician",
        accessorKey: "directus.users_id.first_name",
        accessorFn: (f) => f.directus_users_id?.first_name,
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/admin/dashboard/reports/${row.original.directus_users_id?.id}/user-details`}
          >
            <p
              className="w-[200px] overflow-hidden overflow-ellipsis whitespace-nowrap"
              title={`${row.original.directus_users_id?.first_name} ${row.original.directus_users_id?.last_name}`}
            >
              {`${row.original.directus_users_id?.first_name} ${row.original.directus_users_id?.last_name}`}
            </p>
          </Link>
        ),
      },
      {
        header: "Title",
        accessorKey: "documents.id.title",
        accessorFn: (f) => f.documents_id?.title,
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/admin/documents/detail/${row.original.documents_id?.id}`}
          >
            <p
              className="w-[200px] overflow-hidden overflow-ellipsis whitespace-nowrap"
              title={row.original.documents_id?.title as string}
            >
              {row.original.documents_id?.title}
            </p>
          </Link>
        ),
      },
      {
        header: "Agency",
        accessorKey: "agency.name",
        enableSorting: true,
        cell: ({ row }) => row.original.agency?.name,
      },
      {
        header: "Status",
        accessorKey: "documents.id.id",
        accessorFn: (f) => f.documents_id?.id,
        enableSorting: true,
        cell: ({ row }) => {
          let status: string = row.original.read ? "Read" : "Unread";
          if (
            new Date(row.original.expires_on!).getTime() <= new Date().getTime()
          ) {
            status = "Expired";
          }

          if (row.original.status === CompetencyState.DUE_DATE_EXPIRED) {
            status = "Due Date Expired";
          }
          return <div className="capitalize">{status}</div>;
        },
      },

      {
        header: "Read On",
        accessorKey: "read",
        enableSorting: true,
        cell: ({ row }) =>
          row.original.read ? getDateRow(row.original.read) : "Not read",
      },
      {
        header: "Expires on",
        accessorKey: "expires_on",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="capitalize">
            {format(
              new Date(row.original?.expires_on!),
              "LL LLL yyyy hh:mm aa"
            )}
          </div>
        ),
      },
    ];
  }, []);

  const reportTable = useAdminTable<DocumentsAssigmentsFragment>({
    columns,
    data:
      documentsAssignmentsQuery.data?.junction_directus_users_documents || [],
    pageCount: Math.ceil(totalAssignments / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: documentsAssignmentsQuery.loading,
    totalItems: totalAssignments,
  });

  return (
    <DocumentsReportLayout>
      <div className="mb-4 flex flex-col justify-between md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">
            Documents Detail Reports
          </h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="noprint">
          <Button
            label="Export CSV/report"
            loading={assigmentsLoading}
            variant="solid"
            disabled={totalAssignments === 0}
            onClick={exportReport}
          />
        </div>
      </div>
      <div className="mb-8 ">
        <DocumentsDetailsFilters setFilters={setFilters} />
        <h2 className="my-4 text-xl font-semibold">Analytics</h2>
        <AnalyticsDocumentsReports filters={filters} />
        <h2 className="my-4 text-xl font-semibold">List</h2>
        <reportTable.Component />
      </div>
    </DocumentsReportLayout>
  );
}

export default withAuth(DocumentsDetails, AdminGroup);
