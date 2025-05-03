import { faMagnifyingGlass } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

interface Props {
  onChange: (value: string) => void;
  placeholder?: string;
  inputId?: string;
}

export const SearchInput: React.FC<Props> = ({
  onChange,
  placeholder = "Search...",
  inputId,
}) => {
  return (
    <div className="relative flex items-center">
      <input
        id={inputId}
        type="text"
        className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="absolute right-3"
        color="gray"
      />
    </div>
  );
};
