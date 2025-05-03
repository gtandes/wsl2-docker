import React from "react";
import Button from "./Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition, faArrowLeft } from "@fortawesome/pro-solid-svg-icons";

interface Props {
  icon: IconDefinition;
  color: string;
  title: string;
  category: string;
  backButtonLabel?: string;
  backButtonAction?: () => void;
}

export const SpecialtyHeader: React.FC<Props> = ({
  icon,
  title,
  color,
  backButtonLabel,
  backButtonAction,
  category,
}) => {
  return (
    <div className="mt-8 flex flex-grow items-center justify-between">
      <div className="flex flex-row items-center">
        <div
          className={`mr-6 flex h-16 w-16 items-center justify-center rounded-md bg-${color}-200`}
        >
          <FontAwesomeIcon
            icon={icon}
            size="2x"
            className={`text-${color}-400`}
          />
        </div>
        <div>
          <p className={`text-md font-medium text-${color}-400`}>{category}</p>
          <h1 className="mt-2 text-3xl font-medium">{title}</h1>
        </div>
      </div>
      {backButtonLabel && (
        <Button
          iconLeft={faArrowLeft}
          label={backButtonLabel}
          variant="light"
          onClick={backButtonAction}
        />
      )}
    </div>
  );
};
