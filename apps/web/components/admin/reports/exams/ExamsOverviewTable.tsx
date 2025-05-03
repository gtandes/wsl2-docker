import { ColumnDef } from "@tanstack/react-table";
import {
  Exams_Filter,
  Junction_Directus_Users_Exams,
  OverviewExamsFragment,
  useGetOverviewExamsReportQuery,
} from "api";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { averageScore } from "../../../../utils/utils";
import { CompetencyState } from "types";
import { useAgency } from "../../../../hooks/useAgency";
import { Spinner } from "../../../Spinner";

interface Props {
  filter?: Exams_Filter;
}
const PAGE_SIZE = 10;
export default function ExamsOverviewTable({ filter = {} }: Props) {
  const router = useRouter();
  const { currentAgency, loaded } = useAgency();
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

  const { data, loading } = useGetOverviewExamsReportQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      filter,
    },
    fetchPolicy: "cache-and-network",
    skip: !loaded,
  });

  const totalRecords = useMemo(
    () => data?.exams_aggregated[0]?.countDistinct?.id || 0,
    [data]
  );

  const counters = (
    data: Junction_Directus_Users_Exams[],
    status: CompetencyState[]
  ): number => {
    let total = 0;
    if (data.length) {
      total = data
        .filter((it) => status?.includes(it.status as CompetencyState))
        .reduce((sum) => (sum = sum + 1), 0);
    }

    return total;
  };

  const columns: ColumnDef<OverviewExamsFragment>[] = [
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
        row.original.agencies?.length
          ? row.original.agencies.map((a) => a?.agencies_id?.name).join(", ")
          : "All",
    },
    {
      header: "Not started",
      accessorKey: "not_started",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.NOT_STARTED]
          )}
        </>
      ),
    },
    {
      header: "In progress",
      accessorKey: "in_progress",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.IN_PROGRESS]
          )}
        </>
      ),
    },
    {
      header: "Passed",
      accessorKey: "passed",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.COMPLETED]
          )}
        </>
      ),
    },
    {
      header: "Proctoring Review",
      accessorKey: "in_review",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.IN_REVIEW]
          )}
        </>
      ),
    },
    {
      header: "Invalid",
      accessorKey: "invalid",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.INVALID]
          )}
        </>
      ),
    },
    {
      header: "Failed",
      accessorKey: "failed",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.FAILED]
          )}
        </>
      ),
    },
    {
      header: "Expired",
      accessorKey: "expired",
      enableSorting: true,
      cell: ({ row }) => (
        <>
          {counters(
            row.original.directus_users as Junction_Directus_Users_Exams[],
            [CompetencyState.EXPIRED, CompetencyState.DUE_DATE_EXPIRED]
          )}
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
          (ex) =>
            ex?.status === CompetencyState.COMPLETED ||
            ex?.status === CompetencyState.FAILED
        ).length;

        return (
          <>{`${completed}/${total} (${
            Math.round((completed! * 100) / total!) || 0
          }%)`}</>
        );
      },
    },
    {
      header: "average attempts",
      accessorKey: "attempts",
      enableSorting: true,
      cell: ({ row }) => {
        const totalClinicians = row.original.directus_users?.length || 0;
        const totalAttemps =
          totalClinicians *
          (row.original.exam_versions?.[0]?.allowed_attempts || 0);
        const totalAttempsUsed = row.original.directus_users?.reduce(
          (prev, curr) => prev + curr?.attempts_used! || 0,
          0
        );

        return <>{`${totalAttempsUsed}/${totalAttemps}`}</>;
      },
    },
    {
      header: "average score",
      accessorKey: "score",
      enableSorting: true,
      cell: ({ row }) => (
        <>{`${averageScore(
          row.original.directus_users?.length || 0,
          row.original.directus_users
            ?.filter(
              (eu) =>
                ![CompetencyState.IN_REVIEW, CompetencyState.INVALID].includes(
                  eu?.status as CompetencyState
                )
            )
            .flatMap((eu) => ({ score: eu?.score }))
        ).toFixed(1)}%`}</>
      ),
    },
  ];

  const filteredExams = useMemo(() => {
    if (!data?.exams || !currentAgency?.id) return [];

    return data.exams.map((exam) => ({
      ...exam,
      directus_users:
        exam.directus_users?.filter((user) => {
          return user?.agency?.id === currentAgency?.id;
        }) || [],
    }));
  }, [data?.exams, currentAgency?.id]);

  const shownData =
    currentAgency?.id === undefined ? data?.exams : filteredExams;

  const reportTable = useAdminTable<OverviewExamsFragment>({
    columns,
    data: shownData ?? [],
    pageCount: Math.ceil(totalRecords / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loading,
    totalItems: totalRecords,
    onRowClick: (row) => {
      router.push(`/admin/exams/detail/${row.id}`);
    },
  });

  if (loading || !loaded) {
    return <Spinner />;
  }

  return <reportTable.Component />;
}
