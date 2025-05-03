import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles } from "../../../types/roles";
import {
  MappingFragment,
  useGetAllExistingContentForMappingsQuery,
  useGetMappedMappingsQuery,
  useGetMappingsQuery,
  useUpdateDataMappingItemMutation,
} from "api/generated/graphql";
import React, { useState } from "react";
import { useAdminTable } from "../../../hooks/useAdminTable";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import clsx from "clsx";
import {
  GENERIC_ERROR,
  GENERIC_SUCCESS_SAVED,
  notify,
} from "../../../components/Notification";

const PAGE_SIZE = 25;

function Mappings() {
  const [filterMappings, setFilterMappings] = useState("exam");

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    })
  );

  const { data, loading } = useGetMappingsQuery({
    variables: {
      limit: PAGE_SIZE,
      offset: page.pageIndex * PAGE_SIZE,
      filter: {
        content_type: {
          _eq: filterMappings,
        },
      },
    },
  });

  const { data: mappedMappings } = useGetMappedMappingsQuery({
    variables: {
      filter: {
        content_type: {
          _eq: filterMappings,
        },
        _or: [
          {
            target_id_string: {
              _nnull: true,
            },
          },
          {
            target_id_number: {
              _nnull: true,
            },
          },
        ],
      },
    },
  });

  const { data: excludedMappings } = useGetMappedMappingsQuery({
    variables: {
      filter: {
        exclude: {
          _eq: true,
        },
      },
    },
  });

  const totalUnmapped =
    mappedMappings?.data_migration_mappings_aggregated.at(0)?.count?.id! +
    excludedMappings?.data_migration_mappings_aggregated.at(0)?.count?.id!;

  const [updateDataMappingMutation] = useUpdateDataMappingItemMutation({
    refetchQueries: ["getMappings", "getMappedMappings"],
  });

  const idIsNumber = ["module", "skill_checklist"].includes(filterMappings);

  const { data: existingContent } = useGetAllExistingContentForMappingsQuery();

  const totalItems =
    data?.data_migration_mappings_aggregated.at(0)?.count?.id || 0;

  const onUpdateMapping = async (e: any, id: string) => {
    const value = e.target ? e.target.value || null : e;
    const data =
      typeof value === "boolean"
        ? { exclude: value, target_id_number: null, target_id_string: null }
        : {
            target_id_number: idIsNumber ? value : undefined,
            target_id_string: idIsNumber ? undefined : value,
          };

    await updateDataMappingMutation({
      variables: {
        id,
        data,
      },
      onCompleted: () => {
        notify(GENERIC_SUCCESS_SAVED);
      },
      onError: () => notify(GENERIC_ERROR),
    });
  };

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "name",
        desc: false,
      },
    ])
  );

  const table = useAdminTable<MappingFragment>({
    data: data?.data_migration_mappings || [],
    pageCount: Math.ceil((totalItems || 0) / PAGE_SIZE),
    paginate: [page, setPage],
    loading: loading,
    sort: [sort, setSort],
    totalItems: totalItems || 0,
    columns: [
      {
        header: "Source name",
        accessorKey: "source_name",
        cell: (row) => (
          <div className="m-w-28 whitespace-normal">
            {row.row.original.source_name}
          </div>
        ),
      },
      {
        header: "Target",
        cell: (row) => {
          let existingItems;

          switch (row.row.original.content_type) {
            case "exam":
              existingItems = existingContent?.exams;
              break;
            case "module":
              existingItems = existingContent?.modules_definition;
              break;
            case "skill_checklist":
              existingItems = existingContent?.sc_definitions;
              break;
            case "policy":
              existingItems = existingContent?.policies;
              break;
            case "document":
              existingItems = existingContent?.documents;
              break;
          }

          const titleField = filterMappings === "policy" ? "name" : "title";
          const id = idIsNumber
            ? row.row.original.target_id_number || undefined
            : row.row.original.target_id_string || undefined;

          const options = [
            <option key="null" value={undefined}></option>,
            existingItems?.map((e: any) => {
              let agencyName = "";
              if (e.agencies?.length || e.agency?.length) {
                if (e.agencies?.at(0).agencies_id?.name) {
                  agencyName = e.agencies.at(0).agencies_id.name;
                }
                if (e.agency?.at(0).agencies_id?.name) {
                  agencyName = e.agency.at(0).agencies_id.name;
                }
              }

              return (
                <option key={e.id} value={e.id}>
                  {e[titleField]} {agencyName ? `(${agencyName})` : "(global)"}
                </option>
              );
            }),
          ];

          return (
            !row.row.original.exclude && (
              <select
                className={clsx(
                  "!p-0.5 text-sm",
                  id ? "bg-green-100" : "bg-red-100"
                )}
                defaultValue={String(id)}
                onChange={(e) => onUpdateMapping(e, row.row.original.id)}
              >
                {options}
              </select>
            )
          );
        },
      },
      {
        header: "Exclude",
        cell: (row) => (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={row.row.original.exclude || false}
              onChange={(e) =>
                onUpdateMapping(e.target.checked, row.row.original.id)
              }
            />
          </div>
        ),
      },
    ],
  });

  return (
    <AdminLayout>
      <h1 className="text-2xl font-medium text-blue-800">Mappings</h1>
      <p className="mt-4 font-medium">
        Total: {totalUnmapped} / {totalItems}
      </p>
      <div className="mt-6 flex items-center">
        <h2 className="mr-3 text-lg font-medium">View</h2>
        <select
          className="!p-0.5 !pl-2 !pr-8"
          defaultValue={filterMappings}
          onChange={(value) => {
            setPage({ pageIndex: 0, pageSize: PAGE_SIZE });
            setFilterMappings(value.target.value);
          }}
        >
          <option value="exam">Exams</option>
          <option value="module">Modules</option>
          <option value="skill_checklist">Skill Checklists</option>
          <option value="policy">Policies</option>
          <option value="document">Documents</option>
        </select>
      </div>
      <table.Component />
    </AdminLayout>
  );
}

export default withAuth(Mappings, AdminEditRoles);
