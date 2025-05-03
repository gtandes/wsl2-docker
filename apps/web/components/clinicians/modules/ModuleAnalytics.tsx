import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ExamAnaliticCard } from "../ExamAnaliticCard";
import { faSmile, faFrown } from "@fortawesome/pro-light-svg-icons";
import { addMinutes, format, intervalToDuration } from "date-fns";
import SemiCircleProgressBar from "react-progressbar-semicircle";
import { useContext } from "react";
import { ModuleResultsContext } from "../../shared/modules/ModuleResults";

export const ModuleAnalytics = () => {
  const { results } = useContext(ModuleResultsContext);
  const score = results?.score;

  const attemptsPercentage =
    (results?.attempts_used &&
      results?.allowed_attempts &&
      (((results?.attempts_used as number) /
        results?.allowed_attempts) as number) * 100) ||
    0.01;

  const start = new Date(results?.started_on!);
  const end = new Date(results?.finished_on!);

  const totalTimeTaken = intervalToDuration({
    start,
    end,
  });
  const totalTimeTakenDate = totalTimeTaken
    ? addMinutes(new Date().setHours(0, 0, 0, 0), totalTimeTaken?.minutes!)
    : 0;

  return (
    results && (
      <>
        <h6 className="font-bold">Analytics</h6>
        <div className="flex flex-wrap justify-center gap-3">
          <ExamAnaliticCard
            title={
              <>
                <span className="text-sm">Score</span>
                {results.approved ? (
                  <FontAwesomeIcon
                    icon={faSmile}
                    size="2x"
                    className="mt-2 text-green-400"
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={faFrown}
                    size="2x"
                    className="mt-2 text-red-400"
                  />
                )}
              </>
            }
          >
            <div className="flex flex-col">
              <span
                className={`text-center text-5xl font-extrabold text-${
                  results.approved ? "green" : "red"
                }-400`}
              >
                {score}%
              </span>
              <span
                className={`m-auto mt-2 flex max-h-8 w-20 justify-center rounded-md bg-${
                  results.approved ? "green" : "red"
                }-100 p-1 text-sm font-medium text-${
                  results.approved ? "green" : "red"
                }-900`}
              >
                {results.approved ? "Passed" : "Failed"}
              </span>
            </div>
          </ExamAnaliticCard>
          <ExamAnaliticCard
            title={
              <span className="whitespace-nowrap text-sm">No. of Attempts</span>
            }
          >
            <div className="flex flex-col items-center justify-center">
              <SemiCircleProgressBar
                percentage={attemptsPercentage}
                strokeWidth={15}
                stroke="rgb(69, 138, 236)"
                diameter={160}
              />
              <span className="-mt-8 text-3xl font-extrabold text-blue-500 ">
                {results.attempts_used}/{results?.allowed_attempts}
              </span>
            </div>
          </ExamAnaliticCard>
          <ExamAnaliticCard title={<span className="text-sm">Total Time</span>}>
            <div className="flex flex-col items-center justify-center">
              <SemiCircleProgressBar
                percentage={100}
                strokeWidth={15}
                stroke="rgb(7, 94, 65)"
                diameter={160}
              />
              <span className="-mt-8 text-2xl font-semibold text-green-800 ">
                {format(totalTimeTakenDate, "HH:mm")}
              </span>
            </div>
          </ExamAnaliticCard>
        </div>
      </>
    )
  );
};
