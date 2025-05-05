import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CompetencyCard } from "../../components/clinicians/CompetencyCard";
import { DashboardLayout } from "../../components/clinicians/DashboardLayout";
import { withAuth } from "../../hooks/withAuth";
import { ClinicianGroup } from "../../types/roles";
import {
  faChalkboardTeacher,
  faCircleQuestion,
  faListCheck,
} from "@fortawesome/pro-light-svg-icons";
import { useAuth } from "../../hooks/useAuth";
import { useGetClinicianDashboardCompetenciesQuery } from "api";
import { faBookOpen, faMemo } from "@fortawesome/pro-regular-svg-icons";
import { MyCertificates } from "../../components/clinicians/dashboard/MyCertificates";
import { MyPendingItems } from "../../components/clinicians/dashboard/MyPendingItems";
import { MyExpiringSoonItems } from "../../components/clinicians/dashboard/MyExpiringSoonItems";

import { MyAnalytics } from "../../components/clinicians/dashboard/MyAnalytics";

type CompetenciesTotals = {
  exams: number;
  exams_completed: number;
  modules: number;
  modules_completed: number;
  skill_checklists: number;
  skill_checklists_completed: number;
  policies: number;
  policies_completed: number;
  documents: number;
  documents_completed: number;
};

function Dashboard() {
  const auth = useAuth();
  const { data: competencies, loading } =
    useGetClinicianDashboardCompetenciesQuery({
      skip: !auth.currentUser?.id,
    });

  const clinicianCompetencies = useMemo<CompetenciesTotals>(
    () => ({
      exams: competencies?.total_exams[0].count?.id || 0,
      exams_completed: competencies?.total_exams_completed[0].count?.id || 0,
      modules: competencies?.total_modules[0].count?.id || 0,
      modules_completed:
        competencies?.total_modules_completed[0].count?.id || 0,
      skill_checklists: competencies?.total_skills_checklists[0].count?.id || 0,
      skill_checklists_completed:
        competencies?.total_skills_checklists_completed[0].count?.id || 0,
      policies: competencies?.total_policies[0].count?.id || 0,
      policies_completed:
        competencies?.total_policies_completed[0].count?.id || 0,
      documents: competencies?.total_documents[0].count?.id || 0,
      documents_completed:
        competencies?.total_documents_completed[0].count?.id || 0,
    }),
    [competencies]
  );

  return (
    <DashboardLayout>
      <h1 className="mb-10 text-center text-4xl font-medium text-blue-800">
        Welcome back, {auth.currentUser?.firstName}!
      </h1>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-5">
        <CompetencyCard
          type="Exams"
          completed={clinicianCompetencies.exams_completed}
          total={clinicianCompetencies.exams}
          color="purple"
          icon={<FontAwesomeIcon icon={faCircleQuestion} size="2xl" />}
          viewAllAction="/clinician/exams"
          loading={loading}
        />
        <CompetencyCard
          type="Modules"
          completed={clinicianCompetencies.modules_completed}
          total={clinicianCompetencies.modules}
          color="light-blue"
          icon={<FontAwesomeIcon icon={faChalkboardTeacher} size="2xl" />}
          viewAllAction="/clinician/modules"
          loading={loading}
        />
        <CompetencyCard
          type="Skills Checklist"
          completed={clinicianCompetencies.skill_checklists_completed}
          total={clinicianCompetencies.skill_checklists}
          color="green"
          icon={<FontAwesomeIcon icon={faListCheck} size="2xl" />}
          viewAllAction="/clinician/skills-checklists"
          loading={loading}
        />
        <CompetencyCard
          type="Policies"
          completed={clinicianCompetencies.policies_completed}
          total={clinicianCompetencies.policies}
          color="blue"
          icon={<FontAwesomeIcon icon={faMemo} size="2xl" />}
          viewAllAction="/clinician/policies"
          loading={loading}
        />
        <CompetencyCard
          type="Documents"
          completed={clinicianCompetencies.documents_completed}
          total={clinicianCompetencies.documents}
          color="teal"
          icon={<FontAwesomeIcon icon={faBookOpen} size="2xl" />}
          viewAllAction="/clinician/documents"
          loading={loading}
        />
      </div>

      <div className="mt-10 flex w-full flex-col gap-3 md:h-[870px] xl:flex-row">
        <div className="flex basis-2/3 flex-col rounded-lg bg-white">
          <MyCertificates />
          <MyAnalytics />
        </div>
        <div className="basis-1/4 overflow-auto rounded-lg bg-white">
          <MyPendingItems />
        </div>
        <div className="basis-1/4 overflow-auto rounded-lg bg-white">
          <MyExpiringSoonItems />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(Dashboard, ClinicianGroup);
