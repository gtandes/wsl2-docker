import React from "react";
import SemiCircleProgressBar from "react-progressbar-semicircle";
interface Props {
  percentage?: number;
  color: string;
  children?: React.ReactNode;
  text?: string;
}

export const CircularPercentage: React.FC<Props> = ({
  percentage = 0,
  color,
  children,
  text,
}) => {
  return (
    <div className="flex justify-center">
      {!isNaN(percentage) && (
        <div className="mb-5 flex flex-col">
          <SemiCircleProgressBar
            percentage={percentage}
            strokeWidth={20}
            stroke={color}
            diameter={250}
          />
          <div
            className={`${text ? "-mt-16" : "-mt-10"} text-5xl font-extrabold`}
            style={{ color: color }}
          >
            {Math.round(percentage)} % <br />{" "}
            {text ? (
              <p className={`text-xs font-medium`} style={{ color: color }}>
                {text}
              </p>
            ) : (
              ""
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
