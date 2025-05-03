import { useEffect, useMemo, useState } from "react";
import DateInput from "../../../DateInput";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { useDebounce } from "usehooks-ts";
import {
  Junction_Modules_Definition_Directus_Users_Filter,
  useGetModulesForFilterQuery,
  useSysUsersWithModulesQuery,
} from "api";
import { useAgency } from "../../../../hooks/useAgency";
import { CompetencyState, DirectusStatus, ExpirationType } from "types";
import { UserRole } from "../../../../types/roles";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface ModulesDetailFiltersProps {
  setFilters: (
    filters: Junction_Modules_Definition_Directus_Users_Filter
  ) => void;
}

const DEBOOUNCE_TIMEOUT = 400;

export const ModulesDetailFilters: React.FC<ModulesDetailFiltersProps> = ({
  setFilters,
}) => {
  const globalAgency = useAgency();

  const [completedOnDateStartFilter, setCompletedOnDateStartFilter] =
    useState<string>("");
  const [completedOnDateEndFilter, setCompletedOnDateEndFilter] =
    useState<string>("");

  const [userFilter, setUserFilter] = useState<FilterComboOptions[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterComboOptions[]>([]);
  const [modulesFilter, setModulesFilter] = useState<FilterComboOptions[]>([]);
  const [expirationFilter, setExpirationFilter] = useState<
    FilterComboOptions[]
  >([]);

  const [searchModulesQuery, setSearchModulesQuery] = useState("");
  const [searchClinicianQuery, setSearchClinicianQuery] = useState("");
  const debouncedSearchModulesQuery = useDebounce(
    searchModulesQuery,
    DEBOOUNCE_TIMEOUT
  );
  const debouncedSearchClinicianQuery = useDebounce(
    searchClinicianQuery,
    DEBOOUNCE_TIMEOUT
  );

  const cliniciansQuery = useSysUsersWithModulesQuery({
    variables: {
      search: debouncedSearchClinicianQuery,
      filter: {
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency.id } },
          },
        }),
        modules: {
          id: { _nnull: true },
        },
        role: { id: { _eq: UserRole.Clinician } },
      },
    },
  });

  const modulesOptionsResults = useGetModulesForFilterQuery({
    variables: {
      search: debouncedSearchModulesQuery,
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
  });

  const modulesOptions = useMemo<FilterComboOptions[]>(
    () =>
      modulesOptionsResults?.data?.modules_definition?.map((module) => ({
        label: module.title,
        value: module.id,
      })) as FilterComboOptions[],
    [modulesOptionsResults]
  );

  const usersFilterOptions = useMemo<FilterComboOptions[]>(
    () =>
      cliniciansQuery.data?.users.map((user) => ({
        label: `${user.first_name} ${user.last_name}`,
        value: user.id,
      })) || [],
    [cliniciansQuery]
  );

  const statusFilterOptions = [
    {
      label: "Not Started",
      value: CompetencyState.PENDING,
    },
    {
      label: "In Progress",
      value: CompetencyState.STARTED,
    },
    {
      label: "Completed",
      value: CompetencyState.FINISHED,
    },
    {
      label: "Expired",
      value: CompetencyState.EXPIRED,
    },
  ];

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

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (cliniciansQuery.loading || modulesOptionsResults.loading) return;

      let filtersConfig: Junction_Modules_Definition_Directus_Users_Filter = {
        modules_definition_id: {
          status: {
            _neq: DirectusStatus.ARCHIVED,
          },
        },
      };

      if (userFilter.length > 0) {
        filtersConfig.directus_users_id = {
          id: {
            _in: userFilter.map((option) => option.value),
          },
        };
      }

      if (modulesFilter.length > 0) {
        filtersConfig.modules_definition_id = {
          id: {
            _in: modulesFilter.map((option) => option.value),
          },
        };
      }

      if (statusFilter.length > 0) {
        filtersConfig.status = {
          _in: statusFilter.map((option) => option.value),
        };
      }

      if (expirationFilter.length > 0) {
        filtersConfig.module_version = {
          expiration: {
            _in: expirationFilter.map((option) => option.value),
          },
        };
      }

      if (completedOnDateStartFilter || completedOnDateEndFilter) {
        const completedFilter: Junction_Modules_Definition_Directus_Users_Filter =
          {
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
            { status: { _neq: DirectusStatus.ARCHIVED } },
            filtersConfig,
          ],
        });
      } else {
        setFilters(filtersConfig);
      }
    }
  }, [
    userFilter,
    modulesFilter,
    statusFilter,
    expirationFilter,
    completedOnDateStartFilter,
    completedOnDateEndFilter,
    globalAgency,
    cliniciansQuery.loading,
    modulesOptionsResults.loading,
    setFilters,
  ]);

  useEffect(() => {
    setUserFilter([]);
    setModulesFilter([]);
    setStatusFilter([]);
    setExpirationFilter([]);
    setCompletedOnDateStartFilter("");
    setCompletedOnDateEndFilter("");
  }, [globalAgency]);

  return (
    <div className="noprint mb-10 flex flex-wrap">
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
          label="Modules"
          options={modulesOptions}
          filters={modulesFilter}
          filterKey="label"
          setFilters={setModulesFilter}
          setDebounced={setSearchModulesQuery}
          placeholder="Filter by Module"
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
          filterKey="label"
          filters={expirationFilter}
          setFilters={setExpirationFilter}
          placeholder="Filter by Frequency"
        />
      </div>
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
  );
};
