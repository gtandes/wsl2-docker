import React, { useMemo, useState } from "react";
import { ContentTypeList } from "../../../components/clinicians/ContentTypeList";
import { DashboardLayout } from "../../../components/clinicians/DashboardLayout";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { withAuth } from "../../../hooks/withAuth";
import { ClinicianGroup } from "../../../types/roles";
import {
  Documents,
  DocumentsAssigmentsFragment,
  Junction_Directus_Users_Documents_Filter,
  useGetAllCategoriesQuery,
  useGetDocumentsAssignmentsQuery,
  useUpdateAssignedDocumentMutation,
} from "api";
import { useAuth } from "../../../hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faBookOpen } from "@fortawesome/pro-regular-svg-icons";
import {
  formatDateForInput,
  formatDateTime,
  formatExpiresOnDate,
} from "../../../utils/format";
import Button from "../../../components/Button";
import {
  CompetencyState,
  DirectusStatus,
  ExpirationType,
  controlExpiration,
} from "types";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";
import { Badge } from "../../../components/Badge";

function CliniciansDocumentList() {
  const auth = useAuth();
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
      label: "Due Date Expired",
      value: CompetencyState.DUE_DATE_EXPIRED,
    },
  ];
  const documentsQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "document",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });
  const [updateAssignedDocument] = useUpdateAssignedDocumentMutation({
    refetchQueries: [
      "GetDocumentsAssignments",
      "GetClinicianDashboardCompetencies",
      "GetClinicianDashboardItems",
      "GetClinicianDashboardAnalytics",
    ],
  });

  const filters = useMemo(() => {
    const filter: Junction_Directus_Users_Documents_Filter = {
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
      const hasDueDateExpiredFilter = statusFilters.some(
        (sf) => sf.value === CompetencyState.DUE_DATE_EXPIRED
      );
      const statusSubFilter: Junction_Directus_Users_Documents_Filter = {
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
      if (hasDueDateExpiredFilter) {
        statusSubFilter?._or?.push({
          status: { _eq: CompetencyState.DUE_DATE_EXPIRED },
        });
      }
      filter?._and?.push(statusSubFilter);
    }
    if (categoryFilters.length) {
      filter?._and?.push({
        documents_id: {
          categories: {
            categories_id: {
              id: { _in: categoryFilters.flatMap((c) => c.value) },
            },
          },
        },
      });
    }

    return filter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilters, categoryFilters]);

  const documentsAssignments = useGetDocumentsAssignmentsQuery({
    variables: {
      filter: filters,
    },
  });

  const categoriesOptions =
    (documentsQuery.data?.categories.map((c) => ({
      label: c.title,
      value: c.id,
    })) as FilterComboOptions[]) || [];

  const onOpenFile = async (
    document: DocumentsAssigmentsFragment,
    documentFile: Documents,
    itWasRead: Date,
    relationId: string
  ) => {
    const linkToOpen =
      document.documents_id?.import_document_url ||
      `/cms/assets/${documentFile.id}`;

    if (!itWasRead) {
      const now = new Date();
      await updateAssignedDocument({
        variables: {
          id: relationId,
          data: {
            read: now,
            expires_on: controlExpiration(
              document.expiration_type as ExpirationType,
              now
            ),
          },
        },
      });
    }

    window.open(linkToOpen, "_blank");
  };

  const renderActions = (document: DocumentsAssigmentsFragment) => {
    return (
      <div className="flex flex-row gap-2">
        {document.status === CompetencyState.DUE_DATE_EXPIRED ? (
          <Button
            label="Due Date Expired"
            classes="cursor-not-allowed"
            variant="light-red"
          />
        ) : (
          <Button
            onClick={() =>
              onOpenFile(
                document,
                document.documents_id?.document as Documents,
                document.read!,
                document.id
              )
            }
            label="Read"
            variant="light-blue"
          />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-medium text-teal-500">Documents</h1>
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
        loading={documentsAssignments.loading}
        totalItems={
          documentsAssignments.data?.junction_directus_users_documents.length
        }
        content={documentsAssignments.data?.junction_directus_users_documents.map(
          (da) => {
            return (
              <div
                key={da.id}
                className="flex flex-col gap-4 rounded-lg px-4 py-6 shadow"
              >
                <div className="flex gap-3">
                  <div className="hidden h-[110px] w-[130px] items-center justify-center rounded-md border-gray-300 bg-teal-50 md:flex">
                    <FontAwesomeIcon
                      icon={da.read ? faBookOpen : faBook}
                      className="text-4xl text-teal-500"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[40px] w-[50px] items-center justify-center rounded-md border-gray-300 bg-teal-50 md:hidden">
                        <FontAwesomeIcon
                          icon={da.read ? faBookOpen : faBook}
                          className="text-2xl text-teal-400"
                        />
                      </div>
                      <h6 className="text-sm font-bold uppercase text-teal-500">
                        {da.documents_id?.categories?.[0]?.categories_id?.title}
                      </h6>
                      <Badge colors="bg-teal-50 text-teal-500">
                        {da?.agency?.name}
                      </Badge>
                    </div>
                    <h5 className="break-words text-lg font-medium leading-5 text-black">
                      {da.documents_id?.title}
                    </h5>
                    <p className="text-sm leading-6 text-gray-500">
                      {da.documents_id?.description}
                    </p>
                    <Dates document={da} />
                  </div>

                  <div className="hidden flex-col justify-between gap-3 md:flex">
                    {renderActions(da)}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between gap-3 md:hidden">
                  {renderActions(da)}
                </div>
              </div>
            );
          }
        )}
      />
    </DashboardLayout>
  );
}

function Dates(props: { document: DocumentsAssigmentsFragment }) {
  const { document } = props;
  return (
    <div className="flex w-full flex-col gap-1 text-xs text-gray-500 md:flex-row md:gap-4">
      {document?.assigned_on && (
        <>
          <span>Assigned: {formatDateTime(document?.assigned_on as Date)}</span>
        </>
      )}

      {document?.read && (
        <>
          <span>Read: {formatDateForInput(document?.read as Date)}</span>
        </>
      )}

      {document?.expires_on && (
        <span>
          Expires On: {formatExpiresOnDate(document?.expires_on as Date)}
        </span>
      )}
    </div>
  );
}

export default withAuth(CliniciansDocumentList, ClinicianGroup);
