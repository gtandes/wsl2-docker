import { AdminLayout } from "../../../components/AdminLayout";
import Tabs from "../../../components/Tabs";
import { getExamTabs } from "../../../components/exams/tabs";
import { faTrash, faCirclePlus } from "@fortawesome/pro-regular-svg-icons";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles, AdminGroup } from "../../../types/roles";
import { useRouter } from "next/router";
import {
  AllExamsForListFragment,
  Exams_Filter,
  useGetAllCategoriesQuery,
  useGetAllExamsQuery,
  useUpdateExamMutation,
} from "api";
import { useAdminTable } from "../../../hooks/useAdminTable";
import React, { useEffect, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { ColumnDef, Row } from "@tanstack/react-table";
import { useModal } from "../../../hooks/useModal";
import { notify } from "../../../components/Notification";
import { useAuth } from "../../../hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../components/Button";
import { useAgency } from "../../../hooks/useAgency";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { SearchInput } from "../../../components/SearchInput";
import { DirectusStatus } from "types";
import { FilterComboInfoTooltip } from "../../../components/FilterComboInfoTooltip";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";

const PAGE_SIZE = 10;
const debouncedTime = 500;

function ExamsList() {
  const router = useRouter();
  const modal = useModal();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const auth = useAuth();
  const globalAgency = useAgency();
  const isAdmin = AdminEditRoles.includes(auth.currentUser?.role!);

  const [category1Filters, setCategory1Filters] = useState<
    FilterComboOptions[]
  >([]);
  const [category2Filters, setCategory2Filters] = useState<
    FilterComboOptions[]
  >([]);
  const [category3Filters, setCategory3Filters] = useState<
    FilterComboOptions[]
  >([]);
  const [category1Search, setCategory1Search] = useState<string>("");
  const [category2Search, setCategory2Search] = useState<string>("");
  const [category3Search, setCategory3Search] = useState<string>("");
  const debouncedSearchCategory1Query = useDebounce(
    category1Search,
    debouncedTime
  );
  const debouncedSearchCategory2Query = useDebounce(
    category2Search,
    debouncedTime
  );
  const debouncedSearchCategory3Query = useDebounce(
    category3Search,
    debouncedTime
  );

  const categories1Query = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "modality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchCategory1Query,
    },
  });

  const categories2Query = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "speciality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchCategory2Query,
    },
  });
  const categories3Query = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "sub_speciality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      sort: ["title"],
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchCategory3Query,
    },
  });

  const categories1Options =
    (categories1Query.data?.categories.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const categories2Options =
    (categories2Query.data?.categories.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const categories3Options =
    (categories3Query.data?.categories.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

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

  const filter = useMemo<Exams_Filter>(() => {
    let filters: Exams_Filter = {
      _and: [
        {
          status: {
            _in: [DirectusStatus.PUBLISHED, DirectusStatus.DRAFT],
          },
        },
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
            { id: { _nnull: !globalAgency.currentAgency?.id } },
          ],
        },
      ],
    };

    if (category1Filters.length) {
      filters._and?.push({
        _or: category1Filters.map((c1) => ({
          modality: { id: { _eq: c1.value } },
        })),
      });
    }
    if (category2Filters.length) {
      filters._and?.push({
        specialties: {
          categories_id: {
            id: { _in: category2Filters.flatMap((c2) => c2.value) },
          },
        },
      });
    }
    if (category3Filters.length) {
      filters._and?.push({
        subspecialties: {
          categories_id: {
            id: { _in: category3Filters.flatMap((c3) => c3.value) },
          },
        },
      });
    }

    return filters;
  }, [
    globalAgency.currentAgency,
    category1Filters,
    category2Filters,
    category3Filters,
  ]);

  const examsQuery = useGetAllExamsQuery({
    variables: {
      offset: page.pageIndex * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort:
        sort && sort.length
          ? sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`)
          : undefined,
      search: debouncedSearchQuery,
      filter,
    },
    skip: !globalAgency.loaded,
  });

  const [updateExamMutation] = useUpdateExamMutation();

  const columns: ColumnDef<AllExamsForListFragment>[] = [
    {
      header: "Title",
      enableSorting: true,
      accessorKey: "title",
      cell: ({ row }: { row: Row<AllExamsForListFragment> }) => (
        <p
          className="w-28 whitespace-normal"
          title={row.original.title as string}
        >
          {row.original.title}
        </p>
      ),
    },
    {
      header: "Categories (1, 2 & 3)",
      id: "modality.title",
      accessorKey: "modality.title",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="w-28 whitespace-normal capitalize text-gray-400">
          {row.original.modality?.title}
          {row.original.specialties?.length &&
            `, ${row.original.specialties
              ?.map((s) => s?.categories_id?.title)
              .join(", ")}`}
          {row.original.subspecialties?.length &&
            `, ${row.original.subspecialties
              ?.map((s) => s?.categories_id?.title)
              .join(", ")}`}
        </div>
      ),
    },
    {
      header: "Agency",
      accessorKey: "agencies",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="w-28 whitespace-normal">
          {row.original.agencies?.length
            ? row.original.agencies?.at(0)?.agencies_id?.name
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

  if (isAdmin) {
    columns.push({
      header: "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        if (row.original.status === DirectusStatus.ARCHIVED) return null;
        return (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleArchiveExam(row.original.id)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-800 transition-all hover:bg-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      },
    });
  }

  const adminTable = useAdminTable<AllExamsForListFragment>({
    columns,
    data: examsQuery.data?.exams || [],
    pageCount: Math.ceil(
      (examsQuery.data?.exams_aggregated[0].count?.id || 0) / PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: examsQuery.loading,
    totalItems: examsQuery.data?.exams_aggregated[0].count?.id || 0,
    onRowClick: (row) => {
      router.push(`/admin/exams/detail/${row.id}`);
    },
  });

  useEffect(() => {
    if (debouncedSearchQuery) {
      setPage({
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      });
    }
  }, [debouncedSearchQuery, setPage]);

  const handleArchiveExam = async (id: string) => {
    if (await modal.showConfirm("Are you sure you want to delete the Exam?")) {
      updateExamMutation({
        variables: {
          id: id,
          data: {
            status: DirectusStatus.ARCHIVED,
          },
        },
        refetchQueries: ["getAllExams"],
        onCompleted: () => {
          notify({
            type: "success",
            title: (
              <>
                This exam has been successfully deleted! It’s been safely
                archived for future reference. All associated questions and
                assignments will remain unaffected.
              </>
            ),
          });
        },
      });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-row items-center gap-2">
        <h1 className="text-2xl font-medium text-blue-800 ">Exams</h1>
        <FilterComboInfoTooltip />
      </div>
      <div className="mb-6 w-full border-b border-b-gray-100">
        <Tabs tabs={getExamTabs(isAdmin)} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SearchInput placeholder="Search by Title" onChange={setSearchQuery} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <FilterCombo
            placeholder="Filter by Category 1 - Modality"
            options={categories1Options}
            filters={category1Filters}
            filterKey="label"
            setFilters={setCategory1Filters}
            setDebounced={setCategory1Search}
          />
        </div>
        <div>
          <FilterCombo
            placeholder="Filter by Category 2 - Speciality"
            options={categories2Options}
            filters={category2Filters}
            filterKey="label"
            setFilters={setCategory2Filters}
            setDebounced={setCategory2Search}
          />
        </div>
        <div>
          <FilterCombo
            placeholder="Filter by Category 3 - Sub-specialties"
            options={categories3Options}
            filters={category3Filters}
            filterKey="label"
            setFilters={setCategory3Filters}
            setDebounced={setCategory3Search}
          />
        </div>
      </div>
      {isAdmin && (
        <div className="mt-8 flex justify-end">
          <Button
            label="New Exam"
            classes="md:col-start-2 md:w-56 md:place-self-end"
            iconLeft={faCirclePlus}
            onClick={() => {
              router.push("/admin/exams/detail/new");
            }}
          />
        </div>
      )}
      <adminTable.Component />
    </AdminLayout>
  );
}

export default withAuth(ExamsList, AdminGroup);
