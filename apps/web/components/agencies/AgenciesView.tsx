import React, { useCallback, useEffect, useState } from "react";
import Button from "../Button";
import { SearchInput } from "../SearchInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ColumnDef } from "@tanstack/react-table";
import {
  AgencyForAdminFragment,
  useDeleteAgencyMutation,
  useGetAllAgenciesForAdminQuery,
  useGetMigrationRecordsQuery,
  useGetRunningDataMigrationQuery,
} from "api";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useDebounce } from "usehooks-ts";
import { useAdminTable } from "../../hooks/useAdminTable";
import { useModal } from "../../hooks/useModal";
import { GENERIC_SUCCESS_DELETED, notify } from "../Notification";
import { AgencyFormModal } from "./AgencyFormModal";
import { useAuth } from "../../hooks/useAuth";

import {
  faFileImport,
  faPlusCircle,
  faTrash,
} from "@fortawesome/pro-regular-svg-icons";
import { AdminEditRoles, UserRole } from "../../types/roles";
import { first } from "lodash";
import { query } from "../../utils/utils";
import clsx from "clsx";
import { Spinner } from "../Spinner";
import { useApolloClient } from "@apollo/client";

export const AgenciesView: React.FC = ({}) => {
  const auth = useAuth();
  const apolloClient = useApolloClient();
  const canEdit = AdminEditRoles.includes(auth.currentUser?.role!);
  const isProd = process.env.NEXT_PUBLIC_ENV_NAME === "prod";

  const canImport =
    (["migration", "local"].includes(
      process.env.NEXT_PUBLIC_ENV_NAME as string
    ) &&
      auth.currentUser?.role === UserRole.HSHAdmin) ||
    (isProd &&
      ["ignacio+import@germinateapps.com", "admin.import@hs-hire.com"].includes(
        auth.currentUser?.email as string
      ));

  const PAGE_SIZE = 10;

  const modal = useModal();

  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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

  const { data: allAgencies, loading: loadingAgencies } =
    useGetAllAgenciesForAdminQuery({
      variables: {
        limit: page.pageSize,
        offset: page.pageIndex * page.pageSize,
        sort: sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`),
        search: debouncedSearchQuery,
        filter: {
          status: { _eq: "published" },
        },
      },
    });

  const [canRunMigration, setCanRunMigration] = useState(true);
  const {
    data: dataMigrations,
    loading: loadingDataMigrations,
    startPolling,
    stopPolling,
  } = useGetRunningDataMigrationQuery({});

  const {
    data: migrationRecords,
    startPolling: recordsStartPolling,
    stopPolling: recordsStopPolling,
  } = useGetMigrationRecordsQuery({
    variables: {
      filters: {
        data_migration: {
          id: {
            _eq: dataMigrations?.data_migrations.at(0)?.id,
          },
        },
      },
    },
    skip: loadingDataMigrations || dataMigrations?.data_migrations.length === 0,
  });

  const [recordsLog, setRecordsLog] = useState<any>();

  useEffect(() => {
    if (!dataMigrations?.data_migrations.length) {
      stopPolling();
      recordsStopPolling();
      setCanRunMigration(true);
      apolloClient.refetchQueries({
        include: ["getAllAgenciesForAdmin"],
      });
    }
  }, [dataMigrations]);

  useEffect(() => {
    if (migrationRecords?.data_migration_records.length! > 0) {
      setRecordsLog(migrationRecords?.data_migration_records);
    }
  }, [migrationRecords]);

  const usedAgencyNames = allAgencies?.agencies.map((a) => a.name!) || [];

  const handleCreateAgency = async () => {
    await modal.show({
      title: "Create a new Agency",
      children: (onClose) => (
        <AgencyFormModal usedAgencyNames={usedAgencyNames} onClose={onClose} />
      ),
    });
  };

  const handleEditAgency = async (agency: AgencyForAdminFragment) => {
    await modal.show({
      title: `Edit "${agency.name}" Agency`,
      children: (onClose) => (
        <AgencyFormModal
          usedAgencyNames={usedAgencyNames}
          onClose={onClose}
          agency={agency}
        />
      ),
    });
  };

  const [deleteAgency] = useDeleteAgencyMutation({
    refetchQueries: ["getAllAgencies", "getAllAgenciesForAdmin"],
  });

  const handleDeleteAgency = useCallback(
    async (agency: AgencyForAdminFragment) => {
      const result = await modal.showConfirm(
        `Are you sure you want to delete agency "${agency.name}"?`
      );

      if (result) {
        await deleteAgency({
          variables: {
            id: agency.id,
          },
        });

        notify(GENERIC_SUCCESS_DELETED);
      }
    },
    [deleteAgency, modal]
  );

  const handleImport = async (portalID: number) => {
    setCanRunMigration(false);
    const migrationCall = await query(
      `/cms/migration/agency?agency_id=${portalID}`,
      "GET"
    );

    if (migrationCall?.status === 200) {
      startPolling(2000);
      recordsStartPolling(2000);
      notify({
        type: "success",
        title: <>Data migration started</>,
      });
    } else {
      setCanRunMigration(true);
      notify({
        type: "error",
        title: <>Data migration could not be started</>,
      });
    }
  };

  const columns: ColumnDef<AgencyForAdminFragment>[] = [
    {
      header: "Name",
      accessorKey: "name",
      enableSorting: true,
    },
    {
      header: "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        if (canEdit) {
          return (
            <div className="flex justify-end gap-3">
              {canImport &&
                !row.original.live_since &&
                row.original.import_portal_id && (
                  <button
                    type="button"
                    disabled={!canRunMigration}
                    onClick={async () => {
                      if (isProd) {
                        await modal.show({
                          title: "Confirm One-Time Agency Import",
                          disableClickOutside: true,
                          children: (onClose) => (
                            <>
                              <p>
                                <b className="text-red-600">
                                  This is a one-time import.
                                </b>
                              </p>
                              <br />
                              <ol className="mx-6 list-decimal">
                                <li>
                                  Prior to migration, please run the activity
                                  report on the old system.
                                </li>
                                <li>
                                  Upon completion, migration details will be
                                  updated in the database to prevent this agency
                                  from being accidentally migrated again.
                                </li>
                                <li>
                                  Once the migration is complete, Chris Council
                                  will need to update DNS for system redirection
                                  post-migration.
                                </li>
                              </ol>
                              <br />
                              <br />
                              <div className="flex justify-end gap-3">
                                <button
                                  className="rounded-lg bg-red-600 px-2 py-1 font-medium text-white transition-all hover:bg-red-500"
                                  onClick={onClose}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="rounded-lg bg-blue-800 px-2 py-1 font-medium text-white transition-all hover:bg-blue-600"
                                  onClick={() => {
                                    handleImport(
                                      row.original.import_portal_id!
                                    );
                                    onClose();
                                  }}
                                >
                                  Confirm Import
                                </button>
                              </div>
                            </>
                          ),
                        });
                        return;
                      } else {
                        handleImport(row.original.import_portal_id!);
                      }
                    }}
                    className="rounded-lg bg-blue-800 px-2 py-1 text-xs font-medium text-white transition-all hover:bg-blue-600 disabled:bg-blue-200"
                  >
                    Import Agency <FontAwesomeIcon icon={faFileImport} />
                  </button>
                )}
              {row.original.live_since && (
                <p className="text-center text-xs">
                  Live since <br />
                  {row.original.live_since.toUTCString()}
                </p>
              )}
              <button
                type="button"
                disabled={!canRunMigration}
                onClick={() => handleDeleteAgency(row.original)}
                className="rounded-lg bg-red-200 px-2 py-1 text-red-700 transition-all hover:bg-red-300 disabled:bg-red-100 disabled:text-red-400"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          );
        }
      },
    },
  ];

  const listAgenciesTable = useAdminTable<AgencyForAdminFragment>({
    data: allAgencies?.agencies || [],
    pageCount: Math.ceil(
      (first(allAgencies?.agencies_aggregated || [])?.count?.id || 0) /
        PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loadingAgencies,
    totalItems: first(allAgencies?.agencies_aggregated || [])?.count?.id || 0,
    onRowClick: (row) => canEdit && handleEditAgency(row),
    columns: columns,
  });

  useEffect(() => {
    setPage({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearchQuery, setPage]);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SearchInput placeholder="Search by Title" onChange={setSearchQuery} />
        {canEdit && (
          <>
            <div className="flex justify-end gap-3">
              <Button
                label="New"
                classes="md:col-start-2 md:w-56 md:place-self-end"
                onClick={handleCreateAgency}
                iconLeft={faPlusCircle}
              />
            </div>
          </>
        )}
      </div>
      {recordsLog && recordsLog.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 flex gap-3 font-medium">
            Import log{" "}
            <Spinner loading={!!dataMigrations?.data_migrations.length} />
          </h2>
          <div className="h-[400px] overflow-y-scroll rounded border bg-gray-50 p-2 text-xs">
            <pre>
              {recordsLog?.map((record: any) => (
                <span
                  key={record.id}
                  className={clsx(
                    record.level !== "info" ? "text-red-700" : "text-black"
                  )}
                >
                  {record.message?.replace("Data migration: ", "")}
                  {"\n"}
                </span>
              ))}
            </pre>
          </div>
        </>
      )}
      <listAgenciesTable.Component />
    </>
  );
};
