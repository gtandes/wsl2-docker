import { first } from "lodash";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { UserAndGroupsReportsLayout } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsReportsLayout";
import {
  ACCESSORS,
  UsersReportList,
  processUserForExport,
  processUserForList,
} from "../../../../../components/admin/reports/user-and-groups/UsersReportList";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import {
  Directus_Users_Filter,
  useSysUsersForReportsQuery,
  useSysUsersForReportsExportLazyQuery,
} from "api";
import { useState } from "react";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { UsersAndGroupsReportsExport } from "../../../../../types/reports";
import { exportToCsv2 } from "../../../../../utils/utils";
import { UserAndGroupsDetailsFilters } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsDetailsFilters";
import { useAgency } from "../../../../../hooks/useAgency";
import { Spinner } from "../../../../../components/Spinner";

const PAGE_SIZE = 10;

function UserAndGroupsDetails() {
  const [filters, setFilters] = useState<Directus_Users_Filter>({});
  const { currentAgency, loaded } = useAgency();

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "last_name",
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

  const { data: usersResponse, loading: isUsersLoading } =
    useSysUsersForReportsQuery({
      variables: {
        limit: PAGE_SIZE,
        offset: page.pageIndex * PAGE_SIZE,
        sort: sort.map(
          (s: any) =>
            `${s.desc ? "-" : ""}${
              ACCESSORS[s.id as keyof typeof ACCESSORS]
                ? ACCESSORS[s.id as keyof typeof ACCESSORS]
                : s.id
            }`
        ),
        filter: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const usersListData = usersResponse?.users?.map((user) => {
    return processUserForList(user, currentAgency?.id ?? "");
  });
  const userListTotals = usersResponse?.userTotal;

  const [fetchUsers, { loading: isExporting }] =
    useSysUsersForReportsExportLazyQuery();

  if (!loaded) {
    return <Spinner />;
  }

  const exportReport = async () => {
    const PAGE_SIZE_EXPORT = 500;
    let allData: UsersAndGroupsReportsExport[] = [];
    let pageIndex = 0;

    while (true) {
      const reportData = await fetchUsers({
        variables: {
          filter: filters,
          limit: PAGE_SIZE_EXPORT,
          offset: pageIndex * PAGE_SIZE_EXPORT,
          sort: sort.map(
            (s: any) =>
              `${s.desc ? "-" : ""}${
                ACCESSORS[s.id as keyof typeof ACCESSORS]
                  ? ACCESSORS[s.id as keyof typeof ACCESSORS]
                  : s.id
              }`
          ),
        },
      });

      const fetchedData = reportData.data?.users.map((user) =>
        processUserForExport(user, currentAgency?.id ?? "")
      ) as UsersAndGroupsReportsExport[];

      if (!fetchedData.length) {
        break;
      }

      allData = [...allData, ...fetchedData];
      pageIndex++;
    }

    exportToCsv2<UsersAndGroupsReportsExport>("user-groups-reports", allData);
  };

  return (
    <UserAndGroupsReportsLayout>
      <div className="admin-report mb-8 rounded-md bg-white p-8 pt-0 shadow-sm">
        <div className="flex flex-col justify-between align-middle md:flex-row">
          <div className="flex flex-row items-baseline gap-2">
            <h1 className="mb-3 text-xl font-semibold">
              Users &amp; Groups Details Reports
            </h1>
            <FilterComboInfoTooltip />
          </div>
          <div className="noprint">
            <Button
              label="Export CSV/report"
              loading={isExporting}
              variant="solid"
              disabled={usersListData?.length === 0}
              onClick={exportReport}
            />
          </div>
        </div>
        <div className="mb-8">
          <UserAndGroupsDetailsFilters setFilters={setFilters} />
          <h2 className="noprint my-4 text-xl font-semibold">List</h2>
          <UsersReportList
            data={usersListData || []}
            isLoading={isUsersLoading}
            totalItems={first(userListTotals)?.countDistinct?.id || 0}
            sort={sort}
            setSort={setSort}
            page={page}
            setPage={setPage}
            pageCount={Math.ceil(
              (first(userListTotals)?.countDistinct?.id || 0) / PAGE_SIZE
            )}
            pageSize={PAGE_SIZE}
            spinnerClasses="h-24 w-24 my-20 border-8"
          />
        </div>
      </div>
    </UserAndGroupsReportsLayout>
  );
}

export default withAuth(UserAndGroupsDetails, AdminGroup);
