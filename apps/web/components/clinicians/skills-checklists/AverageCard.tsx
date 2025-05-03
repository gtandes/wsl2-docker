import SemiCircleProgressBar from "react-progressbar-semicircle";

export const AverageCard = ({
  title,
  value,
}: {
  title: string;
  value: number;
}) => {
  const getPercentage = (value: number) => (value * 100) / 4;

  const getColor = (value: number) => {
    const red = "#C13614";
    const lightRed = "#FF7C5C";
    const yellow = "#F0CB1F";
    const green = "#12B777";

    if (value < 1.5) return red;
    if (value < 2.5) return lightRed;
    if (value < 3.5) return yellow;
    if (value <= 4) return green;
  };

  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-md bg-dark-blue-50 px-7 pb-10 pt-4 print:px-0">
      <span className="w-full pl-2 text-xs text-black">{title}</span>
      <div className="relative">
        <SemiCircleProgressBar
          percentage={getPercentage(value)}
          strokeWidth={15}
          stroke={getColor(value)}
          diameter={130}
        />
        <span
          style={{
            color: getColor(value),
          }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 transform text-2xl font-medium leading-none"
        >
          {value > 0 ? value.toFixed(2) : "N/A"}
        </span>
      </div>
    </div>
  );
};
