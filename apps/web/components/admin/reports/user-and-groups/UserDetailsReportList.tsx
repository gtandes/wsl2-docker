import React, { useMemo, useState } from "react";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import {
  OnChangeFn,
  PaginationState,
  Row,
  SortingState,
} from "@tanstack/react-table";
import {
  formatDateTime,
  formatDateTimeSplitted,
} from "../../../../utils/format";
import {
  Directus_Users,
  Junction_Directus_Users_Documents,
  Junction_Directus_Users_Exams,
  Junction_Directus_Users_Policies,
} from "api";

import { CompetencyState, CompetencyType, DirectusStatus } from "types";
import { UserDetailsReportsExport } from "../../../../types/reports";

export const ACCESSORS = {
  Name: "last_name",
  "Last Access": "last_access",
};

export type UserReportItemType = {
  id: string;
  title: string;
  frequency: string | null;
  contentType: CompetencyType;
  status: CompetencyState | DirectusStatus | null;
  score: number | null;
  agency: string;
  attemptsUsed: number | null;
  attemptsAllowed: number | null;
  startedOn: Date | null;
  completedOn: Date | null;
  expiresOn: Date | null;
};

export const getDateTimeRow = (datetime: string | Date) => {
  const { date, time } = formatDateTimeSplitted(datetime as string);
  return (
    <div>
      {date} <br />
      <span className="text-gray-500">{time}</span>
    </div>
  );
};

const getStatusRow = (status: CompetencyState | DirectusStatus | null) => {
  let color: string;
  switch (status) {
    case CompetencyState.FINISHED:
    case CompetencyState.SIGNED:
    case CompetencyState.COMPLETED:
    case DirectusStatus.PUBLISHED:
      color = "green";
      break;
    case CompetencyState.IN_PROGRESS:
    case CompetencyState.STARTED:
    case DirectusStatus.DRAFT:
      color = "blue";
      break;
    case CompetencyState.FAILED:
    case CompetencyState.DUE_DATE_EXPIRED:
      color = "red";
      break;
    case CompetencyState.NOT_STARTED:
    case CompetencyState.PENDING:
      color = "yellow";
      break;
    default:
      color = "gray";
  }
  return (
    <div
      className={`rounded-md bg-${color}-100 text-sm font-medium text-${color}-700 whitespace-pre-wrap p-1`}
    >
      {status ? status.replaceAll("_", " ") : ""}
    </div>
  );
};

const getFrequencyRow = (expiration: string | null) => {
  const color = expiration === "one-time" ? "gray" : "yellow";
  const frequency = expiration === "one-time" ? "ONE-TIME" : "ANNUAL";
  return (
    expiration && (
      <div
        className={`rounded-md bg-${color}-100 text-xs font-medium text-${color}-700 w-20 p-1 text-center`}
      >
        {frequency}
      </div>
    )
  );
};

const calculateExamStatus = (
  item: Junction_Directus_Users_Exams
): CompetencyState | null => {
  switch (item.status) {
    case CompetencyState.COMPLETED:
      return CompetencyState.COMPLETED;
    case CompetencyState.FAILED:
      return CompetencyState.FAILED;
    case CompetencyState.IN_PROGRESS:
      return CompetencyState.IN_PROGRESS;
    case CompetencyState.EXPIRED:
      return CompetencyState.EXPIRED;
    case CompetencyState.NOT_STARTED:
      return CompetencyState.NOT_STARTED;
    case CompetencyState.DUE_DATE_EXPIRED:
      return CompetencyState.DUE_DATE_EXPIRED;
    default:
      throw new Error("Invalid exam status");
  }
};

const calculatePoliciesStatus = (
  item: Junction_Directus_Users_Policies
): CompetencyState | null => {
  if (item) {
    if (!item.read && !item.signed_on) return CompetencyState.NOT_STARTED;
    if (item.read && !item.signed_on) return CompetencyState.IN_PROGRESS;
    if (item.signed_on) return CompetencyState.SIGNED;
  }

  throw new Error("Invalid policy status");
};

const calculateDocumentsStatus = (
  item: Junction_Directus_Users_Documents
): CompetencyState | null => {
  if (item) {
    if (new Date(item.expires_on as Date).getTime() < new Date().getTime()) {
      return CompetencyState.EXPIRED;
    }
    if (!item.read) {
      return CompetencyState.NOT_STARTED;
    }
    if (item.read) {
      return CompetencyState.READ;
    }
  }

  throw new Error("Invalid document status");
};

export const processUserDetailsForList = (
  data: Directus_Users
): UserReportItemType[] => {
  const reportItems: UserReportItemType[] = [];

  if (data?.exams?.length! > 0) {
    data.exams?.forEach((item) => {
      reportItems.push({
        id: item?.exams_id?.id!,
        title: item?.exams_id?.title!,
        frequency: item?.exam_versions_id?.expiration!,
        contentType: CompetencyType.EXAM,
        status: calculateExamStatus(item as Junction_Directus_Users_Exams),
        agency: item?.agency?.name!,
        score: item?.score!,
        attemptsUsed: item?.attempts_used!,
        attemptsAllowed: item?.allowed_attempts!,
        startedOn: item?.started_on!,
        completedOn: item?.finished_on!,
        expiresOn: item?.expires_on!,
      });
    });
  }

  if (data?.modules?.length! > 0) {
    data.modules?.forEach((item) => {
      reportItems.push({
        id: item?.id!,
        title: item?.modules_definition_id?.title!,
        frequency: item?.module_version?.expiration!,
        contentType: CompetencyType.MODULE,
        status: (item?.status as CompetencyState) || null,
        agency: item?.agency?.name || "",
        score: item?.score || 0,
        attemptsUsed: item?.attempts_used || 0,
        attemptsAllowed: item?.allowed_attempts || 0,
        startedOn: item?.started_on || null,
        completedOn: item?.finished_on || null,
        expiresOn: item?.expires_on || null,
      });
    });
  }

  if (data?.sc_definitions?.length! > 0) {
    data.sc_definitions?.forEach((item) => {
      reportItems.push({
        id: item?.id!,
        title: item?.sc_definitions_id?.title!,
        frequency: null,
        contentType: CompetencyType.SKILL_CHECKLIST,
        status: item?.status as CompetencyState,
        agency: item?.agency?.name || "",
        score: null,
        attemptsUsed: null,
        attemptsAllowed: null,
        startedOn: item?.assigned_on!,
        completedOn: item?.finished_on || null,
        expiresOn: item?.expires_on! || null,
      });
    });
  }

  if (data?.policies?.length! > 0) {
    data.policies?.forEach((item) => {
      reportItems.push({
        id: item?.id!,
        title: item?.policies_id?.name!,
        frequency: null,
        contentType: CompetencyType.POLICY,
        status: calculatePoliciesStatus(
          item as Junction_Directus_Users_Policies
        ),
        agency: item?.agency?.name || "",
        score: null,
        attemptsUsed: null,
        attemptsAllowed: null,
        startedOn: item?.assigned_on!,
        completedOn: item?.signed_on || null,
        expiresOn: item?.expires_on! || null,
      });
    });
  }
  if (data?.documents?.length! > 0) {
    data.documents?.forEach((item) => {
      reportItems.push({
        id: item?.id!,
        title: item?.documents_id?.title!,
        frequency: null,
        contentType: CompetencyType.DOCUMENT,
        status: calculateDocumentsStatus(
          item as Junction_Directus_Users_Documents
        ),
        agency: item?.agency?.name || "",
        score: null,
        attemptsUsed: null,
        attemptsAllowed: null,
        startedOn: item?.assigned_on!,
        completedOn: item?.read || null,
        expiresOn: item?.expires_on! || null,
      });
    });
  }

  return reportItems;
};

export const processUserDetailsForExport = (
  data: UserReportItemType[]
): UserDetailsReportsExport[] => {
  return data.map((p) => {
    return {
      title: p.title || "",
      frequency: p.frequency || "",
      status: p.status || "",
      score: (p.score as unknown as string) || "",
      attempts:
        p.attemptsUsed || "" + p.attemptsUsed! || p.attemptsUsed === 0
          ? "/"
          : "" + p.attemptsAllowed || "",
      started: formatDateTime(p.startedOn || ""),
      completed: formatDateTime(p.completedOn || ""),
      expires: formatDateTime(p.expiresOn || ""),
    };
  });
};

const tableColumns = [
  {
    header: "Title",
    accessorFn: () => ({}),
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="flex flex-col space-y-1">
        <div className="">{row.original.title}</div>
        {getFrequencyRow(row.original.frequency)}
      </div>
    ),
  },
  {
    header: "Content Type",
    accessorFn: () => ({}),
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[100px] text-center">{row.original.contentType}</div>
    ),
  },
  {
    header: "Agency",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="overflow-wrap break-words text-center">
        {row.original.agency}
      </div>
    ),
  },
  {
    header: "Status",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[130px] text-center">
        {getStatusRow(row.original.status)}
      </div>
    ),
  },
  {
    header: "Score",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[90px] text-center">{row.original.score}</div>
    ),
  },
  {
    header: "Attempts",
    accessorKey: "module",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[80px] text-center">
        {row.original.attemptsUsed}
        {row.original.attemptsUsed || row.original.attemptsUsed === 0
          ? "/"
          : ""}
        {row.original.attemptsAllowed}
      </div>
    ),
  },
  {
    header: "Started On",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[90px] text-center text-[10px] xl:text-sm">
        {getDateTimeRow(row.original.startedOn!)}
      </div>
    ),
  },
  {
    header: "Completed",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[90px] text-center text-[10px] xl:text-sm">
        {getDateTimeRow(row.original.completedOn!)}
      </div>
    ),
  },
  {
    header: "Expires",
    enableSorting: false,
    accessorFn: () => ({}),
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[90px] text-center text-[10px] xl:text-sm">
        {getDateTimeRow(row.original.expiresOn!)}
      </div>
    ),
  },
];

interface Props {
  data: UserReportItemType[];
  totalItems: number;
  isLoading: boolean;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
  page: PaginationState;
  pageCount: number;
  setPage: OnChangeFn<PaginationState>;
  pageSize: number;
  spinnerClasses?: string;
}

export const UserDetailsReportList: React.FC<Props> = ({
  data,
  totalItems,
  isLoading,
  sort,
  setSort,
  page,
  pageCount,
  setPage,
  spinnerClasses,
}: Props) => {
  const [rowSelection, setRowSelection] = useState({});

  const usersReportList = useAdminTable<UserReportItemType>({
    columns: tableColumns,
    data: data,
    pageCount: 0,
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: isLoading,
    totalItems: 0,
    rowSelection: [rowSelection, setRowSelection],
    spinnerClasses: spinnerClasses,
  });

  return <usersReportList.Component />;
};
