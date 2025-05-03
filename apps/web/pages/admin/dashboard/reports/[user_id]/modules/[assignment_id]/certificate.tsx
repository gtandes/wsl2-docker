import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { Agencies, useGetModuleassignmentByUserIdQuery } from "api";
import { withAuth } from "../../../../../../../hooks/withAuth";
import { AllRoles } from "../../../../../../../types/roles";
import { Certificate as ModuleCertificate } from "../../../../../../../components/clinicians/Certificate";

function Certificate() {
  const router = useRouter();
  const assignmentId = router.query.assignment_id as string;
  const userId = router.query.user_id as string;

  const moduleAssignment = useGetModuleassignmentByUserIdQuery({
    variables: {
      userId: userId,
      assignmentId: assignmentId,
    },
  });

  const assignment =
    moduleAssignment.data?.junction_modules_definition_directus_users.at(0);
  const isApproved = assignment?.approved;
  const definition = assignment?.modules_definition_id;
  const currentUser = assignment?.directus_users_id;

  useEffect(() => {
    if (assignment && !isApproved) {
      router.back();
    }
  }, [assignment, isApproved, router]);

  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      {isApproved && currentUser && (
        <div className="container">
          <ModuleCertificate
            certificateCode={assignment.cert_code as unknown as string}
            title={definition?.title as string}
            fullName={currentUser.first_name + " " + currentUser.last_name}
            grantedOn={assignment.finished_on as unknown as string}
            validUntil={assignment.expires_on as unknown as string}
            passingScore={assignment.score as number}
            category={definition?.modality?.title as string}
            ceu={String(
              assignment?.modules_definition_id?.last_version?.contact_hour
            )}
            agency={assignment.agency as Agencies}
            type="Module"
          />
        </div>
      )}
    </div>
  );
}

export default withAuth(Certificate, AllRoles);
