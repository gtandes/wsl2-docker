import React from "react";
import { AvatarMenu } from "../../../../components/AvatarMenu";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { clinicianNavigation } from "../../../../components/clinicians/DashboardLayout";
import { ExamResults } from "../../../../components/shared/exams/ExamResults";

function ReviewExam() {
  return (
    <>
      <AvatarMenu navigation={clinicianNavigation} />
      <ExamResults />
    </>
  );
}

export default withAuth(ReviewExam, ClinicianGroup);
