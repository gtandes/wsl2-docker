import React from "react";
import {
  FieldError,
  FieldErrorsImpl,
  Merge,
  UseFormRegisterReturn,
} from "react-hook-form";
import { faCircleExclamation } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  register: UseFormRegisterReturn<any>;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
  classes?: string;
  maxLength?: number;
  leftComponent?: React.ReactNode;
}

export const Input: React.FC<Props> = ({
  error,
  label,
  register,
  required,
  classes,
  maxLength = 255,
  leftComponent,
  ...props
}: Props) => {
  return (
    <div className={clsx("relative w-full", classes)}>
      {label && (
        <label htmlFor={register.name} className="block text-xs text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative mt-1 flex items-center gap-3 rounded-md">
        {leftComponent}
        <input
          id={label}
          className={clsx(
            "block w-full rounded-md border-0 px-2 py-1.5 text-xs text-gray-900 ring-1 ring-inset ring-gray-300 " +
              "placeholder:text-xs placeholder:text-gray-400 read-only:bg-gray-50 focus:ring-2 focus:ring-inset disabled:bg-gray-50 " +
              "file:rounded file:border-none file:bg-blue-100 file:px-2 file:text-xs disabled:text-gray-400 sm:text-sm sm:leading-6",
            error && "ring-red-300"
          )}
          {...props}
          {...register}
          {...(error && { "aria-invalid": true })}
          maxLength={maxLength}
        />
        {error && props.type !== "date" && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <FontAwesomeIcon
              icon={faCircleExclamation}
              className="ml-2 text-red-500"
            />
          </div>
        )}
      </div>
      {error && (
        <p className="absolute mt-1 text-xs text-red-500">
          {error?.message?.toString()}
        </p>
      )}
    </div>
  );
};
