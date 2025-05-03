import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  IconDefinition,
  faChevronRight,
} from "@fortawesome/pro-solid-svg-icons";
import clsx from "clsx";

interface Props {
  icon: IconDefinition;
  iconClass?: string;
  color: string;
  title: string;
  description: string;
  action?: () => void;
  classes?: string;
}

export const ExamSummaryItem: React.FC<Props> = ({
  icon,
  iconClass,
  color,
  title,
  description,
  action,
  classes,
}) => {
  return (
    <div className={clsx("m-4 mb-1 border-b-gray-100 pb-4", classes)}>
      <div
        className={clsx(
          "flex flex-row justify-between align-middle",
          action ? "hover:cursor-pointer" : ""
        )}
        onClick={action}
      >
        <div className="flex flex-row items-center">
          <div
            className={`bg-${color}-400 min-h-4 min-w-5 flex max-h-16 rounded-md p-4 ${iconClass}`}
          >
            <FontAwesomeIcon icon={icon} color="white" size="2x" />
          </div>
          <div className="mx-5 my-2">
            <h5 className="text-left font-bold">{title}</h5>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {action && (
          <div className="min-h-4 py-4 pl-4">
            <FontAwesomeIcon icon={faChevronRight} color="#999" />
          </div>
        )}
      </div>
    </div>
  );
};
