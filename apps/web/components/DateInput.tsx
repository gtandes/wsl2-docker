import React, { Dispatch, SetStateAction } from "react";

interface Props {
  label: string;
  value?: string;
  min?: string;
  setValue: Dispatch<SetStateAction<string>>;
}
export default function DateInput({
  label,
  value = "",
  min = "",
  setValue,
}: Props) {
  return (
    <div className="mt-5">
      <div>
        <label className="mr-3 text-sm font-medium leading-6 text-gray-900">
          {label}
        </label>
      </div>
      <input
        className="min-w-[100%] rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...(min && { min })}
      />
    </div>
  );
}
