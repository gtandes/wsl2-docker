import { useRouter } from "next/router";
import { usePrintMode } from "../../../../../../../hooks/usePrintMode";
import {
  Junction_Sc_Definitions_Directus_Users,
  useGetSkillChecklistAssignmentQuery,
} from "api";
import {
  SkillChecklistAverages,
  SkillChecklistsQuestion,
} from "../../../../../../../types/global";
import { useMemo } from "react";
import { PrintReview } from "../../../../../../../components/clinicians/skills-checklists/PrintReview";
import { withAuth } from "../../../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../../../types/roles";
import { SkillCheckListsReview } from "../../../../../../../components/shared/skill-checklists/SkillCheckListsReview";
import { useFeatureFlags } from "../../../../../../../hooks/useFeatureFlags";

function ReviewSkillChecklist() {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const isFlagNewFormatEnable = flags["is_skill_checklist_new_format_enabled"];

  const scId = router.query.sc_id as string;

  const assignmentQuery = useGetSkillChecklistAssignmentQuery({
    variables: {
      assignmentId: scId,
    },
  });

  const definitionData =
    assignmentQuery.data?.junction_sc_definitions_directus_users_by_id
      ?.sc_definitions_id;

  const assignmentData = assignmentQuery.data
    ?.junction_sc_definitions_directus_users_by_id as Junction_Sc_Definitions_Directus_Users;

  const questions = assignmentData?.questions as Array<SkillChecklistsQuestion>;

  const isEnableData =
    assignmentData?.skillchecklist_version?.is_new_format ?? false;

  const isEnableNewFormat = isEnableData && isFlagNewFormatEnable;

  const generalAverages = useMemo<SkillChecklistAverages>(() => {
    const initialResult: SkillChecklistAverages = isEnableNewFormat
      ? { overallAvg: 0 }
      : {
          skillAverage: 0,
          frequencyAverage: 0,
          overallAvg: 0,
        };

    if (!questions) return initialResult;

    let skillTotal = 0;
    let skillCount = 0;
    let freqTotal = 0;
    let freqCount = 0;
    let profTotal = 0;
    let profCount = 0;

    for (const question of questions) {
      for (const section of question.sections) {
        if (section.excludeFromScore === true) continue;

        for (const item of section.items) {
          if (isEnableNewFormat) {
            if (item.proficiency && item.proficiency !== 0) {
              profTotal += item.proficiency;
              profCount += 1;
            }
          } else {
            if (item.skill && item.skill !== 0) {
              skillTotal += item.skill;
              skillCount += 1;
            }
            if (item.frequency && item.frequency !== 0) {
              freqTotal += item.frequency;
              freqCount += 1;
            }
          }
        }
      }
    }

    if (isEnableNewFormat) {
      return {
        overallAvg: profCount > 0 ? profTotal / profCount : 0,
      };
    }

    const skillAvg = skillCount > 0 ? skillTotal / skillCount : 0;
    const freqAvg = freqCount > 0 ? freqTotal / freqCount : 0;
    const overallAvg =
      skillCount + freqCount > 0
        ? (skillTotal + freqTotal) / (skillCount + freqCount)
        : 0;

    return {
      skillAverage: skillAvg,
      frequencyAverage: freqAvg,
      overallAvg,
    };
  }, [questions, isEnableNewFormat]);

  const showSkillChecklist = definitionData && assignmentData && questions;
  return (
    <>
      {showSkillChecklist && (
        <>
          <PrintReview
            assignmentData={assignmentData}
            definitionData={definitionData}
            generalAverages={generalAverages}
            questions={questions}
            isEnableNewFormat={isEnableNewFormat}
          />
          <div className="skill-checklist-review flex h-screen print:mx-auto print:!h-full">
            <div className="flex flex-1 flex-col overflow-hidden bg-[#f4f6fd] print:bg-white">
              <div className="flex h-full flex-1 items-stretch overflow-hidden">
                <div className="flex flex-1 flex-col overflow-y-auto p-3 py-10 print:p-2 md:p-6">
                  <SkillCheckListsReview
                    definitionData={definitionData}
                    assignmentData={assignmentData}
                    generalAverages={generalAverages}
                    questions={questions}
                    isEnableNewFormat={isEnableNewFormat}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default withAuth(ReviewSkillChecklist, AdminGroup);
