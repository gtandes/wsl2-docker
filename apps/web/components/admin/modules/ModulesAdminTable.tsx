import { faTrash } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { ModuleDefinitionFragment } from "api";
import router from "next/router";
import { useMemo } from "react";
import { useAdminTable } from "../../../hooks/useAdminTable";
import { formatDateForModules } from "../../../utils/format";

interface ModulesAdminTableProps {
  modules: ModuleDefinitionFragment[];
  canEdit: boolean;
  handleDeleteModule: (id: string) => void;
  totalPages: number;
  page: PaginationState;
  setPage: OnChangeFn<PaginationState>;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
  pageSize: number;
  loading: boolean;
}

export const ModulesAdminTable: React.FC<ModulesAdminTableProps> = ({
  canEdit,
  handleDeleteModule,
  modules,
  page,
  pageSize,
  setPage,
  setSort,
  sort,
  totalPages,
  loading,
}) => {
  const columns: ColumnDef<ModuleDefinitionFragment>[] = useMemo(
    () => [
      {
        header: "Title",
        accessorKey: "title",
        id: "title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal">{row.original.title}</div>
        ),
      },
      {
        header: "Version",
        accessorKey: "last_version.version_number",
        id: "last_version.version_number",
        enableSorting: true,
      },
      {
        header: "Installed",
        accessorKey: "date_created",
        enableSorting: true,
        cell: ({ row }) => formatDateForModules(row.original.date_created),
      },
      {
        header: "Categories (1, 2 & 3)",
        id: "modality.title",
        accessorKey: "modality.title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal capitalize text-gray-400">
            {row.original.modality?.title}
            {row.original.specialty?.title &&
              `,${row.original.specialty?.title}`}
            {row.original.sub_specialty?.title &&
              `,${row.original.sub_specialty?.title}`}
          </div>
        ),
      },
      {
        header: "Contact HRS (CEU)",
        accessorKey: "last_version.contact_hour",
        enableSorting: true,
      },
      {
        header: "Status",
        accessorKey: "status",
        enableSorting: true,
        cell: ({ row }) => {
          const statusMap = {
            draft: "Draft",
            published: "Published",
            archived: "Archived",
          };
          const status = row.original.status as keyof typeof statusMap;
          return statusMap[status];
        },
      },
      {
        header: "",
        accessorKey: "actions",
        enableSorting: false,
        cell: ({ row }) =>
          canEdit ? (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleDeleteModule(row.original.id)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300 disabled:bg-gray-200 disabled:text-white"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          ) : null,
      },
    ],
    [canEdit, handleDeleteModule]
  );

  const adminTable = useAdminTable<ModuleDefinitionFragment>({
    columns,
    data: modules,
    pageCount: Math.ceil(totalPages / pageSize),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loading,
    totalItems: totalPages,
    onRowClick: (row) => router.push(`/admin/modules/${row.id}`),
  });

  return <adminTable.Component />;
};
