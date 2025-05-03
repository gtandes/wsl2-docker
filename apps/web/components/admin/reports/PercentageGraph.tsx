import clsx from "clsx";
import SemiCircleProgressBar from "react-progressbar-semicircle";
interface Props {
  percentage: number;
  title: string;
  color: string;
  counters?: string;
  showPerecentage?: boolean;
  maxWidth?: string;
  noMargin?: boolean;
}

export default function PercentageGraph({
  percentage,
  title,
  color,
  counters,
  showPerecentage = true,
  maxWidth,
  noMargin,
}: Props) {
  return (
    <div
      className={clsx(
        "m-3 flex flex-col",
        maxWidth ? "w-max-[" + maxWidth + "px]" : "w-full"
      )}
    >
      <div
        className={clsx(
          "w-full rounded-md bg-blue-50 px-6 py-6",
          noMargin ? "" : "mb-4 mr-4"
        )}
      >
        <div className="flex justify-between p-2 font-semibold">{title}</div>
        <div className="flex justify-center">
          <div className="flex flex-col">
            <SemiCircleProgressBar
              percentage={percentage}
              strokeWidth={20}
              stroke={color}
              diameter={276}
            />
            <div
              className={`-mt-10 text-4xl font-extrabold`}
              style={{ color: color }}
            >
              {counters ? counters : `${Math.round(percentage)} %`}
            </div>
          </div>
        </div>
      </div>
      {counters && showPerecentage && (
        <div className={`text-4xl font-extrabold`} style={{ color: color }}>
          {Math.round(percentage)} %
        </div>
      )}
    </div>
  );
}
