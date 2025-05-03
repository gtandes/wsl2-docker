import { UserExamsFragment } from "api";
import { CompetencyState } from "types";
import { Timer } from "../Timer";
import ExamTimer from "./ExamTimer";

interface Props {
  exam: UserExamsFragment;
  onTimeUp: () => void;
  isExamCompleted: boolean;
}

export const ExamResumeTimer: React.FC<Props> = ({
  exam,
  onTimeUp,
  isExamCompleted,
}) => {
  const handleOnTimeUp = () => {
    onTimeUp();
  };
  if (exam.status === CompetencyState.IN_PROGRESS && exam.attempt_due) {
    return <Timer due={exam.attempt_due as Date} onTimeUp={handleOnTimeUp} />;
  }
  return null;
};
