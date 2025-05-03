import React, { useMemo, useState } from "react";
import { ContentTypeList } from "../../../components/clinicians/ContentTypeList";
import { DashboardLayout } from "../../../components/clinicians/DashboardLayout";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { withAuth } from "../../../hooks/withAuth";
import { AllRoles, ClinicianGroup } from "../../../types/roles";
import {
  Documents,
  Junction_Directus_Users_Policies_Filter,
  PoliciesAssignmentsFragment,
  useGetAllCategoriesQuery,
  useGetAllPoliciesAssignmentsQuery,
  useUpdatePoliciesAssignmentMutation,
} from "api";
import { useAuth } from "../../../hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faBookOpen } from "@fortawesome/pro-regular-svg-icons";
import { formatDateTime, formatExpiresOnDate } from "../../../utils/format";
import Button from "../../../components/Button";
import { first } from "lodash";
import { useModal } from "../../../hooks/useModal";
import PolicySignModal from "./policySignModal";
import { CompetencyState, DirectusStatus, ExpirationType } from "types";
import Link from "next/link";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";
import { Badge } from "../../../components/Badge";

function CliniciansPoliciesList() {
  const auth = useAuth();
  const modal = useModal();
  const [statusFilters, setStatusFilters] = useState<FilterComboOptions[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<FilterComboOptions[]>(
    []
  );
  const status_options = [
    {
      label: "Read",
      value: "read",
    },
    {
      label: "Unread",
      value: "unread",
    },
    {
      label: "Signed",
      value: "signed",
    },
    {
      label: "Unsigned",
      value: "unsigned",
    },
    {
      label: "Due Date Expired",
      value: CompetencyState.DUE_DATE_EXPIRED,
    },
  ];
  const documentsQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "policy",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });

  const filters = useMemo(() => {
    const filter: Junction_Directus_Users_Policies_Filter = {
      _and: [
        { directus_users_id: { id: { _eq: auth.currentUser?.id! } } },
        { status: { _neq: DirectusStatus.ARCHIVED } },
        {
          agency: {
            _and: [
              { directus_users: { status: { _eq: DirectusStatus.ACTIVE } } },
              {
                directus_users: {
                  directus_users_id: { id: { _eq: auth.currentUser?.id! } },
                },
              },
            ],
          },
        },
      ],
    };

    if (statusFilters.length) {
      const hasReadFilter = statusFilters.some((sf) => sf.value === "read");
      const hasUnreadFilter = statusFilters.some((sf) => sf.value === "unread");
      const hasSignedFilter = statusFilters.some((sf) => sf.value === "signed");
      const hasUnsignedFilter = statusFilters.some(
        (sf) => sf.value === "unsigned"
      );
      const hasDueDateExpiredFilter = statusFilters.some(
        (sf) => sf.value === CompetencyState.DUE_DATE_EXPIRED
      );
      const statusSubFilter: Junction_Directus_Users_Policies_Filter = {
        _or: [],
      };
      if (hasReadFilter) {
        statusSubFilter?._or?.push({
          read: { _nnull: true },
        });
      }
      if (hasUnreadFilter) {
        statusSubFilter?._or?.push({
          read: { _null: true },
        });
      }
      if (hasSignedFilter) {
        statusSubFilter?._or?.push({
          signed_on: { _nnull: true },
        });
      }
      if (hasUnsignedFilter) {
        statusSubFilter?._or?.push({
          read: { _null: true },
        });
      }
      if (hasDueDateExpiredFilter) {
        statusSubFilter?._or?.push({
          status: { _eq: CompetencyState.DUE_DATE_EXPIRED },
        });
      }
      filter?._and?.push(statusSubFilter);
    }
    if (categoryFilters.length) {
      filter?._and?.push({
        policies_id: {
          categories: {
            categories_id: {
              id: { _in: categoryFilters.map((c) => c.value) },
            },
          },
        },
      });
    }
    return filter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilters, categoryFilters]);

  const policiesAssignments = useGetAllPoliciesAssignmentsQuery({
    variables: {
      filter: filters,
      sort: "-assigned_on",
    },
  });

  const [updateAssignedPolicy] = useUpdatePoliciesAssignmentMutation({
    refetchQueries: [
      "getAllPoliciesAssignments",
      "GetClinicianDashboardCompetencies",
      "GetClinicianDashboardItems",
      "GetClinicianDashboardAnalytics",
    ],
  });

  const categoriesOptions =
    (documentsQuery.data?.categories.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const onOpenPolicy = async (
    policy: PoliciesAssignmentsFragment,
    policyDocument: Documents,
    itWasRead: Date,
    relationId: string
  ) => {
    const linkToOpen =
      policy.policies_id?.import_policy_url ||
      `/cms/assets/${policyDocument.id}`;

    if (!itWasRead) {
      await updateAssignedPolicy({
        variables: {
          id: relationId,
          data: { read: new Date() },
        },
      });
    }

    window.open(linkToOpen, "_blank");
  };

  const onSignPolicy = async (policy: PoliciesAssignmentsFragment) => {
    await modal.show({
      title: policy.policies_id?.name!,
      children: (onClose) => (
        <PolicySignModal
          relationId={policy.id}
          expirationType={policy.expiration_type as ExpirationType}
          onClose={onClose}
        />
      ),
    });
  };

  const renderActions = (policy: PoliciesAssignmentsFragment) => {
    const isSigned = !!policy.signed_on;

    return (
      <div className="flex flex-row flex-wrap gap-2">
        {policy.status === CompetencyState.DUE_DATE_EXPIRED ? (
          <Button
            label="Due Date Expired"
            classes="cursor-not-allowed"
            variant="light-red"
          />
        ) : (
          <>
            {isSigned && (
              <Link href={`/clinician/policies/${policy.id}/signature`}>
                <Button label="View Signature" variant="light-green" />
              </Link>
            )}
            <Button
              onClick={() =>
                onOpenPolicy(
                  policy,
                  policy.policies_id?.document as Documents,
                  policy.read as Date,
                  policy.id
                )
              }
              label="Read"
              variant="light-blue"
            />
            <Button
              onClick={() => onSignPolicy(policy)}
              label={isSigned ? "Re-Sign" : "Sign"}
              variant="solid"
            />
          </>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-medium text-blue-400">Policies</h1>
      <ContentTypeList
        filters={
          <>
            <div className="h-full rounded-md bg-white">
              <FilterCombo
                label="STATUS"
                placeholder="Filter by Status"
                options={status_options}
                filters={statusFilters}
                setFilters={setStatusFilters}
              />
              <FilterCombo
                label="CATEGORY"
                placeholder="Filter by Category"
                options={categoriesOptions}
                filters={categoryFilters}
                setFilters={setCategoryFilters}
              />
            </div>
          </>
        }
        totalItems={
          policiesAssignments.data?.junction_directus_users_policies.length
        }
        loading={policiesAssignments.loading}
        content={policiesAssignments.data?.junction_directus_users_policies.map(
          (policy) => {
            return (
              <div
                key={policy.id}
                className="flex flex-col gap-4 rounded-lg px-4 py-6 shadow"
              >
                <div className="flex gap-3">
                  <div className="hidden h-[110px] w-[130px] items-center justify-center rounded-md border-gray-300 bg-blue-50 md:flex">
                    <FontAwesomeIcon
                      icon={policy.read ? faBookOpen : faBook}
                      className="text-4xl text-blue-500"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[40px] w-[50px] items-center justify-center rounded-md border-gray-300 bg-green-50 md:hidden">
                        <FontAwesomeIcon
                          icon={policy.read ? faBookOpen : faBook}
                          className="text-2xl text-blue-500"
                        />
                      </div>
                      <h6 className="mt-2 text-sm font-bold uppercase text-blue-500">
                        {
                          first(policy.policies_id?.categories)?.categories_id
                            ?.title
                        }
                      </h6>
                      <Badge colors="bg-blue-50 text-blue-500">
                        {policy?.agency?.name}
                      </Badge>
                    </div>
                    <h5 className="mb-7 break-words text-lg font-medium leading-5 text-black">
                      {policy.policies_id?.name}
                    </h5>
                    <Dates policy={policy} />
                  </div>
                  <div className="hidden flex-col justify-between gap-3 md:flex">
                    {renderActions(policy)}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between gap-3 md:hidden">
                  {renderActions(policy)}
                </div>
              </div>
            );
          }
        )}
      />
    </DashboardLayout>
  );
}

function Dates(props: { policy: PoliciesAssignmentsFragment }) {
  const { policy } = props;
  return (
    <div className="flex w-full flex-col gap-1 text-xs text-gray-500 md:flex-row md:gap-4">
      {policy?.assigned_on && (
        <span>Assigned: {formatDateTime(policy?.assigned_on as Date)}</span>
      )}

      {policy?.read && (
        <span>Read: {formatDateTime(policy?.read as Date)}</span>
      )}

      {policy?.signed_on && (
        <span>Signed: {formatDateTime(policy?.signed_on as Date)}</span>
      )}

      {policy?.expires_on && (
        <span>
          Expires On: {formatExpiresOnDate(policy?.expires_on as Date)}
        </span>
      )}
    </div>
  );
}

export default withAuth(CliniciansPoliciesList, ClinicianGroup);
