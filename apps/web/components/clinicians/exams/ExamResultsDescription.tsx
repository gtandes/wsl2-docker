import { useContext, useEffect, useState } from "react";
import { SpecialtyHeader } from "../../SpecialtyHeader";
import { Logo } from "../../utils/Logo";
import { faBriefcaseMedical } from "@fortawesome/pro-light-svg-icons";
import { ExamResultsContext } from "../../shared/exams/ExamResults";
import { useGetUserExamCerificateDetailsQuery } from "api";
import { UserRole } from "../../../types/roles";
import { CompetencyState } from "types";
import { first } from "lodash";
import { formatDate, formatExpiresOnDate } from "../../../utils/format";

export const ExamResultDescription = () => {
  const { results, exam_results, userInfo, attempt_id, isExamCompleted } =
    useContext(ExamResultsContext);
  const isClinician = userInfo?.role?.id === UserRole.Clinician;
  const answers = exam_results;
  const contactHours = results?.exam_versions_id?.contact_hour;
  const agencyName = first(answers)?.assignment_id?.agency?.name || "";

  const [filteredScore, setFilteredScore] = useState<any | null>(null);

  const { data: dataUserExamCertificate } =
    useGetUserExamCerificateDetailsQuery({
      variables: {
        user: userInfo?.id as string,
        assignment_id: results?.id as string,
      },
      skip: !userInfo?.id || !results?.exams_id?.id,
    });

  const certificate = first(
    dataUserExamCertificate?.junction_directus_users_exams
  );

  useEffect(() => {
    if (typeof results?.score_history !== "object") {
      setFilteredScore(null);
    }
    if ((results?.score_history as any[])?.length) {
      const matchedScore = (results?.score_history as Array<any>)?.at(
        attempt_id ? attempt_id - 1 : -1
      );
      setFilteredScore(matchedScore || null);
    }
  }, [results?.score_history]);

  const getMessage = (
    scoreStatus: CompetencyState | null | undefined,
    resultStatus: CompetencyState | null | undefined | string,
    isExamCompleted: boolean
  ) => {
    if (resultStatus === CompetencyState.COMPLETED && !scoreStatus) {
      return <>Congratulations! You’ve passed. We are proud of you.</>;
    }

    if (
      scoreStatus === CompetencyState.FAILED ||
      (isExamCompleted && resultStatus !== CompetencyState.COMPLETED)
    ) {
      return (
        <>
          Oh no! We’re sorry, but your score is not sufficient to pass the exam.
        </>
      );
    }

    if (scoreStatus === CompetencyState.FAILED_TIMED_OUT) {
      return <>Oh no! We’re sorry, but you ran out of time.</>;
    }

    return <>Congratulations! You’ve passed. We are proud of you.</>;
  };

  return (
    results && (
      <>
        <Logo />
        <div className="mb-5">
          <SpecialtyHeader
            icon={faBriefcaseMedical}
            color="purple"
            title={results.exams_id?.title as string}
            category={results.exams_id?.modality?.title as string}
          />
        </div>

        {isClinician && (
          <h1 className="mb-5 text-2xl font-bold text-[#3e5a8c] print:text-lg">
            {getMessage(
              filteredScore?.score_status,
              results?.status,
              isExamCompleted as boolean
            )}
          </h1>
        )}

        <div className="flex flex-col">
          <span className="font-bold capitalize">
            {userInfo?.first_name} {userInfo?.last_name}
          </span>
          <span className="text-sm">{userInfo?.email}</span>
        </div>
        <div className="flex flex-col">
          {agencyName && (
            <span className="font-bold capitalize">
              Company: &nbsp;
              <span className="font-normal">{agencyName}</span>
            </span>
          )}
          {results?.exam_versions_id?.description && (
            <p>
              <span className="font-bold">Exam Description:</span>&nbsp;
              <span className="w-4/5 font-normal">
                {results.exam_versions_id.description}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-10">
          <div className="flex flex-col">
            <div>
              <span className="font-bold">Assigned On:</span>&nbsp;
              <span className="font-normal">
                {formatDate(results?.assigned_on?.toISOString() || "")}
              </span>
            </div>
            <div>
              <span className="font-bold">Started On:</span>&nbsp;
              <span className="font-normal">
                {formatDate(results?.started_on?.toISOString() || "")}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            {certificate?.finished_on && (
              <div>
                <span className="font-bold">Completed On:</span>&nbsp;
                <span className="font-normal">
                  {formatDate(certificate?.finished_on)}
                </span>
              </div>
            )}
            {certificate?.expires_on && (
              <div>
                <span className="font-bold">Expires On:</span>&nbsp;
                <span className="font-normal">
                  {formatExpiresOnDate(certificate?.expires_on)}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            {certificate?.cert_code && (
              <div>
                <span className="font-bold">Certificate code:</span>&nbsp;
                <span className="font-normal">{certificate?.cert_code}</span>
              </div>
            )}
            {contactHours && (
              <div>
                <span className="font-bold">Contact Hours(s):</span>&nbsp;
                <span className="font-normal">{contactHours}</span>
              </div>
            )}
          </div>
        </div>
      </>
    )
  );
};
