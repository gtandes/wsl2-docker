import {
  Directus_Users,
  Exam_Results,
  Junction_Directus_Users_Exams,
  useGetUserExamAttemptQuery,
  useGetUserExamsResultsDetailByAttemptQuery,
  useSysUsersQuery,
  useGetUserExamQuery,
} from "api";
import { CategoriesBreakdown } from "../../clinicians/exams/CategoriesBreakdown";
import { ExamsAnalytics } from "../../clinicians/exams/ExamsAnalytics";
import { UnansweredQuestions } from "../../clinicians/exams/UnansweredQuestions";
import { PrintLandscapeOrientation } from "../../utils/PrintLandscapeOrientation";
import { Answer, Question } from "../../exams/QuestionModal";
import { useAuth } from "../../../hooks/useAuth";
import { useRouter } from "next/router";
import { first } from "lodash";
import Button from "../../Button";
import { faArrowLeft } from "@fortawesome/pro-solid-svg-icons";
import { CompetencyState } from "types";
import { UserRole } from "../../../types/roles";
import { createContext } from "react";
import { ExamResultDescription } from "../../clinicians/exams/ExamResultsDescription";
import { Spinner } from "../../Spinner";

export type AttemptType = Exam_Results & {
  answer: Answer;
  question_versions_id?:
    | {
        __typename?: "question_versions" | undefined;
        question: Question;
      }
    | null
    | undefined;
  image?: string;
};
type CategoryCountType = {
  title: string;
  correctAnswers: number;
  totalAnswers: number;
};

type ExamResults = {
  results?: Junction_Directus_Users_Exams;
  exam_results?: Exam_Results[];
  categoriesCount?: CategoryCountType[];
  userInfo?: Directus_Users;
  totalQuestions?: number;
  isExamCompleted?: boolean;
  attempt_id?: number;
  isAttemptTimedOut?: boolean;
};

export const ExamResultsContext = createContext<ExamResults>({
  results: undefined,
  exam_results: undefined,
  categoriesCount: undefined,
  userInfo: undefined,
  totalQuestions: undefined,
  isExamCompleted: undefined,
  attempt_id: undefined,
  isAttemptTimedOut: undefined,
});

interface Props {
  attempt_id?: string;
}

interface AttemptResult {
  score: number;
  attempt: number;
  assignment_status: string;
  score_status: string;
}

export const ExamResults = ({ attempt_id }: Props) => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { user_id, assignment_id } = router.query;
  const userId = user_id || currentUser?.id;
  const isClinician = currentUser?.role === UserRole.Clinician;

  const { data: userData, loading: userLoading } = useSysUsersQuery({
    variables: {
      filter: {
        id: {
          _eq: userId as string,
        },
      },
    },
    skip: !userId,
  });

  const { data: dataUserExam, loading: examLoading } =
    useGetUserExamAttemptQuery({
      variables: {
        user: userId as string,
        assignment_id: Number(assignment_id),
      },
      skip: !userId || !assignment_id,
    });

  const userExam = useGetUserExamQuery({
    variables: {
      filter: {
        id: { _eq: assignment_id as string },
      },
    },
    skip: !currentUser?.id || !assignment_id,
  });

  const results = first(
    dataUserExam?.junction_directus_users_exams
  ) as Junction_Directus_Users_Exams;

  const { data: examResults, loading: resultsLoading } =
    useGetUserExamsResultsDetailByAttemptQuery({
      variables: {
        assignment_id: Number(assignment_id),
        exam_id: results?.exams_id?.id!,
        attempt: attempt_id
          ? Number(attempt_id) - 1
          : Number(results?.attempts_used) - 1,
      },
      skip: !results || !results.exams_id?.id,
    });

  const isLoading = userLoading || examLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-medium">
          <Spinner />
        </div>
      </div>
    );
  }

  const userInfo = first(userData?.users) as Directus_Users;
  const exam = userExam.data?.junction_directus_users_exams.at(0);
  const totalQuestions = Object.values(
    exam?.question_versions_list || []
  ).length;

  const exam_results = examResults?.exam_results as Exam_Results[];
  const answers = exam_results;

  function getCategoryAnswersCounts(examResults: AttemptType[]) {
    const categoriesList: string[] = [];
    const categoryCorrectCount: { [category: string]: number } = {};
    const categoryTotal: { [category: string]: number } = {};

    examResults.map((result: any) => {
      const category = result.questions_id.category.title;
      categoryTotal[category] = categoryTotal[category]
        ? categoryTotal[category] + 1
        : 1;
      categoryCorrectCount[category] = categoryCorrectCount[category]
        ? categoryCorrectCount[category] + (result.correct ? 1 : 0)
        : 0 + (result.correct ? 1 : 0);
      if (!categoriesList.find((cat) => cat === category)) {
        categoriesList.push(category);
      }
    });
    return categoriesList.map((category: string) => {
      return {
        title: category,
        correctAnswers: categoryCorrectCount[category],
        totalAnswers: categoryTotal[category],
      };
    });
  }

  const categoriesCount: CategoryCountType[] = answers?.length
    ? getCategoryAnswersCounts(answers as AttemptType[])
    : [];

  const totalAnswers = exam_results ? exam_results.length : 0;
  const isExamCompleted = totalAnswers === totalQuestions;
  const attemptId = attempt_id ? parseInt(attempt_id as string, 10) : undefined;

  const scoreHistory = results?.score_history as AttemptResult[] | undefined;

  const attemptScoreStatus = scoreHistory?.find(
    (item) => item.attempt === attemptId
  )?.score_status;

  const isAttemptTimedOut =
    attemptScoreStatus === CompetencyState.FAILED_TIMED_OUT;

  return (
    results && (
      <ExamResultsContext.Provider
        value={{
          results,
          exam_results,
          categoriesCount,
          userInfo,
          totalQuestions,
          isExamCompleted,
          attempt_id: attemptId,
          isAttemptTimedOut: isAttemptTimedOut,
        }}
      >
        <PrintLandscapeOrientation />
        <div className="flex min-h-screen justify-center">
          <div className="bg-white p-5 print:text-sm">
            <div className="flex print:hidden">
              <div className="my-5 flex w-full">
                {isClinician && (
                  <Button
                    iconLeft={faArrowLeft}
                    label="Back to Score"
                    variant="link"
                    onClick={() => {
                      router.push(`/clinician/exams/${assignment_id}/result`);
                    }}
                  />
                )}

                <div className="ml-auto flex gap-3">
                  {results?.status === CompetencyState.COMPLETED && (
                    <Button
                      label="Certificate"
                      variant="light"
                      onClick={() => {
                        const route = router.asPath.startsWith("/admin")
                          ? `/admin/dashboard/reports/${userInfo?.id}/${assignment_id}/certificate`
                          : `/clinician/exams/${assignment_id}/certificate`;
                        return router.push(route);
                      }}
                    />
                  )}
                  {isExamCompleted && (
                    <Button
                      label="Download"
                      variant="solid"
                      onClick={() => print()}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="print-exam-fit flex flex-col gap-5 px-5 md:px-52">
              <ExamResultDescription />
              <ExamsAnalytics />
              <CategoriesBreakdown />
              <UnansweredQuestions />
            </div>
          </div>
        </div>
      </ExamResultsContext.Provider>
    )
  );
};
