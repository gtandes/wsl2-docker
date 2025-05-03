import { useRouter } from "next/router";
import { faCirclePlus, faTrash } from "@fortawesome/pro-regular-svg-icons";
import { AdminLayout } from "../../../components/AdminLayout";
import { DocumentTabs } from "../../../components/exams/tabs";
import { useAuth } from "../../../hooks/useAuth";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup, EditRoles, UserRole } from "../../../types/roles";
import Button from "../../../components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import {
  AllDocumentsForListFragment,
  Documents_Filter,
  useGetAllCategoriesQuery,
  useGetAllDocumentsQuery,
  useUpdateDocumentMutation,
} from "api";
import { ColumnDef } from "@tanstack/react-table";
import { useModal } from "../../../hooks/useModal";
import { notify } from "../../../components/Notification";
import { useAdminTable } from "../../../hooks/useAdminTable";
import { SelectFilter } from "../../../components/SelectFilter";
import { Tabs2 } from "../../../components/Tabs2";
import { useAgency } from "../../../hooks/useAgency";
import { SearchInput } from "../../../components/SearchInput";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";

const PAGE_SIZE = 10;

function DocumentList() {
  const router = useRouter();
  const auth = useAuth();
  const globalAgency = useAgency();
  const modal = useModal();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const isAdmin =
    auth.currentUser?.role === UserRole.HSHAdmin ||
    auth.currentUser?.role === UserRole.Developer;
  const isAgency = auth.currentUser?.role === UserRole.AgencyUser;

  const [updateDocument] = useUpdateDocumentMutation({
    refetchQueries: ["GetAllDocuments"],
  });

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "date_created",
        desc: true,
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
  const categoriesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "document",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });

  const filter = useMemo(() => {
    let filters: Documents_Filter = {
      _and: [
        {
          _or: [
            {
              _or: [
                {
                  agencies: {
                    agencies_id: {
                      id: {
                        _in: globalAgency.currentAgency?.id
                          ? [String(globalAgency.currentAgency?.id)]
                          : [null],
                      },
                    },
                  },
                },
                { agencies: { agencies_id: { id: { _null: true } } } },
              ],
            },
            {
              id: { _nnull: !globalAgency.currentAgency?.id },
            },
          ],
        },
        { status: { _in: [DirectusStatus.PUBLISHED, DirectusStatus.DRAFT] } },
      ],
    };

    if (category) {
      filters._and?.push({
        categories: {
          categories_id: {
            id: {
              _eq: category,
            },
          },
        },
      });
    }

    return filters;
  }, [category, globalAgency.currentAgency?.id]);

  const documentsQuery = useGetAllDocumentsQuery({
    variables: {
      limit: PAGE_SIZE,
      offset: page.pageIndex * PAGE_SIZE,
      sort:
        sort && sort.length
          ? sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`)
          : undefined,
      search: debouncedSearchQuery,
      filter,
    },
    skip: !globalAgency.loaded,
  });

  const handleArchiveDocument = async (id: string) => {
    if (
      await modal.showConfirm("Are you sure you want to delete the Document?")
    ) {
      updateDocument({
        variables: {
          id: id,
          data: {
            status: DirectusStatus.ARCHIVED,
          },
        },
        onCompleted: () => {
          notify({
            type: "success",
            title: (
              <>
                This document has been successfully deleted! It’s been safely
                archived for future reference. All associated assignments will
                remain unaffected.
              </>
            ),
          });
        },
      });
    }
  };

  const columns: ColumnDef<AllDocumentsForListFragment>[] = [
    {
      header: "Title",
      enableSorting: true,
      accessorKey: "title",
      cell: ({ row }) => (
        <p
          className="overflow-hidden overflow-ellipsis whitespace-nowrap"
          title={row.original.title as string}
        >
          {row.original.title}
        </p>
      ),
    },
    {
      header: "Category",
      accessorKey: "categories",
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          {row.original.categories?.length &&
            row.original.categories?.at(0)?.categories_id?.title}
        </div>
      ),
    },
    {
      header: "Agency",
      accessorKey: "agencies",
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          {row.original.agencies?.length
            ? `${row.original.agencies?.at(0)?.agencies_id?.name}`
            : "All"}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="capitalize">{row.original.status}</div>
      ),
    },
  ];

  if (isAdmin || isAgency) {
    columns.push({
      header: "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.status === DirectusStatus.ARCHIVED) return null;

        if (isAgency) {
          const rowAgencyId = row.original.agencies?.at(0)?.agencies_id?.id;
          const userAgencyId = auth.currentUser?.agencies?.at(0)?.id;

          if (rowAgencyId !== userAgencyId) {
            return null;
          }
        }

        return (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleArchiveDocument(row.original.id)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      },
    });
  }

  const adminTable = useAdminTable<AllDocumentsForListFragment>({
    columns,
    data: documentsQuery.data?.documents || [],
    pageCount: Math.ceil(
      (documentsQuery.data?.documents_aggregated[0].count?.id || 0) / PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: documentsQuery.loading,
    totalItems: documentsQuery.data?.documents_aggregated[0].count?.id || 0,
    onRowClick: (row) => {
      router.push(`/admin/documents/detail/${row.id}`);
    },
  });

  const categoryOptions = categoriesQuery.data
    ? [
        {
          label: "All Categories",
          value: "",
        },
        ...categoriesQuery.data?.categories.map((item) => ({
          label: item.title!,
          value: item.id,
        })),
      ]
    : [];

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-medium text-blue-800 sm:mb-12">
        Documents
      </h1>
      <div className="mb-6 w-full border-b border-b-gray-100">
        <Tabs2 tabs={DocumentTabs} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SearchInput placeholder="Search Documents" onChange={setSearchQuery} />
        <SelectFilter
          options={categoryOptions}
          onChange={(e) => setCategory(e)}
        />
      </div>

      {[...EditRoles, UserRole.CredentialingUser].includes(
        auth.currentUser?.role!
      ) && (
        <div className="mt-8 flex justify-end">
          <Button
            label="New"
            classes="md:col-start-2 md:w-56 md:place-self-end"
            iconLeft={faCirclePlus}
            onClick={() => router.push("/admin/documents/detail/new")}
          />
        </div>
      )}
      <adminTable.Component />
    </AdminLayout>
  );
}

export default withAuth(DocumentList, AdminGroup);
