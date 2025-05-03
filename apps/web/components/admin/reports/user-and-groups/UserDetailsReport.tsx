import {
  useSysUserDetailsQuery,
  Directus_Users_Filter,
  useGetAllExamsForUserFilterQuery,
  useGetModulesForUserFilterQuery,
  useGetAllSkillChecklistsForUserFilterQuery,
  useGetAllPoliciesForUserFilterQuery,
  useGetAllDocumentsForUserFilterQuery,
  Junction_Directus_Users_Agencies,
  useGetUserDetailsAvgQuery,
  Junction_Modules_Definition_Directus_Users_Filter,
  Junction_Directus_Users_Exams_Filter,
  Junction_Sc_Definitions_Directus_Users_Filter,
  Junction_Directus_Users_Documents_Filter,
  Junction_Directus_Users_Policies_Filter,
  Junction_Directus_Users_Agencies_Filter,
  Directus_Users,
} from "api";
import { first } from "lodash";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../../Button";
import { faArrowLeft } from "@fortawesome/pro-regular-svg-icons";
import { useCurrentOrGlobalAgency } from "../../../../hooks/useAgency";
import { formatDateTime } from "../../../../utils/format";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import {
  UserDetailsReportList,
  UserReportItemType,
  processUserDetailsForExport,
  processUserDetailsForList,
} from "./UserDetailsReportList";
import {
  UserDetailAgenciesList,
  processAgenciesForList,
} from "./UserDetailsAgenciesList";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../clinicians/FilterCombo";
import { useDebounce } from "usehooks-ts";
import { CompetencyState, UserRole } from "types";
import { exportToCsv } from "../../../../utils/utils";
import { UserDetailsReportsExport } from "../../../../types/reports";
import AnalyticsUserDetailsReports from "./AnalyticsUserDetailsReports";
import { Spinner } from "../../../Spinner";
import { useAuth } from "../../../../hooks/useAuth";

const PAGE_SIZE = 10;
const DEBOOUNCE_TIMEOUT = 400;
const DROPDOWN_LIMIT = 10;

export const goToUserDetails = (id: string) => {
  window.open(`/admin/dashboard/reports/${id}/user-details`, "_self");
};

export default function UserDetailReport() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { user_id } = router.query;
  const agency = useCurrentOrGlobalAgency();
  const [examsQuery, setExamsQuery] =
    useState<Junction_Directus_Users_Exams_Filter>({});
  const [modulesQuery, setModulesQuery] =
    useState<Junction_Modules_Definition_Directus_Users_Filter>({});

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "last_name",
        desc: true,
      },
    ])
  );

  const [sortAgency, setSortAgency] = useQueryParam(
    "sort_agency",
    withDefault(JsonParam, [
      {
        id: "name",
        desc: true,
      },
    ])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    })
  );

  // ASSIGNMENT FILTER ****************************************************************

  const [statusFilter, setStatusFilter] = useState<FilterComboOptions[]>([]);

  const statusOptions = Object.keys(CompetencyState).map((key) => {
    return {
      label: CompetencyState[key as keyof typeof CompetencyState].replaceAll(
        "_",
        " "
      ),
      value: CompetencyState[key as keyof typeof CompetencyState],
      selected: false,
    };
  });

  // EXAMS FILTER ****************************************************************

  const [examsFilter, setExamsFilter] = useState<FilterComboOptions[]>([]);
  const [seachExamsQuery, setSearchExamsQuery] = useState<string>("");

  const debouncedExamsQuery = useDebounce(seachExamsQuery, DEBOOUNCE_TIMEOUT);

  const examsNamewResult = useGetAllExamsForUserFilterQuery({
    variables: {
      search: debouncedExamsQuery,
      limit: DROPDOWN_LIMIT,
      filter: {
        directus_users_id: {
          id: { _eq: user_id as string },
        },
      },
    },
  });

  const examsOptions = useMemo<FilterComboOptions[]>(
    () =>
      examsNamewResult?.data?.junction_directus_users_exams.map((exam) => ({
        label: exam.exams_id?.title,
        value: exam.exams_id?.id,
      })) as FilterComboOptions[],
    [examsNamewResult]
  );

  // MODULES FILTER ****************************************************************

  const [modulesFilter, setModulesFilter] = useState<FilterComboOptions[]>([]);
  const [seachModulesQuery, setSearchModulesQuery] = useState<string>("");

  const debouncedModulesQuery = useDebounce(
    seachModulesQuery,
    DEBOOUNCE_TIMEOUT
  );

  const modulesNamesResult = useGetModulesForUserFilterQuery({
    variables: {
      search: debouncedModulesQuery,
      limit: DROPDOWN_LIMIT,
      filter: {
        directus_users_id: {
          id: { _eq: user_id as string },
        },
      },
    },
  });

  const modulesOptions = useMemo<FilterComboOptions[]>(
    () =>
      modulesNamesResult?.data?.junction_modules_definition_directus_users?.map(
        (module) => ({
          label: module.modules_definition_id?.title,
          value: module.modules_definition_id?.id,
        })
      ) as FilterComboOptions[],
    [modulesNamesResult]
  );

  // SKILLS CHECKLIST FILTER ****************************************************************

  const [scFilter, setSCFilter] = useState<FilterComboOptions[]>([]);
  const [seachSCQuery, setSearchSCQuery] = useState<string>("");

  const debouncedSCQuery = useDebounce(seachSCQuery, DEBOOUNCE_TIMEOUT);

  const scNamesResult = useGetAllSkillChecklistsForUserFilterQuery({
    variables: {
      search: debouncedSCQuery,
      limit: DROPDOWN_LIMIT,
      filter: {
        directus_users_id: {
          id: { _eq: user_id as string },
        },
      },
    },
  });

  const scOptions = useMemo<FilterComboOptions[]>(
    () =>
      scNamesResult?.data?.junction_sc_definitions_directus_users.map((sc) => ({
        label: sc.sc_definitions_id?.title,
        value: sc.sc_definitions_id?.id,
      })) as FilterComboOptions[],
    [scNamesResult]
  );

  // POLICIES FILTER ****************************************************************

  const [policiesFilter, setPoliciesFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [seachPoliciesQuery, setSearchPoliciesQuery] = useState<string>("");

  const debouncedPoliciesQuery = useDebounce(
    seachPoliciesQuery,
    DEBOOUNCE_TIMEOUT
  );

  const policiesNamesResult = useGetAllPoliciesForUserFilterQuery({
    variables: {
      search: debouncedPoliciesQuery,
      limit: DROPDOWN_LIMIT,
      filter: {
        directus_users_id: {
          id: { _eq: user_id as string },
        },
      },
    },
  });

  const policiesOptions = useMemo<FilterComboOptions[]>(
    () =>
      policiesNamesResult?.data?.junction_directus_users_policies?.map(
        (policy) => ({
          label: policy.policies_id?.name,
          value: policy.policies_id?.id,
        })
      ) as FilterComboOptions[],
    [policiesNamesResult]
  );

  // DOCUMENTS FILTER ****************************************************************

  const [documentsFilter, setDocumentsFilter] = useState<FilterComboOptions[]>(
    []
  );
  const [seachDocumentsQuery, setSearchDocumentsQuery] = useState<string>("");

  const debouncedDocumentsQuery = useDebounce(
    seachDocumentsQuery,
    DEBOOUNCE_TIMEOUT
  );

  const documentsNamesResult = useGetAllDocumentsForUserFilterQuery({
    variables: {
      search: debouncedDocumentsQuery,
      limit: DROPDOWN_LIMIT,
      filter: {
        directus_users_id: {
          id: { _eq: user_id as string },
        },
      },
    },
  });

  const documentsOptions = useMemo<FilterComboOptions[]>(
    () =>
      documentsNamesResult?.data?.junction_directus_users_documents?.map(
        (document) => ({
          label: document.documents_id?.title,
          value: document.documents_id?.id,
        })
      ) as FilterComboOptions[],
    [documentsNamesResult]
  );

  // MAIN QUERY ****************************************************************

  const filter: Directus_Users_Filter = {
    id: {
      _eq: user_id as string,
    },
  };

  const userFilters = useMemo(() => {
    const noArchivedFilter = { status: { _neq: "archived" } };
    let filter_agency: Junction_Directus_Users_Agencies_Filter =
      noArchivedFilter;
    let filter_exams: Junction_Directus_Users_Exams_Filter = noArchivedFilter;
    let filter_modules: Junction_Modules_Definition_Directus_Users_Filter =
      noArchivedFilter;
    let filter_sc: Junction_Sc_Definitions_Directus_Users_Filter =
      noArchivedFilter;
    let filter_policies: Junction_Directus_Users_Policies_Filter =
      noArchivedFilter;
    let filter_documents: Junction_Directus_Users_Documents_Filter =
      noArchivedFilter;

    if (agency && agency.id && currentUser?.role !== UserRole.HSHAdmin) {
      const agencyFilter = { agency: { id: { _eq: agency.id } } };
      filter_agency = {
        _and: [{ agencies_id: { id: { _eq: agency.id } } }, noArchivedFilter],
      };
      filter_exams = { _and: [agencyFilter, noArchivedFilter] };
      filter_modules = { _and: [agencyFilter, noArchivedFilter] };
      filter_sc = { _and: [agencyFilter, noArchivedFilter] };
      filter_policies = { _and: [agencyFilter, noArchivedFilter] };
      filter_documents = { _and: [agencyFilter, noArchivedFilter] };
    }

    return {
      filter_agency,
      filter_exams,
      filter_modules,
      filter_sc,
      filter_policies,
      filter_documents,
    };
  }, [agency, currentUser]);

  const {
    filter_agency,
    filter_exams,
    filter_modules,
    filter_sc,
    filter_policies,
    filter_documents,
  } = userFilters;

  const { data: userData, loading: loadingUserData } = useSysUserDetailsQuery({
    variables: {
      filter,
      filter_agency,
      filter_exams,
      filter_modules,
      filter_sc,
      filter_policies,
      filter_documents,
    },
  });

  const user = useMemo(() => first(userData?.users), [userData]);
  const agencyData = useMemo(
    () => first(user?.agencies?.filter((a) => a?.id === agency?.id)),
    [user, agency]
  );

  const compencyItems = useMemo(
    () => processUserDetailsForList(user! as Directus_Users),
    [user]
  );
  const agencyItems = useMemo(
    () =>
      processAgenciesForList(
        user?.agencies as Junction_Directus_Users_Agencies[]
      ),
    [user]
  );

  const hasFilters = useCallback(() => {
    return (
      statusFilter.length ||
      examsFilter.length ||
      modulesFilter.length ||
      scFilter.length ||
      policiesFilter.length ||
      documentsFilter.length
    );
  }, [
    documentsFilter,
    examsFilter,
    modulesFilter,
    policiesFilter,
    scFilter,
    statusFilter,
  ]);

  const isIncluded = (itemsToInclude: any[], attr: string, itemValue: string) =>
    itemsToInclude.length &&
    itemsToInclude.map((x) => x[attr]).includes(itemValue);

  const filteredCompetencyItems = useMemo(() => {
    return hasFilters()
      ? compencyItems.filter((item: UserReportItemType) => {
          return (
            isIncluded(statusFilter, "value", item.status!) ||
            isIncluded(examsFilter, "label", item.title) ||
            isIncluded(modulesFilter, "label", item.title) ||
            isIncluded(scFilter, "label", item.title) ||
            isIncluded(policiesFilter, "label", item.title) ||
            isIncluded(documentsFilter, "label", item.title)
          );
        })
      : compencyItems;
  }, [
    compencyItems,
    hasFilters,
    statusFilter,
    examsFilter,
    modulesFilter,
    scFilter,
    policiesFilter,
    documentsFilter,
  ]);

  const exportReport = async () => {
    const dataToExport = processUserDetailsForExport(filteredCompetencyItems);

    exportToCsv<UserDetailsReportsExport>(
      "user-compentencies-report",
      dataToExport
    );
  };

  const agencyFilterQuery =
    agency && agency?.id
      ? {
          agency: { id: { _eq: agency?.id } },
        }
      : {};

  const userFilterQuery = {
    directus_users_id: {
      id: { _eq: user_id as string },
    },
  };

  useEffect(() => {
    setExamsQuery(
      examsFilter.length
        ? {
            exams_id: {
              id: { _in: examsFilter.map((e) => e.value) },
            },
          }
        : {}
    );
    setModulesQuery(
      modulesFilter.length
        ? {
            modules_definition_id: {
              id: { _in: modulesFilter.map((m) => m.value) },
            },
          }
        : {}
    );
  }, [examsFilter, modulesFilter]);

  const { data: averages, loading: loadingAverages } =
    useGetUserDetailsAvgQuery({
      variables: {
        examFilter: {
          _and: [userFilterQuery, examsQuery, agencyFilterQuery],
        },
        modulesFilter: {
          _and: [userFilterQuery, modulesQuery, agencyFilterQuery],
        },
      },
    });

  return (
    <div className="print-content user-details-report mb-8 rounded-md bg-white p-8 shadow-sm">
      <h1 className="noprint mb-4 text-xl font-semibold">
        Users & Groups Reports
      </h1>
      <div className="noprint xs:fle flex justify-between">
        <div>
          <Button
            onClick={() => router.back()}
            iconLeft={faArrowLeft}
            label="Back"
            variant="link"
            classes="-ml-4"
          />
        </div>
        {user && (
          <div className="noprint text-end">
            <Button
              label="Print PDF"
              variant="solid"
              onClick={() => print()}
              classes="mb-4"
            />
            <Button
              label="Export CSV/report"
              variant="solid"
              onClick={exportReport}
              classes="ml-2"
            />
          </div>
        )}
      </div>
      {loadingUserData ? (
        <div className="flex items-center justify-center">
          <Spinner />
        </div>
      ) : user ? (
        <>
          <h2 className="mt-11 text-xl font-semibold ">
            {user?.first_name + " " + user?.last_name}
          </h2>
          <div className="flex flex-col justify-between text-sm font-semibold text-gray-400 sm:flex-row">
            <div>{user?.email}</div>
            {agency && agencyData?.employee_number && (
              <div>Emloyee #{agencyData?.employee_number}</div>
            )}
            <div>
              Status: {user?.status === "active" ? "active" : "inactive"}
            </div>
            {agency && agencyData?.date_created && (
              <div>Joined: {formatDateTime(agencyData?.date_created)}</div>
            )}
            <div>Last Access: {formatDateTime(user?.last_access!)}</div>
          </div>
        </>
      ) : (
        <div className="m-8 text-center align-middle">
          Thit user is not part of this agency, please select other agencie.
        </div>
      )}
      <UserDetailAgenciesList
        data={agencyItems}
        isLoading={loadingUserData}
        sort={sortAgency}
        setSort={setSortAgency}
      />
      <div className="mr-4 w-60">
        <FilterCombo
          label="Assignment Status"
          options={statusOptions}
          filters={statusFilter}
          filterKey="label"
          setFilters={setStatusFilter}
          disabled={!user}
        />
      </div>
      <div className="noprint mb-10 flex flex-wrap">
        <div className="mr-4 w-60">
          <FilterCombo
            label="Exams"
            options={examsOptions}
            filters={examsFilter}
            filterKey="label"
            setFilters={setExamsFilter}
            setDebounced={setSearchExamsQuery}
            disabled={!user}
            placeholder="Filter by Exam"
          />
        </div>
        <div className="mr-4 w-60">
          <FilterCombo
            label="Modules"
            options={modulesOptions}
            filters={modulesFilter}
            filterKey="label"
            setFilters={setModulesFilter}
            setDebounced={setSearchModulesQuery}
            disabled={!user}
            placeholder="Filter by Module"
          />
        </div>
        <div className="mr-4 w-60">
          <FilterCombo
            label="Skills Checklist"
            options={scOptions}
            filters={scFilter}
            filterKey="label"
            setFilters={setSCFilter}
            setDebounced={setSearchSCQuery}
            disabled={!user}
            placeholder="Filter by Skill Checklist"
          />
        </div>
        <div className="mr-4 w-60">
          <FilterCombo
            label="Policies"
            options={policiesOptions}
            filters={policiesFilter}
            filterKey="label"
            setFilters={setPoliciesFilter}
            setDebounced={setSearchPoliciesQuery}
            disabled={!user}
            placeholder="Filter by Policy"
          />
        </div>
        <div className="mr-4 w-60">
          <FilterCombo
            label="Documents"
            options={documentsOptions}
            filters={documentsFilter}
            filterKey="label"
            setFilters={setDocumentsFilter}
            setDebounced={setSearchDocumentsQuery}
            disabled={!user}
            placeholder="Filter by Document"
          />
        </div>
      </div>
      <AnalyticsUserDetailsReports
        loading={loadingAverages}
        hasFilters={hasFilters()}
        examsFilters={examsFilter}
        modulesFilters={modulesFilter}
        dataItems={filteredCompetencyItems}
        averages={averages}
      />
      <UserDetailsReportList
        data={filteredCompetencyItems}
        isLoading={loadingUserData}
        totalItems={0}
        sort={sort}
        setSort={setSort}
        page={page}
        setPage={setPage}
        pageCount={0}
        pageSize={0}
        spinnerClasses="h-24 w-24 my-20 border-8"
      />
    </div>
  );
}
