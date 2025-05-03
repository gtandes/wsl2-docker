import { faPlusCircle, faTrash } from "@fortawesome/pro-regular-svg-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../Button";
import { SearchInput } from "../SearchInput";
import { SelectFilter } from "../SelectFilter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Updater, RowSelectionState, ColumnDef } from "@tanstack/react-table";
import {
  useGetAllCategoriesQuery,
  useDeleteCategoryMutation,
  Categories,
} from "api";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { useDebounce } from "usehooks-ts";
import { useAdminTable } from "../../hooks/useAdminTable";
import { useModal } from "../../hooks/useModal";
import { notify, GENERIC_SUCCESS_DELETED } from "../Notification";
import { CategoryFormModal } from "./CategoryFormModal";
import { useAuth } from "../../hooks/useAuth";
import { AdminEditRoles, EditRoles, UserRole } from "../../types/roles";
import { useAgency } from "../../hooks/useAgency";
import { DirectusStatus } from "types";

interface Props {
  type: "policy" | "document" | "question" | "competencies";
}

const CATEGORY_TYPES = {
  modality: "Cat 1 - Modalities",
  speciality: "Cat 2 - Specialties",
  sub_speciality: "Cat 3 - Sub-specialities",
};

export const CategoriesView: React.FC<Props> = ({ type }) => {
  const auth = useAuth();
  const globalAgency = useAgency();
  const canEdit =
    AdminEditRoles.includes(auth.currentUser?.role!) ||
    (type &&
      ["policy", "document"].includes(type) &&
      EditRoles.includes(auth.currentUser?.role!));

  const PAGE_SIZE = 10;
  const CATEGORY_OPTIONS = [
    {
      label: "All",
      value: "",
    },
    {
      label: "Cat 1 - Modalities",
      value: "modality",
    },
    {
      label: "Cat 2- Specialties",
      value: "speciality",
    },
    {
      label: "Cat 3 - Sub-specialities",
      value: "sub_speciality",
    },
  ];

  const modal = useModal();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedCategoryFilter = useDebounce(categoryFilter, 500);

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "title",
        desc: false,
      },
    ])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    })
  );

  const filters = useMemo(() => {
    if (type === "competencies") {
      if (debouncedCategoryFilter) {
        return {
          type: {
            _eq: debouncedCategoryFilter,
          },
        };
      } else {
        return {
          type: {
            _in: ["modality", "speciality", "sub_speciality"],
          },
        };
      }
    } else {
      return {
        type: {
          _eq: type,
        },
      };
    }
  }, [debouncedCategoryFilter, type]);

  const allCategoriesQuery = useGetAllCategoriesQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
      search: debouncedSearchQuery,
      filter: {
        ...filters,
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        ...(auth.currentUser?.role !== UserRole.HSHAdmin &&
        globalAgency.currentAgency?.id
          ? {
              _or: [
                { agency: { id: { _eq: globalAgency.currentAgency?.id } } },
                { agency: { id: { _null: true } } },
              ],
            }
          : globalAgency.currentAgency?.id && {
              agency: { id: { _eq: globalAgency.currentAgency?.id } },
            }),
      },
    },
  });

  const [deleteCategory] = useDeleteCategoryMutation({
    refetchQueries: ["getAllCategories"],
  });

  const handleCreateCategory = async () => {
    await modal.show({
      title:
        type === "competencies"
          ? "Create a new category"
          : `Create a new ${type} category`,
      children: (onClose) => (
        <CategoryFormModal type={type} isNew onClose={onClose} />
      ),
    });
  };

  const handleEditCategory = async (category: Categories) => {
    await modal.show({
      title:
        type === "competencies" ? "Edit Category" : `Edit ${type} category`,
      children: (onClose) => (
        <CategoryFormModal
          type={type}
          onClose={onClose}
          isNew={false}
          category={category}
        />
      ),
    });
  };

  const handleDeleteCategory = useCallback(
    async (category: Categories) => {
      const result = await modal.showConfirm(
        `Are you sure you want to delete category ${category.title}?`
      );

      if (result) {
        await deleteCategory({
          variables: {
            id: category.id,
          },
        });

        notify(GENERIC_SUCCESS_DELETED);
      }
    },
    [deleteCategory, modal]
  );

  const canEditRow = useCallback(
    (category: Categories): boolean => {
      const agencyCanEdit =
        auth.currentUser?.role! === UserRole.AgencyUser
          ? category.agency?.id
          : true;
      return category.type !== "modality" && !!canEdit && !!agencyCanEdit;
    },
    [auth.currentUser?.role, canEdit]
  );

  const columns: ColumnDef<Categories>[] = useMemo(() => {
    if (type === "competencies") {
      return [
        {
          header: "TITLE",
          accessorKey: "title",
          enableSorting: true,
        },
        {
          header: "CATEGORY TYPE",
          accessorKey: "type",
          enableSorting: true,
          cell: ({ row }) =>
            CATEGORY_TYPES[row.original.type as keyof typeof CATEGORY_TYPES],
        },
        {
          header: "AGENCY",
          accessorKey: "agency",
          enableSorting: true,
          cell: ({ row }) => row.original.agency?.name || "All",
        },
        {
          header: "",
          accessorKey: "actions",
          enableSorting: false,
          cell: ({ row }) => {
            if (canEditRow(row.original)) {
              return (
                <div className="flex justify-end">
                  {row.original.type !== "modality" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(row.original)}
                      className="rounded-lg bg-red-200 px-2 py-1 text-red-700 transition-all hover:bg-red-300"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              );
            }
          },
        },
      ];
    } else {
      return [
        {
          header: "TITLE",
          accessorKey: "title",
          enableSorting: true,
        },
        {
          header: "AGENCY",
          accessorKey: "agency",
          enableSorting: true,
          cell: ({ row }) => row.original.agency?.name || "All",
        },
        {
          header: "",
          accessorKey: "actions",
          enableSorting: false,
          cell: ({ row }) => {
            if (canEditRow(row.original)) {
              return (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={row.original.type === "modality"}
                    onClick={() => handleDeleteCategory(row.original)}
                    className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              );
            }
          },
        },
      ];
    }
  }, [canEditRow, handleDeleteCategory, type]);

  const listCategoriesTable = useAdminTable<Categories>({
    rowSelection: [{}, function (p1: Updater<RowSelectionState>) {}],
    data: allCategoriesQuery.data?.categories || [],
    pageCount: Math.ceil(
      (allCategoriesQuery.data?.categories_aggregated.at(0)?.count?.id || 0) /
        PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: allCategoriesQuery.loading,
    totalItems:
      allCategoriesQuery.data?.categories_aggregated.at(0)?.count?.id || 0,
    onRowClick: (row) => canEditRow(row) && handleEditCategory(row),
    columns: columns,
  });

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SearchInput placeholder="Search by Title" onChange={setSearchQuery} />
        {type === "competencies" && (
          <SelectFilter
            options={CATEGORY_OPTIONS}
            onChange={setCategoryFilter}
          />
        )}
      </div>
      {canEdit && (
        <div className="mt-8 flex justify-end">
          <Button
            label="New"
            classes="md:col-start-2 md:w-56 md:place-self-end"
            onClick={handleCreateCategory}
            iconLeft={faPlusCircle}
          />
        </div>
      )}
      <listCategoriesTable.Component />
    </div>
  );
};
