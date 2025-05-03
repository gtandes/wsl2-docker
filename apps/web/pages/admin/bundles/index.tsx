import { faPlusCircle } from "@fortawesome/pro-regular-svg-icons";
import { AdminLayout } from "../../../components/AdminLayout";
import Button from "../../../components/Button";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../types/roles";
import { useRouter } from "next/router";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { SearchInput } from "../../../components/SearchInput";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { useDeleteBundleMutation, useGetAllBundlesQuery } from "api";
import { useModal } from "../../../hooks/useModal";
import {
  GENERIC_SUCCESS_DELETED,
  notify,
} from "../../../components/Notification";
import { useAuth } from "../../../hooks/useAuth";
import { DirectusStatus } from "types";
import { useAgency } from "../../../hooks/useAgency";
import { Filters } from "../../../components/admin/bundles/Filters";
import { FilterComboInfoTooltip } from "../../../components/FilterComboInfoTooltip";
import { BundlesAdminTable } from "../../../components/admin/bundles/BundlesAdminTable";

const PAGE_SIZE = 10;
const debouncedTime = 500;

function Bundles() {
  const router = useRouter();
  const globalAgency = useAgency();

  const { currentUser } = useAuth();
  const canEdit = [
    UserRole.AgencyUser,
    UserRole.HSHAdmin,
    UserRole.CredentialingUser,
  ].includes(currentUser?.role!);
  const modal = useModal();

  const [filters, setFilters] = useState<Array<Record<string, any>>>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, debouncedTime);

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

  const bundlesAndFilters = useMemo(() => {
    const andFilters = [];

    if (globalAgency.currentAgency?.id) {
      andFilters.push({
        _or: [
          {
            agency: {
              id: {
                _eq: globalAgency.currentAgency?.id,
              },
            },
          },
          {
            agency: {
              id: {
                _null: true,
              },
            },
          },
        ],
      });
    }

    if (filters.length > 0) {
      andFilters.push({
        _or: filters,
      });
    }

    return andFilters;
  }, [filters, globalAgency.currentAgency?.id]);

  const bundlesQuery = useGetAllBundlesQuery({
    variables: {
      search: debouncedSearchQuery,
      sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
      limit: 10,
      offset: page.pageIndex * page.pageSize,
      filter: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        _and: bundlesAndFilters,
      },
    },
  });

  const [deleteBundle, deleteBundleResult] = useDeleteBundleMutation({
    refetchQueries: ["GetAllBundles"],
  });

  const totalPages =
    bundlesQuery.data?.bundles_aggregated.at(0)?.count?.id ?? 0;
  const bundles = bundlesQuery.data?.bundles;

  const handleDeleteBundle = async (id: string) => {
    if (!canEdit) return;

    const confirmed = await modal.showConfirm(
      "Are you sure you want to delete this bundle?"
    );

    if (!confirmed) return;

    await deleteBundle({
      variables: {
        id,
      },
    });

    notify(GENERIC_SUCCESS_DELETED);
  };

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  return (
    <AdminLayout>
      <div className="flex flex-col">
        <div className="mb-6 flex flex-row items-center gap-2">
          <h1 className="text-2xl font-medium text-blue-800">Bundles</h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <SearchInput placeholder="Search bundles" onChange={setSearchQuery} />
        </div>
        <Filters setFilters={setFilters} />
      </div>
      {canEdit && (
        <div className="mt-8 flex justify-end">
          <Button
            onClick={async () => await router.push(`/admin/bundles/new`)}
            label="New"
            disabled={!canEdit}
            iconLeft={faPlusCircle}
          />
        </div>
      )}
      <BundlesAdminTable
        bundles={bundles || []}
        totalPages={totalPages}
        page={page}
        setPage={setPage}
        sort={sort}
        setSort={setSort}
        loading={bundlesQuery.loading}
        loadingDeleteBundle={deleteBundleResult.loading}
        handleDeleteBundle={handleDeleteBundle}
        canEdit={canEdit}
        pageSize={PAGE_SIZE}
      />
    </AdminLayout>
  );
}

export default withAuth(Bundles, AdminGroup);
