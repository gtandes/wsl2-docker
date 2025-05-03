import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { DashboardLayout } from "../../../../components/clinicians/DashboardLayout";
import { Spinner } from "../../../../components/Spinner";
import { PrintReview } from "../../../../components/clinicians/skills-checklists/PrintReview";
import { SkillCheckListsReview } from "../../../../components/shared/skill-checklists/SkillCheckListsReview";
import { useSkillChecklistReview } from "../../../../hooks/skill-checklist/useSkillChecklistReview";

function ReviewSkillChecklist() {
  const {
    assignmentQuery,
    definitionData,
    assignmentData,
    questions,
    generalAverages,
    showSkillChecklist,
    fromReport,
    isEnableNewFormat,
  } = useSkillChecklistReview();

  return (
    <>
      {showSkillChecklist && definitionData && assignmentData && questions && (
        <PrintReview
          assignmentData={assignmentData}
          definitionData={definitionData}
          generalAverages={generalAverages}
          questions={questions}
          isEnableNewFormat={isEnableNewFormat}
        />
      )}

      <DashboardLayout hideNavbar {...(fromReport && { showHeader: false })}>
        {assignmentQuery.loading && (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        )}
        {showSkillChecklist &&
          definitionData &&
          assignmentData &&
          questions && (
            <SkillCheckListsReview
              definitionData={definitionData}
              assignmentData={assignmentData}
              generalAverages={generalAverages}
              questions={questions}
              isEnableNewFormat={isEnableNewFormat}
            />
          )}
      </DashboardLayout>
    </>
  );
}

export default withAuth(ReviewSkillChecklist, ClinicianGroup);
