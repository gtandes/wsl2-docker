import { ModuleAssignmentFragment } from "api";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import { useState } from "react";
import {
  PaginationState,
  OnChangeFn,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import { formatDateTimeSplitted } from "../../../../utils/format";
import { faMedal } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CompetencyState, ExpirationType } from "types";
import { goToUserDetails } from "../user-and-groups/UserDetailsReport";
import { openExternalLink } from "../../../../utils/utils";
import Link from "next/link";
import { faBarChart } from "@fortawesome/pro-regular-svg-icons";
import { Frequency } from "../../../utils/Frequency";

interface Props {
  assignments: ModuleAssignmentFragment[];
  page: PaginationState;
  pageCount: number;
  setPage: OnChangeFn<PaginationState>;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
  loading: boolean;
  totalItems: number;
}

export const getDateTimeRow = (datetime: string | Date) => {
  const { date, time } = formatDateTimeSplitted(datetime as string);
  return (
    <div>
      {date} <br />
      <span className="text-gray-500">{time}</span>
    </div>
  );
};

const getStatusRow = (module: ModuleAssignmentFragment) => {
  let text: string;
  let color: string;

  const status = module.status as CompetencyState;

  switch (status) {
    case CompetencyState.FINISHED:
      if (module.approved) {
        text = "PASSED";
        color = "green";
      } else {
        text = "FAILED";
        color = "red";
      }
      break;
    case CompetencyState.DUE_DATE_EXPIRED:
      text = "DUE DATE EXPIRED";
      color = "red";
      break;
    case CompetencyState.STARTED:
      text = "IN PROGRESS";
      color = "blue";
      break;
    case CompetencyState.EXPIRED:
      text = "EXPIRED";
      color = "gray";
      break;
    case CompetencyState.PENDING:
      text = "PENDING";
      color = "yellow";
      break;
    default:
      text = "UNKNOWN";
      color = "gray";
  }
  return (
    <div
      className={`rounded-md bg-${color}-100 text-sm font-medium text-${color}-700 inline-block p-1`}
    >
      {text}
    </div>
  );
};

const tableColumns: ColumnDef<ModuleAssignmentFragment>[] = [
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
            {row.original.directus_users_id?.first_name +
              " " +
              row.original.directus_users_id?.last_name}
          </span>
          <br />
          <span className="text-sm text-gray-400">
            {row.original.directus_users_id?.email}
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
    accessorKey: "modules.definition_id.title",
    accessorFn: (f) => f.modules_definition_id?.title,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="w-[200px] whitespace-pre-wrap">
        {row.original.modules_definition_id?.title}
      </div>
    ),
  },
  {
    header: "Agency",
    accessorKey: "agency",
    enableSorting: false,
    cell: ({ row }) => row.original.agency?.name,
  },
  {
    header: "Status",
    accessorKey: "status",
    enableSorting: true,
    cell: ({ row }) => (
      <div className="-ml-5 w-[110px] text-center">
        {getStatusRow(row.original)}
      </div>
    ),
  },
  {
    header: "CEU",
    cell: ({ row }) => (
      <div className="-ml-10 w-[110px] text-center">
        {row.original.status === CompetencyState.FINISHED &&
          (row.original.module_version?.contact_hour ||
            row.original.modules_definition_id?.import_ceu ||
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
        {row.original.score ? row.original.score + "%" : ""}
      </div>
    ),
  },
  {
    header: "Attempts",
    accessorKey: "attempts",
    enableSorting: false,
    cell: ({ row }) => {
      const attemptsUsed = row.original.attempts_used || 0;
      const allowedAttempts = row.original.allowed_attempts || 0;

      return (
        <div>
          {attemptsUsed}/{allowedAttempts}
        </div>
      );
    },
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
    cell: ({ row }) => getDateTimeRow(row.original.finished_on || ""),
  },
  {
    header: "Expires",
    enableSorting: true,
    accessorKey: "expires_on",
    cell: ({ row }) => getDateTimeRow(row.original.expires_on || ""),
  },
  {
    header: " ",
    cell: ({ row }) => {
      const classes =
        "rounded-lg bg-green-200 px-2 py-1 text-green-800 transition-all hover:bg-green-300";

      const renderActions = () => {
        const status = row.original.status as CompetencyState;
        const approved = !!row.original.approved;

        if (status === CompetencyState.FINISHED) {
          if (row.original.import_cert_url) {
            return (
              <button
                type="button"
                onClick={() => openExternalLink(row.original.import_cert_url!)}
                className={classes}
              >
                <FontAwesomeIcon icon={faMedal} />
              </button>
            );
          }

          if (approved) {
            return (
              <>
                <Link
                  className={classes}
                  target="_blank"
                  href={`/admin/dashboard/reports/${row.original.directus_users_id?.id}/modules/${row.original.id}/certificate`}
                >
                  <FontAwesomeIcon icon={faMedal} />
                </Link>
                <Link
                  target="_blank"
                  className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
                  href={`/admin/dashboard/reports/${row.original.directus_users_id?.id}/modules/${row.original.id}/review`}
                >
                  <FontAwesomeIcon icon={faBarChart} />
                </Link>
              </>
            );
          }

          return (
            <Link
              target="_blank"
              className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
              href={`/admin/dashboard/reports/${row.original.directus_users_id?.id}/modules/${row.original.id}/review`}
            >
              <FontAwesomeIcon icon={faBarChart} />
            </Link>
          );
        }

        return null;
      };

      return <div className="flex justify-end gap-2">{renderActions()}</div>;
    },
  },
];

export const ReportModulesTable: React.FC<Props> = ({
  assignments,
  page,
  setPage,
  pageCount,
  sort,
  setSort,
  loading,
  totalItems,
}) => {
  const [rowSelection, setRowSelection] = useState({});

  const table = useAdminTable<ModuleAssignmentFragment>({
    data: assignments,
    columns: tableColumns,
    pageCount,
    paginate: [page, setPage],
    loading,
    totalItems,
    rowSelection: [rowSelection, setRowSelection],
    sort: [sort, setSort],
  });

  return <table.Component />;
};
