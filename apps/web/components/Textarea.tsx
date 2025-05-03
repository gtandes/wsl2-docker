import React from "react";
import {
  FieldError,
  FieldErrors,
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form";
import { faCircleExclamation } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

interface Props extends React.HTMLProps<HTMLTextAreaElement> {
  label?: string;
  register: UseFormRegisterReturn<any>;
  error?: FieldError;
  maxLength?: number;
  classes?: string;
}

export const Textarea: React.FC<Props> = ({
  error,
  label,
  register,
  required,
  maxLength = 1500,
  classes,
  ...props
}) => {
  return (
    <div className={classes}>
      {label && (
        <label htmlFor={register.name} className="block text-xs text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative mt-1 rounded-md">
        <textarea
          className={clsx(
            "focus:ring-indigo-600 block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:text-gray-400 sm:text-sm sm:leading-6",
            error && "ring-red-300"
          )}
          {...props}
          {...register}
          {...(error && { "aria-invalid": true })}
          maxLength={maxLength}
        />
        {error && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <FontAwesomeIcon
              icon={faCircleExclamation}
              className="ml-2 text-red-500"
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">{error?.message}</p>
    </div>
  );
};
