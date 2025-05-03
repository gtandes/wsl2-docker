import { useRouter } from "next/router";
import { SkillChecklistsItem } from "../../../types/global";
import { ScoreSelector } from "./ScoreSelector";
import { ScoreSelectorReview } from "./ScoreSelectorReview";
import { useBreakpoint } from "../../../hooks/useBreakpoint";

interface IQuestionTableProps {
  item: SkillChecklistsItem;
  onChangeAnswer: (
    value: number | null,
    section: number,
    item: number,
    property: "skill" | "frequency" | "proficiency"
  ) => boolean;
  itemIndex: number;
  sectionIndex: number;
  isReview: boolean;
  skipSkill: boolean;
  skipFrequency: boolean;
  isEnableNewFormat?: boolean;
}

export const QuestionItem: React.FC<IQuestionTableProps> = ({
  onChangeAnswer,
  item,
  itemIndex,
  sectionIndex,
  isReview,
  skipFrequency,
  skipSkill,
  isEnableNewFormat = false,
}) => {
  const router = useRouter();
  const step = router.query.step as string;

  const { breakpoint } = useBreakpoint();
  const isMobile = breakpoint === "sm" || breakpoint === "md";

  const renderFrequencyRow = !isEnableNewFormat && (
    <td className={isMobile ? "px-2" : ""}>
      {isReview ? (
        <ScoreSelectorReview item={item} property="frequency" />
      ) : (
        <ScoreSelector
          name={`${item.title} - frequency - ${step}`}
          value={item?.frequency ?? -1}
          onChange={(newValue) => {
            const success = onChangeAnswer(
              newValue,
              sectionIndex,
              itemIndex,
              "frequency"
            );

            if (!success) {
              setTimeout(() => {
                onChangeAnswer(null, sectionIndex, itemIndex, "frequency");
              }, 10);
            }
          }}
          disabled={skipFrequency}
        />
      )}
    </td>
  );

  if (isMobile) {
    return (
      <>
        <tr className="h-12 text-sm text-gray-700">
          <td colSpan={isEnableNewFormat ? 2 : 3} className="px-7">
            {itemIndex + 1}. {item.title}
          </td>
        </tr>
        <tr className="h-16 text-sm">
          <td className="px-2">Skill</td>
          <td colSpan={isEnableNewFormat ? 1 : 2} className="px-2">
            {isReview ? (
              isEnableNewFormat ? (
                <ScoreSelectorReview item={item} property="proficiency" />
              ) : (
                <ScoreSelectorReview item={item} property="skill" />
              )
            ) : isEnableNewFormat ? (
              <ScoreSelector
                name={`${item.title} - proficiency - ${step}`}
                value={item.proficiency ?? -1}
                onChange={(newValue) => {
                  const success = onChangeAnswer(
                    newValue,
                    sectionIndex,
                    itemIndex,
                    "proficiency"
                  );

                  if (!success) {
                    setTimeout(() => {
                      onChangeAnswer(
                        null,
                        sectionIndex,
                        itemIndex,
                        "proficiency"
                      );
                    }, 10);
                  }
                }}
                disabled={skipSkill}
              />
            ) : (
              <ScoreSelector
                name={`${item.title} - skill - ${step}`}
                value={item.skill ?? -1}
                onChange={(newValue) => {
                  const success = onChangeAnswer(
                    newValue,
                    sectionIndex,
                    itemIndex,
                    "skill"
                  );

                  if (!success) {
                    setTimeout(() => {
                      onChangeAnswer(null, sectionIndex, itemIndex, "skill");
                    }, 10);
                  }
                }}
                disabled={skipSkill}
              />
            )}
          </td>
        </tr>
        {!isEnableNewFormat && (
          <tr className="h-16 border-b text-sm">
            <td className="px-2">Frequency</td>
            <td colSpan={2} className="px-2">
              {isReview ? (
                <ScoreSelectorReview item={item} property="frequency" />
              ) : (
                <ScoreSelector
                  name={`${item.title} - frequency - ${step}`}
                  value={item.frequency ?? -1}
                  onChange={(newValue) => {
                    const success = onChangeAnswer(
                      newValue,
                      sectionIndex,
                      itemIndex,
                      "frequency"
                    );

                    if (!success) {
                      setTimeout(() => {
                        onChangeAnswer(
                          null,
                          sectionIndex,
                          itemIndex,
                          "frequency"
                        );
                      }, 10);
                    }
                  }}
                  disabled={skipFrequency}
                />
              )}
            </td>
          </tr>
        )}
        {isEnableNewFormat && <tr className="h-16 border-b text-sm"></tr>}
      </>
    );
  } else {
    return (
      <tr className="h-16 text-sm text-gray-700">
        <td className="px-2 pl-7">
          {itemIndex + 1}. {item.title}
        </td>
        <td>
          {isReview ? (
            isEnableNewFormat ? (
              <ScoreSelectorReview item={item} property="proficiency" />
            ) : (
              <ScoreSelectorReview item={item} property="skill" />
            )
          ) : isEnableNewFormat ? (
            <ScoreSelector
              name={`${item.title} - proficiency - ${step}`}
              value={item.proficiency ?? -1}
              onChange={(newValue) => {
                const success = onChangeAnswer(
                  newValue,
                  sectionIndex,
                  itemIndex,
                  "proficiency"
                );

                if (!success) {
                  setTimeout(() => {
                    onChangeAnswer(
                      null,
                      sectionIndex,
                      itemIndex,
                      "proficiency"
                    );
                  }, 10);
                }
              }}
              disabled={skipSkill}
            />
          ) : (
            <ScoreSelector
              name={`${item.title} - skill - ${step}`}
              value={item.skill ?? -1}
              onChange={(newValue) => {
                const success = onChangeAnswer(
                  newValue,
                  sectionIndex,
                  itemIndex,
                  "skill"
                );

                if (!success) {
                  setTimeout(() => {
                    onChangeAnswer(null, sectionIndex, itemIndex, "skill");
                  }, 10);
                }
              }}
              disabled={skipSkill}
            />
          )}
        </td>
        {!isEnableNewFormat && renderFrequencyRow}
      </tr>
    );
  }
};
