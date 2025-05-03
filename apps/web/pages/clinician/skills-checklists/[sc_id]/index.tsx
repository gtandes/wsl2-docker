import Button from "../../../../components/Button";
import { withAuth } from "../../../../hooks/withAuth";
import { AllRoles } from "../../../../types/roles";
import { DashboardLayout } from "../../../../components/clinicians/DashboardLayout";
import { useRouter } from "next/router";
import {
  useGetSkillChecklistAssignmentQuery,
  useGetSkillChecklistDetailQuery,
  useUpdateSkillChecklistAssignmentMutation,
} from "api";
import { Spinner } from "../../../../components/Spinner";
import { SkillChecklistLayout } from "../../../../components/clinicians/skills-checklists/SkillChecklistLayout";
import { FormEventHandler, useRef } from "react";
import { QuestionDetailsCard } from "../../../../components/clinicians/skills-checklists/QuestionDetailsCard";
import { notify } from "../../../../components/Notification";
import { useFeatureFlags } from "../../../../hooks/useFeatureFlags";

function SkillChecklist() {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const isFlagNewFormatEnable = flags["is_skill_checklist_new_format_enabled"];

  const scId = router.query.sc_id as string;
  const isPreview = router.query.preview === "true";

  const assignmentQuery = useGetSkillChecklistAssignmentQuery({
    variables: {
      assignmentId: scId,
    },
    skip: isPreview,
  });

  const { data, loading } = useGetSkillChecklistDetailQuery({
    variables: {
      checklistId: scId,
    },
    skip: !isPreview,
  });

  const [updateSkillChecklistAssignment] =
    useUpdateSkillChecklistAssignmentMutation();

  const definitionData = isPreview
    ? data?.sc_definitions_by_id
    : assignmentQuery.data?.junction_sc_definitions_directus_users_by_id
        ?.sc_definitions_id;

  const isEnableData = isPreview
    ? !!data?.sc_definitions_by_id?.last_version?.is_new_format
    : !!assignmentQuery?.data?.junction_sc_definitions_directus_users_by_id
        ?.skillchecklist_version?.is_new_format;

  const isEnableNewFormat = isEnableData && isFlagNewFormatEnable;

  const agreementsCheckbox = useRef<HTMLInputElement>(null);

  const handleStart: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if (isPreview) {
      if (!definitionData?.last_version?.questions) {
        notify({
          type: "error",
          title: "Error",
          description: "There are no questions in this skills checklist",
        });

        return;
      }
      await router.push(`/clinician/skills-checklists/${scId}/1?preview=true`);
    } else {
      if (agreementsCheckbox.current?.checked) {
        await updateSkillChecklistAssignment({
          variables: {
            assignmentId: scId,
            data: {
              accept_agreements: true,
            },
          },
        });
        router.push(`/clinician/skills-checklists/${scId}/1`);
      }
    }
  };

  const contentDynamicText = isEnableNewFormat
    ? "Skills checklists are important documents that legally outline your expertise of your skills across various specialties"
    : "Skills checklists are important documents that legally outline your expertise and the frequency of your skills across various specialties";

  const loadingState = assignmentQuery.loading || loading;

  return (
    <DashboardLayout hideNavbar>
      {loadingState && (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      )}

      {definitionData && (
        <SkillChecklistLayout
          title={definitionData.title!}
          category={definitionData.category?.title!}
        >
          <form
            onSubmit={handleStart}
            className="flex flex-col items-center justify-center gap-10 rounded-lg bg-white px-2 pb-16 pt-24 sm:px-6 lg:px-32"
          >
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-4xl font-medium leading-10 text-blue-800">
                {"Let's"} get started!
              </h2>
              <p className="text-center text-lg leading-none text-gray-500 sm:text-start">
                {isEnableNewFormat
                  ? "Please rate your level of proficiency in performing the following procedures and skills:"
                  : "  Please rate your level of skills & frequency of performance for the following procedures/skills:"}
              </p>
            </div>
            <div className="flex w-full flex-col gap-10 lg:flex-row">
              <QuestionDetailsCard
                title="Agreements"
                content="Your honesty is crucial in ensuring we adhere to legal standards. Thank you!"
              />
              <QuestionDetailsCard
                title="Instructions"
                content={contentDynamicText}
              />
            </div>
            <div className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  required={!isPreview}
                  id="disclaimer"
                  aria-describedby="disclaimer-description"
                  name="disclaimer"
                  type="checkbox"
                  ref={agreementsCheckbox}
                  className="text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300"
                />
              </div>
              <div className="ml-3 text-xs leading-6 sm:text-sm">
                <label
                  htmlFor="disclaimer"
                  className="font-medium text-gray-900"
                >
                  I understand and acknowledge that any misrepresentation or
                  omission may result in disqualification from employment and/or
                  immediate dismissal. By clicking this box, I hereby certify
                  that all information I have provided on this skills checklist
                  is true and accurate, and an automated signature will be
                  generated on the skills checklist.
                </label>
              </div>
            </div>
            <Button type="submit" label="Start Skills Checklist" />
          </form>
        </SkillChecklistLayout>
      )}
    </DashboardLayout>
  );
}

export default withAuth(SkillChecklist, AllRoles);
