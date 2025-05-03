import React from "react";
import { withAuth } from "../../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../../types/roles";
import { ExamResults } from "../../../../../../components/shared/exams/ExamResults";

function ReviewExam() {
  return <ExamResults />;
}

export default withAuth(ReviewExam, AdminGroup);
