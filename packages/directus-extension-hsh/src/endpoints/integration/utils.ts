import { CompetencyState } from "types";

export const validateCredentials = (req: any) => {
  const { client_id, client_secret, client_username, client_password, agency_id } = req.body;
  return client_id && client_secret && client_username && client_password && agency_id;
};

export const computeStatusSummary = (skillsChecklist: any[]) => {
  if (skillsChecklist.length === 0) return "Not Started";

  const allCompleted = skillsChecklist.every((item) => item.status === CompetencyState.COMPLETED);
  const hasPending = skillsChecklist.some(
    (item) => item.status === CompetencyState.PENDING || item.status === CompetencyState.NOT_STARTED,
  );
  const allExpiredOrCompleted = skillsChecklist.every(
    (item) => item.status === CompetencyState.COMPLETED || item.status === CompetencyState.DUE_DATE_EXPIRED,
  );
  const hasCompleted = skillsChecklist.some((item) => item.status === CompetencyState.COMPLETED);

  if (allCompleted) return "Completed";
  if (hasPending) return "In Progress";
  if (allExpiredOrCompleted && hasCompleted) return "Completed";

  return "In Progress";
};
