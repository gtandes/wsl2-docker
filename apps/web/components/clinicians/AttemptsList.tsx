import React, { useState } from "react";
import { useSimpleTable } from "../../hooks/useSimpleTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/pro-solid-svg-icons";
import { formatDateTimeSplitted } from "../../utils/format";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { Row } from "@tanstack/react-table";

const getStatusRow = (status: string) => {
  let color: string;
  switch (status) {
    case "Passed":
      color = "green";
      break;
    case "Failed":
      color = "red";
      break;
    case "Paused":
      color = "yellow";
      break;
    default:
      color = "gray";
  }
  return (
    <span
      className={`m-auto mt-2 flex max-h-8 w-20 justify-center rounded-md bg-${color}-100 p-1 text-sm font-medium text-${color}-700`}
    >
      {status}
    </span>
  );
};

const getDateTimeFormated = (datetime: string) => {
  const { date, time } = formatDateTimeSplitted(datetime);
  return (
    <div>
      {date} <br />
      <span className="text-gray-500">{time}</span>
    </div>
  );
};

type AttemptType = {
  attempt: number;
  total: number;
  correct: number;
  score: number;
  status: string;
  timeTaken: string;
  started: string;
  completed: string;
};

const attemptsData = [
  {
    attempt: 1,
    total: 3,
    correct: 2,
    score: 90,
    status: "Passed",
    timeTaken: "00:00:23",
    started: "2023-06-29T20:48:21.616Z",
    completed: "2023-06-29T20:48:21.616Z",
  },
  {
    attempt: 1,
    total: 3,
    correct: 2,
    score: 90,
    status: "Failed",
    timeTaken: "00:00:23",
    started: "2023-06-29T20:48:21.616Z",
    completed: "2023-06-29T20:48:21.616Z",
  },
];

const tableColumns = [
  {
    header: "Exam Preview",
    accessorKey: "attempt",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <p className="w-[150px] gap-2">
        <FontAwesomeIcon icon={faEye} className="mr-2" />
        Attempt {row.original.attempt}/{row.original.total}
      </p>
    ),
  },
  {
    header: "Score",
    accessorKey: "score",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <p className="w-[50px] text-center">{row.original.score}%</p>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <p className="-ml-2 w-[70px]">{getStatusRow(row.original.status)}</p>
    ),
  },
  {
    header: "Correct Answers",
    accessorKey: "correct",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <p className="ml-2 w-[100px] text-center">
        {row.original.correct}/{row.original.total}
      </p>
    ),
  },
  {
    header: "Time Taken",
    accesorKey: "timeTaken",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <p className="ml-3 w-[80px]">{row.original.timeTaken}</p>
    ),
  },
  {
    header: "Started",
    accesorKey: "started",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <div className="w-[100px]">
        {getDateTimeFormated(row.original.started)}
      </div>
    ),
  },
  {
    header: "Completed",
    accesorKey: "completed",
    enableSorting: true,
    cell: ({ row }: { row: Row<AttemptType> }) => (
      <div className="w-[100px]">
        {getDateTimeFormated(row.original.completed)}
      </div>
    ),
  },
];

interface Props {}

export const AttemptsList: React.FC<Props> = ({}: Props) => {
  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "exanAttempts",
        desc: true,
      },
    ])
  );
  const [rowSelection, setRowSelection] = useState({});

  const attemptsList = useSimpleTable<AttemptType>({
    columns: tableColumns,
    data: attemptsData,

    sort: [sort, setSort],
    loading: false,
    rowSelection: [rowSelection, setRowSelection],
  });

  return <attemptsList.Component />;
};
