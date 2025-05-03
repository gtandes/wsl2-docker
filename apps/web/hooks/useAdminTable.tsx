import {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowSelectionState,
  getFilteredRowModel,
  Updater,
} from "@tanstack/react-table";
import {
  AdminTableDesktopPagination,
  AdminTableMobilePagination,
} from "../components/AdminTablePagination";
import clsx from "clsx";
import { faChevronDown } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { HTMLProps, useEffect, useMemo, useState } from "react";

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pageCount?: number;
  loading: boolean;
  paginate: [PaginationState, OnChangeFn<PaginationState>];
  sort: [SortingState, OnChangeFn<SortingState>];
  totalItems: number;
  onRowClick?: (row: T) => void;
  rowSelection?: [RowSelectionState, OnChangeFn<RowSelectionState>];
  rowSelect?: (row: T) => void;
  addRowAttributes?: (row: T) => {
    [key: string]: any;
  };
  spinnerClasses?: string;
  isClickable?: (row: T) => boolean | string[];
}

function SelectableCheckbox({
  indeterminate,
  className = "",
  ...props
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = React.useRef<HTMLInputElement>(null!);

  React.useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !props.checked && indeterminate;
    }
  }, [ref, indeterminate, props.checked]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={`border-1 ${className} h-3.5 w-3.5 cursor-pointer border-gray-300 p-2`}
      {...props}
    />
  );
}

export const useAdminTable = <T,>({
  data: _data,
  columns,
  loading,
  pageCount,
  paginate: [pagination, setPagination],
  sort: [sorting, setSorting],
  rowSelection: [rowSelection, setRowSelection] = [
    {},
    function (_: Updater<RowSelectionState>) {},
  ],
  totalItems: _totalItems,
  rowSelect,
  onRowClick,
  addRowAttributes,
  isClickable,
}: Props<T>) => {
  const [data, setData] = useState<any>();
  const [totalItems, setTotalItems] = useState<number>(0);
  useEffect(() => {
    if (!loading) {
      setData(_data);
      setTotalItems(_totalItems);
    }
  }, [_data, _totalItems, loading]);

  const allColumns: ColumnDef<T>[] = useMemo(() => {
    if (rowSelect) {
      return [
        {
          id: "select",
          header: ({ table }) => (
            <SelectableCheckbox
              id="checkbox-all"
              className="rounded"
              {...{
                checked: table.getIsAllRowsSelected(),
                indeterminate: table.getIsSomeRowsSelected(),
                onChange: table.getToggleAllRowsSelectedHandler(),
              }}
            />
          ),
          cell: ({ row }) => (
            <SelectableCheckbox
              id={`checkbox-${row.id}`}
              className="rounded"
              {...{
                checked: row.getIsSelected(),
                disabled: !row.getCanSelect(),
                indeterminate: row.getIsSomeSelected(),
                onChange: row.getToggleSelectedHandler(),
              }}
            />
          ),
        },
        ...columns.map((column) => ({
          ...column,
          enableSorting: column.enableSorting ?? false,
        })),
      ];
    }

    return columns;
  }, [columns, rowSelect]);

  const table = useReactTable({
    data,
    columns: allColumns,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onPaginationChange: (paginationState) => {
      setRowSelection({});
      setPagination(paginationState);
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      pagination,
      sorting,
      rowSelection,
    },
  });

  const Component = useMemo(() => {
    const AdminTable: React.FC = () => (
      <>
        <div className="mt-4 flow-root overflow-hidden rounded-lg border md:mt-8">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="group overflow-hidden ring-1 ring-black ring-opacity-5">
                {data && data.length > 0 ? (
                  <table className="admin-table min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            return (
                              <th
                                className={`whitespace-nowrap py-3 pl-4 pr-3 text-left text-sm font-medium uppercase text-gray-500`}
                                scope="col"
                                key={header.id}
                              >
                                {header.isPlaceholder ? null : (
                                  <div
                                    onClick={header.column.getToggleSortingHandler()}
                                    className={clsx({
                                      "cursor-pointer":
                                        header.column.getCanSort(),
                                    })}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                    {header.column.getCanSort() && (
                                      <FontAwesomeIcon
                                        icon={faChevronDown}
                                        size="xs"
                                        color="currentColor"
                                        className={clsx(
                                          "ml-1 text-gray-200 transition-all",
                                          {
                                            "!text-gray-900":
                                              header.column.getIsSorted(),
                                            "rotate-180":
                                              header.column.getIsSorted() ===
                                              "desc",
                                          }
                                        )}
                                      />
                                    )}
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <tr
                            {...(addRowAttributes && {
                              ...addRowAttributes(row.original),
                            })}
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="group/user hover:bg-gray-100 focus:outline-none focus:ring-gray-100"
                          >
                            {row.getVisibleCells().map((cell) => {
                              return (
                                <td
                                  onClick={() => {
                                    if (
                                      onRowClick &&
                                      cell.column.id !== "select" &&
                                      cell.column.id !== "actions"
                                    )
                                      onRowClick(row.original);
                                  }}
                                  className={clsx(
                                    "ml-1 whitespace-nowrap py-3 pl-4 pr-3 text-sm",
                                    onRowClick &&
                                      isClickable &&
                                      isClickable(row.original as T)
                                      ? "cursor-pointer"
                                      : "cursor-default"
                                  )}
                                  key={cell.id}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="h-24 text-center text-sm">
                            No results found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="bg-white p-10 text-center text-sm">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
          <AdminTableDesktopPagination
            totalItems={totalItems}
            table={table}
            loading={loading}
          />
          <AdminTableMobilePagination
            totalItems={totalItems}
            table={table}
            loading={loading}
          />
        </div>
      </>
    );
    return AdminTable;
  }, [data, loading, onRowClick, table, totalItems]);

  return { Component, table };
};
