import { ColumnDef } from "@tanstack/react-table";
import {
  Modules_Definition_Filter,
  OverviewModulesFragment,
  useGetOverviewModulesReportQuery,
} from "api";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { averageScore } from "../../../../utils/utils";
import { CompetencyState } from "types";
import { differenceInMinutes } from "date-fns";

interface Props {
  filter?: Modules_Definition_Filter;
}
const PAGE_SIZE = 10;

export default function ModulesOverviewTable({ filter = {} }: Props) {
  const router = useRouter();
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
    }),
    { removeDefaultsFromUrl: true }
  );

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [filter, setPage]);

  const overviewReport = useGetOverviewModulesReportQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      filter,
    },
    skip: !Object.keys(filter).length,
  });

  const totalRecords = useMemo(
    () => overviewReport.data?.modules_definition_aggregated[0].count?.id || 0,
    [overviewReport]
  );

  const columns: ColumnDef<OverviewModulesFragment>[] = [
    {
      header: "Title",
      accessorKey: "title",
      enableSorting: true,
      cell: ({ row }) => row.original.title,
    },
    {
      header: "Agency",
      accessorKey: "agency",
      enableSorting: true,
      cell: ({ row }) =>
        row.original.agencies?.length
          ? row.original.agencies?.map((a) => a?.agencies_id?.name).join(", ")
          : "All",
    },
    {
      header: "Not started",
      accessorKey: "not_started",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {row.original.directus_users?.length
            ? row.original.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.PENDING ? prev + 1 : 0,
                0
              )
            : 0}
        </>
      ),
    },
    {
      header: "In progress",
      accessorKey: "in_progress",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {row.original.directus_users?.length
            ? row.original.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.STARTED && curr.approved
                    ? prev + 1
                    : 0,
                0
              )
            : 0}
        </>
      ),
    },
    {
      header: "Passed",
      accessorKey: "passed",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          {row.original.directus_users?.length
            ? row.original.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.FINISHED && curr?.approved
                    ? prev + 1
                    : 0,
                0
              )
            : 0}
        </>
      ),
    },
    {
      header: "Failed",
      accessorKey: "failed",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          {row.original.directus_users?.length
            ? row.original.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.FINISHED && !curr?.approved
                    ? prev + 1
                    : 0,
                0
              )
            : 0}
        </>
      ),
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
                  curr?.due_date &&
                  new Date(curr?.due_date).getTime() <= new Date().getTime()
                    ? prev + 1
                    : 0,
                0
              )
            : 0}
        </>
      ),
    },
    {
      header: "completion status",
      accessorKey: "completion",
      enableSorting: true,
      cell: ({ row }) => {
        const total = row.original.directus_users?.length;
        const completed = row.original.directus_users?.filter(
          (mo) => mo?.status === CompetencyState.FINISHED
        ).length;

        return (
          <>{`${completed}/${total} (${
            Math.round((completed! * 100) / total!) || 0
          }%)`}</>
        );
      },
    },
    {
      header: "Average Attempts",
      accessorKey: "attempts",
      enableSorting: false,
      cell: ({ row }) => {
        let totalAttemptsUsed = 0;
        const totalAssignments = row.original.directus_users?.length || 0;

        for (const m of row.original.directus_users || []) {
          totalAttemptsUsed += m?.attempts_used || 0;
        }
        const avg = totalAttemptsUsed / totalAssignments;

        return <>{`${isNaN(avg) ? "0.00" : avg.toFixed(2)}`}</>;
      },
    },
    {
      header: "average score",
      accessorKey: "score",
      enableSorting: true,
      cell: ({ row }) => (
        <>{`${averageScore(
          row.original.directus_users?.length || 0,
          row.original.directus_users?.flatMap((eu) => ({ score: eu?.score }))
        ).toFixed(1)}%`}</>
      ),
    },
    {
      header: "Average Duration",
      accessorKey: "duration",
      enableSorting: false,
      cell: ({ row }) => {
        let totalDuration = 0;
        const totalAssignments = row.original.directus_users?.length || 0;

        for (const m of row.original.directus_users || []) {
          if (!m?.started_on || !m?.finished_on) continue;

          const startDate = new Date(m?.started_on);
          const endDate = new Date(m?.finished_on);

          const duration = differenceInMinutes(endDate, startDate, {
            roundingMethod: "ceil",
          });

          totalDuration += duration;
        }

        const avg = totalDuration / totalAssignments;

        return <>{`${isNaN(avg) ? "0.00" : avg.toFixed(2)}`} min</>;
      },
    },
  ];

  const reportTable = useAdminTable<OverviewModulesFragment>({
    columns,
    data: overviewReport.data?.modules_definition || [],
    pageCount: Math.ceil(totalRecords / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: overviewReport.loading,
    totalItems: totalRecords,
    onRowClick: (row) => {
      router.push(`/admin/modules/${row.id}`);
    },
  });

  return <reportTable.Component />;
}
