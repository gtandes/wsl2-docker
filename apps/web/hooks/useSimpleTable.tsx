import {
  ColumnDef,
  OnChangeFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowSelectionState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import clsx from "clsx";
import { faChevronDown } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { HTMLProps, useMemo } from "react";
import { Spinner } from "../components/Spinner";

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading: boolean;
  sort: [SortingState, OnChangeFn<SortingState>];
  onRowClick?: (row: T) => void;
  rowSelection: [RowSelectionState, OnChangeFn<RowSelectionState>];
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
      className="border-1 {className} h-3.5 w-3.5 cursor-pointer border-gray-300 p-2"
      {...props}
    />
  );
}

export const useSimpleTable = <T,>({
  data,
  columns,
  loading,
  sort: [sorting, setSorting],
  onRowClick,
}: Props<T>) => {
  const table = useReactTable({
    data,
    columns: [
      ...columns.map((column) => ({
        ...column,
        enableSorting: column.enableSorting ?? false,
      })),
    ],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualSorting: true,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const Component = useMemo(() => {
    const AdminTable: React.FC = () => (
      <>
        <div className="mt-4 flow-root md:mt-8">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                {loading ? (
                  <div className="flex justify-center bg-white p-10">
                    <Spinner />
                  </div>
                ) : (
                  <>
                    {data && data.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                                return (
                                  <th
                                    className={`whitespace-nowrap py-3 pl-4 pr-3 text-left text-sm font-medium uppercase text-gray-500 first:pl-5`}
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
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                              >
                                {row.getVisibleCells().map((cell) => {
                                  return (
                                    <td
                                      className={clsx(
                                        "ml-1 whitespace-nowrap py-3 pl-4 pr-3 text-sm",
                                        onRowClick && "cursor-pointer"
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
                              <td
                                colSpan={4}
                                className="h-24 text-center text-sm"
                              >
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
    return AdminTable;
  }, [data, loading, onRowClick, table]);

  return { Component, table };
};
