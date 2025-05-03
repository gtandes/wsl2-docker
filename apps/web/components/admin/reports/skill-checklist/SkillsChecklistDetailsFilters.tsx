import {
  useSysUsersWithSkillChecklistsQuery,
  useGetAllSkillChecklistsOnReportQuery,
  Junction_Sc_Definitions_Directus_Users_Filter,
} from "api";
import { CompetencyState, DirectusStatus } from "types";
import DateInput from "../../../DateInput";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { useEffect, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface SkillsChecklistDetailsFiltersProps {
  setFilters: (filter: Junction_Sc_Definitions_Directus_Users_Filter) => void;
}

const debouncedTime = 500;

export const SkillsChecklistDetailsFilters: React.FC<
  SkillsChecklistDetailsFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();

  const [searchClinicianQuery, setSearchClinicianQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<FilterComboOptions[]>([]);
  const [clinicianFilter, setClinicianFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [skillChecklistsFilter, setSkillChecklistsFilter] = useState<
    FilterComboOptions[]
  >([]);
  const [submittedDateStartFilter, setSubmittedDateStartFilter] =
    useState<string>("");
  const [submittedDateEndFilter, setSubmittedDateEndFilter] =
    useState<string>("");
  const [searchSkillChecklistsQuery, setSearchSkillChecklistsQuery] =
    useState<string>("");

  const debouncedSearchClinicianQuery = useDebounce(
    searchClinicianQuery,
    debouncedTime
  );
  const debouncedSearchSkillChecklistsQuery = useDebounce(
    searchSkillChecklistsQuery,
    debouncedTime
  );

  const cliniciansQuery = useSysUsersWithSkillChecklistsQuery({
    variables: {
      search: debouncedSearchClinicianQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: globalAgency.currentAgency?.id
        ? {
            _and: [
              { sc_definitions: { id: { _nnull: true } } },
              {
                agencies: {
                  agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
                },
              },
            ],
          }
        : { sc_definitions: { id: { _nnull: true } } },
    },
    skip: !globalAgency.loaded,
  });

  const skillChecklistQuery = useGetAllSkillChecklistsOnReportQuery({
    variables: {
      search: debouncedSearchSkillChecklistsQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: globalAgency.currentAgency?.id
        ? {
            _and: [
              { status: { _eq: "published" } },
              {
                directus_users: {
                  agency: { id: { _eq: globalAgency.currentAgency?.id } },
                },
              },
            ],
          }
        : { status: { _eq: "published" } },
    },
    skip: !globalAgency.loaded,
  });

  const clinicianOptions =
    (cliniciansQuery.data?.users.map((c) => ({
      label: `${c.first_name} ${c.last_name}`,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const skillChecklistsOptions =
    (skillChecklistQuery?.data?.sc_definitions.map((c) => ({
      label: c?.title,
      value: c?.id,
    })) as FilterComboOptions[]) || [];

  const statusOptions = [
    { label: "Completed", value: CompetencyState.COMPLETED },
    { label: "Pending", value: CompetencyState.PENDING },
  ];

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (!globalAgency.loaded || cliniciansQuery.loading) return;

      const filters: Junction_Sc_Definitions_Directus_Users_Filter = {
        _and: globalAgency.currentAgency?.id
          ? [{ agency: { id: { _eq: globalAgency.currentAgency?.id } } }]
          : [],
      };

      filters._and?.push({ status: { _neq: DirectusStatus.ARCHIVED } });

      if (clinicianFilter.length > 0) {
        filters._and?.push({
          directus_users_id: {
            id: { _in: clinicianFilter.flatMap((c) => c.value) },
          },
        });
      }

      if (skillChecklistsFilter.length > 0) {
        filters._and?.push({
          sc_definitions_id: {
            id: { _in: skillChecklistsFilter.flatMap((d) => d.value) },
          },
        });
      }

      if (submittedDateStartFilter || submittedDateEndFilter) {
        const submittedFilter: Junction_Sc_Definitions_Directus_Users_Filter = {
          _and: [],
        };

        if (submittedDateStartFilter) {
          submittedFilter._and?.push({
            finished_on: { _gte: submittedDateStartFilter },
          });
        }
        if (submittedDateEndFilter) {
          submittedFilter._and?.push({
            finished_on: { _lte: submittedDateEndFilter },
          });
        }

        filters._and?.push(submittedFilter);
      }

      if (statusFilter.length > 0) {
        const arrayFilters = statusFilter.flatMap((sf) => sf.value);
        const statusLocalFilter: Junction_Sc_Definitions_Directus_Users_Filter =
          {
            _or: [],
          };

        if (arrayFilters.includes(CompetencyState.COMPLETED)) {
          statusLocalFilter._or?.push({
            status: { _eq: CompetencyState.COMPLETED },
          });
        }
        if (arrayFilters.includes(CompetencyState.PENDING)) {
          statusLocalFilter._or?.push({
            status: { _eq: CompetencyState.PENDING },
          });
        }

        filters._and?.push(statusLocalFilter);
      }

      setFilters(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clinicianFilter,
    globalAgency,
    skillChecklistsFilter,
    statusFilter,
    submittedDateEndFilter,
    submittedDateStartFilter,
    cliniciansQuery.loading,
  ]);

  return (
    <div className="mb-10 grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div className="w-full">
        <FilterCombo
          label="Clinicians"
          options={clinicianOptions}
          filters={clinicianFilter}
          filterKey="label"
          setFilters={setClinicianFilter}
          setDebounced={setSearchClinicianQuery}
          placeholder="Filter by Clinician"
        />
      </div>
      <div className="w-full">
        <FilterCombo
          label="Skill Checklist"
          options={skillChecklistsOptions}
          filters={skillChecklistsFilter}
          filterKey="label"
          setFilters={setSkillChecklistsFilter}
          setDebounced={setSearchSkillChecklistsQuery}
          placeholder="Filter by Skill Checklist"
        />
      </div>
      <div className="w-full">
        <FilterCombo
          label="Status"
          options={statusOptions}
          filters={statusFilter}
          setFilters={setStatusFilter}
          placeholder="Filter by Status"
        />
      </div>
      <div className="w-full">
        <DateInput
          label="Date submitted start"
          value={submittedDateStartFilter}
          setValue={setSubmittedDateStartFilter}
        />
      </div>
      <div className="w-full">
        <DateInput
          label="Date submitted end"
          value={submittedDateEndFilter}
          setValue={setSubmittedDateEndFilter}
        />
      </div>
    </div>
  );
};
