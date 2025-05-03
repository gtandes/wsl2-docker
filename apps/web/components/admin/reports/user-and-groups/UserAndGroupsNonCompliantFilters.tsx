import {
  Directus_Users_Filter,
  useSummaryFiltersOptionsQuery,
  useSysUsersQuery,
} from "api";
import { useState, useMemo, useEffect } from "react";
import { DirectusStatus } from "types";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { UserRole } from "../../../../types/roles";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { merge } from "lodash";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface UserAndGroupsNonCompliantFiltersProps {
  setFilters: (filters: Directus_Users_Filter) => void;
}

const DEBOOUNCE_TIMEOUT = 500;

export const UserAndGroupsNonCompliantFilters: React.FC<
  UserAndGroupsNonCompliantFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();

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

  const [seachSpecialtiesQuery, setSearchSpecialtiesQuery] =
    useState<string>("");
  const [seachDepartmentsQuery, setSearchDepartmentsQuery] =
    useState<string>("");
  const [seachLocationsQuery, setSearchLocationsQuery] = useState<string>("");
  const [seachSupervisorsQuery, setSearchSupervisorsQuery] =
    useState<string>("");

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

        setFilters(filtersConfig);
      } else {
        setFilters(filtersConfig);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    departmentsFilter,
    locationsFilter,
    specialtiesFilter,
    supervisorsFilter,
    globalAgency,
    supervisorsQuery.loading,
    filtersQuery.loading,
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
          placeholder="Filter by Speciality"
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
function setFilters(arg0: { _and: Directus_Users_Filter[] }) {
  throw new Error("Function not implemented.");
}
