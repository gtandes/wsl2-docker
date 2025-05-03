import React from "react";
import { Tooltip } from "../components/utils/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle } from "@fortawesome/pro-solid-svg-icons";

interface Props {}

export const FilterComboInfoTooltip: React.FC<Props> = () => {
  return (
    <Tooltip
      content={
        <div className="w-36 rounded bg-black/60 p-3 text-xs text-white md:ml-40 md:w-96">
          <b>Search and Select:</b>
          <div className="mt-2">
            Start typing to find your options in the dropdown menu. <br />
            You can select multiple options!
          </div>
        </div>
      }
      showArrow
      placement="top"
      offset={10}
      arrowOptions={{ fill: "rgb(100,100,100)" }}
    >
      <FontAwesomeIcon
        icon={faQuestionCircle}
        className="cursor-pointer text-gray-400"
      />
    </Tooltip>
  );
};
