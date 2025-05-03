import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Documents_Filter,
  OverviewPoliciesFragment,
  useGetOverviewPoliciesReportQuery,
} from "api";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useAdminTable } from "../../../../hooks/useAdminTable";

interface Props {
  filter?: Documents_Filter;
}
const PAGE_SIZE = 10;

export default function PoliciesOverviewTable({ filter = {} }: Props) {
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

  const overviewReport = useGetOverviewPoliciesReportQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      filter,
    },
    skip: !Object.keys(filter).length,
  });

  const totalRecords = useMemo(
    () => overviewReport.data?.policies_aggregated?.[0]?.count?.id || 0,
    [overviewReport]
  );

  const columns: ColumnDef<OverviewPoliciesFragment>[] = useMemo(() => {
    return [
      {
        header: "Title",
        accessorKey: "title",
        enableSorting: true,
        cell: ({ row }) => (
          <a href={`/cms/assets/${row.original.document?.id}`} target="_blank">
            {row.original.name}
          </a>
        ),
      },
      {
        header: "Agency",
        accessorKey: "agency",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.agencies?.length
            ? row.original.agencies.map((a) => a?.agencies_id?.name).join(", ")
            : "All",
      },
      {
        header: "Average unread",
        accessorKey: "unread",
        enableSorting: true,
        cell: ({ row }) => {
          const total = row.original.directus_users?.length;
          const unread = row.original.directus_users?.filter(
            (doc) => !doc?.read
          ).length;
          return (
            <>{`${unread}/${total} (${
              Math.round((unread! * 100) / total!) || 0
            }%)`}</>
          );
        },
      },
      {
        header: "Average read",
        accessorKey: "read",
        enableSorting: true,
        cell: ({ row }) => {
          const total = row.original.directus_users?.length;
          const read = row.original.directus_users?.filter(
            (doc) => doc?.read
          ).length;
          return (
            <>{`${read}/${total} (${
              Math.round((read! * 100) / total!) || 0
            }%)`}</>
          );
        },
      },
      {
        header: "Average signed",
        accessorKey: "signed",
        enableSorting: true,
        cell: ({ row }) => {
          const total = row.original.directus_users?.length;
          const signed = row.original.directus_users?.filter(
            (doc) => doc?.signed_on
          ).length;
          return (
            <>{`${signed}/${total} (${
              Math.round((signed! * 100) / total!) || 0
            }%)`}</>
          );
        },
      },
      {
        header: "Expired",
        accessorKey: "expired",
        enableSorting: true,
        cell: ({ row }) => (
          <>
            {row.original.directus_users?.length
              ? row.original.directus_users.reduce(
                  (prev, curr) =>
                    curr?.expires_on &&
                    new Date(curr?.expires_on).getTime() <= new Date().getTime()
                      ? prev + 1
                      : 0,
                  0
                )
              : 0}
          </>
        ),
      },
      {
        header: "Completion Status",
        accessorKey: "completion",
        enableSorting: false,
        cell: ({ row }) => {
          const total = row.original.directus_users?.length;
          const signed =
            row.original.directus_users?.filter((doc) => !!doc?.signed_on)
              .length || 0;
          return (
            <>{`${signed}/${total || 0} (${
              Math.round((signed * 100) / (total || 1)) || 0
            }%)`}</>
          );
        },
      },
    ];
  }, []);

  const reportTable = useAdminTable<OverviewPoliciesFragment>({
    columns,
    data: overviewReport.data?.policies || [],
    pageCount: Math.ceil(totalRecords / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: overviewReport.loading,
    totalItems: totalRecords,
  });

  return <reportTable.Component />;
}
