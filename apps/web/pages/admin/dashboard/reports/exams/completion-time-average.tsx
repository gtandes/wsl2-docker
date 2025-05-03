import React, { useMemo, useState, useEffect } from "react";
import { withAuth } from "../../../../../hooks/withAuth";
import { useAdminTable } from "../../../../../hooks/useAdminTable";
import ReportLayout from "../../../../../components/admin/reports/ReportLayout";
import { ExamReportLayout } from "../../../../../components/admin/reports/exams/ExamReportLayout";
import { HSHAdminOnly } from "../../../../../types/roles";
import { query } from "../../../../../utils/utils";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";

const PAGE_SIZE = 10;

const ExamCompletionTimeAverageReport: React.FC = () => {
  const [data, setData] = useState<Record<string, string>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, { pageIndex: 0, pageSize: PAGE_SIZE })
  );

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [{ id: "title", desc: false }])
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await query(
          "/cms/reports/exam-average-time-spent",
          "GET"
        );
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const responseData = await response.json();
        setData(responseData.data);
      } catch (error) {
        console.error("Error fetching exam average time data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const paginatedReportData = useMemo(() => {
    if (!data?.length) return [];

    const startIndex = page.pageIndex * PAGE_SIZE;
    return data.slice(startIndex, startIndex + PAGE_SIZE);
  }, [data, page.pageIndex]);

  const convertSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    const hourText = hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : "";
    const minuteText =
      minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""}` : "";
    const secondText = `${seconds.toFixed(0)} second${
      seconds === 1 ? "" : "s"
    }`;

    return [hourText, minuteText, secondText].filter(Boolean).join(", ");
  };

  const adminTable = useAdminTable({
    columns: [
      {
        header: "Title",
        accessorKey: "title",
        id: "title",
        enableSorting: false,
      },
      {
        header: "Total Take Time",
        accessorKey: "total_time",
        id: "total_time",
        enableSorting: false,
        cell: ({ row }) => convertSeconds(Number(row.original.total_time)),
      },
      {
        header: "Total Attempts",
        accessorKey: "total_attempts",
        id: "total_attempts",
        enableSorting: false,
      },
      {
        header: "Average Take Time",
        accessorKey: "average_time",
        id: "average_time",
        enableSorting: false,
        cell: ({ row }) => convertSeconds(Number(row.original.average_time)),
      },
    ],
    data: paginatedReportData,
    pageCount: Math.ceil((data?.length ?? 0) / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: isLoading,
    totalItems: data?.length ?? 0,
  });

  return (
    <ReportLayout>
      <ExamReportLayout>
        <h1 className="mb-3 text-xl font-semibold">Completion Time Average</h1>
        <adminTable.Component />
      </ExamReportLayout>
    </ReportLayout>
  );
};

export default withAuth(ExamCompletionTimeAverageReport, HSHAdminOnly);
