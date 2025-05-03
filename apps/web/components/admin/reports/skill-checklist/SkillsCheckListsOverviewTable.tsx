import { ColumnDef } from "@tanstack/react-table";
import {
  OverviewSkillsChecklistsFragment,
  Sc_Definitions_Filter,
  useGetOverviewSkillsChecklistsReportQuery,
} from "api";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { CompetencyState } from "types";

interface Props {
  filter?: Sc_Definitions_Filter;
}
const PAGE_SIZE = 10;

export default function SkillsCheckListsOverviewTable({ filter = {} }: Props) {
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
    })
  );

  const overviewReport = useGetOverviewSkillsChecklistsReportQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      filter,
    },
    skip: !Object.keys(filter).length,
  });

  const totalRecords = useMemo(
    () => overviewReport.data?.sc_definitions_aggregated?.[0]?.count?.id || 0,
    [overviewReport]
  );

  const columns: ColumnDef<OverviewSkillsChecklistsFragment>[] = [
    {
      header: "Title",
      accessorKey: "title",
      enableSorting: true,
      cell: ({ row }) => row.original.title,
    },
    {
      header: "Agency",
      accessorKey: "agency",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.agency?.length
          ? row.original.agency.map((a) => a?.agencies_id?.name).join(", ")
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
      header: "Completed",
      accessorKey: "completed",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          {row.original.directus_users?.length
            ? row.original.directus_users.reduce(
                (prev, curr) =>
                  curr?.status === CompetencyState.COMPLETED ? prev + 1 : 0,
                0
              )
            : 0}
        </>
      ),
    },
    {
      header: "Expired",
      accessorKey: "expires_on",
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
      header: "completion status",
      accessorKey: "completion",
      enableSorting: true,
      cell: ({ row }) => {
        const total = row.original.directus_users?.length;
        const completed = row.original.directus_users?.filter(
          (sc) => sc?.status === CompetencyState.COMPLETED
        ).length;

        return (
          <>{`${completed}/${total} (${
            Math.round((completed! * 100) / total!) || 0
          }%)`}</>
        );
      },
    },
  ];

  const reportTable = useAdminTable<OverviewSkillsChecklistsFragment>({
    columns,
    data: overviewReport.data?.sc_definitions || [],
    pageCount: Math.ceil(totalRecords / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: overviewReport.loading,
    totalItems: totalRecords,
    onRowClick: (row) => {
      router.push(`/admin/skills-checklists/${row.id}`);
    },
  });

  return <reportTable.Component />;
}
