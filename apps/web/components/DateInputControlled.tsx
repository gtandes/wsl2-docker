import React from "react";
import {
  FieldError,
  FieldErrorsImpl,
  Merge,
  UseFormRegisterReturn,
} from "react-hook-form";

interface Props {
  label: string;
  register: UseFormRegisterReturn<any>;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  min?: string;
}
export default function DateInputControlled({
  label,
  register,
  error,
  min = "",
}: Props) {
  return (
    <div className="relative">
      <label
        htmlFor={register.name}
        className="text-gray-70 mb-1 block text-xs"
      >
        {label}
      </label>
      <input
        className="min-w-[100%] rounded-md border-0 bg-white py-1.5 pl-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        type="date"
        {...register}
        {...(min && { min })}
        onKeyDown={(e) => e.preventDefault()}
      />
      {error && (
        <p className="absolute mt-1 text-xs text-red-500">
          {error?.message?.toString()}
        </p>
      )}
    </div>
  );
}
