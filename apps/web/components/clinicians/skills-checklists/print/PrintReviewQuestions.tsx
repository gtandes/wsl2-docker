import { Fragment, useContext } from "react";
import { PrintContext } from "../PrintReview";
import clsx from "clsx";
import { PrintReviewSectionAverages } from "./PrintReviewSectionAverages";

export const PrintReviewQuestions = () => {
  const { questions, isEnableNewFormat } = useContext(PrintContext);
  if (!questions) {
    return null;
  }

  const sections = questions.flatMap((q) => q.sections);
  return (
    <div className="columns-2 text-xs">
      {sections.map((sect, sectIdx) => (
        <Fragment key={sectIdx}>
          <PrintReviewSectionAverages section={sect} />
          {sect.items.map((item, itemIdx) => (
            <div className="flex gap-3 p-1.5" key={itemIdx}>
              <div
                className={clsx(
                  "flex gap-2",
                  isEnableNewFormat ? "flex-1" : "flex-[5]"
                )}
              >
                <div>{itemIdx + 1}.</div>
                <div>{item.title}</div>
              </div>
              <div
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs text-blue-900",
                  {
                    "w-10": item.skill === 0,
                  }
                )}
              >
                {isEnableNewFormat
                  ? item.proficiency === 0
                    ? "N/A"
                    : item.proficiency
                  : item.skill === 0
                  ? "N/A"
                  : item.skill}
              </div>
              {!isEnableNewFormat && (
                <div
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs text-blue-900",
                    {
                      "w-10": item.frequency === 0,
                    }
                  )}
                >
                  {item.frequency === 0 ? "N/A" : item.frequency}
                </div>
              )}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
};
