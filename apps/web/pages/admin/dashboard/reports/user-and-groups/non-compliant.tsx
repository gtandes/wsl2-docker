import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { UserAndGroupsReportsLayout } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsReportsLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import { UserAndGroupsNonCompliantFilters } from "../../../../../components/admin/reports/user-and-groups/UserAndGroupsNonCompliantFilters";
import {
  Directus_Users_Filter,
  useSysUsersForReportsQuery,
  useSysUsersForReportsExportLazyQuery,
} from "api";
import { useState } from "react";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { ACCESSORS } from "../../../../../components/admin/reports/user-and-groups/UserDetailsReportList";
import {
  processUserForList,
  UsersReportList,
  processNonCompliantUsersForReport,
} from "../../../../../components/admin/reports/user-and-groups/UsersReportList";
import { UsersAndGroupsNonCompliantReportsExport } from "../../../../../types/reports";
import { exportToCsv } from "../../../../../utils/utils";
import { CompetencyState } from "types";
import { first } from "lodash";
import { useAgency } from "../../../../../hooks/useAgency";
import { Spinner } from "../../../../../components/Spinner";

const PAGE_SIZE = 10;

function UsersAndGroupsNonCompliant() {
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

  const cliniciansQuery = useSysUsersForReportsQuery({
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
      filter: {
        ...filters,
        exams: {
          status: {
            _in: [
              CompetencyState.FAILED,
              CompetencyState.IN_PROGRESS,
              CompetencyState.NOT_STARTED,
            ],
          },
        },
        modules: {
          status: {
            _in: [
              CompetencyState.IN_PROGRESS,
              CompetencyState.PENDING,
              CompetencyState.FINISHED,
            ],
          },
          approved: {
            _eq: false,
          },
        },
        sc_definitions: {
          status: {
            _in: [CompetencyState.PENDING],
          },
        },
        policies: {
          signed_on: {
            _null: true,
          },
        },
        documents: {
          read: {
            _null: true,
          },
        },
      },
    },
    skip: !Object.keys(filters).length,
  });

  const usersListData = cliniciansQuery?.data?.users?.map((user) => {
    return processUserForList(user, currentAgency?.id ?? "");
  });
  const userListTotals =
    first(cliniciansQuery.data?.userTotal)?.countDistinct?.id || 0;

  const [fetchUsers, { loading: isExporting }] =
    useSysUsersForReportsExportLazyQuery();

  const exportReport = async () => {
    const reportData = await fetchUsers({
      variables: { filter: filters },
    });

    const dataToExport = reportData.data?.users
      .map(processNonCompliantUsersForReport)
      .flat() as UsersAndGroupsNonCompliantReportsExport[];

    exportToCsv<UsersAndGroupsNonCompliantReportsExport>(
      "user-groups-reports",
      dataToExport
    );
  };

  if (!loaded) {
    return <Spinner />;
  }

  return (
    <UserAndGroupsReportsLayout>
      <div className="flex flex-col justify-between align-middle md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">Non Compliant Reports</h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="noprint">
          <Button
            label="Export CSV/report"
            loading={isExporting}
            variant="solid"
            disabled={userListTotals === 0}
            onClick={exportReport}
          />
        </div>
      </div>
      <UserAndGroupsNonCompliantFilters setFilters={setFilters} />
      <UsersReportList
        data={usersListData || []}
        isLoading={cliniciansQuery.loading}
        totalItems={userListTotals || 0}
        sort={sort}
        setSort={setSort}
        page={page}
        setPage={setPage}
        pageCount={Math.ceil((userListTotals || 0) / PAGE_SIZE)}
        pageSize={PAGE_SIZE}
        spinnerClasses="h-24 w-24 my-20 border-8"
      />
    </UserAndGroupsReportsLayout>
  );
}

export default withAuth(UsersAndGroupsNonCompliant, AdminGroup);
