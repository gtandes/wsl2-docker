import { AvatarMenu } from "../../../../components/AvatarMenu";
import React from "react";
import { Certificate as ExamCertificate } from "../../../../components/clinicians/Certificate";
import { useRouter } from "next/router";
import { useAuth } from "../../../../hooks/useAuth";
import {
  Agencies,
  useGetUserExamCerificateDetailsQuery,
  useSysUserQuery,
} from "api";
import { first } from "lodash";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { getUserName } from "../../../../utils/utils";
import { formatExpiresOnDate } from "../../../../utils/format";

function Certificate() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { assignment_id, user_id } = router.query;

  const sysUserQuery = useSysUserQuery({
    variables: {
      id: user_id as string,
    },
    skip: !user_id,
  });

  const userId = user_id ? user_id : currentUser?.id;
  const userQueryData = first(sysUserQuery.data?.users);
  const userName = user_id
    ? getUserName(userQueryData?.first_name!, userQueryData?.last_name!)
    : getUserName(currentUser?.firstName!, currentUser?.lastName!);

  const { data: dataUserExamCertificate } =
    useGetUserExamCerificateDetailsQuery({
      variables: {
        user: userId as string,
        assignment_id: Number(assignment_id),
      },
      skip: !userId || !assignment_id,
    });
  const certificate = first(
    dataUserExamCertificate?.junction_directus_users_exams
  );

  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      <AvatarMenu />
      {certificate && userId && (
        <div className="container">
          <ExamCertificate
            certificateCode={certificate.cert_code as string}
            title={certificate.exams_id?.title as string}
            fullName={userName}
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

export default withAuth(Certificate, ClinicianGroup);
