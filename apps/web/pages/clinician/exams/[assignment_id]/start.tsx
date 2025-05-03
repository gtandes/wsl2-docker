// TODO
//  Tighten clinician permissions

import React, { useMemo } from "react";
import { AvatarMenu } from "../../../../components/AvatarMenu";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { useAuth } from "../../../../hooks/useAuth";
import { useRouter } from "next/router";
import { useGetUserExamQuery } from "api";
import { ExamStartResume } from "../../../../components/clinicians/ExamStartResume";
import { clinicianNavigation } from "../../../../components/clinicians/DashboardLayout";
import ExamCheck from "../../../../components/clinicians/ExamCheck";
import { CompetencyState } from "types";

function StartExam() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { assignment_id } = router.query;

  const { data, loading } = useGetUserExamQuery({
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

  const userExam = useMemo(
    () => data?.junction_directus_users_exams.at(0),
    [data]
  );

  return (
    <div className="min-h-screen bg-blue-50 pb-12">
      <AvatarMenu navigation={clinicianNavigation} />
      <ExamCheck status={userExam?.status as CompetencyState} loading={loading}>
        <div className="mx-4 md:mx-12 lg:mx-auto lg:px-12 xl:max-w-[1300px]">
          <ExamStartResume start exam={userExam} />
        </div>
      </ExamCheck>
    </div>
  );
}

export default withAuth(StartExam, ClinicianGroup);
