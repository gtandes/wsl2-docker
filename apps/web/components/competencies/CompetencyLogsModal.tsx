/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from "react";
import { useAdminTable } from "../../hooks/useAdminTable";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import router from "next/router";
import { CompetencyType } from "types";
import { query } from "../../utils/utils";

interface Log {
  description: string;
  created_on: string;
  initiator_full_name: string;
}

const formatDate = (date: Date | null | undefined) => {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date(date));
};

interface Props {
  assignmentId: number | string;
  competencyType: CompetencyType | undefined;
}

export default function AttemptHistoryModal({
  assignmentId,
  competencyType,
}: Props) {
  const userId = router.query.user_id as string;
  const PAGE_SIZE = 10;

  const [sort, setSort] = useQueryParam(
    "logs-sort",
    withDefault(JsonParam, [{ id: "created_on", desc: false }])
  );
  const [page, setPage] = useQueryParam(
    "logs-page",
    withDefault(JsonParam, { pageIndex: 0, pageSize: PAGE_SIZE })
  );

  const { pageIndex, pageSize } = page;

  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [totalItems, setTotalItems] = useState<number>(0);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLogsLoading(true);
        const res = await query(
          `/cms/logs/?assignmentId=${assignmentId}&type=${competencyType}&userId=${userId}`,
          "GET"
        );

        if (!res.ok) {
          throw new Error("Network response was not ok");
        }

        const data: Log[] = await res.json();
        setTotalItems(data.length);

        const start = pageIndex * pageSize;
        const end = start + pageSize;
        setLogs(data.slice(start, end));
      } catch (error) {
        console.error("Error fetching logs:", error);
        setLogs([]);
      } finally {
        setLogsLoading(false);
      }
    };

    if (assignmentId) {
      fetchLogs();
    }
  }, [assignmentId, competencyType, userId, pageIndex, pageSize]);

  const adminTable = useAdminTable<Log>({
    columns: [
      {
        header: "Description",
        accessorKey: "description",
      },
      {
        header: "Date Logged",
        accessorKey: "created_on",
        cell: ({ row }: { row: { original: Log } }) =>
          formatDate(new Date(row.original.created_on)),
      },
      {
        header: "By User",
        accessorKey: "initiator_full_name",
      },
    ],
    data: logs,
    pageCount: Math.ceil(totalItems / pageSize),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: logsLoading,
    totalItems,
  });

  return (
    <div className="flex w-full flex-col">
      <adminTable.Component />
    </div>
  );
}
