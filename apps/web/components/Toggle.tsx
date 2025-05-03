import React from "react";
import { Switch } from "@headlessui/react";
import clsx from "clsx";
import { useController, UseControllerProps } from "react-hook-form";

interface Props extends UseControllerProps<any> {
  label: string | React.ReactNode;
  disabled?: boolean;
  labelClasses?: string;
}

export function Toggle({ label, disabled, labelClasses, ...props }: Props) {
  const { field } = useController(props);

  return (
    <div className="flex items-center">
      <Switch
        disabled={disabled}
        onChange={() => {
          field.onChange(!field.value);
        }}
        value={field.value ? "true" : "false"}
        className={clsx(
          field.value ? "bg-blue-600" : "bg-gray-200",
          "border-transparent relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={clsx(
            field.value ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
      <div
        className={clsx({
          "ml-4 text-xs text-gray-700": !labelClasses,
          [labelClasses as string]: labelClasses,
        })}
      >
        {label}
      </div>
    </div>
  );
}
