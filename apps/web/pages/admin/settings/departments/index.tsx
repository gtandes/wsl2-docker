import React, { useCallback, useState } from "react";
import { AdminLayout } from "../../../../components/AdminLayout";
import Tabs from "../../../../components/Tabs";
import { SettingsTabs } from "../../../../components/exams/tabs";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../../types/roles";
import Button from "../../../../components/Button";
import AdminPanel from "../../../../components/AdminPanel";
import { ColumnDef } from "@tanstack/react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Agencies,
  Departments,
  useDeleteDepartmentMutation,
  useGetAllDepartmentsForListingQuery,
} from "api";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import { SearchInput } from "../../../../components/SearchInput";
import { faPlusCircle, faTrash } from "@fortawesome/pro-regular-svg-icons";
import { useModal } from "../../../../hooks/useModal";
import {
  GENERIC_SUCCESS_DELETED,
  notify,
} from "../../../../components/Notification";
import { useDebounce } from "usehooks-ts";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { first } from "lodash";
import { useCurrentOrGlobalAgency } from "../../../../hooks/useAgency";
import { DepartmentFormModal } from "./DepartmentFormModal";
import { useAuth } from "../../../../hooks/useAuth";

const PAGE_SIZE = 10;
const ACCESSORS = {
  Name: "name",
  Agency: "agency.id",
};

function DepartmentSettings() {
  const auth = useAuth();
  const modal = useModal();
  const agency = useCurrentOrGlobalAgency();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const settingsTabs = SettingsTabs.filter((tab) =>
    tab.allowed_roles?.includes(auth.currentUser?.role as UserRole)
  );

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

  const { data: departmentsData, loading: loading } =
    useGetAllDepartmentsForListingQuery({
      variables: {
        limit: PAGE_SIZE,
        offset: page.pageIndex * PAGE_SIZE,
        search: debouncedSearchQuery,
        filter: {
          _and: [
            { status: { _eq: "published" } },
            agency && agency?.id
              ? {
                  agency: { id: { _eq: agency?.id } },
                }
              : {},
          ],
        },
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

  const departments = departmentsData?.departments;
  const departmentsTotal = first(departmentsData?.total)?.count?.id;

  const [deleteDepartment] = useDeleteDepartmentMutation({
    refetchQueries: ["GetAllDepartmentsForListing"],
  });

  const handleCreateDepartment = async () => {
    await modal.show({
      title: "Create a new Department",
      children: (onClose) => (
        <DepartmentFormModal agency={agency!} onClose={onClose} />
      ),
    });
  };

  const handleEditDepartment = async (department: Departments) => {
    await modal.show({
      title: "Edit Department",
      children: (onClose) => (
        <DepartmentFormModal
          department={department}
          agency={agency!}
          onClose={onClose}
        />
      ),
    });
  };

  const handleDeleteDepartment = useCallback(
    async (department: Departments) => {
      const result = await modal.showConfirm(
        `Are you sure you want to delete department "${department.name}"?`
      );

      if (result) {
        await deleteDepartment({
          variables: {
            id: department.id,
          },
        });

        notify(GENERIC_SUCCESS_DELETED);
      }
    },
    [deleteDepartment, modal]
  );

  const columns: ColumnDef<Departments>[] = [
    {
      header: "Name",
      accessorFn: () => {},
      enableSorting: true,
      cell: ({ row }) => row.original.name,
    },
    {
      header: "Agency",
      accessorFn: () => {},
      enableSorting: true,
      cell: ({ row }) => row.original.agency?.name,
    },
    {
      header: "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleDeleteDepartment(row.original)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-700 transition-all hover:bg-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      },
    },
  ];
  const listDepartmentsTable = useAdminTable<Departments>({
    data: departments || [],
    pageCount: Math.ceil((departmentsTotal || 0) / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loading,
    totalItems: departmentsTotal || 0,
    onRowClick: (row) => handleEditDepartment(row),
    columns: columns,
  });
  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-medium text-blue-800 sm:mb-12">
        Settings
      </h1>
      <Tabs tabs={settingsTabs} />
      <div className="mt-10" />
      <AdminPanel>
        <div className="mt-8 flex justify-between">
          <SearchInput placeholder="Search ..." onChange={setSearchQuery} />
          <Button
            label="New"
            onClick={handleCreateDepartment}
            iconLeft={faPlusCircle}
          />
        </div>
        <listDepartmentsTable.Component />
      </AdminPanel>
    </AdminLayout>
  );
}

export default withAuth(DepartmentSettings, AdminGroup);
