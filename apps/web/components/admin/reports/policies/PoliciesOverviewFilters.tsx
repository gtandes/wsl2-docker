import {
  Policies_Filter,
  useGetPoliciesOverviewFiltersQuery,
  useSysUsersQuery,
} from "api";
import { useEffect, useMemo, useState } from "react";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { UserRole } from "../../../../types/roles";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { useUsersByFilters } from "../../../../hooks/useUserByFilters";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface PoliciesOverviewFiltersProps {
  setFilters: (filters: Policies_Filter) => void;
}

const debouncedTime = 500;

export const PoliciesOverviewFilters: React.FC<
  PoliciesOverviewFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();
  const { getUserBy } = useUsersByFilters(
    globalAgency.currentAgency?.id || null
  );

  const [policiesFilter, setPoliciesFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [categoryFilters, setCategoryFilters] = useState<FilterComboOptions[]>(
    []
  );
  const [departmentFilters, setDepartmentFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [specialityFilters, setSpecialityFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [locationFilters, setLocationFilters] = useState<FilterComboOptions[]>(
    []
  );
  const [supervisorFilters, setSupervisorFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [policiesQuery, setPoliciesQuery] = useState<string>("");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [departmentSearch, setDepartmentSearch] = useState<string>("");
  const [specialitySearch, setSpecialitySearch] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [supervisorSearch, setSupervisorSearch] = useState<string>("");
  const debouncedPoliciesQuery = useDebounce(policiesQuery, debouncedTime);
  const debouncedSearchCategoryQuery = useDebounce(
    categorySearch,
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
  const debouncedSearchSupervisorQuery = useDebounce(
    supervisorSearch,
    debouncedTime
  );

  const filtersQuery = useGetPoliciesOverviewFiltersQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      policiesSearch: debouncedPoliciesQuery,
      categorySearch: debouncedSearchCategoryQuery,
      departmentsSearch: debouncedSearchDepartmentQuery,
      locationsSearch: debouncedSearchLocationQuery,
      specialtiesSearch: debouncedSearchSpecialityQuery,
      policiesFilters: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
          },
        }),
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
      specialtiesFilter: {
        status: { _eq: DirectusStatus.PUBLISHED },
      },
    },
    skip: !globalAgency.loaded,
  });

  const supervisorQuery = useSysUsersQuery({
    variables: {
      filter: globalAgency.currentAgency?.id
        ? {
            status: { _eq: "active" },
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
            status: { _eq: "active" },
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
      search: debouncedSearchSupervisorQuery,
    },
    skip: !globalAgency.loaded,
  });

  const policiesOptions = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery?.data?.policies?.map((policy) => ({
        label: policy.name,
        value: policy.id,
      })) as FilterComboOptions[],
    [filtersQuery]
  );
  const categoriesOptions =
    (filtersQuery.data?.categories.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const departmentOptions =
    (filtersQuery.data?.departments.map((d) => ({
      label: d.name,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  const specialityOptions =
    (filtersQuery.data?.specialties.map((d) => ({
      label: d.name,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  const locationOptions =
    (filtersQuery.data?.locations.map((d) => ({
      label: d.name,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  const supervisorOptions =
    (supervisorQuery.data?.users.map((d) => ({
      label: `${d.first_name} ${d.last_name}`,
      value: d.id,
    })) as FilterComboOptions[]) || [];

  useEffect(() => {
    loadFilters();
    return () => {};
    async function loadFilters() {
      if (
        !globalAgency.loaded ||
        supervisorQuery.loading ||
        filtersQuery.loading
      )
        return;

      const statusFilter = [{ status: { _eq: "published" } }];
      const filter: Policies_Filter = {
        _and: globalAgency.currentAgency?.id
          ? [
              {
                directus_users: {
                  agency: {
                    id: { _eq: globalAgency.currentAgency?.id },
                  },
                },
              },
              ...statusFilter,
            ]
          : [...statusFilter],
      };

      if (policiesFilter.length) {
        filter._and?.push({
          id: { _in: policiesFilter.map((doc) => doc.value) },
        });
      }
      if (categoryFilters.length) {
        filter?._and?.push({
          categories: {
            categories_id: {
              id: { _in: categoryFilters.map((cat1) => cat1.value) },
            },
          },
        });
      }
      if (
        globalAgency.currentAgency?.id &&
        (departmentFilters.length ||
          specialityFilters.length ||
          locationFilters.length ||
          supervisorFilters.length)
      ) {
        const users = await getUserBy(
          supervisorFilters,
          locationFilters,
          departmentFilters,
          specialityFilters
        );

        filter._and?.push({
          directus_users: {
            directus_users_id: { id: { _in: users as string[] } },
          },
        });
      }
      setFilters(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    globalAgency,
    policiesFilter,
    categoryFilters,
    departmentFilters,
    specialityFilters,
    locationFilters,
    supervisorFilters,
    supervisorQuery.loading,
    filtersQuery.loading,
  ]);

  useEffect(() => {
    setPoliciesFilter([]);
    setCategoryFilters([]);
    setSupervisorFilters([]);
    setDepartmentFilters([]);
    setLocationFilters([]);
    setSpecialityFilters([]);
  }, [globalAgency]);

  return (
    <div className="noprint mb-10 flex flex-col gap-4">
      <div className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="w-full">
          <FilterCombo
            label="Title"
            options={policiesOptions}
            filters={policiesFilter}
            filterKey="label"
            setFilters={setPoliciesFilter}
            setDebounced={setPoliciesQuery}
            placeholder="Filter by Title"
          />
        </div>
        <div className="w-full">
          <FilterCombo
            label="Policy Category"
            options={categoriesOptions}
            filters={categoryFilters}
            filterKey="label"
            setFilters={setCategoryFilters}
            setDebounced={setCategorySearch}
            placeholder="Filter by Category"
          />
        </div>
      </div>
      <div className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="w-full">
          <FilterCombo
            label="Department"
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
            label="Location"
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
            label="Speciality"
            options={specialityOptions}
            filters={specialityFilters}
            filterKey="label"
            disabled={!globalAgency.currentAgency?.id}
            setFilters={setSpecialityFilters}
            setDebounced={setSpecialitySearch}
            placeholder="Filter by Speciality"
          />
        </div>
        <div className="w-full">
          <FilterCombo
            label="Supervisor"
            options={supervisorOptions}
            filters={supervisorFilters}
            filterKey="label"
            disabled={!globalAgency.currentAgency?.id}
            setFilters={setSupervisorFilters}
            setDebounced={setSupervisorSearch}
            placeholder="Filter by Supervisor"
          />
        </div>
      </div>
    </div>
  );
};
