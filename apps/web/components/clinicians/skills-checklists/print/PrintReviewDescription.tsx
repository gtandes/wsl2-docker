import { useContext } from "react";
import {
  SkillChecklistNewFormatQuestion,
  SkillChecklistQuestionDefaultValue,
} from "../../../../types/global";
import { PrintContext } from "../PrintReview";

export const PrintReviewDescription = () => {
  const { isEnableNewFormat } = useContext(PrintContext);

  return (
    <div className="m-7 whitespace-pre-line text-xs leading-5 text-gray-700">
      {isEnableNewFormat
        ? SkillChecklistNewFormatQuestion
        : SkillChecklistQuestionDefaultValue}
    </div>
  );
};
