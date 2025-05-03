import { useEffect, useMemo, useState } from "react";
import DateInput from "../../../DateInput";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import {
  useSysUsersWithPoliciesQuery,
  useGetAllPoliciesOnReportQuery,
  Junction_Directus_Users_Policies_Filter,
} from "api";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface PoliciesDetailsFiltersProps {
  setFilters: (filters: Junction_Directus_Users_Policies_Filter) => void;
}

const debouncedTime = 500;

export const PoliciesDetailsFilters: React.FC<PoliciesDetailsFiltersProps> = ({
  setFilters,
}) => {
  const globalAgency = useAgency();

  const [signedDateStartFilter, setSignDateStartFilter] = useState<string>("");
  const [signDateEndFilter, setSignDateEndFilter] = useState<string>("");
  const [searchClinicianQuery, setSearchClinicianQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<FilterComboOptions[]>([]);
  const debouncedSearchClinicianQuery = useDebounce(
    searchClinicianQuery,
    debouncedTime
  );
  const [clinicianFilter, setClinicianFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [searchDocumentQuery, setSearchDocumentQuery] = useState<string>("");
  const debouncedSearchPolicyQuery = useDebounce(
    searchDocumentQuery,
    debouncedTime
  );
  const [policiesFilter, setDocumentFilter] = useState<FilterComboOptions[]>(
    []
  );

  const cliniciansQuery = useSysUsersWithPoliciesQuery({
    variables: {
      search: debouncedSearchClinicianQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        policies: { id: { _nnull: true } },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency.id } },
          },
        }),
      },
    },
    skip: !globalAgency.loaded,
  });

  const policiesQuery = useGetAllPoliciesOnReportQuery({
    variables: {
      search: debouncedSearchPolicyQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency.id } },
          },
        }),
      },
    },
    skip: !globalAgency.loaded,
  });

  const clinicianOptions = useMemo<FilterComboOptions[]>(
    () =>
      cliniciansQuery.data?.users.map((c) => ({
        label: `${c.first_name} ${c.last_name}`,
        value: c.id,
      })) as FilterComboOptions[],
    [cliniciansQuery.data]
  );
  const policiesOptions = useMemo<FilterComboOptions[]>(
    () =>
      policiesQuery?.data?.policies?.map((c) => ({
        label: c?.name,
        value: c?.id,
      })) as FilterComboOptions[],
    [policiesQuery]
  );

  const statusOptions = [
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
    { label: "Signed", value: "signed" },
    { label: "Expired", value: "expired" },
  ];

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (
        !globalAgency.loaded ||
        cliniciansQuery.loading ||
        policiesQuery.loading
      )
        return;

      const filter: Junction_Directus_Users_Policies_Filter = {
        _and: globalAgency.currentAgency?.id
          ? [{ agency: { id: { _eq: globalAgency.currentAgency.id } } }]
          : [],
      };
      filter._and?.push({ status: { _neq: DirectusStatus.ARCHIVED } });

      if (clinicianFilter.length) {
        filter._and?.push({
          directus_users_id: {
            id: { _in: clinicianFilter.flatMap((c) => c.value) },
          },
        });
      }

      if (policiesFilter.length) {
        filter._and?.push({
          policies_id: {
            id: { _in: policiesFilter.flatMap((d) => d.value) },
          },
        });
      }
      if (signedDateStartFilter || signDateEndFilter) {
        const readFilter: Junction_Directus_Users_Policies_Filter = {
          _and: [],
        };

        if (signedDateStartFilter) {
          readFilter._and?.push({ read: { _gte: signedDateStartFilter } });
        }
        if (signDateEndFilter) {
          readFilter._and?.push({ read: { _lte: signDateEndFilter } });
        }

        filter._and?.push(readFilter);
      }

      if (statusFilter.length) {
        const arrayFilters = statusFilter.flatMap((sf) => sf.value);
        const statusLocalFilter: Junction_Directus_Users_Policies_Filter = {
          _or: [],
        };

        if (arrayFilters.includes("read")) {
          statusLocalFilter._or?.push({
            _and: [
              {
                read: { _nnull: true },
              },
              { signed_on: { _null: true } },
            ],
          });
        }
        if (arrayFilters.includes("unread")) {
          statusLocalFilter._or?.push({
            read: { _null: true },
          });
        }
        if (arrayFilters.includes("signed")) {
          statusLocalFilter._or?.push({
            signed_on: { _nnull: true },
          });
        }
        if (arrayFilters.includes("expired")) {
          statusLocalFilter._or?.push({
            assigned_on: {
              _lte: new Date(
                new Date().setFullYear(new Date().getFullYear() - 1)
              ).toUTCString(),
            },
          });
        }

        filter._and?.push(statusLocalFilter);
      }

      setFilters(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clinicianFilter,
    policiesFilter,
    signDateEndFilter,
    signedDateStartFilter,
    statusFilter,
    globalAgency.currentAgency?.id,
    globalAgency.loaded,
    policiesQuery.loading,
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
          label="Policies"
          options={policiesOptions}
          filters={policiesFilter}
          filterKey="label"
          setFilters={setDocumentFilter}
          setDebounced={setSearchDocumentQuery}
          placeholder="Filter by Policy"
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
          label="Signed date start"
          value={signedDateStartFilter}
          setValue={setSignDateStartFilter}
        />
      </div>
      <div className="w-full">
        <DateInput
          label="Signed date end"
          value={signDateEndFilter}
          min={signedDateStartFilter}
          setValue={setSignDateEndFilter}
        />
      </div>
    </div>
  );
};
