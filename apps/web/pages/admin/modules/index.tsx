import { faPlusCircle } from "@fortawesome/pro-regular-svg-icons";
import { AdminLayout } from "../../../components/AdminLayout";
import Button from "../../../components/Button";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles, AdminGroup } from "../../../types/roles";
import { useRouter } from "next/router";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { SearchInput } from "../../../components/SearchInput";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import {
  Modules_Definition_Filter,
  useDeleteModuleDefinitionMutation,
  useGetAllCategoriesQuery,
  useGetModulesDefinitionsQuery,
  useGetModulesDefinitionsTotalPagesQuery,
} from "api";
import { useModal } from "../../../hooks/useModal";
import {
  GENERIC_SUCCESS_DELETED,
  notify,
} from "../../../components/Notification";
import { useAuth } from "../../../hooks/useAuth";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { DirectusStatus } from "types";
import { FilterComboInfoTooltip } from "../../../components/FilterComboInfoTooltip";
import { ModulesAdminTable } from "../../../components/admin/modules/ModulesAdminTable";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";

const PAGE_SIZE = 10;
const debouncedTime = 500;
const categoriesLimit = 5;

function Modules() {
  const router = useRouter();

  const { currentUser } = useAuth();
  const canEdit = AdminEditRoles.includes(currentUser?.role!);

  const modal = useModal();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, debouncedTime);

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

  const [deleteModule] = useDeleteModuleDefinitionMutation({
    refetchQueries: [
      "getModulesDefinitions",
      "getModulesDefinitionsTotalPages",
    ],
  });

  const filter = useMemo<Modules_Definition_Filter>(() => {
    let filters: Modules_Definition_Filter = {
      _and: [
        {
          status: { _in: [DirectusStatus.PUBLISHED, DirectusStatus.DRAFT] },
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
        _or: category2Filters.map((c2) => ({
          specialty: { id: { _eq: c2.value } },
        })),
      });
    }
    if (category3Filters.length) {
      filters._and?.push({
        _or: category3Filters.map((c2) => ({
          sub_specialty: { id: { _eq: c2.value } },
        })),
      });
    }

    return filters;
  }, [category1Filters, category2Filters, category3Filters]);

  const modulesQuery = useGetModulesDefinitionsQuery({
    variables: {
      search: debouncedSearchQuery,
      sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
      limit: page.pageSize,
      offset: page.pageIndex * page.pageSize,
      filter,
    },
  });

  const modulesTotalPagesQuery = useGetModulesDefinitionsTotalPagesQuery({
    variables: {
      search: debouncedSearchQuery,
    },
  });

  const totalPages =
    modulesTotalPagesQuery.data?.modules_definition_aggregated.at(0)?.count
      ?.id ?? 0;
  const modulesDefinitions = modulesQuery.data?.modules_definition;

  const handleDeleteModule = useCallback(
    async (id: string) => {
      if (!canEdit) return;

      const confirmed = await modal.showConfirm(
        "Are you sure you want to delete this module?"
      );

      if (!confirmed) return;

      await deleteModule({
        variables: {
          id,
        },
      });

      notify(GENERIC_SUCCESS_DELETED);
    },
    [canEdit, deleteModule, modal]
  );

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  return (
    <AdminLayout>
      <div className="flex flex-col">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-2xl font-medium text-blue-800">Modules</h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <SearchInput
            placeholder="Search by Title"
            onChange={setSearchQuery}
          />
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
      </div>
      {canEdit && (
        <div className="mt-8 flex justify-end">
          <Button
            onClick={async () => await router.push(`/admin/modules/new`)}
            label="New"
            disabled={!canEdit}
            iconLeft={faPlusCircle}
          />
        </div>
      )}
      <ModulesAdminTable
        modules={modulesDefinitions || []}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        page={page}
        setPage={setPage}
        sort={sort}
        setSort={setSort}
        loading={modulesQuery.loading}
        handleDeleteModule={handleDeleteModule}
        canEdit={canEdit}
      />
    </AdminLayout>
  );
}

export default withAuth(Modules, AdminGroup);
