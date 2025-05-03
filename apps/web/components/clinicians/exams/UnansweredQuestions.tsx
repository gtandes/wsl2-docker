import { Exam_Results } from "api";
import { ExamResponse } from "../ExamReponse";
import { Question } from "../../exams/QuestionModal";
import {
  AttemptType,
  ExamResultsContext,
} from "../../shared/exams/ExamResults";
import { useContext } from "react";

export const UnansweredQuestions = () => {
  const { exam_results } = useContext(ExamResultsContext);

  const answers = exam_results;
  const incorrectAnswers = answers?.filter((e) => !e.correct);
  const incorrectAnswersTotal = incorrectAnswers ? incorrectAnswers?.length : 0;
  const totalAnswered = answers ? answers?.length : 0;

  const getIncorrectAnswerText = (examResult: AttemptType): string => {
    let incorrectAnswerText = "";
    const incorrectId = examResult?.answer.id;
    examResult?.question_versions_id?.question.answers?.forEach((answer) => {
      if (answer.id === incorrectId) {
        incorrectAnswerText = answer.answer_text;
      }
    });
    return incorrectAnswerText;
  };

  return (
    <div className="mt-6 text-left">
      {totalAnswered > 0 && (
        <h6 className="font-semibold">Incorrect responses:</h6>
      )}
      <div className="m-auto py-10 print:w-10/12 md:w-10/12">
        {incorrectAnswersTotal > 0 &&
          incorrectAnswers &&
          incorrectAnswers.map((answer, i) => (
            <ExamResponse
              key={`exam-response-${i}`}
              question={`${i + 1}. ${
                (answer.question_versions_id?.question as Question)
                  .question_text
              }`}
              questionImageUrl={
                answer.question_versions_id?.question &&
                answer.question_versions_id.image?.id
                  ? `/cms/assets/${answer.question_versions_id.image?.id}`
                  : undefined
              }
              optionColor="red"
              optionText={`${getIncorrectAnswerText(
                answer as AttemptType
              )} (Incorrect answer)`}
              category={answer.questions_id?.category?.title as string}
              categoryColor="green"
            />
          ))}
        {totalAnswered === 0 ? (
          <p className="text-center text-xl font-medium">
            You did not answer any questions.
          </p>
        ) : incorrectAnswersTotal === 0 ? (
          <p className="text-center text-xl font-medium">
            Congratulations!
            <br /> No incorrect answers!
          </p>
        ) : null}
      </div>
    </div>
  );
};
