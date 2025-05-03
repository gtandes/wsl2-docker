import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import { AvatarMenu } from "../AvatarMenu";
import { ExamHeader } from "../clinicians/ExamHeader";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/router";
import { useGetUserExamQuery } from "api";
import { clinicianNavigation } from "../clinicians/DashboardLayout";
import { differenceInSeconds, format } from "date-fns";
import { Spinner } from "../Spinner";
import Button from "../Button";
import { Badge } from "../Badge";
import { ProgressBar } from "../ProgressBar";
import { CUSTOM_MESSAGE, GENERIC_ERROR, notify } from "../Notification";
import { RadioGroup } from "@headlessui/react";
import clsx from "clsx";
import Image from "next/image";
import { CompetencyState } from "types";
import { query } from "../../utils/utils";
import Lightbox from "../utils/Lightbox";
import { Timer } from "../clinicians/Timer";

export interface MultipleChoiceSingleAnswerQuestion {
  id: string;
  question: {
    question_text: string;
    answers: SingleAnswer[];
  };
  question_id: string;
  question_index: number;
  category: string;
  image?: string;
}

export interface SingleAnswer {
  id: string;
  sort: number;
  answer_text: string;
}

interface ExamState {
  currentQuestion: number;
  canDisplay: boolean | undefined;
  question: MultipleChoiceSingleAnswerQuestion | undefined;
  selectedAnswer: string | undefined;
  showFormError: boolean;
  questionStart: DOMHighResTimeStamp;
  saving: boolean;
  isSubmitting: boolean;
  hasError: boolean;
  isTimeUp: boolean;
  retrying: boolean;
}

const RETRY_DELAY = 1000;
const RETRY_ATTEMPTS = 3;
const JITTER_FACTOR = 0.2;
let retryCount = 0;

function QuestionExam() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { assignment_id } = router.query;
  const [imageError, setImageError] = useState(false);

  const [examState, setExamState] = useState<ExamState>({
    currentQuestion: 1,
    canDisplay: true,
    question: undefined,
    selectedAnswer: undefined,
    showFormError: false,
    questionStart: Date.now(),
    saving: false,
    isSubmitting: false,
    hasError: false,
    isTimeUp: false,
    retrying: false,
  });

  const serverTimeFetchedRef = useRef(false);
  const serverTimeRef = useRef(Date.now());

  const fetchServerTime = useCallback(async () => {
    if (serverTimeFetchedRef.current) {
      return serverTimeRef.current;
    }

    try {
      const response = await fetch(`/cms/exams/server-time`);
      const { epoch } = await response.json();

      serverTimeRef.current = epoch;
      serverTimeFetchedRef.current = true;

      return epoch;
    } catch (error) {
      console.error("Failed to fetch server time:", error);
      return Date.now();
    }
  }, []);

  useEffect(() => {
    const updateServerTime = async () => {
      try {
        const time = await fetchServerTime();
        setExamState((prev) => ({
          ...prev,
          questionStart: time,
        }));
      } catch (error) {
        console.error("Failed to fetch initial server time:", error);
        setExamState((prev) => ({
          ...prev,
          questionStart: Date.now(),
        }));
      }

      if (!serverTimeFetchedRef.current) {
        updateServerTime();
      }
    };
  }, [fetchServerTime]);

  const { data, loading, error } = useGetUserExamQuery({
    variables: {
      filter: {
        id: { _eq: assignment_id as string },
        directus_users_id: { id: { _eq: currentUser?.id } },
        status: {
          _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS],
        },
      },
    },
    fetchPolicy: "cache-and-network",
    skip: !currentUser?.id || !assignment_id,
  });

  if (error) {
    console.error(`[Get Exam Query Error]:`, error.message);
    if (error.networkError) {
      notify({
        type: "error",
        title: "Network Error",
        description:
          "There was a problem connecting to the server. Please check your internet connection and try again.",
      });
    }
  }

  const exam = data?.junction_directus_users_exams.at(0);
  const examVersion = exam?.exams_id?.exam_versions?.at(0);
  const totalQuestions = useMemo(
    () => Object.values(exam?.question_versions_list || []).length,
    [exam?.question_versions_list]
  );

  const getQuestion = useCallback(
    async (retryCount = 0) => {
      if (!exam?.id) return;

      setExamState((prev) => ({
        ...prev,
        saving: true,
        hasError: false,
        retrying: retryCount > 0,
      }));

      try {
        const response = await query(
          `/cms/exams/question?assignment_id=${exam.id}`,
          "GET"
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch question: ${response.status}`);
        }

        const question = await response.json();

        setExamState((prev) => ({
          ...prev,
          showFormError: false,
          questionStart: serverTimeRef.current,
          selectedAnswer: undefined,
          question,
          currentQuestion: question.exam_result_length + 1,
          saving: false,
          hasError: false,
          isSubmitting: false,
          retrying: false,
        }));
        retryCount = 0;
      } catch (error) {
        if (retryCount < RETRY_ATTEMPTS) {
          setExamState((prev) => ({
            ...prev,
            retrying: true,
            retryAttempt: retryCount + 1,
            saving: true,
          }));
          retryCount++;

          notify(
            CUSTOM_MESSAGE(
              "error",
              <>Error getting questions. Retrying...</>,
              <>
                Attempt {retryCount} of {RETRY_ATTEMPTS}. Please wait a
                moment...
              </>
            )
          );

          const increasingDelay = RETRY_DELAY * (1 << (retryCount - 1));
          const jitterRange = increasingDelay * JITTER_FACTOR;
          const jitter = Math.random() * jitterRange;
          const delayWithJitter = increasingDelay + jitter;

          setTimeout(() => getQuestion(retryCount + 1), delayWithJitter);
        } else {
          console.error(`Error Getting Question: `, error);
          setExamState((prev) => ({
            ...prev,
            saving: false,
            hasError: true,
            canDisplay: false,
            isSubmitting: false,
            retrying: false,
          }));
          notify(
            CUSTOM_MESSAGE(
              "error",
              <>Error getting question.</>,
              <>Please refresh the page or try again in a few minutes.</>
            )
          );
        }
      }
    },
    [exam?.id]
  );

  useEffect(() => {
    if (exam?.id) {
      getQuestion();
    }
  }, [exam?.id, getQuestion]);

  const handleSubmit = async () => {
    const { selectedAnswer, question, questionStart, isSubmitting } = examState;

    if (isSubmitting) return;

    if (!selectedAnswer) {
      setExamState((prev) => ({ ...prev, showFormError: true }));
      return;
    }

    setExamState((prev) => ({
      ...prev,
      saving: true,
      isSubmitting: true,
      hasError: false,
    }));

    const attemptSubmission = async (): Promise<boolean> => {
      try {
        if (!exam?.id || !question?.id) {
          throw new Error("Missing required data for submission");
        }

        const response = await query(`/cms/exams/question`, "POST", {
          assignment_id: exam.id,
          question_version_id: question.id,
          answer_id: selectedAnswer,

          time_taken: differenceInSeconds(serverTimeRef.current, questionStart),
        });

        if (response.status === 504) {
          setExamState((prev) => ({
            ...prev,
            saving: false,
            isSubmitting: false,
            hasError: true,
          }));
          throw new Error("Server timeout (504)");
        }

        if (!response.ok) {
          if (response.status === 400) {
            console.error("Validation failed");
            throw new Error(`Validation failed: ${response.status}`);
          } else {
            throw new Error(`Submission failed: ${response.status}`);
          }
        }

        if (examState.currentQuestion === totalQuestions) {
          await router.push(`/clinician/exams/${assignment_id}/result`);

          setExamState((prev) => ({
            ...prev,
            saving: false,
            isSubmitting: false,
            hasError: false,
            isTimeUp: false,
            canDisplay: true,
            retrying: false,
          }));
        } else {
          await getQuestion();
          setExamState((prev) => ({
            ...prev,
            hasError: false,
          }));
        }
        retryCount = 0;

        return true;
      } catch (error) {
        const isRetryable =
          (error instanceof Error && error.message.includes("timeout")) ||
          (error instanceof Error && error.message.includes("504")) ||
          (error instanceof Error && error.message.includes("network")) ||
          (error instanceof Error &&
            error.message.includes("Submission failed") &&
            !error.message.includes("400"));

        if (isRetryable && retryCount < RETRY_ATTEMPTS) {
          retryCount++;

          const increasingDelay = RETRY_DELAY * (1 << (retryCount - 1));
          const jitterRange = increasingDelay * JITTER_FACTOR;
          const jitter = Math.random() * jitterRange;
          const delayWithJitter = increasingDelay + jitter;

          setExamState((prev) => ({
            ...prev,
            saving: true,
            isSubmitting: true,
            hasError: false,
            retrying: true,
          }));
          notify(
            CUSTOM_MESSAGE(
              "error",
              <>Error submitting answer. Retrying...</>,
              <>
                Attempt {retryCount} of {RETRY_ATTEMPTS}. Please wait a
                moment...
              </>
            )
          );

          await new Promise((resolve) => setTimeout(resolve, delayWithJitter));

          return await attemptSubmission();
        } else {
          throw error;
        }
      }
    };

    try {
      await attemptSubmission();
      retryCount = 0;
    } catch (error: any) {
      setExamState((prev) => ({
        ...prev,
        saving: false,
        isSubmitting: false,
        hasError: true,
        canDisplay: false,
        retrying: false,
      }));

      const isGatewayTimeout =
        error instanceof Error && error.message.includes("504");

      if (isGatewayTimeout) {
        notify(
          CUSTOM_MESSAGE(
            "error",
            <>We are experiencing high traffic at the moment.</>,
            <>Please refresh the page or try again in a few minutes.</>
          )
        );
      } else {
        notify(GENERIC_ERROR);
      }
    }
  };

  const isSubmitDisabled =
    examState.saving || examState.hasError || examState.isSubmitting;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const RadioOptions = useMemo(
    () => (
      <RadioGroup className="mt-4 sm:mt-10">
        <div className="rounded-md bg-white">
          {examState.question?.question.answers.map((answer, index) => (
            <RadioGroup.Option
              key={`${answer.id}-${index}`}
              value={answer.id}
              onClick={() =>
                setExamState((prev) => ({ ...prev, selectedAnswer: answer.id }))
              }
              className={({ checked }) =>
                clsx(
                  "relative my-3 flex cursor-pointer rounded border p-4 focus:outline-none",
                  checked
                    ? "z-10 border-blue-200 bg-blue-50"
                    : "border-gray-200"
                )
              }
            >
              {({ active, checked }) => (
                <>
                  <span
                    className={clsx(
                      checked
                        ? "border-transparent bg-blue-600"
                        : "border-gray-300 bg-white",
                      active ? "ring-2 ring-blue-600 ring-offset-2" : "",
                      "mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border"
                    )}
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <span className="ml-3 flex flex-col">
                    <RadioGroup.Label
                      as="span"
                      className={clsx(
                        checked ? "text-blue-900" : "text-gray-900",
                        "block text-sm font-medium"
                      )}
                    >
                      {answer.answer_text}
                    </RadioGroup.Label>
                  </span>
                </>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
    ),
    [examState.question?.question.answers]
  );

  const handleTimeIsUp = () => {
    setExamState((prev) => ({
      ...prev,
      canDisplay: false,
      isTimeUp: true,
    }));
  };

  const handleBackToExams = async () => {
    window.location.href = "/clinician/exams";
  };

  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      <AvatarMenu navigation={clinicianNavigation} />
      <div className="container">
        <ExamHeader
          modality={exam?.exams_id?.modality?.title || "..."}
          title={examVersion?.title || "..."}
          category={examState.question?.category}
        />
        <div className="flex flex-col gap-3 sm:mt-8 sm:flex-row">
          {/* Sidebar - Fixed width */}
          <div className="w-full flex-shrink-0 rounded bg-blue-800 px-6 py-6 sm:w-[280px]">
            {loading ? (
              <div className="flex justify-center">
                <Spinner />
              </div>
            ) : (
              <div>
                {exam?.id && examState.canDisplay === true && (
                  <Timer
                    due={exam?.attempt_due as Date}
                    onTimeUp={handleTimeIsUp}
                  />
                )}
                <p className="mb-4 mt-6 text-xl font-medium text-white">
                  Question {examState.currentQuestion}/{totalQuestions}
                </p>
                <ProgressBar
                  percentage={
                    (examState.currentQuestion * 100) / (totalQuestions || 1)
                  }
                  color="green"
                />
                <div className="mt-12">
                  <p className="mb-3 text-sm text-white">Question Category</p>
                  <Badge>{examState.question?.category}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Main Exam Content - Flexible width */}
          <div className="flex-grow bg-white p-6 shadow">
            {examState.hasError ? (
              <div className="text-center">
                <p className="font-medium text-red-500">
                  There was a problem while taking your exam.
                </p>
                <p className="font-medium text-red-500">
                  Please try again in a few minutes.
                </p>
                <p className="font-medium text-red-500">
                  If the issue persists, please inform your administrator.
                </p>
                <br />
                <br />
                <span className="font-medium">
                  {exam?.exams_id?.modality?.title}
                </span>
                <br />
                <span className="font-medium">
                  {exam?.started_on
                    ? format(exam?.started_on, "MMMM dd, yyyy")
                    : ""}
                </span>
                <br />
                <br />
                <Button
                  label="Back to Exams"
                  variant="light"
                  classes="mt-6"
                  onClick={handleBackToExams}
                />
              </div>
            ) : examState.isTimeUp || examState.canDisplay === false ? (
              <div className="text-center">
                <p className="font-medium text-red-500">
                  There is no time left to continue
                </p>
                <Button
                  label="Back to Exams"
                  variant="light"
                  classes="mt-6"
                  onClick={handleBackToExams}
                />
              </div>
            ) : examState.question ? (
              examState.question && (
                <>
                  <div className="mb-6 w-full">
                    <div className="mt-3 flex sm:text-xl md:mt-12">
                      <p className="font-medium">
                        Q{examState.currentQuestion}.
                      </p>
                      <p className="no-select ml-3 font-medium">
                        {examState.question.question.question_text}
                      </p>
                    </div>

                    {examState.question.image && (
                      <div
                        className="flex cursor-pointer flex-col items-center"
                        onClick={() => setLightboxOpen(true)}
                      >
                        {!imageError ? (
                          <Image
                            src={`${window.origin}/cms/assets/${examState.question.image}?width=480`}
                            width={640}
                            height={640}
                            alt="Question image"
                            className="mt-3 rounded-md object-contain"
                            priority
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="mt-3 text-center text-red-500">
                            Image not available
                          </div>
                        )}
                        <p className="mt-2 text-red-500">
                          Please click the image to view in full size.
                        </p>
                      </div>
                    )}

                    {lightboxOpen && (
                      <Lightbox
                        image={`${window.origin}/cms/assets/${examState.question.image}?width=480`}
                        onClose={() => setLightboxOpen(false)}
                      />
                    )}

                    {RadioOptions}
                  </div>

                  {examState.showFormError && (
                    <p className="font-medium text-red-500">
                      For your exam to be graded, make sure to answer all of the
                      questions. Each question matters, and your effort counts!
                    </p>
                  )}

                  <div className="mb-6 flex w-full">
                    <Button
                      label="Submit"
                      type="button"
                      classes="mt-6 ml-auto !w-36 self-end"
                      loading={examState.saving}
                      disabled={isSubmitDisabled}
                      onClick={handleSubmit}
                    />
                  </div>
                </>
              )
            ) : (
              <>
                {loading || examState.saving ? (
                  <div className="flex justify-center">
                    <Spinner />
                  </div>
                ) : !examState.question ? (
                  <div className="text-center">
                    <p className="font-medium text-red-500">
                      Unable to retrieve exam details, or the allotted time has
                      expired.
                    </p>
                    <p className="font-medium text-red-500">
                      Please return to the exam listing page and select a new
                      exam.
                    </p>
                    <Button
                      label="Back to Exams"
                      variant="light"
                      classes="mt-6"
                      onClick={handleBackToExams}
                    />
                  </div>
                ) : (
                  <></>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestionExam;
