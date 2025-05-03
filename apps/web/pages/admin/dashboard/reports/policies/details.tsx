import { faSignature } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Row, ColumnDef } from "@tanstack/react-table";
import {
  Junction_Directus_Users_Policies_Filter,
  useGetAllPoliciesForReportQuery,
  useGetAllPoliciesForReportLazyQuery,
  PoliciesForReportFragment,
} from "api";
import { format } from "date-fns";
import { first } from "lodash";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import { AnalyticsPoliciesReports } from "../../../../../components/admin/reports/policies/AnalyticsPoliciesReport";
import { PoliciesReportLayout } from "../../../../../components/admin/reports/policies/PoliciesReportLayout";
import { useAdminTable } from "../../../../../hooks/useAdminTable";
import { withAuth } from "../../../../../hooks/withAuth";
import { PoliciesReportsExport } from "../../../../../types/reports";
import { AdminGroup } from "../../../../../types/roles";
import { formatDateTimeSplitted } from "../../../../../utils/format";
import { exportToCsv } from "../../../../../utils/utils";
import { PoliciesDetailsFilters } from "../../../../../components/admin/reports/policies/PoliciesDetailsFilters";
import { notify } from "../../../../../components/Notification";

const PAGE_SIZE = 10;

const getDateTimeRow = (datetime: string | Date) => {
  const { date, time } = formatDateTimeSplitted(datetime as string);
  return (
    <div>
      {date} <br />
      <span className="text-gray-500">{time}</span>
    </div>
  );
};

const getDateRow = (datetime: string | Date) => {
  const { date } = formatDateTimeSplitted(datetime as string);
  return <div>{date}</div>;
};

const getPolicyStatus = (policy: any) => {
  if (policy.signed_on !== null) return "Signed";
  else if (policy.read !== null) return "Read";
  return "Unread";
};

const getPolicyStatusNode = (row: Row<any>) => {
  let label = "";
  let color = "";

  if (row.original.signed_on !== null) {
    label = "Signed";
    color = "green";
  } else if (row.original.read !== null) {
    label = "Read";
    color = "blue";
  } else {
    label = "Unread";
    color = "yellow";
  }

  return (
    <div
      className={`rounded-md bg-${color}-100 text-sm font-medium text-${color}-700 p-1`}
    >
      {label}
    </div>
  );
};

function PoliciesDetails() {
  const [filters, setFilters] =
    useState<Junction_Directus_Users_Policies_Filter>({});

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "assigned_on",
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

  const { data: policiesAssignments, loading: loadingPoliciesAssignments } =
    useGetAllPoliciesForReportQuery({
      variables: {
        limit: page.pageSize,
        offset: page.pageIndex * page.pageSize,
        sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
        filter: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const [assigmentsQuery, { loading: exportLoading }] =
    useGetAllPoliciesForReportLazyQuery();

  const totalAssignments = useMemo(
    () =>
      first(policiesAssignments?.junction_directus_users_policies_aggregated)
        ?.count?.id || 0,
    [policiesAssignments]
  );

  const exportReport = async () => {
    let offset = 0;
    let allPolicies: any[] = [];
    const LIMIT_BATCH_SIZE = 500;

    try {
      let hasMore = true;
      while (hasMore) {
        const { data: reportData } = await assigmentsQuery({
          variables: {
            filter: filters,
            limit: LIMIT_BATCH_SIZE,
            offset: offset,
          },
        });

        const fetchedPolicies =
          reportData?.junction_directus_users_policies || [];
        const transformedPolicies = fetchedPolicies.map((policy: any) => ({
          clinician: `${policy.directus_users_id?.first_name} ${policy.directus_users_id?.last_name}`,
          title: policy.policies_id?.name,
          status: getPolicyStatus(policy),
          signedDate: policy.signed_on
            ? format(new Date(policy.signed_on), "LL LLL yyyy hh:mm aa")
            : "Not Signed",
          expirationDate: policy.expires_on
            ? format(new Date(policy.expires_on), "LL LLL yyyy")
            : "N/A",
        }));

        allPolicies = allPolicies.concat(transformedPolicies); // Concatenation should work now
        hasMore = fetchedPolicies.length === LIMIT_BATCH_SIZE;
        offset += LIMIT_BATCH_SIZE;
      }

      exportToCsv<PoliciesReportsExport>("policies-reports", allPolicies);
    } catch (error: any) {
      notify({ type: "error", description: "error generating report" });
    }
  };

  const columns: ColumnDef<PoliciesForReportFragment>[] = useMemo(() => {
    return [
      {
        header: "Clinician",
        accessorKey: "directus.users_id.first_name",
        accessorFn: (f) => f.directus_users_id?.first_name,
        enableSorting: true,
        cell: ({ row }: { row: Row<PoliciesForReportFragment> }) => (
          <Link
            href={`/admin/dashboard/reports/${row.original.directus_users_id?.id}/user-details`}
          >
            <p
              className="w-[200px] cursor-pointer overflow-hidden overflow-ellipsis whitespace-nowrap"
              title={`${row.original.directus_users_id?.first_name} ${row.original.directus_users_id?.last_name}`}
            >
              {`${row.original.directus_users_id?.first_name} ${row.original.directus_users_id?.last_name}`}
            </p>
          </Link>
        ),
      },
      {
        header: "Title",
        accessorKey: "policies.id.name",
        accessorFn: (f) => f.policies_id?.name,
        enableSorting: true,
        cell: ({ row }: { row: Row<PoliciesForReportFragment> }) => (
          <p
            className="w-[200px] overflow-hidden overflow-ellipsis whitespace-nowrap"
            title={row.original.policies_id?.name as string}
          >
            {row.original.policies_id?.name}
          </p>
        ),
      },
      {
        header: "agency",
        accessorKey: "agency.name",
        cell: ({ row }) => (
          <p title={row.original.agency?.name as string}>
            {row.original.agency?.name}
          </p>
        ),
      },
      {
        header: "Status",
        enableSorting: true,
        accessorKey: "signed_on",
        cell: ({ row }) => (
          <div className="text-center capitalize">
            {getPolicyStatusNode(row)}
          </div>
        ),
      },
      {
        header: "Signed on",
        accessorKey: "read",
        enableSorting: true,
        cell: ({ row }) => getDateTimeRow(row.original?.read!),
      },
      {
        header: "Expires on",
        accessorKey: "expires_on",
        enableSorting: true,
        cell: ({ row }) => getDateRow(row.original?.expires_on!),
      },
      {
        header: "",
        accessorKey: "actions",
        enableSorting: false,
        cell: ({ row }) => {
          const status = getPolicyStatus(row.original);

          if (status !== "Signed") return null;

          const policySignatureLink = `/admin/policies/${row.original.id}/signature`;

          return (
            <div className="flex items-center gap-2">
              <Link
                href={policySignatureLink}
                className="rounded-lg bg-yellow-200 px-2 py-1 text-yellow-800 transition-all hover:bg-yellow-300"
              >
                <FontAwesomeIcon icon={faSignature} />
              </Link>
            </div>
          );
        },
      },
    ];
  }, []);

  const reportTable = useAdminTable<PoliciesForReportFragment>({
    columns,
    data: policiesAssignments?.junction_directus_users_policies || [],
    pageCount: Math.ceil(totalAssignments / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loadingPoliciesAssignments,
    totalItems: totalAssignments,
  });

  return (
    <PoliciesReportLayout>
      <div className="mb-4 flex flex-col justify-between md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">
            Policies Detail Reports
          </h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="noprint">
          <Button
            label="Export CSV/report"
            loading={exportLoading}
            variant="solid"
            disabled={totalAssignments === 0}
            onClick={exportReport}
          />
        </div>
      </div>
      <div className="mb-8 ">
        <PoliciesDetailsFilters setFilters={setFilters} />
        <h2 className="my-4 text-xl font-semibold">Analytics</h2>
        <AnalyticsPoliciesReports filters={filters} />
        <h2 className="my-4 text-xl font-semibold">List</h2>
        <reportTable.Component />
      </div>
    </PoliciesReportLayout>
  );
}

export default withAuth(PoliciesDetails, AdminGroup);
