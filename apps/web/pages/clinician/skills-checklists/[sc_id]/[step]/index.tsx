import { DashboardLayout } from "../../../../../components/clinicians/DashboardLayout";
import { withAuth } from "../../../../../hooks/withAuth";
import { AllRoles } from "../../../../../types/roles";
import { SkillChecklistLayout } from "../../../../../components/clinicians/skills-checklists/SkillChecklistLayout";
import { Spinner } from "../../../../../components/Spinner";
import Button from "../../../../../components/Button";
import { faArrowLeft, faArrowRight } from "@fortawesome/pro-regular-svg-icons";
import { QuestionTable } from "../../../../../components/clinicians/skills-checklists/QuestionTable";
import {
  SkillChecklistNewFormatQuestion,
  SkillChecklistQuestionDefaultValue,
} from "../../../../../types/global";
import { useSkillChecklistStep } from "../../../../../hooks/skill-checklist/useSKillChecklistStep";

function SkillChecklistStep() {
  const {
    state,
    dispatch,
    loading,
    currentPage,
    totalPages,
    definitionData,
    mutationResult,
    handleNextPage,
    handlePrevious,
    isEnableNewFormat,
  } = useSkillChecklistStep();

  return (
    <DashboardLayout hideNavbar>
      {loading && (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      )}
      {definitionData && state.question && (
        <SkillChecklistLayout
          title={definitionData.title!}
          category={definitionData.category?.title!}
        >
          <form
            onSubmit={handleNextPage}
            className="flex flex-col gap-10 bg-white p-2 md:p-6 lg:p-16"
          >
            <div className="space-y-4 rounded-lg bg-blue-50 p-10">
              <h2 className="text-4xl font-medium leading-10 text-blue-800">
                Description
              </h2>
              <p className="whitespace-pre-line text-gray-500">
                {isEnableNewFormat
                  ? SkillChecklistNewFormatQuestion
                  : SkillChecklistQuestionDefaultValue}
              </p>
            </div>
            <QuestionTable
              question={state.question}
              setQuestion={(q) =>
                dispatch({ type: "SET_QUESTION", payload: q })
              }
              isReview={false}
              isEnableNewFormat={isEnableNewFormat}
            />

            <div className="flex items-center justify-between">
              <Button
                iconLeft={faArrowLeft}
                label="Previous"
                type="reset"
                variant="light-blue"
                onClick={handlePrevious}
                size="xs"
              />
              <div className="text-xs leading-7 text-gray-700 sm:text-xl">
                Section {currentPage} of {totalPages} sections
              </div>
              <Button
                label={currentPage === totalPages ? "Submit" : "Next"}
                iconRight={faArrowRight}
                loading={mutationResult.loading}
                type="submit"
                size="xs"
              />
            </div>
          </form>
        </SkillChecklistLayout>
      )}
    </DashboardLayout>
  );
}

export default withAuth(SkillChecklistStep, AllRoles);
