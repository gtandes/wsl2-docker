import { useRouter } from "next/router";
import { useMemo } from "react";
import {
  Junction_Sc_Definitions_Directus_Users,
  Sc_Definitions,
  useGetSkillChecklistAssignmentQuery,
} from "api";
import {
  SkillChecklistAverages,
  SkillChecklistsQuestion,
} from "../../types/global";
import { useFeatureFlags } from "../useFeatureFlags";

export function useSkillChecklistReview() {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const isFlagNewFormatEnable = flags["is_skill_checklist_new_format_enabled"];

  const scId = router.query.sc_id as string;
  const fromReport = !!router.query.from_report;

  const assignmentQuery = useGetSkillChecklistAssignmentQuery({
    variables: {
      assignmentId: scId,
    },
  });

  const rawDefinitionData =
    assignmentQuery.data?.junction_sc_definitions_directus_users_by_id
      ?.sc_definitions_id;

  const rawAssignmentData =
    assignmentQuery.data?.junction_sc_definitions_directus_users_by_id;

  const definitionData = rawDefinitionData as Sc_Definitions | undefined;
  const assignmentData = rawAssignmentData as
    | Junction_Sc_Definitions_Directus_Users
    | undefined;

  const isEnableData =
    assignmentData?.skillchecklist_version?.is_new_format ?? false;

  const isEnableNewFormat = isEnableData && isFlagNewFormatEnable;

  const questions = useMemo(() => {
    const rawQuestions = assignmentData?.questions as
      | Array<SkillChecklistsQuestion>
      | undefined;

    if (!rawQuestions || !isEnableNewFormat) return rawQuestions;

    return rawQuestions.map((question) => ({
      ...question,
      sections: question.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          frequency: -1,
        })),
      })),
    }));
  }, [assignmentData?.questions, isEnableNewFormat]);

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

  const showSkillChecklist =
    !!definitionData && !!assignmentData && !!questions;

  return {
    assignmentQuery,
    definitionData,
    assignmentData,
    questions,
    generalAverages,
    showSkillChecklist,
    fromReport,
    isEnableNewFormat,
  };
}
