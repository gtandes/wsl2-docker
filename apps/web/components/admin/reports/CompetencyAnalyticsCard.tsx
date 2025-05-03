import SemiCircleProgressBar from "react-progressbar-semicircle";
import { valueHumanReadable } from "../../../utils/utils";
import { isNumber } from "lodash";

interface CompetencyAnalyticsCardProps {
  title: React.ReactElement;
  value: number | string;
  graphColor: string;
  textColor: string;
  graphDiameter?: number;
  graphStrokeWidth?: number;
  isPercentage?: boolean;
  percentage: number;
  fontSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const parseValue = (value: number | string, isPercentage: boolean) => {
  if (!isNumber(value)) return value;

  if (isPercentage) {
    return `${value % 2 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
  }

  return valueHumanReadable(value);
};

export const CompetencyAnalyticsCard: React.FC<
  CompetencyAnalyticsCardProps
> = ({
  title,
  value,
  percentage,
  graphColor,
  textColor,
  graphDiameter = 120,
  graphStrokeWidth = 15,
  isPercentage = false,
  fontSize = "lg",
}) => {
  return (
    <div className="min-h-100 max-h-36 grow rounded-md bg-blue-50 px-6 py-4 sm:w-fit lg:grow-0 min-[1484px]:grow">
      <div className="flex justify-between p-2">{title}</div>
      <div className="relative flex flex-col items-center justify-center">
        <SemiCircleProgressBar
          percentage={percentage > 100 ? 100 : percentage}
          strokeWidth={graphStrokeWidth}
          stroke={graphColor}
          diameter={graphDiameter}
        />
        <span
          className={`absolute bottom-0 text-${fontSize} font-extrabold text-${textColor}-500`}
        >
          {parseValue(value, isPercentage)}
        </span>
      </div>
    </div>
  );
};
