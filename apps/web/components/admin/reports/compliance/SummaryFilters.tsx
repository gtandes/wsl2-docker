import {
  Directus_Users_Filter,
  useSysUsersQuery,
  useSummaryFiltersOptionsQuery,
} from "api";
import { useState, useEffect } from "react";
import { DirectusStatus } from "types";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { useUsersByFilters } from "../../../../hooks/useUserByFilters";
import { UserRole } from "../../../../types/roles";
import {
  FilterComboOptions,
  FilterCombo,
} from "../../../clinicians/FilterCombo";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface SummaryFiltersProps {
  setFilters: React.Dispatch<React.SetStateAction<Directus_Users_Filter>>;
}

const debouncedTime = 500;

export const SummaryFilters: React.FC<SummaryFiltersProps> = ({
  setFilters,
}) => {
  const globalAgency = useAgency();
  const { getUserBy } = useUsersByFilters(
    globalAgency.currentAgency?.id || null
  );

  const [supervisorsSearch, setSupervisorsSearch] = useState<string>("");
  const [departmentSearch, setDepartmentSearch] = useState<string>("");
  const [specialitySearch, setSpecialitySearch] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState<string>("");

  const debouncedSupervisorsSearchQuery = useDebounce(
    supervisorsSearch,
    debouncedTime
  );
  const debouncedSearchDepartmentQuery = useDebounce(
    departmentSearch,
    debouncedTime
  );
  const debouncedSearchSpecialityQuery = useDebounce(
    specialitySearch,
    debouncedTime
  );
  const debouncedSearchLocationQuery = useDebounce(
    locationSearch,
    debouncedTime
  );

  const [supervisorsFilters, setSupervisorsFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [departmentFilters, setDepartmentFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [specialityFilters, setSpecialityFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [locationFilters, setLocationFilters] = useState<FilterComboOptions[]>(
    []
  );

  const filtersOptionsQuery = useSummaryFiltersOptionsQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      departmentsFilter: globalAgency.currentAgency?.id
        ? {
            agency: { id: { _eq: globalAgency.currentAgency?.id } },
            status: { _eq: DirectusStatus.PUBLISHED },
          }
        : { status: { _eq: DirectusStatus.PUBLISHED } },
      departmentsSearch: debouncedSearchDepartmentQuery,
      specialtiesFilter: { status: { _eq: DirectusStatus.PUBLISHED } },
      specialtiesSearch: debouncedSearchSpecialityQuery,
      locationsFilter: globalAgency.currentAgency?.id
        ? {
            status: { _eq: DirectusStatus.PUBLISHED },
            agency: { id: { _eq: globalAgency.currentAgency?.id } },
          }
        : { status: { _eq: DirectusStatus.PUBLISHED } },
      locationsSearch: debouncedSearchLocationQuery,
    },
    skip: !globalAgency.loaded || !globalAgency.currentAgency?.id,
  });

  const supervisorsQuery = useSysUsersQuery({
    variables: {
      filter: globalAgency.currentAgency?.id
        ? {
            status: { _eq: DirectusStatus.ACTIVE },
            agencies: {
              agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
            },
            role: {
              id: {
                _in: [
                  UserRole.AgencyUser,
                  UserRole.UsersManager,
                  UserRole.CredentialingUser,
                ],
              },
            },
          }
        : {
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
          },
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSupervisorsSearchQuery,
    },
    skip: !globalAgency.loaded && !globalAgency.currentAgency?.id,
  });

  const usersOptions =
    (supervisorsQuery.data?.users.map((d) => ({
      label: `${d.first_name} ${d.last_name || ""}`,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  const departmentOptions =
    (filtersOptionsQuery.data?.departments.map((d) => ({
      label: d.name,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  const specialityOptions =
    (filtersOptionsQuery.data?.specialties.map((d) => ({
      label: d.name,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  const locationOptions =
    (filtersOptionsQuery.data?.locations.map((d) => ({
      label: d.name,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  useEffect(() => {
    if (globalAgency.currentAgency?.id && !filtersOptionsQuery.loading) {
      loadFilters();
    }
    return () => {};
    async function loadFilters() {
      const baseFilter = [{ role: { id: { _in: [UserRole.Clinician] } } }];
      const filter: Directus_Users_Filter = {
        _and: globalAgency.currentAgency?.id
          ? [
              {
                agencies: {
                  agencies_id: {
                    id: { _eq: globalAgency.currentAgency?.id },
                  },
                },
              },
              ...baseFilter,
            ]
          : [...baseFilter],
      };

      if (
        globalAgency.currentAgency?.id &&
        (departmentFilters.length ||
          specialityFilters.length ||
          locationFilters.length ||
          supervisorsFilters.length)
      ) {
        const users = await getUserBy(
          supervisorsFilters,
          locationFilters,
          departmentFilters,
          specialityFilters
        );

        filter._and?.push({
          id: {
            _in: users as string[],
          },
        });
      }
      setFilters(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    globalAgency,
    departmentFilters,
    specialityFilters,
    locationFilters,
    supervisorsFilters,
  ]);

  return (
    <div className="grid grid-cols-1 place-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="w-full">
        <FilterCombo
          label="User Groups by Departments"
          options={departmentOptions}
          filters={departmentFilters}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setDepartmentFilters}
          setDebounced={setDepartmentSearch}
          placeholder="Filter by Department"
        />
      </div>
      <div className="w-full">
        <FilterCombo
          label="User Groups by Locations"
          options={locationOptions}
          filters={locationFilters}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setLocationFilters}
          setDebounced={setLocationSearch}
          placeholder="Filter by Location"
        />
      </div>
      <div className="w-full">
        <FilterCombo
          label="User Groups by Specialties"
          options={specialityOptions}
          filters={specialityFilters}
          filterKey="label"
          disabled={!globalAgency.currentAgency?.id}
          setFilters={setSpecialityFilters}
          setDebounced={setSpecialitySearch}
          placeholder="Filter by Specialty"
        />
      </div>
      <div className="w-full">
        <FilterCombo
          label="User Groups by Supervisors"
          filterKey="label"
          options={usersOptions}
          disabled={!globalAgency.currentAgency?.id}
          filters={supervisorsFilters}
          setFilters={setSupervisorsFilters}
          setDebounced={setSupervisorsSearch}
          placeholder="Filter by Supervisor"
        />
      </div>
    </div>
  );
};
