/* eslint-disable react-hooks/rules-of-hooks */
import {
  useGetUserExamAttemptQuery,
  useGetUserExamQuery,
  useGetUserExamsResultsDetailByAttemptQuery,
} from "api";
import { addSeconds, format } from "date-fns";
import { useAdminTable } from "../../hooks/useAdminTable";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import router from "next/router";
import { first } from "lodash";
import { faBarChart } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Spinner } from "../Spinner";
import { CompetencyState, ScoreStatus } from "types";
import CompetencyStatus from "./CompetencyStatus";
import { useModal } from "../../hooks/useModal";

const formatDate = (date: Date | null | undefined) => {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
};

const useExamResults = (
  assignmentId: number,
  examId: string,
  attempt: number
) => {
  return useGetUserExamsResultsDetailByAttemptQuery({
    variables: {
      assignment_id: assignmentId,
      exam_id: examId,
      attempt: attempt - 1,
    },
    skip: !assignmentId || !examId || attempt === undefined,
  });
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="items-left justify-left text-md text-black-600 flex">
    <b>{label}: &nbsp;</b>
    {value}
  </div>
);

interface AttemptHistory {
  attempt: number;
  score_status: string;
  score: number | null;
}

interface Props {
  scoreHistory: AttemptHistory[];
  assignmentId: number;
}

export default function AttemptHistoryModal({
  scoreHistory,
  assignmentId,
}: Props) {
  const { close } = useModal();
  const userId = router.query.user_id as string;
  const PAGE_SIZE = 10;

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [{ id: "assigned_on", desc: false }])
  );
  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, { pageIndex: 0, pageSize: PAGE_SIZE })
  );

  const { data: dataUserExam, loading: loadingUserExam } =
    useGetUserExamAttemptQuery({
      variables: {
        user: userId as string,
        assignment_id: Number(assignmentId),
      },
      skip: !userId || !assignmentId,
    });

  const userExam = useGetUserExamQuery({
    variables: { filter: { id: { _eq: assignmentId as unknown as string } } },
    skip: !userId || !assignmentId,
  });

  const exam = userExam.data?.junction_directus_users_exams.at(0);
  const totalQuestions = Object.keys(exam?.question_versions_list || {}).length;
  const results = first(dataUserExam?.junction_directus_users_exams);

  const shouldHideAttempt = (
    attempt: number,
    scoreHistory: { attempt: number }[],
    examStatus?: CompetencyState | null
  ) => {
    const lastAttempt =
      scoreHistory.length > 0
        ? Math.max(...scoreHistory.map((s) => s.attempt))
        : attempt;

    return (
      attempt === lastAttempt &&
      (examStatus === CompetencyState.IN_REVIEW ||
        examStatus === CompetencyState.INVALID)
    );
  };

  const examStatus = exam?.status as CompetencyState | undefined;

  const adminTable = useAdminTable<AttemptHistory>({
    columns: [
      {
        header: "Date Started",
        accessorKey: "started_on",
        enableSorting: false,
        cell: ({ row }: { row: { original: { attempt: number } } }) => {
          const { data: examResults, loading: loadingExamResults } =
            useExamResults(
              Number(assignmentId),
              results?.exams_id?.id!,
              row.original.attempt
            );

          if (loadingExamResults) {
            return <Spinner />;
          }

          const earliestDate = examResults?.exam_results.reduce<Date | null>(
            (earliest, result) => {
              if (!result.date_created) return earliest;
              const resultDate = new Date(result.date_created);
              return earliest && resultDate < earliest ? earliest : resultDate;
            },
            null
          );

          if (!earliestDate) return "N/A";

          return format(earliestDate, "MMMM dd, yyyy");
        },
      },

      {
        header: "Time Taken",
        accessorKey: "time_taken",
        enableSorting: false,
        cell: ({ row }) => {
          const { data: examResults, loading: loadingExamResults } =
            useExamResults(
              Number(assignmentId),
              results?.exams_id?.id!,
              row.original.attempt
            );

          if (loadingExamResults) {
            return <Spinner />;
          }

          const isExamCompleted =
            examResults?.exam_results?.length === totalQuestions;
          const totalTimeTaken = isExamCompleted
            ? examResults?.exam_results.reduce(
                (total, result) => total + result.time_taken,
                0
              )
            : totalQuestions * 3 * 60;

          const totalTimeTakenDate = totalTimeTaken
            ? addSeconds(new Date().setHours(0, 0, 0, 0), totalTimeTaken)
            : 0;

          return format(totalTimeTakenDate, "HH:mm:ss");
        },
      },
      {
        header: "Result",
        accessorKey: "score_status",
        enableSorting: false,
        cell: ({ row }) => {
          const { data: examResults, loading: loadingExamResults } =
            useGetUserExamQuery({
              variables: {
                filter: {
                  id: { _eq: assignmentId },
                },
              },
              skip: !assignmentId,
            });

          if (loadingExamResults) {
            return <Spinner />;
          }

          const score = row.original.score ?? "-";

          const isLastAttempt =
            row.original.attempt === scoreHistory.at(-1)?.attempt;

          const status: CompetencyState =
            isLastAttempt &&
            (exam?.status === CompetencyState.IN_REVIEW ||
              exam?.status === CompetencyState.INVALID)
              ? exam?.status
              : row.original.score_status === ScoreStatus.PASSED
              ? (exam?.status as CompetencyState) ?? "NA"
              : (row.original.score_status as CompetencyState);

          return (
            <div className="flex items-center">
              {!(
                [
                  CompetencyState.INVALID,
                  CompetencyState.IN_REVIEW,
                  CompetencyState.FAILED_TIMED_OUT,
                ] as CompetencyState[]
              ).includes(status) && <div className="mr-2">{score}%</div>}
              <CompetencyStatus status={status} />
            </div>
          );
        },
      },
      {
        header: "Answered",
        accessorKey: "answered",
        enableSorting: false,
        cell: ({ row }) => {
          const { data: examResults, loading: loadingExamResults } =
            useExamResults(
              Number(assignmentId),
              results?.exams_id?.id!,
              row.original.attempt
            );

          if (loadingExamResults) {
            return <Spinner />;
          }

          return `${examResults?.exam_results.length} / ${totalQuestions}`;
        },
      },
      {
        header: "Correct",
        accessorKey: "correct",
        enableSorting: false,
        cell: ({ row }) => {
          const { data: examResults, loading: loadingExamResults } =
            useExamResults(
              Number(assignmentId),
              results?.exams_id?.id!,
              row.original.attempt
            );

          if (loadingExamResults) {
            return <Spinner />;
          }

          const scoreHistory =
            results && Array.isArray(results.score_history)
              ? results.score_history
              : [];

          if (
            shouldHideAttempt(row.original.attempt, scoreHistory, examStatus)
          ) {
            return "-";
          }

          const correctAnswersCount = examResults
            ? examResults.exam_results.filter((exam) => exam.correct === true)
                .length
            : 0;

          return `${correctAnswersCount} / ${totalQuestions}`;
        },
      },
      {
        header: "Report",
        accessorKey: "report",
        enableSorting: false,
        cell: ({ row }) => {
          const scoreHistory =
            results && Array.isArray(results.score_history)
              ? results.score_history
              : [];

          const isDisabled = shouldHideAttempt(
            row.original.attempt,
            scoreHistory,
            examStatus
          );

          const handleClick = (
            e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
          ) => {
            if (isDisabled) {
              e.preventDefault();
            } else {
              router.push(
                `/admin/dashboard/reports/${userId}/${assignmentId}/${row.original.attempt}/history`
              );
              close();
            }
          };

          return (
            <>
              <a
                className={`rounded-lg px-2 py-1 transition-all ${
                  isDisabled
                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                    : "cursor-pointer bg-blue-200 text-blue-800 hover:bg-blue-300"
                }`}
                onClick={!isDisabled ? handleClick : undefined}
              >
                <FontAwesomeIcon icon={faBarChart} size="lg" />
              </a>
            </>
          );
        },
      },
    ],
    data: scoreHistory,
    pageCount: undefined,
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: loadingUserExam,
    totalItems: 0,
  });

  return (
    <div className="flex w-full flex-col">
      <div>
        <DetailRow label="Title" value={results?.exams_id?.title || "N/A"} />
        <DetailRow
          label="Assigned On"
          value={formatDate(results?.assigned_on)}
        />
        <DetailRow label="Started On" value={formatDate(results?.started_on)} />
        <DetailRow
          label="Attempt Used"
          value={results?.attempts_used || "N/A"}
        />
      </div>

      <adminTable.Component />
    </div>
  );
}
