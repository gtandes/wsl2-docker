import React from "react";

interface Props {
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
}
export const SelectFilter: React.FC<Props> = ({ options, onChange }) => {
  return (
    <select
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 shadow-sm"
    >
      {options.map((option, optionIdx) => (
        <option key={optionIdx} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
