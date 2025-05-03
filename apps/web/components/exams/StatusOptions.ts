import { CompetencyState } from "types";

export const statusOptions = [
  {
    label: "Not Started",
    value: CompetencyState.NOT_STARTED,
  },
  {
    label: "In Progress",
    value: CompetencyState.IN_PROGRESS,
  },
  {
    label: "Failed",
    value: CompetencyState.FAILED,
  },
  {
    label: "Expired",
    value: CompetencyState.EXPIRED,
  },
  {
    label: "Due date Expired",
    value: CompetencyState.DUE_DATE_EXPIRED,
  },
  {
    label: "Completed",
    value: CompetencyState.COMPLETED,
  },
  {
    label: "Proctoring Review",
    value: CompetencyState.IN_REVIEW,
  },
  {
    label: "Invalid",
    value: CompetencyState.INVALID,
  },
  {
    label: "Failed Timed Out",
    value: CompetencyState.FAILED_TIMED_OUT,
  },
];
