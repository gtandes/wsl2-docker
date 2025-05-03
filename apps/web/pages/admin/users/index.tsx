import { faCirclePlus } from "@fortawesome/pro-regular-svg-icons";
import {
  Directus_Users,
  Directus_Users_Filter,
  SysUserForCrudDocument,
  SysUsersTableFragmentFragment,
  useCreateUserForAgencyMutation,
  useDepartmentsQuery,
  useLocationsQuery,
  useSpecialtiesQuery,
  useSysUserForCreationLazyQuery,
  useSysUsersQuery,
  useSysUsersTableQuery,
  useUpdateUserForAgencyMutation,
} from "api";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import React, { useEffect, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { AdminLayout } from "../../../components/AdminLayout";
import Button from "../../../components/Button";
import { withAuth } from "../../../hooks/withAuth";
import { getRoleOptions, UserRole, AdminGroup } from "../../../types/roles";
import { useRouter } from "next/router";

import {
  UserProfileForm,
  UserProfileFormValues,
} from "../../../components/UserProfileForm";
import { useModal } from "../../../hooks/useModal";
import { useAdminTable } from "../../../hooks/useAdminTable";
import { SearchInput } from "../../../components/SearchInput";
import { useAuth } from "../../../hooks/useAuth";
import { useAgency } from "../../../hooks/useAgency";
import {
  GENERIC_ERROR,
  GENERIC_SUCCESS_CREATED,
  notify,
  PROFILE_SYNC_SUCCESS,
  SYNC_NOT_ALLOWED,
} from "../../../components/Notification";
import AssignUsersCompentenciesModal from "../../../components/competencies/AssignUsersCompetenciesModal";
import { ColumnDef, Row } from "@tanstack/react-table";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { first } from "lodash";
import { directus } from "../../../utils/directus";
import {
  COMBOBOX_RESULTS_AMOUNT,
  usersAgencyStatusOptions,
  usersStatusOptions,
} from "../../../types/global";
import { FilterComboInfoTooltip } from "../../../components/FilterComboInfoTooltip";
import { getDateTimeRow } from "../../../components/exams/ExamsList";
import { DirectusStatus, EmailAction } from "types";
import { EmailActionsModal } from "../../../components/users/EmailActionsModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis } from "@fortawesome/pro-solid-svg-icons";
import { PopOver, PopOverItem } from "../../../components/PopOver";
import { query } from "../../../utils/utils";

const refetchQueries = ["sysUsersTable", "UserCompetencies"];

function Users() {
  const PAGE_SIZE = 10;
  const router = useRouter();
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState<string[] | null>(null);
  const [createUserAgency] = useCreateUserForAgencyMutation({ refetchQueries });
  const [existingUserFetch] = useSysUserForCreationLazyQuery();
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const modal = useModal();

  const { currentUser } = useAuth();
  const globalAgency = useAgency();

  const isAdminAndDeveloper =
    currentUser?.role === UserRole.HSHAdmin ||
    currentUser?.role === UserRole.Developer;

  const isAllAdmin =
    currentUser?.role === UserRole.AgencyUser ||
    currentUser?.role === UserRole.UsersManager ||
    currentUser?.role === UserRole.HSHAdmin;

  const showCreateUserAdminModal = () =>
    modal.show({
      title: "Create New Admin User",
      disableClickOutside: true,
      panelClasses: "md:!w-4/5 xl:!w-3/5",
      children: (onClose) => (
        <UserProfileForm
          createAdmin={true}
          onSubmit={(results) => onCreateUser(results, onClose)}
          isCreating={isAdminAndDeveloper}
        >
          <div className="mt-5 sm:mt-12 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <Button
              onClick={() => onClose()}
              label="Cancel"
              variant="outline"
              type="button"
            />
            <Button type="submit" label="Create" />
          </div>
        </UserProfileForm>
      ),
    });

  const showCreateUserModal = () =>
    modal.show({
      title: "Create New User",
      disableClickOutside: true,
      panelClasses: "md:!w-4/5 xl:!w-3/5",
      children: (onClose) => (
        <UserProfileForm
          onSubmit={(results) => onCreateUser(results, onClose)}
          isCreating={true}
        >
          <div className="mt-5 sm:mt-12 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <Button
              onClick={() => onClose()}
              label="Cancel"
              variant="outline"
              type="button"
            />
            <Button type="submit" label="Create" />
          </div>
        </UserProfileForm>
      ),
    });

  const showAssignCompetenciesModal = () => {
    modal.show({
      title: "Assign Competencies",
      disableClickOutside: true,
      panelClasses: "md:!w-[1000px]",
      children: (onClose) => (
        <AssignUsersCompentenciesModal onClose={onClose} />
      ),
    });
  };

  const showActionsAdminModal = (selectedUsers: Directus_Users[]) => {
    const roles = selectedUsers.reduce(
      (acc, user) => {
        if (user.role?.id === UserRole.Clinician) acc.hasClinician = true;
        if (user.role?.id === UserRole.AgencyUser) acc.hasAgencyAdmin = true;
        if (user.role?.id === UserRole.UsersManager) acc.hasManager = true;
        if (user.role?.id === UserRole.CredentialingUser)
          acc.hasCredentialinguser = true;
        return acc;
      },
      {
        hasClinician: false,
        hasAgencyAdmin: false,
        hasManager: false,
        hasCredentialinguser: false,
      }
    );

    const isClinicianSelected = roles.hasClinician;
    const isAdminOrManagerSelected =
      roles.hasAgencyAdmin || roles.hasManager || roles.hasCredentialinguser;

    modal.show({
      title: "Email Notification Actions",
      disableClickOutside: true,
      panelClasses: "md:!w-[800px]",
      children: (onClose) => (
        <EmailActionsModal
          onClose={onClose}
          users={selectedUsers}
          agency={globalAgency.currentAgency?.id || ""}
          hidden={{
            [EmailAction.SEND_EXPIRING_COMPETENCY_CLINICIAN]:
              isAdminOrManagerSelected,
            [EmailAction.SEND_EXPIRING_COMPETENCY_REPORTS]: isClinicianSelected,
            [EmailAction.DUE_DATE_REPORT_REMINDER]: isClinicianSelected,
            [EmailAction.DUE_DATE_REMINDER]: isAdminOrManagerSelected,
          }}
        />
      ),
    });
  };

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "first_name",
        desc: false,
      },
    ])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    }),
    { removeDefaultsFromUrl: true }
  );

  const allAgencies = !isAdminAndDeveloper
    ? false
    : !globalAgency.currentAgency?.id;

  const agencies = !isAdminAndDeveloper
    ? [String(first(auth.currentUser?.agencies)?.id)]
    : globalAgency.currentAgency?.id
    ? [String(globalAgency.currentAgency?.id)]
    : null;

  const debouncedTime = 500;
  const [roleFilters, setRoleFilters] = useState<FilterComboOptions[]>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [specialtyFilters, setSpecialtyFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [statusFilters, setStatusFilters] = useState<FilterComboOptions[]>([]);
  const [statusAgencyFilters, setStatusAgencyFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [specialtySearch, setSpecialtySearch] = useState<string>("");
  const debouncedSearchSpecialtyQuery = useDebounce(
    specialtySearch,
    debouncedTime
  );
  const specialtiesQuery = useSpecialtiesQuery({
    variables: {
      filter: { status: { _eq: "published" } },
      sort: ["name"],
      search: debouncedSearchSpecialtyQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });
  const specialtyOptions =
    (specialtiesQuery.data?.specialties.map((c) => ({
      label: c.name,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const agency = agencies?.length ? agencies[0] : null;
  const [departmentFilters, setDepartmentFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [departmentSearch, setDepartmentSearch] = useState<string>("");
  const debouncedDepartmentSearchQuery = useDebounce(
    departmentSearch,
    debouncedTime
  );
  const departmentsQuery = useDepartmentsQuery({
    variables: {
      filter: { status: { _eq: "published" }, agency: { id: { _eq: agency } } },
      sort: ["name"],
      search: debouncedDepartmentSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
    skip: !agency,
  });

  const departmentOptions =
    (departmentsQuery.data?.departments.map((c) => ({
      label: c.name,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const [locationFilters, setLocationFilters] = useState<FilterComboOptions[]>(
    []
  );
  const [locationSearch, setLocationSearch] = useState<string>("");
  const debouncedLocationSearchQuery = useDebounce(
    locationSearch,
    debouncedTime
  );
  const locationsQuery = useLocationsQuery({
    variables: {
      filter: { status: { _eq: "published" }, agency: { id: { _eq: agency } } },
      sort: ["name"],
      search: debouncedLocationSearchQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
    skip: !agency,
  });
  const locationOptions =
    (locationsQuery.data?.locations.map((c) => ({
      label: c.name,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const locationsQueryFilters = locationFilters.length
    ? {
        locations: {
          locations_id: {
            id: {
              _in: locationFilters.length
                ? locationFilters.map((d) => d.value)
                : [],
            },
          },
        },
      }
    : undefined;

  const [supervisorFilters, setSupervisorFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [supervisorSearch, setSupervisorSearch] = useState<string>("");
  const debouncedSupervisorSearchQuery = useDebounce(
    supervisorSearch,
    debouncedTime
  );
  const supervisorsQuery = useSysUsersQuery({
    variables: {
      filter: {
        status: { _eq: "active" },
        agencies: { agencies_id: { id: { _eq: agency } } },
        role: {
          id: {
            _in: [
              UserRole.AgencyUser,
              UserRole.UsersManager,
              UserRole.CredentialingUser,
            ],
          },
        },
      },
      search: debouncedSupervisorSearchQuery,
      sort: ["last_name"],
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
    skip: !agency,
  });

  const supervisorOptions =
    (supervisorsQuery.data?.users.map((c) => ({
      label: `${[c.first_name, c.last_name].join(" ")} - ${c.email}`,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const supervisorsQueryFilters = supervisorFilters.length
    ? {
        supervisors: {
          directus_users_id: {
            id: {
              _in: supervisorFilters.length
                ? supervisorFilters.map((d) => d.value)
                : [],
            },
          },
        },
      }
    : undefined;

  const departmentsQueryFilters = departmentFilters.length
    ? {
        departments: {
          departments_id: {
            id: {
              _in: departmentFilters.length
                ? departmentFilters.map((d) => d.value)
                : [],
            },
          },
        },
      }
    : undefined;

  const rolesQueryFilters = roleFilters.length
    ? {
        role: {
          id: {
            _in: roleFilters.length ? roleFilters.map((r) => r.value) : [],
          },
        },
      }
    : undefined;

  const specialtiesQueryFilters = specialtyFilters.length
    ? {
        specialties: {
          specialties_id: {
            id: { _in: specialtyFilters.map((s) => s.value) },
          },
        },
      }
    : [];

  const filters = useMemo<Directus_Users_Filter>(() => {
    return {
      _or: [
        {
          agencies: {
            agencies_id: {
              id: { _in: agencies },
            },
            ...specialtiesQueryFilters,
            ...departmentsQueryFilters,
            ...locationsQueryFilters,
            ...supervisorsQueryFilters,
            ...(statusAgencyFilters.length && {
              status: { _in: statusAgencyFilters.map((s) => s.value) },
            }),
          },
          ...(currentUser?.role === UserRole.UsersManager && {
            role: { id: { _nin: [UserRole.AgencyUser] } },
          }),
        },
        { id: { _nnull: allAgencies } },
      ],
      ...rolesQueryFilters,
      ...(statusFilters.length && {
        status: { _in: statusFilters.map((e) => e.value) },
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    specialtiesQueryFilters,
    departmentsQueryFilters,
    locationsQueryFilters,
    supervisorsQueryFilters,
    rolesQueryFilters,
    statusAgencyFilters,
    statusFilters,
    currentUser,
    allAgencies,
  ]);

  const usersQuery = useSysUsersTableQuery({
    variables: {
      filter: {
        ...filters,
        _and: [
          ...(debouncedSearchQuery && debouncedSearchQuery.length > 0
            ? debouncedSearchQuery
                .filter((term) => term !== "")
                .map((term) => ({
                  _or: [
                    { first_name: { _icontains: term } },
                    { last_name: { _icontains: term } },
                    { email: { _icontains: term } },
                  ],
                }))
            : []),
        ],
      },

      limit: PAGE_SIZE,
      offset: page.pageIndex * PAGE_SIZE,
      sort: sort.length
        ? sort.map((s: any) => `${s.desc ? "-" : ""}${s.id}`)
        : null,
    },
    skip: !globalAgency.loaded,
    onError: (error) => {
      console.error("Users query error:", error);
      notify({
        type: "error",
        title: "Failed to load users",
        description: "Unable to retrieve user data. Please try again later.",
      });
    },
  });

  const getAgenciesForTable = (row: Row<SysUsersTableFragmentFragment>) => {
    return agencies
      ? row.original.agencies?.filter((a) =>
          agencies?.includes(a?.agencies_id?.id as string)
        )
      : row.original.agencies;
  };

  const showStatusPill = (item: SysUsersTableFragmentFragment) => {
    let status = item.status;
    const currentAgency = item.agencies?.find(
      (agency) => agency?.agencies_id?.id! === agencies?.[0]
    );
    if (currentAgency && currentAgency?.status !== DirectusStatus.ARCHIVED) {
      status = currentAgency?.status;
    }
    return (
      <div
        className={`rounded-md bg-${
          status === DirectusStatus.ACTIVE ? "green" : "gray"
        }-100 text-${
          status === DirectusStatus.ACTIVE ? "green" : "gray"
        }-800 m-auto mr-[100%] mt-[6px] h-5 px-1 font-semibold`}
      >
        {status}
      </div>
    );
  };

  const selectedUsers = useMemo(() => {
    const users = usersQuery?.data?.users;
    const checkedUsers = [];
    if (users?.length) {
      for (const row in rowSelection) {
        checkedUsers.push(users?.[row as keyof typeof users]);
      }
    }
    return checkedUsers;
  }, [rowSelection, usersQuery?.data?.users]);

  const columns: ColumnDef<SysUsersTableFragmentFragment>[] = [
    {
      header: " ",
      cell: ({ row }) => {
        {
          return (
            row.original.role?.id !== UserRole.HSHAdmin &&
            !agency && (
              <div
                id={row.id}
                className="invisible absolute float-left -mt-4 ml-[25%] h-7 items-center rounded-full bg-black px-4 pt-1 text-white group-hover/user:visible"
              >
                Please select an agency to view a Clinician Profile.
              </div>
            )
          );
        }
      },
    },
    ...(globalAgency.currentAgency?.bh_enable
      ? [
          {
            header: "Bullhorn ID",
            accessorKey: "bullhorn_id",
            cell: ({
              row,
            }: {
              row: { original: SysUsersTableFragmentFragment };
            }) => {
              const currentAgencyId = globalAgency?.currentAgency?.id;
              const agency = row.original?.agencies?.find(
                (agency) => agency?.agencies_id?.id === currentAgencyId
              );

              const bullhornId = agency ? agency.bullhorn_id : null;
              return bullhornId === null || bullhornId === undefined
                ? "-"
                : bullhornId;
            },
          },
        ]
      : []),

    {
      header: "First name",
      accessorKey: "first_name",
      enableSorting: true,
    },
    {
      header: "Last name",
      accessorKey: "last_name",
      enableSorting: true,
    },
    {
      header: "Email",
      enableSorting: true,
      accessorKey: "email",
      cell: ({ row }) => (
        <div className="flex flex-col">
          {(row.original.agencies && row.original.agencies?.length > 1) ||
          row.original.role?.id! === UserRole.HSHAdmin ? (
            <a href={`/admin/users/${row.original.id}/profile`}>
              {row.original.email}
            </a>
          ) : (
            row.original.email
          )}
          {showStatusPill(row.original)}
        </div>
      ),
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => row.original.role?.name,
    },
    {
      header: "Agency",
      accessorKey: "agencies",
      cell: ({ row }) => {
        if (row.original.agencies && row.original.agencies?.length > 1) {
          return row.original.agencies.map((a) => (
            <p
              key={`${row.original.id}-${a?.agencies_id?.name}`}
              className="whitespace-pre-wrap"
            >
              {a?.agencies_id?.name}
            </p>
          ));
        } else {
          return (
            <p className="whitespace-pre-wrap">
              {row.original.agencies?.[0]?.agencies_id?.name || ""}
            </p>
          );
        }
      },
    },
    {
      header: "Specialties",
      id: "agencies.specialties",
      accessorFn: (f) => f.agencies,
      cell: ({ row }) => {
        const items = getAgenciesForTable(row)?.flatMap((a) =>
          a?.specialties?.flatMap((s) => s?.specialties_id?.name)
        );

        return items?.map((s) => <p key={`${row.original.id}-${s}`}>{s}</p>);
      },
    },
    {
      header: "Departments",
      id: "agencies.departments",
      accessorFn: (f) => f.agencies,
      cell: ({ row }) => {
        const items = getAgenciesForTable(row)?.flatMap((a) =>
          a?.departments?.flatMap((s) => s?.departments_id?.name)
        );

        return items?.map((s) => <p key={`${row.original.id}-${s}`}>{s}</p>);
      },
    },
    {
      header: "Locations",
      id: "agencies.locations",
      accessorFn: (f) => f.agencies,
      cell: ({ row }) => {
        const items = getAgenciesForTable(row)?.flatMap((a) =>
          a?.locations?.flatMap((s) => s?.locations_id?.name)
        );

        return items?.map((s) => <p key={`${row.original.id}-${s}`}>{s}</p>);
      },
    },
    {
      header: "Supervisors",
      id: "agencies.supervisors",
      accessorFn: (f) => f.agencies,
      cell: ({ row }) => {
        const items = getAgenciesForTable(row)?.flatMap((a) =>
          a?.supervisors?.flatMap((s) => s?.directus_users_id?.email)
        );

        return items?.map((s) => <p key={`${row.original.id}-${s}`}>{s}</p>);
      },
    },
    {
      header: "Last access",
      accessorKey: "last_access",
      cell: ({ row }) => getDateTimeRow(row.original.last_access!),
    },
  ];

  if (globalAgency.currentAgency?.id) {
    columns.push({
      header: () => "",
      accessorKey: "actions",
      enableSorting: false,
      cell: ({ row }) => (
        <PopOver button={<FontAwesomeIcon icon={faEllipsis} />}>
          {globalAgency.currentAgency?.bh_enable &&
            !row.original?.agencies?.[0]?.bullhorn_id && (
              <PopOverItem
                onClick={async () => {
                  if (row?.original?.role?.id !== UserRole.Clinician) {
                    notify(SYNC_NOT_ALLOWED);
                  } else if (row?.original?.id) {
                    await handleSyncProfile(
                      row.original.id,
                      row?.original?.agencies?.[0]?.id
                    );
                  }
                }}
              >
                Sync to Bullhorn
              </PopOverItem>
            )}
          <PopOverItem
            onClick={() =>
              showActionsAdminModal([row.original] as Directus_Users[])
            }
          >
            Actions
          </PopOverItem>
        </PopOver>
      ),
    });
  }

  const adminTable = useAdminTable<SysUsersTableFragmentFragment>({
    columns: !isAdminAndDeveloper
      ? columns.filter((c) => c.header !== "Agency")
      : columns,
    data: usersQuery.data?.users || [],
    pageCount: Math.ceil(
      (usersQuery.data?.users_aggregated[0].countDistinct?.id || 0) / PAGE_SIZE
    ),
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: usersQuery.loading,
    totalItems: usersQuery.data?.users_aggregated[0].countDistinct?.id || 0,
    addRowAttributes: (row) => {
      const role = row.role?.id;
      return role === UserRole.HSHAdmin ? { "data-role": role } : {};
    },
    ...(globalAgency.currentAgency?.id && {
      rowSelection: [rowSelection, setRowSelection],
      rowSelect: (row) => {},
    }),

    onRowClick: (row) =>
      (agencies || row.role?.id === UserRole.HSHAdmin) &&
      router.push(`/admin/users/${row.id}/profile`),
    isClickable: (row) => agencies || row.role?.id === UserRole.HSHAdmin,
  });

  const assignCompetencies = async (
    users_by: any,
    competencies: any,
    details: any,
    agency: string
  ): Promise<Response> => {
    await directus.auth.refreshIfExpired();
    const token = await directus.auth.token;
    const response = await fetch(`/cms/assignments/competencies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        users_by,
        competencies,
        details,
        agency,
      }),
      credentials: "include",
    });
    return response;
  };

  const onCreateUser = async (
    result: UserProfileFormValues,
    onClose: Function
  ) => {
    const isAdminAndDeveloper = result.role === UserRole.HSHAdmin;
    const email = result.email.trim().toLowerCase();
    const existingUsers = await existingUserFetch({
      variables: {
        email,
      },
      fetchPolicy: "network-only",
    });

    const existingUser = existingUsers?.data?.users.find(
      (user) => user.email?.trim().toLowerCase() === email
    );

    const currentAgencyId =
      globalAgency.currentAgency?.id || first(auth.currentUser?.agencies)?.id;

    if (
      existingUser &&
      [UserRole.AgencyUser, UserRole.UsersManager].includes(
        existingUser?.role?.id as UserRole
      )
    ) {
      notify({
        type: "error",
        title: "User already exists",
      });

      return;
    }

    if (
      existingUser &&
      existingUser?.agencies?.find(
        (a) => a?.agencies_id?.id === currentAgencyId
      )
    ) {
      notify({
        type: "error",
        title: "Clinician already exists",
      });

      return;
    }

    let commonValues = {};
    if (result.specialties && result.specialties.length) {
      commonValues = {
        ...commonValues,
        specialties: result.specialties?.length
          ? result.specialties.map((s) => ({
              specialties_id: { id: s.id },
            }))
          : undefined,
      };
    }

    if (result.departments && result.departments.length) {
      commonValues = {
        ...commonValues,
        departments: result.departments?.length
          ? result.departments.map((s) => ({
              departments_id: { id: s.id },
            }))
          : undefined,
      };
    }

    if (result.locations && result.locations.length) {
      commonValues = {
        ...commonValues,
        locations: result.locations?.length
          ? result.locations.map((s) => ({
              locations_id: { id: s.id },
            }))
          : undefined,
      };
    }

    if (result.supervisors && result.supervisors.length) {
      commonValues = {
        ...commonValues,
        supervisors: result.supervisors?.length
          ? result.supervisors.map((s) => ({
              directus_users_id: { id: s.id },
            }))
          : undefined,
      };
    }

    try {
      let userId: string = "";

      if (existingUser && result.role === UserRole.Clinician) {
        userId = existingUser.id;
        await createUserAgency({
          variables: {
            data: {
              directus_users_id: {
                id: userId,
              },
              agencies_id: {
                id: currentAgencyId,
              },
              employee_number: result.employee_number,
              ...commonValues,
            },
          },
        });
      } else {
        // create user api endpoint
        const url = `/api/v1/user/create`;
        // POST request API to create a user
        const response = await query(url, "POST", {
          ...result,
          ...(!isAdminAndDeveloper && {
            agencies: [
              {
                agencies_id: {
                  id: currentAgencyId,
                },
                employee_number: result.employee_number,
                ...commonValues,
              },
            ],
          }),
        });
        // get the response data
        const userData = await response.json();
        userId = userData.data;
      }

      if (!isAdminAndDeveloper) {
        await assignCompetencies(
          { users: [{ id: userId }] },
          result.competencies,
          result.details,
          currentAgencyId!
        );
      }

      notify(GENERIC_SUCCESS_CREATED);
      onClose();
    } catch (e) {
      notify(GENERIC_ERROR);
    }
  };

  useEffect(() => {
    setStatusAgencyFilters([]);
    setStatusFilters([]);
  }, [allAgencies]);

  const userCrudVariables = {
    filter: {
      id: {
        _eq: "a308f21c-1553-4a4a-9f4a-f0e735beb06e",
      },
      ...(globalAgency.currentAgency?.id && {
        agencies: {
          agencies_id: {
            id: {
              _eq: globalAgency.currentAgency.id,
            },
          },
        },
      }),
    },
  };

  const refetchCrudQuery = {
    query: SysUserForCrudDocument,
    variables: userCrudVariables,
  };

  const [updateUserAgency] = useUpdateUserForAgencyMutation({
    refetchQueries: [refetchCrudQuery, "sysUsersTable"],
  });

  //ID here is not directus_users_id nor agency id
  //Theres a field named id in junction_directus_users_id which is required of updateUserAgency mutation. -\(-_-)
  const handleSyncProfile = async (clinician_id: any, id: any) => {
    try {
      const agencyId = globalAgency?.currentAgency?.id;
      if (!agencyId) {
        console.warn("No agency ID found.");
        return notify(GENERIC_ERROR);
      }

      const response = await query(
        "/cms/integration/bullhorn/sync-by-one",
        "POST",
        {
          clinician_id,
          agency_id: agencyId,
        }
      );

      const data = await response.json();

      if (response.status !== 200) {
        return notify(GENERIC_ERROR);
      }

      notify(PROFILE_SYNC_SUCCESS);

      const candidateId = data?.candidate_id?.toString();
      if (candidateId) {
        await updateUserAgency({
          variables: {
            id: id,
            data: { bullhorn_id: candidateId },
          },
        });
      }
    } catch (error) {
      console.error("Sync failed with error:", error);
      notify(GENERIC_ERROR);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-2xl font-medium text-blue-800">Users</h1>
          <FilterComboInfoTooltip />
        </div>
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
          <SearchInput
            inputId="search-email"
            placeholder="Search by Name or Email"
            onChange={(value) =>
              setSearchQuery(value.replace(/\s+/g, " ").split(" "))
            }
          />
          <div>
            <FilterCombo
              placeholder="Filter by Role"
              options={getRoleOptions(auth.currentUser?.role as UserRole).slice(
                1
              )}
              filters={roleFilters}
              filterKey="label"
              setFilters={setRoleFilters}
            />
          </div>
          <div>
            <FilterCombo
              placeholder="Filter by Status"
              options={agencies ? usersAgencyStatusOptions : usersStatusOptions}
              filters={agencies ? statusAgencyFilters : statusFilters}
              filterKey="label"
              setFilters={agencies ? setStatusAgencyFilters : setStatusFilters}
            />
          </div>
        </div>
        {!allAgencies && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <FilterCombo
                placeholder="Filter by Specialties"
                options={specialtyOptions}
                filters={specialtyFilters}
                filterKey="label"
                setFilters={setSpecialtyFilters}
                setDebounced={setSpecialtySearch}
              />
            </div>
            <div>
              <FilterCombo
                placeholder="Filter by Departments"
                options={departmentOptions}
                filters={departmentFilters}
                filterKey="label"
                setFilters={setDepartmentFilters}
                setDebounced={setDepartmentSearch}
              />
            </div>
            <div>
              <FilterCombo
                placeholder="Filter by Locations"
                options={locationOptions}
                filters={locationFilters}
                filterKey="label"
                setFilters={setLocationFilters}
                setDebounced={setLocationSearch}
              />
            </div>
            <div>
              <FilterCombo
                placeholder="Filter by Supervisors"
                options={supervisorOptions}
                filters={supervisorFilters}
                filterKey="label"
                setFilters={setSupervisorFilters}
                setDebounced={setSupervisorSearch}
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            label="Assign Competencies"
            disabled={isAdminAndDeveloper && !globalAgency.currentAgency?.id}
            onClick={showAssignCompetenciesModal}
            classes="mr-3"
          />
          <Button
            onClick={showCreateUserModal}
            label="New User"
            disabled={isAdminAndDeveloper && !globalAgency.currentAgency?.id}
            iconLeft={faCirclePlus}
            classes="mr-3"
          />
          {isAdminAndDeveloper && (
            <Button
              onClick={showCreateUserAdminModal}
              label="New Admin User"
              iconLeft={faCirclePlus}
              disabled={!isAdminAndDeveloper}
            />
          )}
        </div>
        {globalAgency.currentAgency?.id && (
          <div className="w-60">
            <Button
              onClick={() =>
                showActionsAdminModal(selectedUsers as Directus_Users[])
              }
              label="Actions"
              disabled={!isAllAdmin || selectedUsers.length === 0}
            />
          </div>
        )}

        <adminTable.Component />
      </div>
    </AdminLayout>
  );
}

export default withAuth(Users, AdminGroup);
