import { useContext } from "react";
import { AverageCard } from "../AverageCard";
import { PrintContext } from "../PrintReview";

export const PrintReviewAverages = () => {
  const { generalAverages, isEnableNewFormat } = useContext(PrintContext);
  if (!generalAverages) {
    return null;
  }
  return (
    <div className="mb-2 flex flex-col justify-between gap-2 print:flex-row lg:flex-row">
      <AverageCard title="Overall Avg." value={generalAverages.overallAvg} />
      {!isEnableNewFormat && (
        <>
          <AverageCard
            title="Skill Avg."
            value={generalAverages.skillAverage ?? 0}
          />
          <AverageCard
            title="Frequency Avg."
            value={generalAverages.frequencyAverage ?? 0}
          />
        </>
      )}
    </div>
  );
};
