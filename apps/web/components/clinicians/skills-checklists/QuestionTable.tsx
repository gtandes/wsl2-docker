import { useMemo } from "react";
import {
  SkillChecklistAverages,
  SkillChecklistsQuestion,
} from "../../../types/global";
import { AverageCard } from "./AverageCard";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { QuestionSection } from "./QuestionSection";
import { useRouter } from "next/router";
import { GENERIC_ERROR_PLEASE_RELOAD, notify } from "../../Notification";

interface IQuestionTableProps {
  question: SkillChecklistsQuestion;
  setQuestion?: (question: SkillChecklistsQuestion) => void;
  isReview: boolean;
  isEnableNewFormat?: boolean;
}

export const QuestionTable = ({
  question,
  isReview,
  setQuestion,
  isEnableNewFormat = false,
}: IQuestionTableProps) => {
  const { breakpoint } = useBreakpoint();
  const router = useRouter();
  const step = router.query.step as string;

  const onChangeAnswer = (
    value: number | null,
    section: number,
    item: number,
    property: "skill" | "frequency" | "proficiency"
  ): boolean => {
    if (!setQuestion) return false;

    if (isEnableNewFormat && property === "frequency") return false;

    let success = false;

    const updatedQuestion = {
      ...question,
      sections: question.sections.map((sect, sectIdx) =>
        sectIdx !== section
          ? sect
          : {
              ...sect,
              items: sect.items.map((itm, itmIdx) =>
                itmIdx !== item
                  ? itm
                  : {
                      ...itm,
                      [property]: value ?? null,
                    }
              ),
            }
      ),
    };

    setQuestion(updatedQuestion);
    success = true;
    return success;
  };

  const onSkipSection = (
    section: number,
    property: "skill" | "frequency" | "proficiency"
  ) => {
    if (!setQuestion) return;

    if (isEnableNewFormat && property === "frequency") return;

    const updatedQuestion = {
      ...question,
      sections: question.sections.map((sect, sectIdx) =>
        sectIdx === section
          ? {
              ...sect,
              items: sect.items.map((itm) => ({
                ...itm,
                [property]: 0,
              })),
            }
          : sect
      ),
    };

    setQuestion(updatedQuestion);
  };

  const averages = useMemo<SkillChecklistAverages>(() => {
    let totalSkillItems = 0;
    let totalFrequencyItems = 0;
    let totalProficiency = 0;
    let skillAcc = 0;
    let freqAcc = 0;
    let proficiencyAcc = 0;

    question.sections?.forEach((section) => {
      if (section.excludeFromScore) {
        return;
      }

      section.items.forEach((item) => {
        if (isEnableNewFormat && item.proficiency !== 0) {
          totalProficiency++;
          proficiencyAcc += item.proficiency ?? 0;
        }
        if (!isEnableNewFormat && item.skill !== 0) {
          totalSkillItems++;
          skillAcc += item.skill ?? 0;
        }
        if (!isEnableNewFormat && item.frequency !== 0) {
          totalFrequencyItems++;
          freqAcc += item.frequency ?? 0;
        }
      });
    });

    const skillAverage = totalSkillItems > 0 ? skillAcc / totalSkillItems : 0;
    const frequencyAverage =
      totalFrequencyItems > 0 ? freqAcc / totalFrequencyItems : 0;
    const proficiencyAverage =
      totalProficiency > 0 ? proficiencyAcc / totalProficiency : 0;

    const overallAvg = isEnableNewFormat
      ? proficiencyAverage
      : totalSkillItems + totalFrequencyItems > 0
      ? (skillAcc + freqAcc) / (totalSkillItems + totalFrequencyItems)
      : 0;

    return {
      skillAverage,
      frequencyAverage,
      overallAvg,
      proficiencyAverage,
    };
  }, [question, isEnableNewFormat]);

  const showAverageCards = question.sections?.some(
    (section) => !section.excludeFromScore
  );

  return (
    <div className="flex w-full flex-col">
      {showAverageCards && (
        <div className="flex flex-col justify-between gap-2 lg:flex-row">
          <AverageCard title="Overall Avg." value={averages.overallAvg} />
          {!isEnableNewFormat && (
            <>
              <AverageCard
                title="Skill Avg."
                value={averages.skillAverage ?? 0}
              />
              <AverageCard
                title="Frequency Avg."
                value={averages.frequencyAverage ?? 0}
              />
            </>
          )}
        </div>
      )}

      <div className="w-full overflow-hidden rounded shadow">
        <table className="w-full">
          <thead>
            <tr className="h-9 bg-blue-800 p-2 text-[10px] text-xs font-medium text-white sm:text-sm">
              <th
                colSpan={breakpoint === "sm" ? (isEnableNewFormat ? 2 : 3) : 1}
                align="left"
                className="min-w-[270px] pl-2"
              >
                PROCEDURES/SKILLS
              </th>

              {isEnableNewFormat ? (
                <th align="left" className="hidden w-[340px] sm:table-cell">
                  PROFICIENCY
                </th>
              ) : (
                <>
                  <th align="left" className="hidden w-[340px] sm:table-cell">
                    SKILL
                  </th>
                  <th align="left" className="hidden w-[340px] sm:table-cell">
                    FREQUENCY
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {question.sections?.map((sect, sectIdx) => (
              <QuestionSection
                key={`${sect.title} - ${sectIdx} - ${step}`}
                isReview={isReview}
                section={sect}
                onChangeAnswer={onChangeAnswer}
                onSkipSection={onSkipSection}
                sectionIndex={sectIdx}
                isEnableNewFormat={isEnableNewFormat}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
