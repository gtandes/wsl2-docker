import { useEffect, useMemo, useState } from "react";
import DateInput from "../../../DateInput";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import {
  useSysUsersWithDocumentsQuery,
  useGetAllDocumentsOnReportQuery,
  Junction_Directus_Users_Documents_Filter,
} from "api";
import { useDebounce } from "usehooks-ts";
import { useAgency } from "../../../../hooks/useAgency";
import { DirectusStatus } from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../../types/global";

interface DocumentsDetailsFiltersProps {
  setFilters: (filters: Junction_Directus_Users_Documents_Filter) => void;
}

const debouncedTime = 500;

export const DocumentsDetailsFilters: React.FC<
  DocumentsDetailsFiltersProps
> = ({ setFilters }) => {
  const globalAgency = useAgency();

  const [readDateStartFilter, setReadDateStartFilter] = useState<string>("");
  const [readDateEndFilter, setReadDateEndFilter] = useState<string>("");
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
  const debouncedSearchDocumentQuery = useDebounce(
    searchDocumentQuery,
    debouncedTime
  );
  const [documentFilter, setDocumentFilter] = useState<FilterComboOptions[]>(
    []
  );

  const cliniciansQuery = useSysUsersWithDocumentsQuery({
    variables: {
      search: debouncedSearchClinicianQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        documents: { id: { _nnull: true } },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
          },
        }),
      },
    },
    skip: !globalAgency.loaded,
  });

  const documentsQuery = useGetAllDocumentsOnReportQuery({
    variables: {
      search: debouncedSearchDocumentQuery,
      limit: COMBOBOX_RESULTS_AMOUNT,
      filter: {
        status: { _eq: DirectusStatus.PUBLISHED },
        ...(globalAgency.currentAgency?.id && {
          agencies: {
            agencies_id: { id: { _eq: globalAgency.currentAgency?.id } },
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
  const documentOptions = useMemo<FilterComboOptions[]>(
    () =>
      documentsQuery?.data?.documents?.map((c) => ({
        label: c?.title,
        value: c?.id,
      })) as FilterComboOptions[],
    [documentsQuery]
  );

  const statusOptions = [
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
    { label: "Expired", value: "expired" },
  ];

  useEffect(() => {
    loadFilters();
    return () => {};

    function loadFilters() {
      if (!globalAgency.loaded || cliniciansQuery.loading) return;

      const filter: Junction_Directus_Users_Documents_Filter = {
        _and: globalAgency.currentAgency?.id
          ? [
              { agency: { id: { _in: [globalAgency.currentAgency?.id] } } },
              { status: { _neq: "archived" } },
            ]
          : [{ status: { _neq: "archived" } }],
      };

      if (clinicianFilter.length) {
        filter._and?.push({
          directus_users_id: {
            id: { _in: clinicianFilter.flatMap((c) => c.value) },
          },
        });
      }

      if (documentFilter.length) {
        filter._and?.push({
          documents_id: {
            id: { _in: documentFilter.flatMap((d) => d.value) },
          },
        });
      }
      if (readDateStartFilter || readDateEndFilter) {
        const readFilter: Junction_Directus_Users_Documents_Filter = {
          _and: [],
        };

        if (readDateStartFilter) {
          readFilter._and?.push({ read: { _gte: readDateStartFilter } });
        }
        if (readDateEndFilter) {
          readFilter._and?.push({ read: { _lte: readDateEndFilter } });
        }

        filter._and?.push(readFilter);
      }

      if (statusFilter.length) {
        const arrayFilters = statusFilter.flatMap((sf) => sf.value);
        const statusLocalFilter: Junction_Directus_Users_Documents_Filter = {
          _or: [],
        };

        if (arrayFilters.includes("unread")) {
          statusLocalFilter._or?.push({
            read: { _null: true },
          });
        }
        if (arrayFilters.includes("read")) {
          statusLocalFilter._or?.push({
            read: { _nnull: true },
          });
        }
        if (arrayFilters.includes("expired")) {
          statusLocalFilter._or?.push({
            expires_on: { _lte: new Date().toISOString() },
          });
        }

        filter._and?.push(statusLocalFilter);
      }

      setFilters(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clinicianFilter,
    documentFilter,
    globalAgency.currentAgency?.id,
    cliniciansQuery.loading,
    readDateEndFilter,
    readDateStartFilter,
    statusFilter,
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
          label="Documents"
          options={documentOptions}
          filters={documentFilter}
          filterKey="label"
          setFilters={setDocumentFilter}
          setDebounced={setSearchDocumentQuery}
          placeholder="Filter by Document"
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
          label="Read date start"
          value={readDateStartFilter}
          setValue={setReadDateStartFilter}
        />
      </div>
      <div className="w-full">
        <DateInput
          label="Read date end"
          value={readDateEndFilter}
          min={readDateStartFilter}
          setValue={setReadDateEndFilter}
        />
      </div>
    </div>
  );
};
