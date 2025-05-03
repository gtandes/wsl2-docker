import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faChevronDoubleLeft,
  faChevronDoubleRight,
} from "@fortawesome/pro-solid-svg-icons";
import { Table } from "@tanstack/react-table";
import clsx from "clsx";
import { Spinner } from "./Spinner";

interface Props {
  table: Table<any>;
  totalItems: number;
  loading: boolean;
}

export const AdminTableDesktopPagination: React.FC<Props> = ({
  table,
  totalItems,
  loading,
}) => {
  const tableState = table.getState();
  const pageCount = Math.ceil(totalItems / tableState.pagination.pageSize);
  const pageButtons = 5;
  const pages = useMemo(() => {
    const start = Math.max(
      0,
      Math.min(
        pageCount - pageButtons,
        tableState.pagination.pageIndex - Math.floor(pageButtons / 2)
      )
    );
    return Array.from({ length: Math.min(pageButtons, pageCount) }).map(
      (_, i) => start + i
    );
  }, [pageCount, pageButtons, tableState.pagination.pageIndex]);

  if (totalItems === 0) {
    return <></>;
  }

  return (
    <div className="hidden border-t bg-white px-3 py-4 sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-gray-700">
          Showing{" "}
          <span className="font-medium">
            {totalItems !== 0
              ? tableState.pagination.pageIndex *
                  tableState.pagination.pageSize +
                1
              : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {totalItems !== 0
              ? Math.min(
                  totalItems,
                  (tableState.pagination.pageIndex + 1) *
                    tableState.pagination.pageSize
                )
              : 0}
          </span>{" "}
          of <span className="font-medium">{totalItems}</span> results
        </p>
      </div>
      <div className="flex items-center gap-3">
        {loading && <Spinner />}

        <div className="rounded-lg border">
          <nav
            className="isolate inline-flex rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              type="button"
              className="inline-flex items-center rounded-l-md border-r px-4 py-2 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-200"
            >
              <span className="sr-only">Previous</span>
              <FontAwesomeIcon icon={faChevronDoubleLeft} size="xs" />
            </button>
            <button
              onClick={table.previousPage}
              disabled={!table.getCanPreviousPage()}
              type="button"
              className="inline-flex items-center rounded-l-md border-r px-4 py-2 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-200"
            >
              <span className="sr-only">Previous</span>
              <FontAwesomeIcon icon={faChevronLeft} size="xs" />
            </button>
            {pages.map((i) => {
              return (
                <button
                  key={i}
                  type="button"
                  className={clsx(
                    "inline-flex items-center px-4 py-2 text-sm tabular-nums",
                    {
                      "border border-blue-800 bg-blue-100 text-blue-800":
                        tableState.pagination.pageIndex === i,
                      "border-r hover:bg-gray-50":
                        tableState.pagination.pageIndex !== i,
                      "border-r-0": tableState.pagination.pageIndex - 1 === i,
                    }
                  )}
                  onClick={() => table.setPageIndex(i)}
                >
                  {i + 1}
                </button>
              );
            })}
            <button
              onClick={table.nextPage}
              disabled={!table.getCanNextPage()}
              type="button"
              className="relative inline-flex items-center rounded-r-md px-4 py-2 ring-0 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-200"
            >
              <span className="sr-only">Next</span>
              <FontAwesomeIcon icon={faChevronRight} size="xs" />
            </button>
            <button
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              type="button"
              className="relative inline-flex items-center rounded-r-md border-l px-4 py-2 ring-0 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-200"
            >
              <span className="sr-only">Next</span>
              <FontAwesomeIcon icon={faChevronDoubleRight} size="xs" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export const AdminTableMobilePagination: React.FC<Props> = ({
  table,
  totalItems,
}) => {
  if (totalItems === 0) {
    return <></>;
  }
  return (
    <div className="flex items-center justify-between overflow-x-auto border-t bg-white px-4 py-3 ring-1 ring-black ring-opacity-5 sm:hidden">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={table.previousPage}
          disabled={!table.getCanPreviousPage()}
          type="button"
          className="relative inline-flex items-center rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 enabled:hover:bg-gray-50 disabled:text-gray-200"
        >
          Previous
        </button>
        <button
          onClick={table.nextPage}
          disabled={!table.getCanNextPage()}
          type="button"
          className="relative ml-3 inline-flex items-center rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 enabled:hover:bg-gray-50 disabled:text-gray-200"
        >
          Next
        </button>
      </div>
    </div>
  );
};
