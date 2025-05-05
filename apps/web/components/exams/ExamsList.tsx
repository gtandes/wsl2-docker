import React, { useState } from "react";
import { useAdminTable } from "../../hooks/useAdminTable";
import {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { formatDateTimeSplitted } from "../../utils/format";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal, faBarChart } from "@fortawesome/pro-regular-svg-icons";
import { UserExamReportsFragment } from "api";
import { CompetencyState, CompetencyType, ExpirationType } from "types";
import { goToUserDetails } from "../admin/reports/user-and-groups/UserDetailsReport";
import { first } from "lodash";
import { Frequency } from "../utils/Frequency";
import { showCompetencyResultLink } from "../../utils/utils";
import { Competencies } from "../../types/global";
import { useAgency } from "../../hooks/useAgency";
import { Spinner } from "../Spinner";

export const getDateTimeRow = (datetime: string | Date) => {
  const { date, time } = formatDateTimeSplitted(datetime as string);
  return (
    <div>
      {date} <br />
      <span className="text-gray-500">{time}</span>
    </div>
  );
};

const getStatusRow = (status: string) => {
  let color: string;
  switch (status) {
    case CompetencyState.COMPLETED:
      color = "green";
      break;
    case CompetencyState.FAILED:
    case CompetencyState.INVALID:
    case CompetencyState.DUE_DATE_EXPIRED:
      color = "red";
      break;
    case CompetencyState.IN_PROGRESS:
    case CompetencyState.IN_REVIEW:
      color = "blue";
      break;
    case CompetencyState.EXPIRED:
      color = "gray";
      break;
    case CompetencyState.NOT_STARTED:
      color = "yellow";
      break;
    default:
      color = "gray";
  }
  return (
    <div
      className={`rounded-md bg-${color}-100 text-sm font-medium text-${color}-700 inline-block p-1`}
    >
      {status.replaceAll("_", " ")}
    </div>
  );
};

const haveCertificate = (status: CompetencyState) =>
  status === CompetencyState.COMPLETED;
const canSeeDetails = (status: CompetencyState) =>
  status === CompetencyState.COMPLETED || status === CompetencyState.FAILED;

const tableColumns: ColumnDef<UserExamReportsFragment>[] = [
  {
    header: "Clinician",
    accessorKey: "directus.users_id.id",
    accessorFn: (f) => f.directus_users_id?.id,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="flex items-center justify-between gap-2">
        <div
          onClick={() => goToUserDetails(row.original.directus_users_id?.id!)}
          className="cursor-pointer"
        >
          <span className="font-semibold">
            {row.original?.directus_users_id?.first_name +
              " " +
              row.original?.directus_users_id?.last_name}
          </span>
          <br />
          <span className="text-sm text-gray-400">
            {row.original?.directus_users_id?.email}
          </span>
        </div>
        <Frequency
          expiration={row.original?.expiration_type as ExpirationType}
        />
      </div>
    ),
  },
  {
    header: "Title",
    accessorKey: "exams.id.title",
    accessorFn: (f) => f.exams_id?.title,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="w-[200px] whitespace-pre-wrap">
        {row.original?.exams_id?.title}
      </div>
    ),
  },
  {
    header: "Agency",
    accessorKey: "agency",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="w-[200px] whitespace-pre-wrap">
        {row.original.agency?.name || ""}
      </div>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="-ml-5 w-[110px] text-center">
        {getStatusRow(row.original?.status || "")}
      </div>
    ),
  },
  {
    header: "CEU",
    cell: ({ row }) => (
      <div className="-ml-10 w-[110px] text-center">
        {row.original.status === CompetencyState.COMPLETED &&
          (first(row.original?.exam_versions_id?.contact_hour) ||
            row.original?.exams_id?.import_ceu ||
            "")}
      </div>
    ),
  },
  {
    header: "Score",
    accessorKey: "score",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="w-[45px] text-center font-bold">
        {row.original?.status !== CompetencyState.IN_REVIEW &&
        row.original?.status !== CompetencyState.INVALID &&
        row.original.score
          ? row.original.score + "%"
          : ""}
      </div>
    ),
  },
  {
    header: "Attempts",
    enableSorting: true,
    accessorKey: "attempts_used",
    cell: ({ row }) => (
      <div className="w-[60px] text-center">
        {row.original.attempts_used}/{row.original.allowed_attempts}
      </div>
    ),
  },
  {
    header: "Started",
    enableSorting: true,
    accessorKey: "started_on",
    cell: ({ row }) => getDateTimeRow(row.original.started_on || ""),
  },
  {
    header: "Completed",
    enableSorting: true,
    accessorKey: "finished_on",
    cell: ({ row }) =>
      getDateTimeRow(
        (row.original?.status !== CompetencyState.IN_REVIEW &&
          row.original.finished_on) ||
          ""
      ),
  },
  {
    header: "Expires",
    enableSorting: true,
    accessorKey: "expires_on",
    cell: ({ row }) => getDateTimeRow(row.original.expires_on || ""),
  },
  {
    header: " ",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        {haveCertificate(row.original.status as CompetencyState) && (
          <button
            type="button"
            onClick={() =>
              window.open(
                row.original?.import_cert_url ||
                  `/admin/dashboard/reports/${row.original?.directus_users_id?.id}/${row.original?.id}/certificate`,
                "_blank"
              )
            }
            className="rounded-lg bg-green-200 px-2 py-1 text-green-800 transition-all hover:bg-green-300"
          >
            <FontAwesomeIcon icon={faMedal} />
          </button>
        )}
        {canSeeDetails(row.original.status as CompetencyState) && (
          <button
            type="button"
            onClick={() =>
              window.open(
                showCompetencyResultLink(
                  CompetencyType.EXAM,
                  row.original as Competencies,
                  false,
                  row.original?.directus_users_id?.id!
                ),
                "_blank"
              )
            }
            className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
          >
            <FontAwesomeIcon icon={faBarChart} />
          </button>
        )}
      </div>
    ),
  },
];

interface Props {
  examsListData: UserExamReportsFragment[];
  totalItems: number;
  isLoading: boolean;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
  page: PaginationState;
  pageCount: number;
  setPage: OnChangeFn<PaginationState>;
  pageSize: number;
}

export const ExamsList: React.FC<Props> = ({
  examsListData,
  totalItems,
  isLoading,
  sort,
  setSort,
  page,
  pageCount,
  setPage,
}: Props) => {
  const { loaded } = useAgency();
  const [rowSelection, setRowSelection] = useState({});

  if (!loaded) {
    <Spinner />;
  }

  const examsList = useAdminTable<UserExamReportsFragment>({
    columns: tableColumns,
    data: examsListData,
    pageCount: pageCount,
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: isLoading,
    totalItems: totalItems,
    rowSelection: [rowSelection, setRowSelection],
    spinnerClasses: "h-24 w-24 my-20 border-8",
  });

  return <examsList.Component />;
};
