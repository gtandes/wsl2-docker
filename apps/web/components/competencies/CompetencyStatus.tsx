import { faCircle0 } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { CompetencyState, ScoreStatus } from "types";

interface Props {
  status: CompetencyState | ScoreStatus | null | undefined;
}

export default function CompetencyStatus({ status }: Props) {
  if (!status) {
    return <></>;
  }

  return (
    <div className="flex items-center gap-1">
      <FontAwesomeIcon
        className={clsx("text-[6px]", {
          "text-yellow-400":
            status === CompetencyState.NOT_STARTED ||
            status === CompetencyState.UNSIGNED ||
            status === CompetencyState.UNREAD ||
            status === CompetencyState.PENDING,
          "text-green-400":
            status === ScoreStatus.PASSED ||
            status === CompetencyState.COMPLETED ||
            status === CompetencyState.READ ||
            status === CompetencyState.FINISHED ||
            status === CompetencyState.SIGNED,
          "text-red-400":
            status === CompetencyState.EXPIRED ||
            status === CompetencyState.FAILED ||
            status === CompetencyState.DUE_DATE_EXPIRED ||
            status === CompetencyState.FAILED_TIMED_OUT ||
            status === CompetencyState.INVALID,
          "text-blue-400":
            status === CompetencyState.IN_PROGRESS ||
            status === CompetencyState.IN_REVIEW,
        })}
        icon={faCircle0}
      />
      <span
        className={clsx("text-xs font-medium leading-none", {
          "text-yellow-800":
            status === CompetencyState.NOT_STARTED ||
            status === CompetencyState.UNSIGNED ||
            status === CompetencyState.UNREAD ||
            status === CompetencyState.PENDING,
          "text-green-800":
            status === ScoreStatus.PASSED ||
            status === CompetencyState.COMPLETED ||
            status === CompetencyState.READ ||
            status === CompetencyState.FINISHED ||
            status === CompetencyState.SIGNED,
          "text-red-800":
            status === CompetencyState.EXPIRED ||
            status === CompetencyState.FAILED ||
            status === CompetencyState.DUE_DATE_EXPIRED ||
            status === CompetencyState.FAILED_TIMED_OUT ||
            status === CompetencyState.INVALID,
          "text-blue-800":
            status === CompetencyState.IN_PROGRESS ||
            status === CompetencyState.IN_REVIEW,
        })}
      >
        {status?.replaceAll("_", " ")}
      </span>
    </div>
  );
}
