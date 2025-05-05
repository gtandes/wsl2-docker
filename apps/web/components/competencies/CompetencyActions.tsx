import { CompetencyState, CompetencyType, DirectusStatus } from "types";
import { Competencies } from "../../types/global";
import EditCompentencyDetails from "./EditCompentencyDetails";
import {
  useUpdateDocumentCompetencyMutation,
  useUpdateExamCompetencyMutation,
  useUpdateModuleCompetencyMutation,
  useUpdatePolicyCompetencyMutation,
  useUpdateSkillChecklistCompetencyMutation,
} from "api";
import { useModal } from "../../hooks/useModal";
import { notify } from "../Notification";
import { CompetenciesActionMenu } from "../CompetenciesActionMenu";
import { ReassignCompetency } from "./ReassignCompetency";
import { useAuth } from "../../hooks/useAuth";
import { UserRole } from "../../types/roles";
import MarkCompetencyAsCompleted from "./MarkCompetencyAsCompleted";
import AttemptHistoryModal from "./AttemptHistoryModal";
import CompetenctLogsModal from "./CompetencyLogsModal";
import { query } from "../../utils/utils";
interface Props {
  competency: Competencies;
  refetch: () => void;
}

export const CompetencyActions = ({ competency, refetch }: Props) => {
  const auth = useAuth();
  const { showConfirm, show } = useModal();
  const [archiveExam] = useUpdateExamCompetencyMutation();
  const [archivePolicy] = useUpdatePolicyCompetencyMutation();
  const [archiveDocument] = useUpdateDocumentCompetencyMutation();
  const [archiveModule] = useUpdateModuleCompetencyMutation();
  const [archiveSkillChecklist] = useUpdateSkillChecklistCompetencyMutation();

  const showEditAndReassignButtons =
    auth.currentUser?.role !== UserRole.UsersManager;
  const showMarkCompetencyAsCompletedButtons =
    competency.type === CompetencyType.MODULE &&
    auth.currentUser?.role === UserRole.HSHAdmin;

  const showViewHistoryButton = competency.type === CompetencyType.EXAM;

  const onEditCompetency = async (
    assignment: Competencies,
    type: CompetencyType
  ) => {
    await show({
      title: `Edit Assignment Details: ${assignment?.name}`,
      children: (onClose) => (
        <EditCompentencyDetails
          assignment={assignment}
          type={type}
          refreshUserAssignments={refetch}
          onClose={onClose}
        />
      ),
    });
  };

  const onRemoveCompetency = async (
    assignmentId?: string,
    type?: CompetencyType
  ) => {
    const confirmed = await showConfirm(
      "Are you sure you want to delete the assignment?"
    );

    if (confirmed && assignmentId && type) {
      const notfication = notify({
        title: "Success!",
        description: "Assignment removed successfully.",
        type: "success",
      });
      const updateValues = {
        variables: {
          id: assignmentId,
          data: {
            status: "archived",
          },
        },
        onCompleted: () => {
          notfication;
          refetch();
        },
      };

      await query(`/cms/assignments/log-archived-competency`, "POST", {
        assignmentId,
        type,
      });

      switch (type) {
        case CompetencyType.EXAM:
          await archiveExam(updateValues);
          break;
        case CompetencyType.POLICY:
          archivePolicy(updateValues);
          break;
        case CompetencyType.DOCUMENT:
          archiveDocument(updateValues);
          break;
        case CompetencyType.MODULE:
          archiveModule(updateValues);
          break;
        case CompetencyType.SKILL_CHECKLIST:
          archiveSkillChecklist(updateValues);
          break;
      }
    }
  };

  const onReassignCompetency = async (assignment: Competencies) => {
    await show({
      title: `Reassign Assignment: ${assignment?.name}`,
      children: (onClose) => (
        <ReassignCompetency
          assignment={assignment}
          refreshUserAssignments={refetch}
          onClose={onClose}
        />
      ),
    });
  };

  const examReassignCondition =
    competency.type === CompetencyType.EXAM &&
    !competency.reassigned &&
    (competency.status === CompetencyState.FAILED ||
      competency.status === CompetencyState.COMPLETED ||
      competency.status === CompetencyState.EXPIRED ||
      competency.status === CompetencyState.DUE_DATE_EXPIRED);
  const moduleReassignCondition =
    competency.type === CompetencyType.MODULE &&
    !competency.reassigned &&
    (competency.status === CompetencyState.FAILED ||
      competency.status === CompetencyState.COMPLETED ||
      competency.status === CompetencyState.EXPIRED ||
      competency.status === CompetencyState.DUE_DATE_EXPIRED);
  const scReassignCondition =
    competency.type === CompetencyType.SKILL_CHECKLIST &&
    !competency.reassigned &&
    (competency.status === CompetencyState.COMPLETED ||
      competency.status === CompetencyState.EXPIRED ||
      competency.status === CompetencyState.DUE_DATE_EXPIRED);
  const documentReassignCondition =
    competency.type === CompetencyType.DOCUMENT &&
    !competency.reassigned &&
    (competency.status === CompetencyState.EXPIRED ||
      competency.status === CompetencyState.READ ||
      competency.status === CompetencyState.DUE_DATE_EXPIRED);
  const policyReassignCondition =
    competency.type === CompetencyType.POLICY &&
    !competency.reassigned &&
    (competency.status === CompetencyState.SIGNED ||
      competency.status === CompetencyState.EXPIRED ||
      competency.status === CompetencyState.DUE_DATE_EXPIRED);

  const editCompetency =
    competency.status === CompetencyState.NOT_STARTED ||
    competency.status === CompetencyState.IN_PROGRESS ||
    competency.status === CompetencyState.PENDING ||
    competency.status === CompetencyState.UNREAD ||
    competency.status === CompetencyState.UNSIGNED
      ? () => onEditCompetency(competency, competency.type!)
      : undefined;

  const reassignCompetency =
    examReassignCondition ||
    moduleReassignCondition ||
    scReassignCondition ||
    documentReassignCondition ||
    policyReassignCondition
      ? () => onReassignCompetency(competency)
      : undefined;

  const markCompetencyAsCompleted = async (
    assignment: Competencies,
    type: CompetencyType
  ) => {
    await show({
      title: `Mark ${assignment?.name} as completed`,
      children: (onClose) => (
        <MarkCompetencyAsCompleted
          assignment={assignment}
          type={type}
          refreshUserAssignments={refetch}
          onClose={onClose}
        />
      ),
    });
  };

  const showHistoryAttempts = (scoreHistory: any, assignment_id: any) => {
    show({
      title: `Exam History`,
      disableClickOutside: true,
      panelClasses: "md:!w-[1000px]",
      children: () => (
        <AttemptHistoryModal
          scoreHistory={scoreHistory}
          assignmentId={assignment_id}
        />
      ),
    });
  };

  const showCompetencyLogs = (assignment_id: any) => {
    show({
      title: `Competency logs`,
      disableClickOutside: true,
      panelClasses: "md:!w-[1000px]",
      children: () => (
        <CompetenctLogsModal
          assignmentId={assignment_id}
          competencyType={competency.type}
        />
      ),
    });
  };

  return (
    <CompetenciesActionMenu
      onViewHistory={
        showViewHistoryButton
          ? () => showHistoryAttempts(competency.score_history, competency.id)
          : undefined
      }
      onViewLogs={() => showCompetencyLogs(competency.id)}
      onDelete={
        competency.status !== DirectusStatus.ARCHIVED
          ? () => onRemoveCompetency(competency.id, competency.type)
          : undefined
      }
      onReassign={showEditAndReassignButtons ? reassignCompetency : undefined}
      onEdit={showEditAndReassignButtons ? editCompetency : undefined}
      markCompetencyAsCompleted={
        showMarkCompetencyAsCompletedButtons
          ? () => markCompetencyAsCompleted(competency, competency.type!)
          : undefined
      }
    />
  );
};
