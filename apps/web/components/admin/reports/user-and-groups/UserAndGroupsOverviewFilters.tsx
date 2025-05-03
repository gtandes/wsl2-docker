import { useGetUserAndGroupsFiltersQuery, useSysUsersQuery } from "api";
import { useEffect, useMemo, useState } from "react";
import { UserRole } from "../../../../types/roles";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { useDebounce } from "usehooks-ts";
import { DirectusStatus } from "types";
import { useAgency } from "../../../../hooks/useAgency";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface UserAndGroupsOverviewFiltersProps {
  setSpecialtiesFilter: (filters: FilterComboOptions[]) => void;
  setDepartmentsFilter: (filters: FilterComboOptions[]) => void;
  setLocationsFilter: (filters: FilterComboOptions[]) => void;
  setSupervisorsFilter: (filters: FilterComboOptions[]) => void;
  specialtiesFilter: FilterComboOptions[];
  departmentsFilter: FilterComboOptions[];
  locationsFilter: FilterComboOptions[];
  supervisorsFilter: FilterComboOptions[];
  setFilters: (filters: any) => void;
}

const DEBOOUNCE_TIMEOUT = 400;

export const UserAndGroupsOverviewFilters: React.FC<
  UserAndGroupsOverviewFiltersProps
> = ({
  setSupervisorsFilter,
  setDepartmentsFilter,
  setLocationsFilter,
  setSpecialtiesFilter,
  setFilters,
  departmentsFilter,
  locationsFilter,
  specialtiesFilter,
  supervisorsFilter,
}) => {
  const globalAgency = useAgency();

  const [seachLocationsQuery, setSearchLocationsQuery] = useState<string>("");
  const [seachSpecialtiesQuery, setSearchSpecialtiesQuery] =
    useState<string>("");
  const [seachDepartmentsQuery, setSearchDepartmentsQuery] =
    useState<string>("");
  const [seachSupervisorsQuery, setSearchSupervisorsQuery] =
    useState<string>("");

  const debouncedSearchSupervisorsQuery = useDebounce(
    seachSupervisorsQuery,
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

  const filtersQuery = useGetUserAndGroupsFiltersQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      departmentsSearch: debouncedSearchDepartmentsQuery,
      locationsSearch: debouncedSearchLocationsQuery,
      specialtiesSearch: debouncedSearchSpecialtiesQuery,
      departmentsFilters: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        ...(globalAgency.currentAgency?.id && {
          agency: {
            id: {
              _eq: globalAgency.currentAgency.id,
            },
          },
        }),
      },
      locationsFilters: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
        ...(globalAgency.currentAgency?.id && {
          agency: {
            id: {
              _eq: globalAgency.currentAgency.id,
            },
          },
        }),
      },
      specialtiesFilters: {
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
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
            agencies_id: {
              id: {
                _eq: globalAgency.currentAgency.id,
              },
            },
          },
        }),
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchSupervisorsQuery,
    },
    skip: !globalAgency.loaded,
  });

  const departmentsOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery.data?.departments.map((d) => ({
        label: d.name,
        value: d.id,
      })) as FilterComboOptions[],
    [filtersQuery.data]
  );

  const locationsOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery.data?.locations.map((location) => ({
        label: location.name,
        value: location.id,
      })) as FilterComboOptions[],
    [filtersQuery.data]
  );

  const specialtiesOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery.data?.specialties?.map((specialty) => ({
        label: specialty.name,
        value: specialty.id,
      })) as FilterComboOptions[],
    [filtersQuery.data]
  );

  const supervisorsOptions = useMemo<FilterComboOptions[]>(
    () =>
      supervisorsQuery.data?.users.map((supervisor) => ({
        label: `${supervisor.first_name} ${supervisor.last_name}`,
        value: supervisor.id,
      })) as FilterComboOptions[],
    [supervisorsQuery.data]
  );

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (
        !globalAgency.loaded ||
        supervisorsQuery.loading ||
        filtersQuery.loading
      )
        return;

      const filter: {
        _and: any[];
      } = {
        _and: globalAgency.currentAgency?.id
          ? [
              {
                agency: {
                  id: { _eq: globalAgency.currentAgency?.id },
                },
              },
            ]
          : [],
      };

      if (specialtiesFilter.length > 0) {
        filter._and.push({
          directus_users_id: {
            agencies: {
              specialties: {
                specialties_id: {
                  id: { _in: specialtiesFilter.map((option) => option.value) },
                },
              },
            },
          },
        });
      }

      if (departmentsFilter.length > 0) {
        filter._and.push({
          directus_users_id: {
            agencies: {
              departments: {
                departments_id: {
                  id: { _in: departmentsFilter.map((option) => option.value) },
                },
              },
            },
          },
        });
      }

      if (locationsFilter.length > 0) {
        filter._and.push({
          directus_users_id: {
            agencies: {
              locations: {
                locations_id: {
                  id: { _in: locationsFilter.map((option) => option.value) },
                },
              },
            },
          },
        });
      }

      if (supervisorsFilter.length > 0) {
        filter._and.push({
          directus_users_id: {
            agencies: {
              supervisors: {
                directus_users_id: {
                  id: { _in: supervisorsFilter.map((option) => option.value) },
                },
              },
            },
          },
        });
      }

      setFilters(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    departmentsFilter,
    locationsFilter,
    specialtiesFilter,
    supervisorsFilter,
    globalAgency.loaded,
    filtersQuery.loading,
    supervisorsQuery.loading,
  ]);

  return (
    <div className="noprint mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="w-full">
        <FilterCombo
          label="Specialties"
          options={specialtiesOptions}
          filters={specialtiesFilter}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setSpecialtiesFilter}
          setDebounced={setSearchSpecialtiesQuery}
          placeholder="Filter by Specialty"
        />
      </div>
      <div className="w-full">
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
      <div className="w-full">
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
      <div className="w-full">
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
