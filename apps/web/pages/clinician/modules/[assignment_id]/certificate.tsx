import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../../hooks/useAuth";
import { Agencies, useGetModuleAssignmentQuery } from "api";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { Certificate as ModuleCertificate } from "../../../../components/clinicians/Certificate";

function Certificate() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const assignmentId = router.query.assignment_id as string;

  const moduleAssignment = useGetModuleAssignmentQuery({
    variables: {
      assignmentId: assignmentId,
    },
    skip: !assignmentId,
  });

  const assignment =
    moduleAssignment.data?.junction_modules_definition_directus_users_by_id;
  const isApproved = assignment?.approved;
  const definition = assignment?.modules_definition_id;

  useEffect(() => {
    if (assignment && !isApproved) {
      router.push(`/clinician/modules`);
    }
  }, [assignment, isApproved, router]);

  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      {isApproved && currentUser && (
        <div className="container">
          <ModuleCertificate
            certificateCode={assignment.cert_code as unknown as string}
            title={definition?.title as string}
            fullName={[
              assignment.directus_users_id?.first_name,
              assignment.directus_users_id?.last_name,
            ].join(" ")}
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

export default withAuth(Certificate, ClinicianGroup);
