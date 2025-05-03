import React, { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup, EditRoles, UserRole } from "../../../types/roles";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../components/Button";
import { faPlusCircle, faTrash } from "@fortawesome/pro-regular-svg-icons";
import { useAdminTable } from "../../../hooks/useAdminTable";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import {
  Documents_Filter,
  PoliciesFragment,
  useDeletePolicyMutation,
  useGetAllCategoriesQuery,
  useGetAllPoliciesQuery,
  useGetAllPoliciesTotalItemsQuery,
} from "api";
import { useDebounce } from "usehooks-ts";
import { useModal } from "../../../hooks/useModal";
import { SearchInput } from "../../../components/SearchInput";
import { first } from "lodash";
import { Tabs2 } from "../../../components/Tabs2";
import { PoliciesTabs } from "../../../components/exams/tabs";
import { useAgency } from "../../../hooks/useAgency";
import { SelectFilter } from "../../../components/SelectFilter";
import { useAuth } from "../../../hooks/useAuth";
import { ColumnDef } from "@tanstack/react-table";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";

function Policies() {
  const router = useRouter();
  const auth = useAuth();
  const isAdmin =
    auth.currentUser?.role === UserRole.HSHAdmin ||
    auth.currentUser?.role === UserRole.Developer;
  const isAgency = auth.currentUser?.role === UserRole.AgencyUser;
  const isCredentialUser =
    auth.currentUser?.role === UserRole.CredentialingUser;
  const globalAgency = useAgency();
  const PAGE_SIZE = 10;

  const modal = useModal();

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const categoriesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "policy",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
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

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "name",
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

  const policiesQuery = useGetAllPoliciesQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      sort:
        sort && sort.length
          ? sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`)
          : undefined,
      search: debouncedSearchQuery,
      filter,
    },
  });

  const policiesTotalPagesQuery = useGetAllPoliciesTotalItemsQuery({
    variables: {
      search: debouncedSearchQuery,
      filter: {
        status: {
          _neq: DirectusStatus.ARCHIVED,
        },
      },
    },
  });

  const [deletePolicies] = useDeletePolicyMutation({
    refetchQueries: ["getAllPolicies", "getAllPoliciesTotalItems"],
  });

  const onDeletePolicy = async (policy: PoliciesFragment) => {
    const confirmed = await modal.showConfirm(
      `Do you want to delete policy "${policy.name}"?`
    );

    if (confirmed) {
      await deletePolicies({
        variables: {
          id: policy.id,
        },
      });
    }
  };

  const columns: ColumnDef<PoliciesFragment>[] = [
    {
      header: "Title",
      accessorKey: "name",
      enableSorting: true,
    },
    {
      header: "Category",
      accessorKey: "categories",
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          {row.original.categories?.length &&
            first(row.original.categories)?.categories_id?.title}
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
            ? `${first(row.original.agencies)?.agencies_id?.name}`
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

  if (isAdmin || isAgency || isCredentialUser) {
    columns.push({
      header: "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.status === DirectusStatus.ARCHIVED) return null;

        if (isAgency || isCredentialUser) {
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
              onClick={() => onDeletePolicy(row.original)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      },
    });
  }

  const policiesAdminTable = useAdminTable<PoliciesFragment>({
    columns: columns,
    data: policiesQuery.data?.policies || [],
    pageCount: Math.ceil(
      (first(policiesTotalPagesQuery.data?.policies_aggregated)?.count?.id ||
        0) / PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: policiesQuery.loading || policiesTotalPagesQuery.loading,
    totalItems:
      first(policiesTotalPagesQuery.data?.policies_aggregated)?.count?.id || 0,
    onRowClick: (row) => router.push(`/admin/policies/${row.id}`),
  });

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-medium text-blue-800 sm:mb-12">
        Policies
      </h1>
      <div className="mb-6 w-full border-b border-b-gray-100">
        <Tabs2 tabs={PoliciesTabs} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SearchInput placeholder="Search Policies" onChange={setSearchQuery} />
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
            iconLeft={faPlusCircle}
            onClick={() => router.push("/admin/policies/new")}
          />
        </div>
      )}

      <policiesAdminTable.Component />
    </AdminLayout>
  );
}

export default withAuth(Policies, AdminGroup);
