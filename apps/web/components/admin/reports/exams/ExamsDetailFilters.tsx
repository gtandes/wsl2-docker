import {
  useGetAllExamsForReportsFilterQuery,
  Junction_Directus_Users_Exams_Filter,
  useDepartmentsQuery,
  useLocationsQuery,
} from "api";
import { startCase } from "lodash";
import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { statusOptions } from "../../../exams/StatusOptions";
import DateInput from "../../../DateInput";
import { DirectusStatus, ExpirationType } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";
import { SearchInput } from "../../../SearchInput";
import { useUsersByFilters } from "../../../../hooks/useUserByFilters";

interface ExamsDetailFiltersProps {
  setFilters: (filters: Junction_Directus_Users_Exams_Filter) => void;
}

const DEBOUNCE_TIMEOUT = 500;

export const ExamsDetailFilters: React.FC<ExamsDetailFiltersProps> = ({
  setFilters,
}) => {
  const globalAgency = useAgency();

  const { getUserBy } = useUsersByFilters(
    globalAgency.currentAgency?.id || null
  );
  const [searchQuery, setSearchQuery] = useState<string[] | null>(null);

  const [examsFilter, setExamsFilter] = useState<FilterComboOptions[]>([]);

  const [departmentsFilter, setDepartmentsFilter] = useState<
    FilterComboOptions[]
  >([]);

  const [locationsFilter, setLocationsFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [seachExamsQuery, setSearchExamsQuery] = useState("");
  const [seachDepartmentsQuery, setSearchDepartmentsQuery] =
    useState<string>("");
  const [seachLocationsQuery, setSearchLocationsQuery] = useState<string>("");
  const debouncedSearchExamsQuery = useDebounce(
    seachExamsQuery,
    DEBOUNCE_TIMEOUT
  );

  const debouncedSearchDepartmentsQuery = useDebounce(
    seachDepartmentsQuery,
    DEBOUNCE_TIMEOUT
  );
  const debouncedSearchLocationsQuery = useDebounce(
    seachLocationsQuery,
    DEBOUNCE_TIMEOUT
  );

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [completedOnDateStartFilter, setCompletedOnDateStartFilter] =
    useState<string>("");
  const [completedOnDateEndFilter, setCompletedOnDateEndFilter] =
    useState<string>("");

  const examsOptionsQuery = useGetAllExamsForReportsFilterQuery({
    variables: {
      search: debouncedSearchExamsQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: globalAgency.currentAgency?.id
        ? {
            _and: [
              { status: { _eq: DirectusStatus.PUBLISHED } },
              {
                directus_users: {
                  agency: { id: { _eq: globalAgency.currentAgency?.id } },
                },
              },
            ],
          }
        : { status: { _eq: DirectusStatus.PUBLISHED } },
    },
    skip: !globalAgency.loaded,
  });

  const [statusFilter, setStatusFilter] = useState<FilterComboOptions[]>([]);
  const statusFilterOptions = statusOptions.map((status) => {
    return {
      label: startCase(status.label.toLowerCase()),
      value: status.value,
    } as FilterComboOptions;
  });

  const [expirationFilter, setExpirationFilter] = useState<
    FilterComboOptions[]
  >([]);

  const examsOptions = useMemo<FilterComboOptions[]>(
    () =>
      examsOptionsQuery?.data?.exams?.map((exam) => ({
        label: exam?.title,
        value: exam?.id,
      })) as FilterComboOptions[],
    [examsOptionsQuery]
  );

  const expirationFilterOptions = [
    {
      label: "Annual",
      value: ExpirationType.YEARLY,
    },
    {
      label: "One-Time",
      value: ExpirationType.ONE_TIME,
    },
    {
      label: "Bi-Annual",
      value: ExpirationType.BIANNUAL,
    },
  ];

  const departmentsQuery = useDepartmentsQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: { id: { _eq: globalAgency.currentAgency?.id } },
        }),
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchDepartmentsQuery,
    },
    skip: !globalAgency.loaded,
  });

  const locationsQuery = useLocationsQuery({
    variables: {
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agency: { id: { _eq: globalAgency.currentAgency?.id } },
        }),
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
      search: debouncedSearchLocationsQuery,
    },
    skip: !globalAgency.loaded,
  });

  const departmentsOptions = useMemo<FilterComboOptions[]>(
    () =>
      departmentsQuery.data?.departments.map((department) => ({
        label: department.name,
        value: department.id,
      })) as FilterComboOptions[],
    [departmentsQuery.data?.departments]
  );
  const locationsOptions = useMemo<FilterComboOptions[]>(
    () =>
      locationsQuery.data?.locations.map((location) => ({
        label: location.name,
        value: location.id,
      })) as FilterComboOptions[],
    [locationsQuery.data?.locations]
  );

  useEffect(() => {
    loadFilters();
    return () => {};

    async function loadFilters() {
      if (!globalAgency.loaded || examsOptionsQuery.loading) return;

      let filtersConfig: Junction_Directus_Users_Exams_Filter = {
        status: { _neq: DirectusStatus.ARCHIVED },
      };
      const userIdFilters: any[] = [];
      const directusUsersFilter: any = {};

      if (debouncedSearchQuery && debouncedSearchQuery.length > 0) {
        const validTerms = debouncedSearchQuery.filter(
          (term) => term.trim() !== ""
        );
        if (validTerms.length > 0) {
          directusUsersFilter._or = validTerms.flatMap((term) => [
            { first_name: { _icontains: term } },
            { last_name: { _icontains: term } },
            { email: { _icontains: term } },
          ]);
        }
      }

      if (globalAgency.currentAgency?.id) {
        const users = await getUserBy(
          [],
          locationsFilter,
          departmentsFilter,
          []
        );

        userIdFilters.push({
          id: { _in: users as string[] },
        });
      }

      if (userIdFilters.length > 0) {
        filtersConfig.directus_users_id =
          userIdFilters.length === 1
            ? userIdFilters[0]
            : { _and: userIdFilters };
      }

      if (Object.keys(directusUsersFilter).length) {
        filtersConfig.directus_users_id =
          Object.keys(directusUsersFilter).length === 1
            ? directusUsersFilter
            : {
                _and: Object.entries(directusUsersFilter).map(
                  ([key, value]) => ({ [key]: value })
                ),
              };
      }

      if (examsFilter.length > 0) {
        filtersConfig.exams_id = {
          id: { _in: examsFilter.map((option) => option.value) },
        };
      }

      if (statusFilter.length > 0) {
        filtersConfig.status = {
          _in: statusFilter.map((option) => option.value),
        };
      }

      if (expirationFilter.length > 0) {
        filtersConfig.exam_versions_id = {
          expiration: {
            _in: expirationFilter.map((option) => option.value),
          },
        };
      }

      if (completedOnDateStartFilter || completedOnDateEndFilter) {
        filtersConfig._and = [
          ...(filtersConfig._and ?? []),
          ...(completedOnDateStartFilter
            ? [{ finished_on: { _gte: completedOnDateStartFilter } }]
            : []),
          ...(completedOnDateEndFilter
            ? [{ finished_on: { _lte: completedOnDateEndFilter } }]
            : []),
        ];
      }

      if (globalAgency.currentAgency?.id) {
        setFilters({
          _and: [
            { agency: { id: { _eq: globalAgency.currentAgency?.id } } },
            filtersConfig,
          ],
        });
      } else {
        setFilters(filtersConfig);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    completedOnDateEndFilter,
    completedOnDateStartFilter,
    examsFilter,
    examsOptionsQuery.loading,
    expirationFilter,
    globalAgency,
    statusFilter,
    debouncedSearchQuery,
    locationsFilter,
    departmentsFilter,
  ]);

  return (
    <>
      <div className="noprint flex flex-wrap">
        <div className="mr-4 w-72">
          <div className="mt-5 flex flex-col">
            <label
              htmlFor="search-email"
              className="line-clamp-1 text-sm font-medium leading-6 text-gray-900"
            >
              Clinicians
            </label>
            <SearchInput
              inputId="search-email"
              placeholder="Search by Name or Email"
              onChange={(value) =>
                setSearchQuery(value.replace(/\s+/g, " ").split(" "))
              }
            />
          </div>
        </div>
        <div className="mr-4 w-72">
          <FilterCombo
            label="Exams"
            options={examsOptions}
            filters={examsFilter}
            filterKey="label"
            setFilters={setExamsFilter}
            setDebounced={setSearchExamsQuery}
            placeholder="Filter by Exam"
          />
        </div>
        <div className="mr-4 w-72">
          <FilterCombo
            label="Status"
            options={statusFilterOptions}
            filters={statusFilter}
            setFilters={setStatusFilter}
            placeholder="Filter by Status"
          />
        </div>
        <div className="mr-4 w-72">
          <FilterCombo
            label="Frequency"
            options={expirationFilterOptions}
            filters={expirationFilter}
            setFilters={setExpirationFilter}
            placeholder="Filter by Frequency"
          />
        </div>
        <div className="mr-4 w-72">
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
        <div className="mr-4 w-72">
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
      </div>
      <div className="noprint mb-10 flex flex-wrap">
        <div className="mr-4 w-72">
          <DateInput
            label="Completed On date start"
            value={completedOnDateStartFilter}
            setValue={setCompletedOnDateStartFilter}
          />
        </div>
        <div className="mr-4 w-72">
          <DateInput
            label="Completed On date end"
            value={completedOnDateEndFilter}
            min={completedOnDateStartFilter}
            setValue={setCompletedOnDateEndFilter}
          />
        </div>
      </div>
    </>
  );
};
