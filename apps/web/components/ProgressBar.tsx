import React from "react";
import clsx from "clsx";

interface Props {
  percentage: number;
  color: string;
}

export const ProgressBar: React.FC<Props> = ({ percentage, color }) => {
  return (
    <div className={clsx("mb-2 h-1.5 w-full rounded-full", `bg-${color}-100`)}>
      <div
        className={clsx(
          "h-1.5 rounded-full",
          `bg-${color}-600 dark:bg-${color}-500`
        )}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};
