import {
  useSysUsersQuery,
  Directus_Users_Filter,
  Junction_Directus_Users_Documents_Filter,
  Junction_Directus_Users_Exams_Filter,
  Junction_Directus_Users_Policies_Filter,
  Junction_Modules_Definition_Directus_Users_Filter,
  Junction_Sc_Definitions_Directus_Users_Filter,
  useSummaryFiltersOptionsQuery,
} from "api";
import { useState, useMemo, useEffect } from "react";
import { DirectusStatus } from "types";
import { useDebounce } from "usehooks-ts";
import { UserRole } from "../../../../types/roles";
import DateInput from "../../../DateInput";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { useAgency } from "../../../../hooks/useAgency";
import { merge } from "lodash";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface UserAndGroupsDetailsFiltersProps {
  setFilters: (filters: Directus_Users_Filter) => void;
}

const statusOptions = [
  {
    label: "active",
    value: DirectusStatus.ACTIVE,
  },
  {
    label: "inactive",
    value: DirectusStatus.INACTIVE,
  },
];

const DEBOOUNCE_TIMEOUT = 500;

export const UserAndGroupsDetailsFilters: React.FC<
  UserAndGroupsDetailsFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();

  const [statusFilter, setStatusFilter] = useState<FilterComboOptions[]>([]);
  const [assignedOnDateStartFilter, setReadDateStartFilter] =
    useState<string>("");
  const [assignedOnDateEndFilter, setReadDateEndFilter] = useState<string>("");

  const [usersFilter, setUsersFilter] = useState<FilterComboOptions[]>([]);

  const [specialtiesFilter, setSpecialtiesFilter] = useState<
    FilterComboOptions[]
  >([]);

  const [departmentsFilter, setDepartmentsFilter] = useState<
    FilterComboOptions[]
  >([]);

  const [locationsFilter, setLocationsFilter] = useState<FilterComboOptions[]>(
    []
  );

  const [supervisorsFilter, setSupervisorsFilter] = useState<
    FilterComboOptions[]
  >([]);

  const [seachUsersQuery, setSearchUsersQuery] = useState<string>("");
  const [seachSpecialtiesQuery, setSearchSpecialtiesQuery] =
    useState<string>("");
  const [seachDepartmentsQuery, setSearchDepartmentsQuery] =
    useState<string>("");
  const [seachLocationsQuery, setSearchLocationsQuery] = useState<string>("");
  const [seachSupervisorsQuery, setSearchSupervisorsQuery] =
    useState<string>("");

  const debouncedSearchUsersQuery = useDebounce(
    seachUsersQuery,
    DEBOOUNCE_TIMEOUT
  );
  const debouncedSearchSpecialtiesQuery = useDebounce(
    seachSpecialtiesQuery,
    DEBOOUNCE_TIMEOUT
  );
  const debouncedSearchDepartmentsQuery = useDebounce(
    seachDepartmentsQuery,
    DEBOOUNCE_TIMEOUT
  );
  const debouncedSearchLocationsQuery = useDebounce(
    seachLocationsQuery,
    DEBOOUNCE_TIMEOUT
  );
  const debouncedSearchSupervisorsQuery = useDebounce(
    seachSupervisorsQuery,
    DEBOOUNCE_TIMEOUT
  );

  const cliniciansQuery = useSysUsersQuery({
    variables: {
      search: debouncedSearchUsersQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: { _eq: DirectusStatus.ACTIVE },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
          },
        }),
        role: {
          id: {
            _eq: UserRole.Clinician,
          },
        },
      },
    },
    skip: !globalAgency.loaded,
  });

  const filtersQuery = useSummaryFiltersOptionsQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      specialtiesSearch: debouncedSearchSpecialtiesQuery,
      departmentsSearch: debouncedSearchDepartmentsQuery,
      locationsSearch: debouncedSearchLocationsQuery,
      specialtiesFilter: {
        status: { _eq: DirectusStatus.PUBLISHED },
      },
      departmentsFilter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: { id: { _eq: globalAgency.currentAgency?.id } },
        }),
      },
      locationsFilter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: { id: { _eq: globalAgency.currentAgency?.id } },
        }),
      },
    },
    skip: !globalAgency.loaded,
  });

  const supervisorsQuery = useSysUsersQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.ACTIVE },
        role: {
          id: {
            _in: [
              UserRole.AgencyUser,
              UserRole.UsersManager,
              UserRole.CredentialingUser,
            ],
          },
        },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
          },
        }),
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchSupervisorsQuery,
    },
    skip: !globalAgency.loaded,
  });

  const cliniciansOptions = useMemo<FilterComboOptions[]>(
    () =>
      cliniciansQuery.data?.users?.map((user) => ({
        // TODO check
        label: `${user.first_name} ${user.last_name || ""}`,
        value: user.id,
      })) as FilterComboOptions[],
    [cliniciansQuery.data?.users]
  );

  const specialtiesOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery.data?.specialties?.map((specialty) => ({
        label: specialty.name,
        value: specialty.id,
      })) as FilterComboOptions[],
    [filtersQuery.data?.specialties]
  );

  const departmentsOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery.data?.departments.map((d) => ({
        label: d.name,
        value: d.id,
      })) as FilterComboOptions[],
    [filtersQuery.data?.departments]
  );

  const locationsOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery.data?.locations.map((location) => ({
        label: location.name,
        value: location.id,
      })) as FilterComboOptions[],
    [filtersQuery.data?.locations]
  );

  const supervisorsOptions = useMemo<FilterComboOptions[]>(
    () =>
      supervisorsQuery.data?.users.map((supervisor) => ({
        label: `${supervisor.first_name} ${supervisor.last_name}`,
        value: supervisor.id,
      })) as FilterComboOptions[],
    [supervisorsQuery.data?.users]
  );

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (
        !globalAgency.loaded ||
        cliniciansQuery.loading ||
        supervisorsQuery.loading ||
        filtersQuery.loading
      )
        return;

      let filtersConfig: Directus_Users_Filter = {
        role: {
          id: {
            _in: [UserRole.Clinician],
          },
        },
      };

      let statusFiltersConfig: any[] = [];

      let assignedOnDatesFilters: {
        exams?: Junction_Directus_Users_Exams_Filter;
        sc_definitions?: Junction_Sc_Definitions_Directus_Users_Filter;
        modules?: Junction_Modules_Definition_Directus_Users_Filter;
        documents?: Junction_Directus_Users_Documents_Filter;
        policies?: Junction_Directus_Users_Policies_Filter;
      }[] = [];

      if (usersFilter.length > 0) {
        merge(filtersConfig, {
          id: {
            _in: usersFilter.map((option) => option.value),
          },
        });
      }

      if (statusFilter.length === 1) {
        merge(filtersConfig, {
          agencies: {
            status: { _in: statusFilter.map((option) => option.value) },
          },
        });
      }

      if (assignedOnDateStartFilter || assignedOnDateEndFilter) {
        let assignedOnFilter:
          | Junction_Directus_Users_Exams_Filter
          | Junction_Sc_Definitions_Directus_Users_Filter
          | Junction_Modules_Definition_Directus_Users_Filter
          | Junction_Directus_Users_Documents_Filter
          | Junction_Directus_Users_Policies_Filter = {
          _and: [],
        };

        if (assignedOnDateStartFilter) {
          assignedOnFilter._and!.push({
            assigned_on: {
              _gte: assignedOnDateStartFilter,
            },
          });
        }
        if (assignedOnDateEndFilter) {
          assignedOnFilter._and!.push({
            assigned_on: {
              _lte: assignedOnDateEndFilter,
            },
          });
        }

        assignedOnDatesFilters = [
          { exams: assignedOnFilter },
          { sc_definitions: assignedOnFilter },
          { modules: assignedOnFilter },
          { documents: assignedOnFilter },
          { policies: assignedOnFilter },
        ];
      }

      if (specialtiesFilter.length > 0) {
        merge(filtersConfig, {
          agencies: {
            specialties: {
              specialties_id: {
                id: { _in: specialtiesFilter.map((option) => option.value) },
              },
            },
          },
        });
      }

      if (departmentsFilter.length > 0) {
        merge(filtersConfig, {
          agencies: {
            departments: {
              departments_id: {
                id: { _in: departmentsFilter.map((option) => option.value) },
              },
            },
          },
        });
      }

      if (locationsFilter.length > 0) {
        merge(filtersConfig, {
          agencies: {
            locations: {
              locations_id: {
                id: { _in: locationsFilter.map((option) => option.value) },
              },
            },
          },
        });
      }

      if (supervisorsFilter.length > 0) {
        merge(filtersConfig, {
          agencies: {
            supervisors: {
              directus_users_id: {
                id: { _in: supervisorsFilter.map((option) => option.value) },
              },
            },
          },
        });
      }

      if (globalAgency.currentAgency?.id) {
        merge(filtersConfig, {
          agencies: {
            agencies_id: {
              id: { _eq: globalAgency.currentAgency?.id },
            },
          },
        });

        setFilters({
          _and: [
            filtersConfig,
            ...assignedOnDatesFilters,
            ...statusFiltersConfig,
          ],
        });
      } else {
        setFilters({
          _and: [
            filtersConfig,
            ...assignedOnDatesFilters,
            ...statusFiltersConfig,
          ],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assignedOnDateEndFilter,
    assignedOnDateStartFilter,
    departmentsFilter,
    locationsFilter,
    specialtiesFilter,
    statusFilter,
    supervisorsFilter,
    usersFilter,
    globalAgency,
    cliniciansQuery.loading,
    supervisorsQuery.loading,
    filtersQuery.loading,
  ]);

  return (
    <div className="noprint mb-10 flex flex-wrap">
      <div className="mr-4 w-64">
        <FilterCombo
          label="Users"
          options={cliniciansOptions}
          filters={usersFilter}
          filterKey="label"
          setFilters={setUsersFilter}
          setDebounced={setSearchUsersQuery}
          placeholder="Filter by User"
        />
      </div>
      <div className="mr-4 w-64">
        <FilterCombo
          label="Active/Inactive user"
          options={statusOptions}
          filters={statusFilter}
          filterKey="label"
          setFilters={setStatusFilter}
          placeholder="Filter by Status"
        />
      </div>
      <div className="mr-4 w-64">
        <FilterCombo
          label="Specialties"
          options={specialtiesOptions}
          filters={specialtiesFilter}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setSpecialtiesFilter}
          setDebounced={setSearchSpecialtiesQuery}
          placeholder="Filter by Speciality"
        />
      </div>
      <div className="mr-4 w-64">
        <FilterCombo
          label="Department"
          options={departmentsOptions}
          filters={departmentsFilter}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setDepartmentsFilter}
          setDebounced={setSearchDepartmentsQuery}
          placeholder="Filter by Department"
        />
      </div>
      <div className="mr-4 w-64">
        <FilterCombo
          label="Location"
          options={locationsOptions}
          filters={locationsFilter}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setLocationsFilter}
          setDebounced={setSearchLocationsQuery}
          placeholder="Filter by Location"
        />
      </div>
      <div className="mr-4 w-64">
        <FilterCombo
          label="Supervisors"
          options={supervisorsOptions}
          filters={supervisorsFilter}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setSupervisorsFilter}
          setDebounced={setSearchSupervisorsQuery}
          placeholder="Filter by Supervisor"
        />
      </div>
    </div>
  );
};
