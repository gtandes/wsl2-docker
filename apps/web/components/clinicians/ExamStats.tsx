import React from "react";
import clsx from "clsx";

interface Props {
  stats: ExamStat[];
  containerClassName?: string;
  itemClassName?: string;
}

export interface ExamStat {
  label: string;
  value: string;
}

export const ExamStats: React.FC<Props> = ({
  stats,
  containerClassName,
  itemClassName,
}) => {
  return (
    <div className={containerClassName}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={clsx("flex justify-between", itemClassName)}
        >
          <p>{stat.label}</p>
          <p>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};
