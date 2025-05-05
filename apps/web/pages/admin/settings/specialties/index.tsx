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
  Specialties,
  useDeleteSpecialtyMutation,
  useGetAllSpecialtiesForListingQuery,
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
import { SpecialtiesFormModal } from "./SpecialtiesFormModal";
import { useAuth } from "../../../../hooks/useAuth";
import NotAuthorized from "../../../not-authorized";

const PAGE_SIZE = 10;
const ACCESSORS = {
  Name: "name",
};

function SpecialtieSettings() {
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

  const { data: specialtiesData, loading: loading } =
    useGetAllSpecialtiesForListingQuery({
      variables: {
        limit: PAGE_SIZE,
        offset: page.pageIndex * PAGE_SIZE,
        search: debouncedSearchQuery,
        filter: {
          status: { _eq: "published" },
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

  const specialties = specialtiesData?.specialties;
  const specialtiesTotal = first(specialtiesData?.total)?.count?.id;

  const [deleteSpecialty] = useDeleteSpecialtyMutation({
    refetchQueries: ["GetAllSpecialtiesForListing"],
  });

  const handleCreateSpecialtie = async () => {
    await modal.show({
      title: "Create a new Specialty",
      children: (onClose) => (
        <SpecialtiesFormModal agency={agency!} onClose={onClose} />
      ),
    });
  };

  const handleEditSpecialtie = async (specialty: Specialties) => {
    await modal.show({
      title: "Edit Specialty",
      children: (onClose) => (
        <SpecialtiesFormModal
          specialty={specialty}
          agency={agency!}
          onClose={onClose}
        />
      ),
    });
  };

  const handleDeleteSpecialtie = useCallback(
    async (specialty: Specialties) => {
      const result = await modal.showConfirm(
        `Are you sure you want to delete specialty "${specialty.name}"?`
      );

      if (result) {
        await deleteSpecialty({
          variables: {
            id: specialty.id,
          },
        });

        notify(GENERIC_SUCCESS_DELETED);
      }
    },
    [deleteSpecialty, modal]
  );

  const columns: ColumnDef<Specialties>[] = [
    {
      header: "Name",
      accessorFn: () => {},
      enableSorting: true,
      cell: ({ row }) => row.original.name,
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
              onClick={() => handleDeleteSpecialtie(row.original)}
              className="rounded-lg bg-red-200 px-2 py-1 text-red-700 transition-all hover:bg-red-300"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      },
    },
  ];
  const listSpecialtiesTable = useAdminTable<Specialties>({
    data: specialties || [],
    pageCount: Math.ceil((specialtiesTotal || 0) / PAGE_SIZE),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loading,
    totalItems: specialtiesTotal || 0,
    onRowClick: (row) => handleEditSpecialtie(row),
    columns: columns,
  });

  if (
    auth.currentUser?.role === UserRole.UsersManager ||
    auth.currentUser?.role === UserRole.CredentialingUser
  ) {
    return <NotAuthorized />;
  }

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
            onClick={handleCreateSpecialtie}
            iconLeft={faPlusCircle}
          />
        </div>
        <listSpecialtiesTable.Component />
      </AdminPanel>
    </AdminLayout>
  );
}

export default withAuth(SpecialtieSettings, AdminGroup);
