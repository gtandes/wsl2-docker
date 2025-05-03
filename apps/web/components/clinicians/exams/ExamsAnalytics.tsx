import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ExamAnaliticCard } from "../ExamAnaliticCard";
import { faFrown, faSmile } from "@fortawesome/pro-light-svg-icons";
import { addSeconds, format } from "date-fns";
import SemiCircleProgressBar from "react-progressbar-semicircle";
import { useContext } from "react";
import { ExamResultsContext } from "../../shared/exams/ExamResults";

const MAX_TIME_ALLOWED_PER_QUESTION = 3;

export const ExamsAnalytics = () => {
  const {
    results,
    exam_results,
    totalQuestions = 0,
    isExamCompleted,
    isAttemptTimedOut,
  } = useContext(ExamResultsContext);
  const passingScore = results?.exam_versions_id?.passing_score;
  const answers = exam_results;
  const correctAnswers = answers?.filter((e) => e.correct);
  const incorrectAnswers = answers?.filter((e) => !e.correct);
  const correctAnswersTotal = correctAnswers ? correctAnswers?.length : 0;
  const incorrectAnswersTotal = incorrectAnswers ? incorrectAnswers.length : 0;
  const resultsScore = Math.ceil((correctAnswersTotal / totalQuestions) * 100);
  const hasPassedScore = passingScore && resultsScore >= passingScore;
  const maxTime = MAX_TIME_ALLOWED_PER_QUESTION * totalQuestions * 60;
  const totalTimeTaken = isExamCompleted
    ? answers?.reduce((acc, exam) => acc + exam.time_taken, 0)
    : maxTime;

  const totalTimeTakenDate = totalTimeTaken
    ? addSeconds(new Date().setHours(0, 0, 0, 0), totalTimeTaken)
    : 0;
  const totalTimeTakenPercentage =
    ((totalTimeTaken || 0) * 100) / maxTime || 0.01;

  return (
    results && (
      <>
        <h6 className="font-bold">Analytics</h6>
        <div className="flex flex-wrap justify-center gap-3">
          {!isAttemptTimedOut && isExamCompleted ? (
            <ExamAnaliticCard
              title={
                <>
                  <span className="text-sm">Score</span>
                  {isExamCompleted && hasPassedScore ? (
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
                    isExamCompleted && hasPassedScore ? "green" : "red"
                  }-400`}
                >
                  {resultsScore}%
                </span>
                <span
                  className={`m-auto mt-2 flex max-h-8 w-20 justify-center rounded-md bg-${
                    isExamCompleted && hasPassedScore ? "green" : "red"
                  }-100 p-1 text-sm font-medium text-${
                    isExamCompleted && hasPassedScore ? "green" : "red"
                  }-900`}
                >
                  {isExamCompleted && hasPassedScore ? "Passed" : "Failed"}
                </span>
              </div>
            </ExamAnaliticCard>
          ) : (
            <></>
          )}

          <ExamAnaliticCard title={<span className="text-sm">Fail Rate</span>}>
            <div className="flex flex-col items-center justify-center">
              <SemiCircleProgressBar
                percentage={
                  incorrectAnswersTotal
                    ? (incorrectAnswersTotal / totalQuestions) * 100
                    : 0
                }
                strokeWidth={15}
                stroke="rgb(217, 181, 64)"
                diameter={160}
              />
              <span className="-mt-8 text-3xl font-extrabold text-yellow-500 ">
                {incorrectAnswersTotal || 0}/{totalQuestions}
              </span>
            </div>
          </ExamAnaliticCard>
          <ExamAnaliticCard
            title={<span className="text-sm">Unanswered Rate</span>}
          >
            <div className="flex flex-col items-center justify-center">
              <SemiCircleProgressBar
                percentage={
                  answers
                    ? ((totalQuestions - answers?.length) / totalQuestions) *
                      100
                    : 0
                }
                strokeWidth={15}
                stroke="rgb(217, 181, 64)"
                diameter={160}
              />
              <span className="-mt-8 text-3xl font-extrabold text-yellow-500 ">
                {answers ? totalQuestions - answers?.length : 0}/
                {totalQuestions}
              </span>
            </div>
          </ExamAnaliticCard>
          <ExamAnaliticCard title={<span className="text-sm">Total Time</span>}>
            <div className="flex flex-col items-center justify-center">
              <SemiCircleProgressBar
                percentage={totalTimeTakenPercentage}
                strokeWidth={15}
                stroke="rgb(7, 94, 65)"
                diameter={160}
              />
              <span className="-mt-8 text-2xl font-semibold text-green-800 ">
                {format(totalTimeTakenDate, "HH:mm:ss")}
              </span>
            </div>
          </ExamAnaliticCard>
        </div>
      </>
    )
  );
};
