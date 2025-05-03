import { SkillChecklistQuestionsForm } from "../../../../components/skills-checklists/SkillChecklistQuestionsForm";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";

function Questions() {
  return <SkillChecklistQuestionsForm />;
}

export default withAuth(Questions, AdminGroup);
