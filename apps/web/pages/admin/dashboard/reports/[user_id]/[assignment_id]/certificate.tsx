import React from "react";
import { Certificate as ExamCertificate } from "../../../../../../components/clinicians/Certificate";
import { useRouter } from "next/router";
import {
  Agencies,
  useGetUserExamCerificateDetailsQuery,
  useSysUsersQuery,
} from "api";
import { first } from "lodash";
import { getUserName } from "../../../../../../utils/utils";
import { formatExpiresOnDate } from "../../../../../../utils/format";

export default function ReportCertificate() {
  const router = useRouter();
  const { user_id, assignment_id } = router.query;

  const { data: userData } = useSysUsersQuery({
    variables: {
      filter: {
        id: {
          _eq: user_id as string,
        },
      },
    },
    skip: !user_id,
  });

  const userInfo = first(userData?.users);
  const { data: dataUserExamCertificate } =
    useGetUserExamCerificateDetailsQuery({
      variables: {
        user: user_id as string,
        assignment_id: Number(assignment_id),
      },
      skip: !user_id || !assignment_id,
    });

  const certificate = first(
    dataUserExamCertificate?.junction_directus_users_exams
  );
  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      {certificate && userInfo && (
        <div className="container">
          <ExamCertificate
            certificateCode={certificate.cert_code as string}
            title={certificate.exams_id?.title as string}
            fullName={getUserName(userInfo.first_name!, userInfo.last_name!)}
            grantedOn={certificate.finished_on as unknown as string}
            validUntil={certificate.expires_on as unknown as string}
            passingScore={certificate.score as number}
            category={certificate.exams_id?.modality?.title as string}
            ceu={certificate.exam_versions_id?.contact_hour as string}
            agency={certificate.agency as Agencies}
            type="Exam"
          />
        </div>
      )}
    </div>
  );
}
