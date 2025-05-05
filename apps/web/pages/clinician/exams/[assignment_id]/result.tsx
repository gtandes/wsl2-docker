import React, { useEffect } from "react";
import { AvatarMenu } from "../../../../components/AvatarMenu";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { clinicianNavigation } from "../../../../components/clinicians/DashboardLayout";
import Button from "../../../../components/Button";
import { useRouter } from "next/router";
import { ExamSummary } from "../../../../components/clinicians/Summary";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcaseMedical,
  faFaceSmile,
  faFrown,
} from "@fortawesome/pro-light-svg-icons";
import { CircularPercentage } from "../../../../components/CircularPercentage";
import { SpecialtyHeader } from "../../../../components/SpecialtyHeader";
import {
  useGetUserExamAttemptForResultQuery,
  useGetUserExamsResultsByAttemptQuery,
  useGetUserExamQuery,
} from "api/generated/graphql";
import { useAuth } from "../../../../hooks/useAuth";
import { first } from "lodash";
import { Outline } from "../../../../components/exams/Outline";
import Image from "next/image";
import HealthCare from "../../../../assets/healthcare.svg";
import { CompetencyState } from "types";
import { useFeatureFlags } from "../../../../hooks/useFeatureFlags";
import { useAgency } from "../../../../hooks/useAgency";
import ExamInReviewMessage from "./proctored-result";

function ResultExam() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { assignment_id } = router.query;
  const { currentAgency } = useAgency();
  const { flags } = useFeatureFlags();

  const { data: dataUserExam, refetch: refetchUserExamAttempt } =
    useGetUserExamAttemptForResultQuery({
      variables: {
        user: currentUser?.id as string,
        assignment_id: Number(assignment_id),
      },
      fetchPolicy: "cache-and-network",
      skip: !currentUser?.id || !assignment_id,
    });

  const results = first(dataUserExam?.junction_directus_users_exams);

  const { data: examResults, refetch: refetchUserExamResults } =
    useGetUserExamsResultsByAttemptQuery({
      variables: {
        exam_id: results?.exams_id?.id!,
        attempt: (Number(results?.attempts_used) - 1) as number,
        assignment_id: Number(assignment_id),
      },
      fetchPolicy: "cache-and-network",
      skip: dataUserExam === undefined,
    });

  const { data: userExam, refetch: refetchUserExam } = useGetUserExamQuery({
    variables: {
      filter: {
        id: { _eq: assignment_id as string },
      },
    },
    fetchPolicy: "cache-and-network",
    skip: !currentUser?.id || !assignment_id,
  });

  const exam = userExam?.junction_directus_users_exams.at(0);

  const totalQuestions: number = Object.values(
    exam?.question_versions_list || []
  ).length;
  const outlineId = results?.exam_versions_id?.outline?.id;
  const passingScore = results?.exam_versions_id?.passing_score;
  const totalAnswers = examResults?.exam_results;
  const correctAnswers = totalAnswers?.filter((e) => e.correct).length;
  const isExamCompleted = totalQuestions === totalAnswers?.length;
  const resultsScore =
    (correctAnswers && Math.ceil((correctAnswers / totalQuestions) * 100)) ||
    0.01;
  const resultsColor =
    results?.status === CompetencyState.COMPLETED
      ? "rgb(54, 209, 145)"
      : "rgb(255, 124, 92)";
  const hideTryAgain = [
    CompetencyState.COMPLETED,
    CompetencyState.FAILED,
  ].includes(results?.status as CompetencyState);

  const handleRetryExam = async () => {
    await refetchUserExamAttempt();
    await refetchUserExamResults();
    await refetchUserExam();
    router.push(`/clinician/exams/${assignment_id}/start`);
  };

  useEffect(() => {
    if (currentAgency?.ia_enable) {
      if (typeof window !== "undefined" && window.IntegrityAdvocate) {
        try {
          window.IntegrityAdvocate.endSession();
        } catch (error) {
          console.error(
            "Error calling window.IntegrityAdvocate.endSession():",
            error
          );
        }
      }
    }
  }, [currentAgency?.ia_enable]);

  return (
    results && (
      <div className="min-h-screen min-w-[573px] bg-blue-50 pb-12">
        <AvatarMenu navigation={clinicianNavigation} />
        <div className="px-4 sm:px-16">
          <SpecialtyHeader
            icon={faBriefcaseMedical}
            color="purple"
            title={results.exams_id?.title as string}
            category={results.exams_id?.modality?.title as string}
          />
          <div className="mt-8 flex gap-3">
            <div className="flex flex-1 items-center justify-center rounded bg-white p-6 pb-12 text-center shadow">
              <div>
                <div>
                  <p className="text-sm font-medium text-purple-400">
                    YOUR RESULTS
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Image
                      width={154}
                      height={48}
                      alt={"Health Care"}
                      src={HealthCare}
                    />
                  </div>
                  <h2 className="max-w-35% mx-40 my-6 text-2xl font-medium">
                    {results.status === CompetencyState.IN_REVIEW ? (
                      <ExamInReviewMessage />
                    ) : results.status === CompetencyState.COMPLETED ? (
                      <p>
                        Congratulations! You’ve passed.
                        <br /> We are proud of you.
                      </p>
                    ) : isExamCompleted ? (
                      <p>
                        Oh no! We’re sorry, but your score is not sufficient to
                        pass the exam.
                      </p>
                    ) : (
                      <p>Oh no! We’re sorry, but you ran out of time.</p>
                    )}
                  </h2>
                </div>

                {results.status === CompetencyState.IN_REVIEW ? null : (
                  <>
                    <div
                      className={`grid sm:grid-cols-1 md:grid-cols-${
                        isExamCompleted ? 2 : 1
                      }`}
                    >
                      {isExamCompleted && (
                        <div className="">
                          <CircularPercentage
                            percentage={resultsScore}
                            color={resultsColor}
                            text="Score"
                          />
                          {results?.status === CompetencyState.COMPLETED ? (
                            <>
                              <FontAwesomeIcon
                                icon={faFaceSmile}
                                size="6x"
                                className="text-green-400"
                              />
                              <p className="mx-auto mt-4 max-w-[50%]">
                                {results.exam_versions_id?.passing_message}
                              </p>
                              {outlineId && (
                                <p className="mx-auto mt-4 max-w-[50%]">
                                  Check out the{" "}
                                  <Outline
                                    id={outlineId as string}
                                    classes="cursor:pointer text-blue-800 underline hover:text-blue-400"
                                  />{" "}
                                  as your trusty Study Guide to help you ace
                                  your next attempt!
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon
                                icon={faFrown}
                                size="6x"
                                className="text-red-400"
                              />
                              <p className="mx-auto mt-4 max-w-[50%]">
                                {results.exam_versions_id?.fail_message}
                              </p>
                              {outlineId && (
                                <p className="mx-auto mt-4 max-w-[50%]">
                                  Check out the{" "}
                                  <Outline
                                    id={outlineId as string}
                                    classes="cursor:pointer text-blue-800 underline hover:text-blue-400"
                                  />{" "}
                                  as your trusty Study Guide to help you ace
                                  your next attempt!
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-4">
                        <ExamSummary
                          allowedAttempts={results.allowed_attempts as number}
                          attemptsUsed={results.attempts_used as number}
                          correctAnswers={correctAnswers!}
                          passingScore={passingScore!}
                          reviewExamRoute={`/clinician/exams/${assignment_id}/review`}
                          totalQuestions={totalQuestions}
                          isExamCompleted={isExamCompleted}
                        />
                        {results?.status === CompetencyState.COMPLETED && (
                          <Button
                            label="View My Certificate"
                            classes="min-w-100"
                            onClick={() =>
                              router.push(
                                `/clinician/exams/${assignment_id}/certificate`
                              )
                            }
                          />
                        )}

                        {isExamCompleted && (
                          <Button
                            label="Review my Answers and Results"
                            classes="min-w-100"
                            onClick={() => {
                              router.push(
                                `/clinician/exams/${assignment_id}/review`
                              );
                            }}
                          />
                        )}
                        {!hideTryAgain && (
                          <Button
                            label="Try Again"
                            variant="light"
                            classes="min-w-100"
                            onClick={handleRetryExam}
                          />
                        )}

                        <Button
                          label="Go to my Exams"
                          variant="light"
                          classes="min-h-5"
                          onClick={() => {
                            window.location.href = `/clinician/exams`;
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
}

export default withAuth(ResultExam, ClinicianGroup);
