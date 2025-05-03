import { useEffect, useMemo, useState } from "react";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import {
  Documents_Filter,
  useGetDocumentsOverviewFiltersQuery,
  useSysUsersQuery,
} from "api";
import { UserRole } from "../../../../types/roles";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { useUsersByFilters } from "../../../../hooks/useUserByFilters";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface DocumentsOverviewFiltersProps {
  setFilters: (filters: Documents_Filter) => void;
}

const debouncedTime = 500;

export const DocumentsOverviewFilters: React.FC<
  DocumentsOverviewFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();
  const { getUserBy } = useUsersByFilters(
    globalAgency.currentAgency?.id || null
  );

  const [documentsFilter, setDocumentsFilter] = useState<FilterComboOptions[]>(
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
  const [documentsSearch, setDocumentsSearch] = useState<string>("");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [departmentSearch, setDepartmentSearch] = useState<string>("");
  const [specialitySearch, setSpecialitySearch] = useState<string>("");
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [supervisorSearch, setSupervisorSearch] = useState<string>("");
  const debouncedDocumentsQuery = useDebounce(documentsSearch, debouncedTime);
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

  const filtersQuery = useGetDocumentsOverviewFiltersQuery({
    variables: {
      limit: COMBOBOX_RESULTS_AMOUNT,
      documentsSearch: debouncedDocumentsQuery,
      categorySearch: debouncedSearchCategoryQuery,
      departmentsSearch: debouncedSearchDepartmentQuery,
      specialtiesSearch: debouncedSearchSpecialityQuery,
      locationsSearch: debouncedSearchLocationQuery,
      documentsFilters: {
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
      specialtiesFilter: {
        status: { _eq: DirectusStatus.PUBLISHED },
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

  const documentsQuery = useMemo<FilterComboOptions[]>(
    () =>
      filtersQuery?.data?.documents?.map((document) => ({
        label: document.title,
        value: document.id,
      })) as FilterComboOptions[],
    [filtersQuery?.data?.documents]
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
        filtersQuery.loading ||
        supervisorQuery.loading
      )
        return;

      const statusFilter = [{ status: { _eq: "published" } }];
      const filter: Documents_Filter = {
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

      if (documentsFilter.length) {
        filter._and?.push({
          id: { _in: documentsFilter.map((doc) => doc.value) },
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
    documentsFilter,
    categoryFilters,
    departmentFilters,
    specialityFilters,
    locationFilters,
    supervisorFilters,
    filtersQuery.loading,
    supervisorQuery.loading,
  ]);

  useEffect(() => {
    setDocumentsFilter([]);
    setCategoryFilters([]);
    setSupervisorFilters([]);
    setDepartmentFilters([]);
    setLocationFilters([]);
    setSpecialityFilters([]);
  }, [globalAgency]);

  return (
    <div className="noprint mb-10 flex flex-col gap-2">
      <div className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="w-full">
          <FilterCombo
            label="Title"
            options={documentsQuery}
            filters={documentsFilter}
            filterKey="label"
            setFilters={setDocumentsFilter}
            setDebounced={setDocumentsSearch}
            placeholder="Filter by Title"
          />
        </div>
        <div className="w-full">
          <FilterCombo
            label="Document Category"
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
            placeholder="Filter by Specialilty"
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
