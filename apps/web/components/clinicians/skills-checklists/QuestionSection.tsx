import { SkillChecklistsQuestion } from "../../../types/global";
import { useRouter } from "next/router";
import { useState } from "react";
import { QuestionItem } from "./QuestionItem";
import { useAgency } from "../../../hooks/useAgency";

interface Props {
  isReview: boolean;
  onChangeAnswer: (
    value: number | null,
    section: number,
    item: number,
    property: "skill" | "frequency" | "proficiency"
  ) => boolean;
  onSkipSection: (
    section: number,
    property: "skill" | "frequency" | "proficiency"
  ) => void;
  section: SkillChecklistsQuestion["sections"][0];
  sectionIndex: number;
  isEnableNewFormat?: boolean;
}

export const QuestionSection = ({
  section,
  isReview,
  onChangeAnswer,
  onSkipSection,
  sectionIndex,
  isEnableNewFormat = false,
}: Props) => {
  const router = useRouter();
  const step = router.query.step as string;
  const globalAgency = useAgency();

  const [skipFrequency, setSkipFrequency] = useState(false);
  const [skipSkill, setSkipSkill] = useState(false);

  const skipIsEnabled = !!globalAgency.currentAgency?.sc_allow_na_option;

  const getAverageRating = (
    property: "skill" | "frequency" | "proficiency",
    section: SkillChecklistsQuestion["sections"][0]
  ) => {
    return (
      Number(
        (
          section.items.reduce((acc, curr) => acc + (curr[property] || 0), 0) /
          section.items.length
        ).toFixed(2)
      ) || "N/A"
    );
  };

  return (
    <>
      <tr className="bg-blue-100 text-[10px] font-medium leading-5 text-gray-700 md:text-sm">
        <td className="py-2 pl-2 sm:pl-6">{section.title}</td>
        <td>
          {isReview ? (
            <>Avg. Rating: {getAverageRating("skill", section)}</>
          ) : (
            skipIsEnabled && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSkipSection(sectionIndex, "skill");
                    }
                    setSkipSkill(e.target.checked);
                  }}
                />
                Skip Skill Section
              </label>
            )
          )}
        </td>
        {!isEnableNewFormat && (
          <td>
            {isReview ? (
              <>Avg. Rating: {getAverageRating("frequency", section)}</>
            ) : (
              skipIsEnabled && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSkipSection(sectionIndex, "frequency");
                      }
                      setSkipFrequency(e.target.checked);
                    }}
                  />
                  Skip Frequency Section
                </label>
              )
            )}
          </td>
        )}
      </tr>
      {section.items.map((item, itemIdx) => {
        return (
          <QuestionItem
            key={`${item.title} - ${itemIdx} - ${step}`}
            item={item}
            itemIndex={itemIdx}
            sectionIndex={sectionIndex}
            isReview={isReview}
            onChangeAnswer={onChangeAnswer}
            skipFrequency={skipFrequency}
            skipSkill={skipSkill}
            isEnableNewFormat={isEnableNewFormat}
          />
        );
      })}
    </>
  );
};
