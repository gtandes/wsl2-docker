import React, { SelectHTMLAttributes } from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import clsx from "clsx";

export type SelectOption = {
  label: string;
  value: string | number | undefined;
  selected?: boolean;
};

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  register?: UseFormRegisterReturn<any>;
  error?: FieldError;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  classes?: string;
  selectSize?: string;
}

export default function Select({
  label,
  options,
  register,
  required,
  error,
  classes,
  selectSize,
  ...props
}: Props) {
  return (
    <div className={clsx("w-full", classes)}>
      {label && (
        <label htmlFor={label} className="block text-xs text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={options.find((option) => option.selected)?.value}
        id={label}
        className={clsx(
          "mt-1 block cursor-pointer rounded-md border-0 px-2 py-1.5 text-xs text-gray-900 ring-1 ring-inset ring-gray-300 " +
            "placeholder:text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:bg-white " +
            "file:rounded file:border-none file:bg-blue-100 file:px-2 file:text-xs disabled:text-gray-400 sm:text-sm sm:leading-6",
          error && "ring-red-300",
          selectSize ? selectSize : "w-full"
        )}
        {...register}
        {...(error && { "aria-invalid": true })}
        {...props}
      >
        {options.map((option) => (
          <option
            key={`option-${option.value}`}
            value={option.value}
            className="text-xs"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-xs text-red-500">{error?.message}</p>}
    </div>
  );
}
