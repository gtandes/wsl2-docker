import {
  SkillChecklistAssignmentFragment,
  useGetAllCategoriesQuery,
  useGetSkillsChecklistsAssignmentsQuery,
  useStartSkillChecklistMutation,
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
import { faBriefcaseMedical } from "@fortawesome/pro-regular-svg-icons";
import {
  formatDateTime,
  getFormattedDueDate,
  getLastMinuteOfDate,
} from "../../../utils/format";
import Button from "../../../components/Button";
import { useRouter } from "next/router";
import { useModal } from "../../../hooks/useModal";
import { CompetencyState, DirectusStatus } from "types";
import {
  COMBOBOX_RESULTS_AMOUNT,
  SkillChecklistsQuestion,
} from "../../../types/global";
import { openExternalLink } from "../../../utils/utils";
import { Badge } from "../../../components/Badge";
import { format, parseISO } from "date-fns";

const STATUS_OPTIONS = [
  {
    label: "Pending",
    value: CompetencyState.PENDING,
  },
  {
    label: "Completed",
    value: CompetencyState.COMPLETED,
  },
  {
    label: "Due Date Expired",
    value: CompetencyState.DUE_DATE_EXPIRED,
  },
];

function CliniciansSkillsChecklists() {
  const auth = useAuth();
  const [statusFilters, setStatusFilters] = useState<FilterComboOptions[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<FilterComboOptions[]>(
    []
  );

  const modal = useModal();
  const router = useRouter();

  const [startSkillChecklist] = useStartSkillChecklistMutation();

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

  const assignmentsQuery = useGetSkillsChecklistsAssignmentsQuery({
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
  });

  const handleRetake = async (assignmentId: string) => {
    const assignment =
      assignmentsQuery.data?.junction_sc_definitions_directus_users.find(
        (a) => a.id === assignmentId
      );

    if (!assignment) return;

    let retakeClear = false;

    const confirmed = await modal.show({
      title:
        "Are you sure you want to proceed? You have already submitted your response.\nThis action will clear all your previous answers from the Skills Checklist.",
      children: (onClose) => (
        <div className="flex flex-col justify-center gap-2">
          <Button
            type="button"
            label="Yes, provide a blank Skills Checklist"
            onClick={() => {
              retakeClear = true;
              onClose(true);
            }}
            variant="light"
          />
          <Button
            type="button"
            classes="break-all"
            label="Yes, populate with my previous answers"
            onClick={() => onClose(true)}
          />
          <Button
            variant="outline"
            type="button"
            label="No"
            onClick={() => onClose(false)}
          />
        </div>
      ),
    });

    if (!confirmed) return;

    await startSkillChecklist({
      variables: {
        assignmentId: assignment.id,
        versionId: assignment.skillchecklist_version?.id || "",
        ...(retakeClear
          ? {
              questions: assignment.skillchecklist_version?.questions || [],
            }
          : {}),
      },
    });

    router.push(`/clinician/skills-checklists/${assignmentId}`);
  };

  const handleStart = async (assignmentId: string) => {
    const assignment =
      assignmentsQuery.data?.junction_sc_definitions_directus_users.find(
        (a) => a.id === assignmentId
      );

    if (!assignment) return;

    await startSkillChecklist({
      variables: {
        assignmentId: assignment.id,
        versionId: assignment.sc_definitions_id?.last_version?.id || "",
        questions: assignment.sc_definitions_id?.last_version?.questions || [],
      },
    });

    router.push(`/clinician/skills-checklists/${assignmentId}`);
  };

  const findLastCompletedPage = (questions: Array<SkillChecklistsQuestion>) => {
    if (!questions) return -1;

    return questions.findLastIndex((question) =>
      question.sections.some((section) =>
        section.items.some(
          (item) => item.skill !== null || item.frequency !== null
        )
      )
    );
  };

  const renderActions = (skill: SkillChecklistAssignmentFragment) => {
    const isDueDateExpired = skill.status === CompetencyState.DUE_DATE_EXPIRED;
    const isFinished = skill.finished_on !== null;
    const lastCompletedPageIndex = findLastCompletedPage(
      skill.questions as Array<SkillChecklistsQuestion>
    );
    const canContinue =
      lastCompletedPageIndex >= 0 && !isFinished && !isDueDateExpired;
    const notStarted = !skill.finished_on && !canContinue && !isDueDateExpired;
    const isShell = !!skill.sc_definitions_id?.import_is_shell;

    return (
      <div className="flex gap-2">
        {isFinished && (
          <>
            <Button
              label="Review"
              variant="green"
              onClick={() => {
                if (skill.import_report_url) {
                  openExternalLink(skill.import_report_url);
                  return;
                }

                router.push(`/clinician/skills-checklists/${skill.id}/review`);
              }}
            />
            {!skill.import_survey_subscription_id && (
              <Button
                label="Retake"
                variant="light-green"
                onClick={() => handleRetake(skill.id)}
                disabled={isShell}
              />
            )}
          </>
        )}

        {canContinue && (
          <Button
            onClick={async () =>
              await router.push(
                `/clinician/skills-checklists/${skill.id}/${
                  lastCompletedPageIndex + 1
                }`
              )
            }
            label="Continue"
            variant="light-green"
            disabled={isShell}
          />
        )}

        {notStarted && (
          <Button
            onClick={() => handleStart(skill.id)}
            label="Start"
            variant="light-green"
            disabled={isShell}
          />
        )}
        {isDueDateExpired && (
          <Button
            label="Due Date Expired"
            classes="cursor-not-allowed"
            variant="light-red"
          />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-medium text-green-500">
        Skills Checklists
      </h1>
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
          assignmentsQuery.data?.junction_sc_definitions_directus_users.length
        }
        loading={assignmentsQuery.loading}
        content={assignmentsQuery.data?.junction_sc_definitions_directus_users.map(
          (assignment) => {
            return (
              <div
                key={assignment?.id}
                className="flex flex-col gap-4 rounded-lg px-4 py-6 shadow"
              >
                <div className="flex gap-3">
                  <div className="hidden h-[110px] w-[130px] items-center justify-center rounded-md border-gray-300 bg-green-50 md:flex">
                    <FontAwesomeIcon
                      icon={faBriefcaseMedical}
                      className="text-4xl text-green-500"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[40px] w-[50px] items-center justify-center rounded-md border-gray-300 bg-green-50 md:hidden">
                        <FontAwesomeIcon
                          icon={faBriefcaseMedical}
                          className="text-2xl text-green-500"
                        />
                      </div>
                      <h6 className="mt-2 text-sm font-bold uppercase text-green-500">
                        {assignment?.sc_definitions_id?.category?.title}
                      </h6>
                      <Badge colors="bg-green-50 text-green-500">
                        {assignment?.agency?.name}
                      </Badge>
                    </div>
                    <h5 className="break-words text-lg font-medium leading-5 text-black">
                      {assignment?.sc_definitions_id?.title}
                    </h5>
                    <p className="text-sm leading-6 text-gray-500">
                      {assignment?.sc_definitions_id?.last_version?.description}
                    </p>
                    <Dates skill={assignment} />
                  </div>
                  <div className="hidden flex-col justify-between gap-3 md:flex">
                    {renderActions(assignment)}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between gap-3 md:hidden">
                  {renderActions(assignment)}
                </div>
              </div>
            );
          }
        )}
      />
    </DashboardLayout>
  );
}

function Dates(props: { skill: SkillChecklistAssignmentFragment }) {
  const { skill } = props;
  return (
    <div className="flex w-full flex-col gap-1 text-xs text-gray-500 md:flex-row md:gap-4">
      {skill?.assigned_on && skill.status !== CompetencyState.COMPLETED && (
        <span>Assigned: {formatDateTime(skill?.assigned_on as Date)}</span>
      )}

      {skill?.finished_on && skill.status === CompetencyState.COMPLETED && (
        <span>Submitted: {formatDateTime(skill?.finished_on as Date)}</span>
      )}

      {skill?.due_date && (
        <span>Due Date: {getFormattedDueDate(skill.due_date as Date)}</span>
      )}
    </div>
  );
}

export default withAuth(CliniciansSkillsChecklists, ClinicianGroup);
