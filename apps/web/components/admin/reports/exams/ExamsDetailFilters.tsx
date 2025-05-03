import {
  useGetAllExamsForReportsFilterQuery,
  Junction_Directus_Users_Exams_Filter,
  useSysUsersWithExamsQuery,
} from "api";
import { startCase } from "lodash";
import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { UserRole } from "../../../../types/roles";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { statusOptions } from "../../../exams/StatusOptions";
import DateInput from "../../../DateInput";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface ExamsDetailFiltersProps {
  setFilters: (filters: Junction_Directus_Users_Exams_Filter) => void;
}

const DEBOUNCE_TIMEOUT = 500;

export const ExamsDetailFilters: React.FC<ExamsDetailFiltersProps> = ({
  setFilters,
}) => {
  const globalAgency = useAgency();

  const [userFilter, setUserFilter] = useState<FilterComboOptions[]>([]);
  const [examsFilter, setExamsFilter] = useState<FilterComboOptions[]>([]);
  const [seachExamsQuery, setSearchExamsQuery] = useState("");
  const [seachClinicianQuery, setSearchClinicianQuery] = useState("");
  const debouncedSearchExamsQuery = useDebounce(
    seachExamsQuery,
    DEBOUNCE_TIMEOUT
  );
  const debouncedSearchClinicianQuery = useDebounce(
    seachClinicianQuery,
    DEBOUNCE_TIMEOUT
  );

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

  const cliniciansQuery = useSysUsersWithExamsQuery({
    variables: {
      search: debouncedSearchClinicianQuery,
      filter: {
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency.id } },
          },
        }),
        exams: {
          id: { _nnull: true },
        },
        role: { id: { _eq: UserRole.Clinician } },
      },
    },
    skip: !globalAgency.loaded,
  });

  const usersFilterOptions = useMemo<FilterComboOptions[]>(
    () =>
      cliniciansQuery.data?.users?.map((user) => ({
        label: `${user.first_name} ${user.last_name}`,
        value: user.id,
      })) as FilterComboOptions[],
    [cliniciansQuery]
  );

  const expirationFilterOptions = [
    {
      label: "Annual",
      value: "yearly",
    },
    {
      label: "One-Time",
      value: "one-time",
    },
  ];

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (
        !globalAgency.loaded ||
        cliniciansQuery.loading ||
        examsOptionsQuery.loading
      )
        return;

      let filtersConfig = { status: { _neq: DirectusStatus.ARCHIVED } };

      if (userFilter.length > 0) {
        filtersConfig = Object.assign(filtersConfig, {
          directus_users_id: {
            id: {
              _in: userFilter.map((option) => option.value),
            },
          },
        });
      }

      if (examsFilter.length > 0) {
        filtersConfig = Object.assign(filtersConfig, {
          exams_id: {
            id: { _in: examsFilter.map((option) => option.value) },
          },
        });
      }

      if (statusFilter.length > 0) {
        filtersConfig = Object.assign(filtersConfig, {
          status: { _in: statusFilter.map((option) => option.value) },
        });
      }

      if (expirationFilter.length > 0) {
        filtersConfig = Object.assign(filtersConfig, {
          exam_versions_id: {
            expiration: {
              _in: expirationFilter.map((option) => option.value),
            },
          },
        });
      }

      if (completedOnDateStartFilter || completedOnDateEndFilter) {
        const completedFilter: Junction_Directus_Users_Exams_Filter = {
          _and: [],
        };

        if (completedOnDateStartFilter) {
          completedFilter._and?.push({
            finished_on: { _gte: completedOnDateStartFilter },
          });
        }
        if (completedOnDateEndFilter) {
          completedFilter._and?.push({
            finished_on: { _lte: completedOnDateEndFilter },
          });
        }

        filtersConfig = Object.assign(filtersConfig, completedFilter);
      }

      if (globalAgency.currentAgency?.id) {
        setFilters({
          _and: [
            {
              agency: {
                id: { _eq: globalAgency.currentAgency?.id },
              },
            },
            filtersConfig,
          ],
        });
      } else {
        setFilters(filtersConfig);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cliniciansQuery.loading,
    completedOnDateEndFilter,
    completedOnDateStartFilter,
    examsFilter,
    examsOptionsQuery.loading,
    expirationFilter,
    globalAgency,
    statusFilter,
    userFilter,
  ]);

  return (
    <>
      <div className="noprint flex flex-wrap">
        <div className="mr-4 w-72">
          <FilterCombo
            label="Clinicians"
            options={usersFilterOptions}
            filters={userFilter}
            filterKey="label"
            setFilters={setUserFilter}
            setDebounced={setSearchClinicianQuery}
            placeholder="Filter by Clinician"
          />
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
