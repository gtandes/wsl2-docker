import React, { useState } from "react";
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
import { useSimpleTable } from "../../../../hooks/useSimpleTable";
import { Junction_Directus_Users_Agencies } from "api";

export type AgencyItemType = {
  id: string;
  name: string;
  join_date: Date;
  employee_number: string;
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

export const processAgenciesForList = (
  data: Junction_Directus_Users_Agencies[]
): AgencyItemType[] => {
  const agenciesList: AgencyItemType[] = [];

  if (data?.length! > 0) {
    data.forEach((item: Junction_Directus_Users_Agencies) => {
      agenciesList.push({
        id: item.id,
        name: item.agencies_id?.name || "",
        join_date: item.date_created!,
        employee_number: item.employee_number || "",
      });
    });
  }

  return agenciesList;
};

const tableColumns = [
  {
    header: "Agency",
    accessorFn: () => ({}),
    enableSorting: false,
    cell: ({ row }: { row: Row<AgencyItemType> }) => (
      <div className="flex w-[240px] flex-row items-center justify-between">
        <div className="">{row.original.name}</div>
      </div>
    ),
  },
  {
    header: "Employee #",
    accessorFn: () => ({}),
    enableSorting: false,
    cell: ({ row }: { row: Row<AgencyItemType> }) => (
      <div className="w-[200px] whitespace-pre-wrap text-xs">
        {row.original.employee_number}
      </div>
    ),
  },
  {
    header: "Join Date",
    enableSorting: false,
    cell: ({ row }: { row: Row<AgencyItemType> }) => (
      <div className="-ml-1 w-[90px] text-center">
        {getDateTimeRow(row.original.join_date)}
      </div>
    ),
  },
];

interface Props {
  data: AgencyItemType[];
  isLoading: boolean;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
}

export const UserDetailAgenciesList: React.FC<Props> = ({
  data,
  sort,
  setSort,
  isLoading,
}: Props) => {
  const [rowSelection, setRowSelection] = useState({});
  const usersReportList = useSimpleTable<AgencyItemType>({
    columns: tableColumns,
    data: data,
    sort: [sort, setSort],
    loading: isLoading,
    rowSelection: [rowSelection, setRowSelection],
  });

  return <usersReportList.Component />;
};
