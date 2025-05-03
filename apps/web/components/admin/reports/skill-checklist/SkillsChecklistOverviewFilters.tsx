import {
  Sc_Definitions_Filter,
  useGetSkillsChecklistOverviewFiltersQuery,
  useSysUsersQuery,
} from "api";
import { useEffect, useState } from "react";
import { DirectusStatus } from "types";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { useAgency } from "../../../../hooks/useAgency";
import { UserRole } from "../../../../types/roles";
import { useDebounce } from "usehooks-ts";
import { useUsersByFilters } from "../../../../hooks/useUserByFilters";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface SkillsChecklistOverviewFiltersProps {
  setFilters: (filters: Sc_Definitions_Filter) => void;
}

const debouncedTime = 500;

export const SkillsChecklistOverviewFilters: React.FC<
  SkillsChecklistOverviewFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();
  const { getUserBy } = useUsersByFilters(
    globalAgency.currentAgency?.id || null
  );

  const [contentNameFilter, setContentNameFilter] = useState<
    FilterComboOptions[]
  >([]);
  const [category1Filters, setCategory1Filters] = useState<
    FilterComboOptions[]
  >([]);
  const [category2Filters, setCategory2Filters] = useState<
    FilterComboOptions[]
  >([]);
  const [category3Filters, setCategory3Filters] = useState<
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
  const [supervisorFilters, setSupervisorFilters] = useState<
    FilterComboOptions[]
  >([]);
  const [contentNameQuery, setContentNameQuery] = useState<string>("");
  const [category1Search, setCategory1Search] = useState<string>("");
  const [category2Search, setCategory2Search] = useState<string>("");
  const [category3Search, setCategory3Search] = useState<string>("");
  const [departmentSearch, setDepartmentSearch] = useState<string>("");
  const [specialitySearch, setSpecialitySearch] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [supervisorSearch, setSupervisorSearch] = useState<string>("");
  const debouncedSkillsChecklistQuery = useDebounce(
    contentNameQuery,
    debouncedTime
  );
  const debouncedSearchCategory1Query = useDebounce(
    category1Search,
    debouncedTime
  );
  const debouncedSearchCategory2Query = useDebounce(
    category2Search,
    debouncedTime
  );
  const debouncedSearchCategory3Query = useDebounce(
    category3Search,
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

  const filtersQuery = useGetSkillsChecklistOverviewFiltersQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      modalitySearch: debouncedSearchCategory1Query,
      specialitySearch: debouncedSearchCategory2Query,
      subSpecialitySearch: debouncedSearchCategory3Query,
      specialtiesSearch: debouncedSearchSpecialityQuery,
      locationsSearch: debouncedSearchLocationQuery,
      departmentsSearch: debouncedSearchDepartmentQuery,
      skillsChecklistSearch: debouncedSkillsChecklistQuery,
      specialtiesFilters: { status: { _eq: DirectusStatus.PUBLISHED } },
      locationsFilters: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: { id: { _eq: globalAgency.currentAgency?.id } },
        }),
      },
      departmentsFilters: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: { id: { _eq: globalAgency.currentAgency?.id } },
        }),
      },
      skillsChecklistFilter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: {
            agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
          },
        }),
      },
    },
    skip: !globalAgency.loaded,
  });

  const supervisorQuery = useSysUsersQuery({
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
      search: debouncedSearchSupervisorQuery,
    },
    skip: !globalAgency.loaded,
  });

  const contentNameOptions =
    (filtersQuery.data?.skillsChecklist.map((sc) => ({
      label: sc.title,
      value: sc.id,
    })) as FilterComboOptions[]) || [];

  const categories1Options =
    (filtersQuery.data?.modalities.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const categories2Options =
    (filtersQuery.data?.specialities.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const categories3Options =
    (filtersQuery.data?.subSpecialities.map((c) => ({
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

      const statusFilter = [{ status: { _eq: DirectusStatus.PUBLISHED } }];
      const filter: Sc_Definitions_Filter = {
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

      if (contentNameFilter.length) {
        filter._and?.push({
          id: { _in: contentNameFilter.map((exam) => exam.value) },
        });
      }
      if (category1Filters.length) {
        filter?._and?.push({
          category: { id: { _in: category1Filters.map((cat1) => cat1.value) } },
        });
      }
      if (category2Filters.length) {
        filter._and?.push({
          speciality: {
            id: { _in: category2Filters.map((cat2) => cat2.value) },
          },
        });
      }
      if (category3Filters.length) {
        filter._and?.push({
          sub_speciality: {
            id: { _in: category3Filters.map((cat3) => cat3.value) },
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
    contentNameFilter,
    category1Filters,
    category2Filters,
    category3Filters,
    departmentFilters,
    specialityFilters,
    locationFilters,
    supervisorFilters,
    supervisorQuery.loading,
    filtersQuery.loading,
  ]);

  useEffect(() => {
    setContentNameFilter([]);
    setCategory1Filters([]);
    setCategory2Filters([]);
    setCategory3Filters([]);
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
            options={contentNameOptions}
            filters={contentNameFilter}
            filterKey="label"
            setFilters={setContentNameFilter}
            setDebounced={setContentNameQuery}
            placeholder="Filter by Title"
          />
        </div>
        <div className="w-full">
          <FilterCombo
            label="Filter by Category 1 - Modality"
            options={categories1Options}
            filters={category1Filters}
            filterKey="label"
            setFilters={setCategory1Filters}
            setDebounced={setCategory1Search}
            placeholder="Filter by Modality"
          />
        </div>
        <div className="w-full">
          <FilterCombo
            label="Filter by Category 2 - Speciality"
            options={categories2Options}
            filters={category2Filters}
            filterKey="label"
            setFilters={setCategory2Filters}
            setDebounced={setCategory2Search}
            placeholder="Filter by Speciality"
          />
        </div>
        <div className="w-full">
          <FilterCombo
            label="Filter by Category 3 - Sub-specialties"
            options={categories3Options}
            filters={category3Filters}
            filterKey="label"
            setFilters={setCategory3Filters}
            setDebounced={setCategory3Search}
            placeholder="Filter by Sub-specialties"
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
