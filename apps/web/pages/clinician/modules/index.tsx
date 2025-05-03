import {
  ModuleAssignmentFragment,
  useCreateAttemptMutation,
  useGetAllCategoriesQuery,
  useGetModulesAssignmentsQuery,
  useStartModuleMutation,
} from "api";
import { ContentTypeList } from "../../../components/clinicians/ContentTypeList";
import { DashboardLayout } from "../../../components/clinicians/DashboardLayout";
import {
  FilterCombo,
  FilterComboOptions,
} from "../../../components/clinicians/FilterCombo";
import { withAuth } from "../../../hooks/withAuth";
import { ClinicianGroup } from "../../../types/roles";
import React, { useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook } from "@fortawesome/pro-regular-svg-icons";
import { useRouter } from "next/router";
import { useModal } from "../../../hooks/useModal";
import Button from "../../../components/Button";
import {
  formatDate,
  formatDateTime,
  formatExpiresOnDate,
  getFormattedDueDate,
} from "../../../utils/format";
import { isBefore, parseISO, format } from "date-fns";
import { CompetencyState, DirectusStatus } from "types";
import { openExternalLink } from "../../../utils/utils";
import { COMBOBOX_RESULTS_AMOUNT } from "../../../types/global";
import { Badge } from "../../../components/Badge";

const STATUS_OPTIONS = [
  {
    label: "Pending",
    value: CompetencyState.PENDING,
  },
  {
    label: "Finished",
    value: CompetencyState.FINISHED,
  },
  {
    label: "Started",
    value: CompetencyState.STARTED,
  },
  {
    label: "Due date expired",
    value: CompetencyState.DUE_DATE_EXPIRED,
  },
];

function ClinicianModules() {
  const auth = useAuth();
  const [statusFilters, setStatusFilters] = useState<FilterComboOptions[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<FilterComboOptions[]>(
    []
  );

  const modal = useModal();

  const router = useRouter();

  const modalitiesQuery = useGetAllCategoriesQuery({
    variables: {
      filter: {
        type: {
          _eq: "modality",
        },
        status: {
          _eq: DirectusStatus.PUBLISHED,
        },
      },
      limit: COMBOBOX_RESULTS_AMOUNT,
    },
  });
  const modalityOptions = modalitiesQuery.data?.categories.map((c) => ({
    label: c.title,
    value: c.id,
  }));

  const assignmentsQuery = useGetModulesAssignmentsQuery({
    variables: {
      userId: auth.currentUser?.id!,
      category:
        categoryFilters.length > 0
          ? categoryFilters.map((c) => c.value)
          : modalityOptions?.map((c) => c.value),
      status:
        statusFilters.length > 0
          ? statusFilters.map((s) => s.value)
          : STATUS_OPTIONS.map((s) => s.value),
    },
    fetchPolicy: "network-only",
  });

  const [startModule] = useStartModuleMutation({
    refetchQueries: [
      "getModulesAssignments",
      "GetClinicianDashboardCompetencies",
      "GetClinicianDashboardItems",
      "GetClinicianDashboardAnalytics",
    ],
  });
  const [createAttempt] = useCreateAttemptMutation();

  const handleStart = async (assignmentId: string) => {
    const moduleDefinition =
      assignmentsQuery.data?.junction_modules_definition_directus_users.find(
        (assignment) => assignment.id === assignmentId
      )?.modules_definition_id;

    if (!moduleDefinition?.last_version?.id) return;

    await createAttempt({
      variables: {
        assignmentId: assignmentId,
        moduleVersionId: moduleDefinition.last_version.id,
        moduleId: moduleDefinition.id,
      },
    });

    await startModule({
      variables: {
        assignmentId: assignmentId,
        versionId: moduleDefinition.last_version.id,
      },
    });

    await router.push(`/clinician/modules/${assignmentId}`);
  };

  const handleContinue = async (assignmentId: string) => {
    await router.push(`/clinician/modules/${assignmentId}`);
  };

  const handleViewCertificate = async (
    assignment: ModuleAssignmentFragment
  ) => {
    if (assignment.import_cert_url) {
      openExternalLink(assignment.import_cert_url);
      return;
    }

    await router.push(`/clinician/modules/${assignment.id}/certificate`);
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-medium text-light-blue-400">Modules</h1>
      <ContentTypeList
        filters={
          <>
            <div className="h-full rounded-md bg-white">
              <FilterCombo
                label="STATUS"
                placeholder="Filter by Status"
                options={STATUS_OPTIONS}
                filters={statusFilters}
                setFilters={setStatusFilters}
              />
              <FilterCombo
                label="CATEGORY"
                placeholder="Filter by Category"
                options={(modalityOptions as FilterComboOptions[]) || []}
                filters={categoryFilters}
                setFilters={setCategoryFilters}
              />
            </div>
          </>
        }
        totalItems={
          assignmentsQuery.data?.junction_modules_definition_directus_users
            .length
        }
        loading={assignmentsQuery.loading}
        content={assignmentsQuery.data?.junction_modules_definition_directus_users.map(
          (assignment) => {
            const assignmentStatus = assignment.status;
            const isExpired = assignment.due_date
              ? isBefore(new Date(assignment.due_date), Date.now())
              : true;

            const expirationDate = assignment?.expires_on
              ? new Date(assignment.expires_on)
              : null;

            const validThru = expirationDate
              ? new Date(
                  new Date(expirationDate).setDate(
                    new Date(expirationDate).getDate() - 1
                  )
                )
              : null;

            const outOfAttempts =
              (assignment.attempts_used ?? 0) >=
              (assignment.allowed_attempts ?? 0);

            const isPending = assignmentStatus === CompetencyState.PENDING;
            const isStarted = assignmentStatus === CompetencyState.STARTED;
            const isFinished = assignmentStatus === CompetencyState.FINISHED;
            const isDueDateExpired =
              assignmentStatus === CompetencyState.DUE_DATE_EXPIRED;

            const passedButtonText = assignment.score
              ? `Passed ${assignment.score}%`
              : "Passed";

            const renderActions = () => {
              const isShell =
                !!assignment.modules_definition_id?.import_is_shell;

              if (outOfAttempts && isFinished) {
                return (
                  <>
                    {assignment.approved && (
                      <Button
                        label={"View Certificate"}
                        onClick={() => handleViewCertificate(assignment)}
                        variant="light-green"
                      />
                    )}
                    <Button
                      label={assignment.approved ? passedButtonText : "Failed"}
                      variant={assignment.approved ? "green" : "light-red"}
                      onClick={() =>
                        router.push(
                          `/clinician/modules/${assignment.id}/review`
                        )
                      }
                    />
                  </>
                );
              }

              if (isExpired && (isPending || isStarted)) {
                return <Button label="Expired" variant="light-gray" />;
              }

              if (isStarted) {
                return (
                  <Button
                    label="Continue"
                    onClick={() => handleContinue(assignment.id)}
                    variant="light"
                    disabled={isShell}
                  />
                );
              }

              if (isPending) {
                return (
                  <Button
                    label="Start"
                    onClick={() => handleStart(assignment.id)}
                    variant="light-blue"
                    disabled={isShell}
                  />
                );
              }
              if (isDueDateExpired) {
                return (
                  <Button
                    label="Due Date Expired"
                    classes="cursor-not-allowed"
                    variant="light-red"
                  />
                );
              }

              if (isFinished && assignment.approved) {
                return (
                  <>
                    <Button
                      label={"View Certificate"}
                      onClick={() => handleViewCertificate(assignment)}
                      variant="light-green"
                    />

                    <Button
                      label={passedButtonText}
                      variant={"green"}
                      onClick={() =>
                        router.push(
                          `/clinician/modules/${assignment.id}/review`
                        )
                      }
                    />
                  </>
                );
              }

              if (isFinished && !outOfAttempts) {
                return (
                  <>
                    {assignment.approved && (
                      <Button
                        label={"View Certificate"}
                        onClick={() => handleViewCertificate(assignment)}
                        variant="light-green"
                      />
                    )}
                    <Button
                      label={"Retry"}
                      onClick={async () => {
                        const confirmed = await modal.showConfirm(
                          `Are you sure you want to retry this module?`
                        );

                        if (!confirmed) return;
                        handleStart(assignment.id);
                      }}
                      variant={"light-green"}
                    />
                  </>
                );
              }
            };

            return (
              <div
                key={assignment?.id}
                className="flex flex-col gap-4 rounded-lg px-4 py-6 shadow"
              >
                <div className="flex gap-3">
                  <div className="hidden h-[110px] w-[130px] items-center justify-center rounded-md border-gray-300 bg-light-blue-50 md:flex">
                    <FontAwesomeIcon
                      icon={faBook}
                      className="text-4xl text-light-blue-500"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[40px] w-[50px] items-center justify-center rounded-md border-gray-300 bg-light-blue-50 md:hidden">
                        <FontAwesomeIcon
                          icon={faBook}
                          className="text-2xl text-light-blue-500"
                        />
                      </div>
                      <h6 className="text-sm font-bold uppercase text-light-blue-500">
                        {assignment.modules_definition_id?.modality?.title}
                      </h6>
                      <Badge colors="bg-light-blue-50 text-light-blue-500">
                        {assignment?.agency?.name}
                      </Badge>
                    </div>
                    <h5 className="break-words text-lg font-medium leading-5 text-black">
                      {assignment.modules_definition_id?.title}
                    </h5>
                    <p className="text-sm leading-6 text-gray-500">
                      {assignment.modules_definition_id?.description}
                    </p>
                    {assignment?.expires_on && (
                      <span className="text-xs text-gray-500">
                        Expires On:{" "}
                        {formatExpiresOnDate(assignment?.expires_on)}
                      </span>
                    )}
                    <Dates module={assignment} />
                  </div>
                  <div className="hidden flex-col gap-3 md:flex">
                    {renderActions()}
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="text-xs text-gray-500">
                    Attempts:{" "}
                    {`${assignment.attempts_used}/${assignment.allowed_attempts}`}
                  </span>
                </div>
                <div className="flex flex-row items-end justify-end gap-3 md:hidden">
                  {renderActions()}
                </div>
              </div>
            );
          }
        )}
      />
    </DashboardLayout>
  );
}

function Dates(props: { module: ModuleAssignmentFragment }) {
  const { module } = props;
  return (
    <div className="flex w-full flex-col gap-1 text-xs text-gray-500 md:flex-row md:gap-4">
      {module?.assigned_on && (
        <span>Assigned: {formatDateTime(module?.assigned_on as Date)}</span>
      )}

      {module?.started_on && (
        <span>Started: {formatDateTime(module?.started_on as Date)}</span>
      )}

      {module?.due_date && (
        <span>Due Date: {getFormattedDueDate(module?.due_date as Date)}</span>
      )}
    </div>
  );
}

export default withAuth(ClinicianModules, ClinicianGroup);
