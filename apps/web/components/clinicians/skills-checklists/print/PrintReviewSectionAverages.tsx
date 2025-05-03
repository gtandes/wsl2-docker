import { useContext } from "react";
import {
  SkillChecklistsQuestion,
  SkillChecklistsSection,
} from "../../../../types/global";
import { PrintContext } from "../PrintReview";

interface Props {
  section: SkillChecklistsSection;
}

export const PrintReviewSectionAverages = ({ section }: Props) => {
  const { isEnableNewFormat } = useContext(PrintContext);

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
    <div className="leading-2 flex gap-3 bg-blue-100 p-1 text-xs font-medium text-gray-700">
      <div className={isEnableNewFormat ? "flex-1" : "flex-[5]"}>
        {section.title}
        {isEnableNewFormat ? (
          <span> (S:{getAverageRating("proficiency", section)})</span>
        ) : (
          <span>
            {" "}
            (S:{getAverageRating("skill", section)}- F:
            {getAverageRating("frequency", section)})
          </span>
        )}
      </div>
      {isEnableNewFormat ? (
        <div>Proficiency</div>
      ) : (
        <>
          <div>Skill</div> <div>Ferq.</div>
        </>
      )}
    </div>
  );
};
