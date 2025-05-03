import { useRouter } from "next/router";
import { ExamSummaryItem } from "./SummaryItem";
import {
  faClock,
  faStar,
  faClipboardList,
} from "@fortawesome/pro-light-svg-icons";

type Props = {
  attemptsUsed: number;
  allowedAttempts: number;
  correctAnswers: number;
  passingScore: number;
  reviewExamRoute: string;
  totalQuestions: number;
  isExamCompleted: boolean;
};

export const ExamSummary = ({
  attemptsUsed,
  allowedAttempts,
  correctAnswers,
  passingScore,
  reviewExamRoute,
  totalQuestions,
  isExamCompleted,
}: Props) => {
  const router = useRouter();

  return (
    <>
      <div className="min flex flex-col justify-center align-middle ">
        {isExamCompleted && (
          <>
            {totalQuestions && (
              <ExamSummaryItem
                title={`Correct Answers: ${correctAnswers}/${totalQuestions}`}
                icon={faClock}
                color="blue"
                description="You can review your answers here."
                action={() => router.push(reviewExamRoute)}
                classes="border-b"
              />
            )}

            {isExamCompleted && (
              <>
                {allowedAttempts > attemptsUsed && (
                  <ExamSummaryItem
                    title={`Attempt: ${attemptsUsed ? attemptsUsed : 0}/${
                      allowedAttempts ? allowedAttempts : 0
                    }`}
                    icon={faClipboardList}
                    iconClass="px-5"
                    color="green"
                    description={`This was your attempt number ${attemptsUsed}. You still have ${
                      allowedAttempts - attemptsUsed
                    } left.`}
                    classes="border-b"
                  />
                )}
              </>
            )}
          </>
        )}
        <ExamSummaryItem
          title="Passing Score"
          icon={faStar}
          color="yellow"
          classes="text-left"
          description={`To pass this exam, you need to complete the exam and achieve a score of ${passingScore}% or higher.`}
        />
      </div>
    </>
  );
};
