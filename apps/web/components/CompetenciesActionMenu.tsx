import { faEllipsis } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { PopOver, PopOverItem } from "./PopOver";

interface Props {
  onDelete: () => void;
  onEdit?: () => void;
  onReassign?: () => void;
  markCompetencyAsCompleted?: () => void;
  onViewHistory?: () => void;
  onViewLogs?: () => void;
}

export const CompetenciesActionMenu: React.FC<Props> = ({
  onDelete,
  onEdit,
  onReassign,
  markCompetencyAsCompleted,
  onViewHistory,
  onViewLogs,
}) => {
  return (
    <PopOver button={<FontAwesomeIcon icon={faEllipsis} />}>
      {onViewHistory && (
        <PopOverItem onClick={() => onViewHistory()}>Exam History</PopOverItem>
      )}
      {onViewLogs && (
        <PopOverItem onClick={() => onViewLogs()}>Logs</PopOverItem>
      )}
      {onEdit && <PopOverItem onClick={() => onEdit()}>Edit</PopOverItem>}
      {onReassign && (
        <PopOverItem onClick={() => onReassign()}>Reassign</PopOverItem>
      )}
      {markCompetencyAsCompleted && (
        <PopOverItem onClick={() => markCompetencyAsCompleted()}>
          Mark as completed
        </PopOverItem>
      )}
      <PopOverItem onClick={() => onDelete()}>Remove</PopOverItem>
    </PopOver>
  );
};
