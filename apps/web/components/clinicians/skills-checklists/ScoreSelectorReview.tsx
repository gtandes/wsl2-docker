import clsx from "clsx";
import { SkillChecklistsItem } from "../../../types/global";

interface Props {
  item: SkillChecklistsItem;
  property: "skill" | "frequency" | "proficiency";
}
export const ScoreSelectorReview = ({ item, property }: Props) => {
  return (
    <div
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs text-blue-900",
        {
          "w-10": item[property] === 0,
        }
      )}
    >
      {item[property] === 0 ? "N/A" : item[property]}
    </div>
  );
};
