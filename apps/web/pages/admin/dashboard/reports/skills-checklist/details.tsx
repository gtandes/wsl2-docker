import { ColumnDef } from "@tanstack/react-table";
import {
  Junction_Sc_Definitions_Directus_Users_Filter,
  useGetAllAssignedSkillChecklistOnReportQuery,
  useGetSkillChecklistsAssignmentsLazyQuery,
  SkillChecklistAssignmentFragment,
} from "api";
import { format } from "date-fns";
import Link from "next/link";
import { useState, useMemo } from "react";
import { CompetencyState, CompetencyType, ExpirationType } from "types";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import Button from "../../../../../components/Button";
import { FilterComboInfoTooltip } from "../../../../../components/FilterComboInfoTooltip";
import AnalyticsSkillsChecklistsReports from "../../../../../components/admin/reports/skill-checklist/AnalyticsSkillsChecklistsReports";
import { SkillsChecklistReportLayout } from "../../../../../components/admin/reports/skill-checklist/SkillsChecklistReportLayout";
import { useAdminTable } from "../../../../../hooks/useAdminTable";
import { withAuth } from "../../../../../hooks/withAuth";
import { SkillChecklistExport } from "../../../../../types/reports";
import { AdminGroup } from "../../../../../types/roles";
import {
  exportToCsv,
  showCompetencyResultLink,
} from "../../../../../utils/utils";
import { SkillsChecklistDetailsFilters } from "../../../../../components/admin/reports/skill-checklist/SkillsChecklistDetailsFilters";
import { faBarChart } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Frequency } from "../../../../../components/utils/Frequency";
import { Competencies } from "../../../../../types/global";
import { notify } from "../../../../../components/Notification";

const PAGE_SIZE = 10;

const getStatusRow = (sc: SkillChecklistAssignmentFragment) => {
  let text: string;
  let color: string;

  const status = sc.status as CompetencyState;

  switch (status) {
    case CompetencyState.COMPLETED:
      text = "COMPLETED";
      color = "green";
      break;
    case CompetencyState.EXPIRED:
      text = "EXPIRED";
      color = "red";
      break;
    case CompetencyState.DUE_DATE_EXPIRED:
      text = "EXPIRED";
      color = "red";
      break;
    case CompetencyState.PENDING:
      text = "NOT STARTED";
      color = "yellow";
      break;
    default:
      text = "UNKNOWN";
      color = "gray";
  }
  return (
    <div
      className={`rounded-md bg-${color}-100 text-sm font-medium text-${color}-700 inline-block p-1`}
    >
      {text}
    </div>
  );
};

function SkillsChecklistDetails() {
  const [filters, setFilters] =
    useState<Junction_Sc_Definitions_Directus_Users_Filter>({});

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

  const skillChecklistsAssignmentsQuery =
    useGetAllAssignedSkillChecklistOnReportQuery({
      variables: {
        limit: page.pageSize,
        offset: page.pageIndex * page.pageSize,
        sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
        filter: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const [assigmentsQuery, { loading: assigmentsLoading }] =
    useGetSkillChecklistsAssignmentsLazyQuery();

  const exportReport = async () => {
    const LIMIT_BATCH_SIZE = 500;
    let offset = 0;
    let allAssignments: any[] = [];

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

        const fetchedAssignments =
          reportData?.junction_sc_definitions_directus_users || [];

        const transformedAssignments = fetchedAssignments.map((js) => ({
          clinician: `${js.directus_users_id?.first_name} ${js.directus_users_id?.last_name}`,
          email: js.directus_users_id?.email,
          title: js.sc_definitions_id?.title,
          assignmentStatus: js.status,
          expirationDate: js.expires_on
            ? format(new Date(js.expires_on), "LL LLL yyyy hh:mm aa")
            : "N/A",
          finishedDate: js.finished_on
            ? format(new Date(js.finished_on), "LL LLL yyyy hh:mm aa")
            : "N/A",
          employeeNumbers: js.directus_users_id?.agencies
            ?.map((a) => `${a?.agencies_id?.name}: ${a?.employee_number}`)
            .join(","),
        }));

        allAssignments = allAssignments.concat(transformedAssignments);
        hasMore = fetchedAssignments.length === LIMIT_BATCH_SIZE;
        offset += LIMIT_BATCH_SIZE;
      }

      exportToCsv<SkillChecklistExport>(
        "skill-checklists-reports",
        allAssignments
      );
    } catch (error: any) {
      notify({ type: "error", description: "error generating report" });
    }
  };

  const columns: ColumnDef<SkillChecklistAssignmentFragment>[] = useMemo(() => {
    return [
      {
        header: "Clinician",
        accessorKey: "directus.users_id.first_name",
        accessorFn: (f) => f.directus_users_id?.first_name,
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/admin/dashboard/reports/${row.original.directus_users_id?.id}/user-details`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="cursor-pointer">
                <span className="font-semibold">
                  {row.original.directus_users_id?.first_name +
                    " " +
                    row.original.directus_users_id?.last_name}
                </span>
                <br />
                <span className="text-sm text-gray-400">
                  {row.original.directus_users_id?.email}
                </span>
              </div>
              <Frequency
                expiration={row.original?.expiration_type as ExpirationType}
              />
            </div>
          </Link>
        ),
      },
      {
        header: "Title",
        accessorKey: "sc.definitions_id.title",
        accessorFn: (f) => f.sc_definitions_id?.title,
        enableSorting: true,
        cell: ({ row }) => (
          <p
            className="w-[200px] overflow-hidden overflow-ellipsis whitespace-nowrap"
            title={`${row.original.sc_definitions_id?.title}`}
          >
            {row.original.sc_definitions_id?.title}
          </p>
        ),
      },
      {
        header: "Agency",
        accessorKey: "agency.name",
        enableSorting: false,
        cell: ({ row }) => row.original.agency?.name,
      },
      {
        header: "Status",
        accessorKey: "status",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="-ml-5 w-[110px] text-center">
            {getStatusRow(row.original)}
          </div>
        ),
      },
      {
        header: "Submission Date",
        accessorKey: "finished_on",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="capitalize">
            {row.original?.finished_on
              ? format(
                  new Date(row.original?.finished_on!),
                  "LL LLL yyyy hh:mm aa"
                )
              : "unsubmitted"}
          </div>
        ),
      },
      {
        header: "expires on",
        accessorKey: "expires_on",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="capitalize">
            {row.original?.expires_on
              ? format(
                  new Date(row.original?.expires_on!),
                  "LL LLL yyyy hh:mm aa"
                )
              : ""}
          </div>
        ),
      },
      {
        header: "",
        accessorKey: "actions",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === CompetencyState.COMPLETED && (
            <Link
              href={showCompetencyResultLink(
                CompetencyType.SKILL_CHECKLIST,
                row.original as Competencies,
                false,
                row.original?.directus_users_id?.id!
              )}
              target={row.original.import_report_url ? "_blank" : "_self"}
              className="rounded-lg bg-blue-200 px-2 py-1 text-blue-800 transition-all hover:bg-blue-300"
            >
              <FontAwesomeIcon icon={faBarChart} />
            </Link>
          ),
      },
    ];
  }, []);

  const totalAssignments = useMemo<number>(
    () =>
      skillChecklistsAssignmentsQuery.data
        ?.junction_sc_definitions_directus_users_aggregated[0].count?.id || 0,
    [skillChecklistsAssignmentsQuery]
  );

  const reportTable = useAdminTable<SkillChecklistAssignmentFragment>({
    columns,
    data:
      skillChecklistsAssignmentsQuery.data
        ?.junction_sc_definitions_directus_users || [],
    pageCount: Math.ceil(totalAssignments / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: skillChecklistsAssignmentsQuery.loading,
    totalItems: totalAssignments,
  });

  return (
    <SkillsChecklistReportLayout>
      <div className="mb-4 flex flex-col justify-between md:flex-row">
        <div className="flex flex-row items-baseline gap-2">
          <h1 className="mb-3 text-xl font-semibold">
            Skills Checklists Detail Reports
          </h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="noprint">
          <Button
            label="Export CSV/report"
            loading={assigmentsLoading}
            variant="solid"
            onClick={exportReport}
          />
        </div>
      </div>
      <div className="mb-8">
        <SkillsChecklistDetailsFilters setFilters={setFilters} />
        <h2 className="my-4 text-xl font-semibold">Analytics</h2>
        <AnalyticsSkillsChecklistsReports filters={filters} />
        <h2 className="my-4 text-xl font-semibold">List</h2>
        <reportTable.Component />
      </div>
    </SkillsChecklistReportLayout>
  );
}

export default withAuth(SkillsChecklistDetails, AdminGroup);
