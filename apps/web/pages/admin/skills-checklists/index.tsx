import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles, AdminGroup } from "../../../types/roles";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../components/Button";
import {
  faClone,
  faPlusCircle,
  faTrash,
} from "@fortawesome/pro-regular-svg-icons";
import { useAdminTable } from "../../../hooks/useAdminTable";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import {
  Sc_Definitions_Filter,
  SkillChecklistFragment,
  useDeleteSkillChecklistMutation,
  useGetAllCategoriesQuery,
  useGetTableSkillsChecklistsQuery,
  useGetTableSkillsChecklistsTotalPagesQuery,
} from "api";
import { SkillsChecklistsHeader } from "../../../components/skills-checklists/SkillsChecklistsHeader";
import { useDebounce } from "usehooks-ts";
import { useModal } from "../../../hooks/useModal";
import { SearchInput } from "../../../components/SearchInput";
import { useAuth } from "../../../hooks/useAuth";
import { useAgency } from "../../../hooks/useAgency";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { ColumnDef } from "@tanstack/react-table";
import { DirectusStatus } from "types";
import { CloneSkillChecklistModal } from "../../../components/skills-checklists/SkillChecklistCloneModal";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";

const PAGE_SIZE = 10;
const debouncedTime = 500;

function Skills() {
  const { currentUser } = useAuth();
  const globalAgency = useAgency();
  const isAdmin = AdminEditRoles.includes(currentUser?.role!);
  const router = useRouter();
  const modal = useModal();
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
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, debouncedTime);

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

  const checkListFilters = useMemo(() => {
    let filters: Sc_Definitions_Filter = {
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
                  agency: {
                    agencies_id: {
                      id: {
                        _in: globalAgency.currentAgency?.id
                          ? [String(globalAgency.currentAgency?.id)]
                          : [null],
                      },
                    },
                  },
                },
                { agency: { agencies_id: { id: { _null: true } } } },
              ],
            },
            {
              id: { _nnull: !globalAgency.currentAgency?.id },
            },
          ],
        },
      ],
    };

    if (category1Filters.length) {
      filters._and?.push({
        _or: category1Filters.map((c1) => ({
          category: { id: { _eq: c1.value } },
        })),
      });
    }
    if (category2Filters.length) {
      filters._and?.push({
        _or: category2Filters.map((c2) => ({
          speciality: { id: { _eq: c2.value } },
        })),
      });
    }
    if (category3Filters.length) {
      filters._and?.push({
        _or: category3Filters.map((c2) => ({
          sub_speciality: { id: { _eq: c2.value } },
        })),
      });
    }

    return filters;
  }, [
    globalAgency.currentAgency,
    category1Filters,
    category2Filters,
    category3Filters,
  ]);

  const skillsChecklistsQuery = useGetTableSkillsChecklistsQuery({
    variables: {
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      sort:
        sort && sort.length
          ? sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`)
          : undefined,
      search: debouncedSearchQuery,
      filter: checkListFilters,
    },
    skip: !globalAgency.loaded,
  });

  const skillsChecklistsTotalPagesQuery =
    useGetTableSkillsChecklistsTotalPagesQuery({
      variables: {
        search: debouncedSearchQuery,
        filter: checkListFilters,
      },
      skip: !globalAgency.loaded,
    });

  const [deleteSkillChecklist] = useDeleteSkillChecklistMutation({
    refetchQueries: [
      "getTableSkillsChecklists",
      "getTableSkillsChecklistsTotalPages",
    ],
  });

  const onDeleteSkillChecklist = useCallback(
    async (checklist: SkillChecklistFragment) => {
      const confirmed = await modal.showConfirm(
        `Do you want to delete skills checklist "${checklist.title}"?`
      );

      if (confirmed) {
        await deleteSkillChecklist({
          variables: {
            id: checklist.id,
          },
        });
      }
    },
    [deleteSkillChecklist, modal]
  );

  const onCloneSkillChecklist = useCallback(
    async (checklist: SkillChecklistFragment) => {
      await modal.show({
        title: "Clone Skills Checklist",
        children: (onClose) => (
          <CloneSkillChecklistModal checklist={checklist} onClose={onClose} />
        ),
      });
    },
    [modal]
  );

  const columns = useMemo(() => {
    const baseColumns: ColumnDef<SkillChecklistFragment>[] = [
      {
        header: "Title",
        accessorKey: "title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal">{row.original.title}</div>
        ),
      },
      {
        header: "Questions",
        id: "last_version.total_questions",
        accessorKey: "last_version.total_questions",
        enableSorting: true,
      },
      {
        header: "Categories (1, 2 & 3)",
        id: "category.title",
        accessorKey: "category.title",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal capitalize text-gray-400">
            {row.original.category?.title}
            {row.original.speciality?.title &&
              `,${row.original.speciality?.title}`}
            {row.original.sub_speciality?.title &&
              `,${row.original.sub_speciality?.title}`}
          </div>
        ),
      },
      {
        header: "Agency",
        accessorKey: "agency",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="w-28 whitespace-normal capitalize">
            {row.original.agency?.at(0)?.agencies_id?.name || "All"}
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
      baseColumns.push({
        header: () => "",
        accessorKey: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDeleteSkillChecklist(row.original)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-700 transition-all hover:bg-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
            <button
              type="button"
              onClick={() => onCloneSkillChecklist(row.original)}
              className="rounded-lg bg-blue-200 px-2 py-1 text-blue-700 transition-all hover:bg-blue-300"
            >
              <FontAwesomeIcon icon={faClone} />
            </button>
          </div>
        ),
      });
    }

    return baseColumns;
  }, [isAdmin, onCloneSkillChecklist, onDeleteSkillChecklist]);

  const skillsChecklistsTable = useAdminTable<SkillChecklistFragment>({
    columns,
    data: skillsChecklistsQuery.data?.sc_definitions || [],
    pageCount: Math.ceil(
      (skillsChecklistsTotalPagesQuery.data?.sc_definitions_aggregated.at(0)
        ?.count?.id || 0) / PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading:
      skillsChecklistsQuery.loading || skillsChecklistsTotalPagesQuery.loading,
    totalItems:
      skillsChecklistsTotalPagesQuery.data?.sc_definitions_aggregated.at(0)
        ?.count?.id || 0,
    onRowClick: (row) => router.push(`/admin/skills-checklists/${row.id}`),
  });

  useEffect(() => {
    if (debouncedSearchQuery) {
      setPage({
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      });
    }
  }, [debouncedSearchQuery, setPage]);

  return (
    <AdminLayout>
      <SkillsChecklistsHeader />
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
      <div className="mt-8 flex justify-end">
        {AdminEditRoles.includes(currentUser?.role!) && (
          <Button
            iconLeft={faPlusCircle}
            label="New"
            onClick={() => router.push("/admin/skills-checklists/new")}
          />
        )}
      </div>
      <skillsChecklistsTable.Component />
    </AdminLayout>
  );
}

export default withAuth(Skills, AdminGroup);
