/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useApolloClient } from "@apollo/client";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { UserExamQuestionsFragment } from "api";
import { ExamStats } from "./ExamStats";
import Button from "../Button";
import { GENERIC_ERROR, notify } from "../Notification";
import ExamANCC from "./ExamANCC";
import { query } from "../../utils/utils";
import { Timer } from "./Timer";
import { useAgency } from "../../hooks/useAgency";
import { useAuth } from "../../hooks/useAuth";
import { useIntegrityAdvocate } from "../../hooks/useIntegrityAdvocate";
import { ExamHeader } from "./ExamHeader";
import indexedDb, { QuestionItem, createDbConfig } from "../../lib/indexedDb";
interface Props {
  start?: boolean;
  resume?: boolean;
  exam: UserExamQuestionsFragment | undefined;
  started?: string;
}

export const ExamStartResume: React.FC<Props> = ({ exam }) => {
  const [loading, setLoading] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const customIndexedDbConfig = createDbConfig("questions");

  const router = useRouter();
  const apolloClient = useApolloClient();
  const { currentAgency } = useAgency();
  const { currentUser } = useAuth();
  const { integrityAdvocate, setIntegrityAdvocate, setShowIntegrityAdvocate } =
    useIntegrityAdvocate();

  const examVersion = useMemo(() => {
    return exam?.exams_id?.exam_versions?.[0];
  }, [exam?.exams_id?.exam_versions]);

  const canResume = useMemo(() => {
    return exam?.attempt_due ? new Date(exam.attempt_due) > new Date() : false;
  }, [exam?.attempt_due]);

  const isProctored = currentAgency?.ia_enable && examVersion?.is_proctoring;

  const stats = useMemo(() => {
    if (!examVersion) return [];

    const totalQuestions = examVersion.questions?.length ?? 0;
    const questionsToGive = examVersion.questions_to_give ?? totalQuestions;
    const questionsToPass = Math.min(totalQuestions, questionsToGive);
    const durationMs = questionsToPass * 180000;

    return [
      { label: "Total Questions", value: questionsToPass.toString() },
      { label: "Passing Marks", value: `${examVersion.passing_score ?? 0}%` },
      {
        label: "Allowed Attempts",
        value: exam?.allowed_attempts?.toString() ?? "N/A",
      },
      { label: "Attempts Used", value: exam?.attempts_used?.toString() ?? "0" },
      {
        label: "Quiz duration",
        value: formatDuration(
          intervalToDuration({ start: 0, end: durationMs })
        ),
      },
    ];
  }, [examVersion, exam?.allowed_attempts, exam?.attempts_used]);

  const onStartExam = useCallback(async () => {
    if (!exam?.id) return;

    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await query(
        "/cms/exams/start",
        "POST",
        { assignment_id: exam.id },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.status !== 200) {
        switch (response.status) {
          case 401:
            notify({
              type: "error",
              title: "Authentication Required",
              description: "Please log in to start this exam.",
            });
            break;

          case 403:
            notify({
              type: "error",
              title: "Access Denied",
              description: "You don't have permission to start this exam.",
            });
            break;

          case 400:
            notify({
              type: "error",
              title: "Error starting the exam",
              description: "Bad Request or Input validation failed.",
            });
            break;

          case 404:
            notify({
              type: "error",
              title: "Exam Not Found",
              description: "The requested exam could not be found.",
            });
            break;

          default:
            notify({
              type: "error",
              title: "Error Starting Exam",
              description: "An error occurred while starting the exam.",
            });
        }
      }

      const jsonResponse = await response.json();

      if (Array.isArray(jsonResponse.data) && jsonResponse.data.length > 0) {
        try {
          await indexedDb.clearQuestions(customIndexedDbConfig);
          await indexedDb.storeQuestions(
            jsonResponse.data,
            customIndexedDbConfig
          );
        } catch (error) {
          console.error("Error Storing Data to IndexedDb", error);
        }
      }

      if (!isProctored) {
        await router.push(`/clinician/exams/${exam.id}/question`);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        notify({
          type: "error",
          title: "Timeout Error",
          description:
            "The exam could not be started due to a timeout. Please try again later.",
        });
      }
      return;
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [exam?.id, isProctored, router, apolloClient]);

  const handleIaReady = () => {
    if (exam?.id) {
      canResume ? null : onStartExam();
    }
  };

  const handleExamNavigation = useCallback(async () => {
    if (!exam?.id) {
      return;
    }

    if (isProctored) {
      setShowIntegrityAdvocate(true);

      window.addEventListener("IA_Ready", handleIaReady);

      if (canResume) {
        canResume ? null : await onStartExam();
      }
    }

    if (!isProctored && exam?.id) {
      if (canResume) {
        router.push(`/clinician/exams/${exam.id}/question`);
      } else {
        await onStartExam();
      }
    }
  }, [
    isProctored,
    canResume,
    exam?.id,
    router,
    onStartExam,
    setShowIntegrityAdvocate,
  ]);

  const examTitle = exam?.exams_id?.title ?? "";
  const examCategory = exam?.exams_id?.modality?.title ?? "";
  const examDescription = examVersion?.description;
  const outlineId = examVersion?.outline?.id ?? "";
  const assignedDate = exam?.assigned_on
    ? format(exam.assigned_on, "PPp")
    : null;
  const isShell = !!exam?.exams_id?.import_is_shell;

  const defaultIAProps = useMemo(
    () => ({
      participantId: currentUser?.id ?? "",
      firstName: currentUser?.firstName ?? "",
      lastName: currentUser?.lastName ?? "",
      email: currentUser?.email ?? "",
      courseId: exam?.exams_id?.modality?.id ?? "",
      activityId: exam?.exams_id?.id ?? "",
      assignmentId: exam?.id ?? "",
      externaluserid: `${currentUser?.id} attempt:${
        (exam?.attempts_used ?? 0) + 1
      }`,
    }),
    [currentUser, exam?.exams_id?.id, exam?.exams_id?.modality?.id, exam?.id]
  );

  useEffect(() => {
    if (!integrityAdvocate) {
      setIntegrityAdvocate(defaultIAProps);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("IA_Ready", handleIaReady);
      }
    };
  }, [integrityAdvocate, setIntegrityAdvocate, defaultIAProps]);

  return (
    <>
      <ExamHeader
        outlineId={outlineId}
        category={examCategory}
        title={examTitle}
      />
      <div className="mt-3 flex gap-3 md:mt-8">
        <div className="hidden !w-[370px] rounded bg-blue-800 px-8 py-6 md:block">
          <p className="mt-6 text-xl font-medium text-white">Exam Summary</p>
          <p className="mb-8 mt-8 text-sm text-white">{examDescription}</p>

          <ExamStats
            stats={stats}
            containerClassName="text-white"
            itemClassName="pb-3 border-b border-blue-400 mt-4"
          />

          <p className="mb-8 mt-12 text-xl font-medium text-white">ANCC</p>
          <ExamANCC
            label="Accreditation Statement"
            body="Healthcare Staffing Hire is accredited as a provider of nursing continuing professional development by the ANCC."
          />
          <ExamANCC
            label="Course Completion Requirements"
            body="With a score of 80% or greater, you may immediately print your CE certificate of completion. If your score is less, you may retake the test."
          />
          <ExamANCC
            label="Monitoring and resolving Conflicts of interest"
            body="HSH evaluates conflicts of interest during planning and implementation of educational content."
          />
          <ExamANCC
            label="Keeping content free from Influence and Bias"
            body="HSH ensures that no content granted CNE is influenced by businesses providing funding."
          />
          <ExamANCC
            label="Enduring Materials"
            body="HSH updates course curricula based on regulatory changes and policy updates."
          />

          {assignedDate && (
            <p className="mt-5 text-sm text-white">
              Assigned on {assignedDate}
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center rounded bg-white p-6 pb-12 text-center shadow">
          <div className="mb-8 text-gray-500">
            <h2 className="mb-6 text-2xl font-medium text-blue-800">
              {canResume ? "Let's get back to it!" : "Let's get started!"}
            </h2>
            {isProctored ? (
              <>
                <p>
                  Once you start the exam, it counts as an attempt. The session
                  will remain active for the full exam duration. If you need a
                  break, you can close the window and resume later by clicking
                  {" Resume."}
                  However, the timer will continue running while you are away.
                  Ensure you return with enough time to complete the exam.
                  Failing to do so will require you to retake the entire
                  questionnaire and will cost you an attempt.
                </p>
                <br />
                <span className="font-bold text-red-500">
                  To pass the exam, you must complete the entire exam and
                  achieve a passing score.
                </span>
              </>
            ) : (
              <>
                <p>
                  Remember, once you start the exam, it counts as an attempt.
                  The session will not pause if you close the window, but you
                  can return by clicking &apos;Resume&apos;. Just make sure to
                  finish before time runs out. Otherwise, you&apos;ll need to
                  retake the entire questionnaire AND you&apos;ll lose an
                  attempt.
                </p>
                <br />
                <span className="font-bold text-red-500">
                  To pass, you must complete the entire exam and achieve a
                  passing score.
                </span>
              </>
            )}

            <br />
            {isProctored && (
              <div className="mt-5 flex flex-col items-center justify-center text-center">
                <div className="mt-3 inline-block text-left">
                  <p className="mb-3">
                    This exam is virtually proctored. To complete this exam,
                    your computer must have a camera enabled to monitor your
                    exam attempt. Before continuing, your camera must be on and
                    allowed to take pictures. You will be asked to take two
                    pictures:
                  </p>
                  <ul className="mx-auto list-disc space-y-2 pl-5">
                    <li>
                      A picture of <span className="font-bold">yourself.</span>
                    </li>
                    <li>
                      A picture of a{" "}
                      <span className="font-bold">
                        valid identification card
                      </span>{" "}
                      that belongs to you.
                    </li>
                  </ul>
                  <p className="mb-3 mt-3">
                    Please note that if you take a break, you will need to
                    re-verify your identity by submitting the two pictures
                    mentioned above..
                  </p>
                  <p className="text-center font-bold text-red-500">
                    To ensure exam integrity, participants must follow these
                    rules:
                  </p>
                  <ol className="mx-auto list-decimal space-y-2 pl-5">
                    <li>
                      <span className="font-bold">
                        Must not leave full screen
                      </span>{" "}
                      - You must stay in full-screen mode and cannot switch
                      windows or tabs.
                    </li>
                    <li>
                      <span className="font-bold">
                        Must not use an additional screen or monitor
                      </span>{" "}
                      - Only one screen is allowed.
                    </li>
                    <li>
                      <span className="font-bold">
                        Do not stop sharing your screen
                      </span>{" "}
                      - Screen sharing must remain active throughout the
                      session.
                    </li>
                    <li>
                      <span className="font-bold">
                        Do not use AI applications
                      </span>{" "}
                      - No AI tools or applications can be running.
                    </li>
                    <li>
                      <span className="font-bold">
                        Must stay in view of the camera
                      </span>{" "}
                      - You must always be visible to the proctoring system.
                    </li>
                    <li>
                      <span className="font-bold">
                        Must not use collaborative applications
                      </span>{" "}
                      - Apps like Slack, Zoom, or Teams are not allowed.
                    </li>
                    <li>
                      <span className="font-bold">
                        Do not communicate with others
                      </span>{" "}
                      - Talking to others is strictly prohibited.
                    </li>
                    <li>
                      <span className="font-bold">
                        Do not be in the presence of others
                      </span>{" "}
                      - No one else should be in the room during the exam.
                    </li>
                    <li>
                      <span className="font-bold">
                        Do not use any smart devices
                      </span>{" "}
                      - Phones, tablets, or other electronic devices are not
                      allowed.
                    </li>
                    <li>
                      <span className="font-bold">Do not use headphones</span> -
                      Headphones and earphones are not permitted.
                    </li>
                    <li>
                      <span className="font-bold">
                        Must not use external resources
                      </span>{" "}
                      - Books, notes, or any other external materials are
                      prohibited.
                    </li>
                  </ol>
                  <p className="mt-3">
                    Failure to comply with these rules may result in the
                    disqualification or invalidation of your exam attempt.
                  </p>
                </div>
              </div>
            )}
            <br />
            <span className="font-medium">
              Good luck, you&apos;ve got this.
            </span>
          </div>

          <ExamStats
            stats={stats}
            containerClassName="block md:hidden text-dark-blue-700 font-medium mb-10"
            itemClassName="pb-2 border-b mt-3"
          />

          {assignedDate && (
            <p className="mb-10 block text-gray-700 md:hidden">
              Assigned on {assignedDate}
            </p>
          )}

          <div className="flex flex-col items-center">
            {!timerHidden && exam?.attempt_due && (
              <div className="mb-2">
                <Timer
                  due={exam.attempt_due as Date}
                  onTimeUp={() => setTimerHidden(true)}
                />
              </div>
            )}
            <Button
              classes="w-40 self-center"
              label={canResume ? "Resume" : "Start"}
              disabled={isShell}
              loading={loading}
              onClick={handleExamNavigation}
            />
          </div>
        </div>
      </div>
    </>
  );
};
