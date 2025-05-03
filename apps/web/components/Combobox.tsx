import { faCheck } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Combobox as HUICombobox } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { useRef } from "react";
import { Control, useController } from "react-hook-form";
import { Tooltip } from "./utils/Tooltip";

interface Props<T> {
  options: T[];
  label?: string;
  control: Control<any>;
  name: string;
  multiple?: boolean;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  getLabel: (val: T) => string;
  by: keyof T;
  displaySelectedValues?: boolean;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  showTooltip?: boolean;
  getTooltipContent?: (val: T) => React.ReactNode;
}

export const Combobox = <T extends Object>({
  options: _options,
  label,
  control,
  name,
  query,
  setQuery,
  getLabel,
  by,
  className,
  placeholder,
  multiple = false,
  required = false,
  displaySelectedValues = false,
  disabled = false,
  showTooltip = false,
  getTooltipContent = () => "",
}: Props<T>) => {
  const controller = useController({
    name,
    control,
    defaultValue: multiple ? [] : null,
  });

  const comboboxButtonRef = useRef<HTMLButtonElement>(null);

  const handleRemove = (val: T) => {
    const newVals = controller.field.value.filter((v: T) => v[by] !== val[by]);
    controller.field.onChange(newVals);
  };

  const options =
    query === ""
      ? multiple
        ? _options
            .filter(
              (o) => !controller.field.value?.some((v: any) => v[by] === o[by])
            )
            .concat(...(controller.field.value || []))
        : _options
            .filter((o) => o[by] !== controller.field.value?.[by])
            .concat(controller.field.value || [])
      : _options;

  return (
    <HUICombobox
      disabled={disabled}
      as="div"
      {...controller.field}
      onChange={(newVal: T) => {
        setQuery("");

        if (!multiple && controller.field.value?.[by] === newVal[by]) {
          controller.field.onChange(null);
        } else {
          const uniqueValues =
            newVal instanceof Array
              ? newVal.reduce((accumulator: T[], current: T) => {
                  let exists = accumulator.find((item: T) => {
                    return item[by] === current[by];
                  });
                  if (!exists) {
                    accumulator = accumulator.concat(current);
                  }
                  return accumulator;
                }, [])
              : newVal;
          controller.field.onChange(uniqueValues);
        }

        comboboxButtonRef.current?.click(); // TODO search if there is a better way to close the dropdown
      }}
      multiple={multiple as any}
      className="w-full"
    >
      {label && (
        <HUICombobox.Label className="mb-1 block text-xs text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </HUICombobox.Label>
      )}
      <div className="relative">
        <HUICombobox.Input
          placeholder={placeholder}
          className={
            className
              ? className
              : "focus:ring-indigo-600 w-full rounded-md border-0 bg-white py-0.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset disabled:bg-gray-50 disabled:text-gray-400 sm:py-1.5 sm:text-sm sm:leading-6" +
                (controller.fieldState.error ? " ring-red-300" : "")
          }
          onChange={(event) => setQuery(event.target.value.trim())}
          displayValue={(option: T) => {
            if (multiple) return "";
            return getLabel(option);
          }}
        />
        <HUICombobox.Button
          ref={comboboxButtonRef}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none"
        >
          <ChevronUpDownIcon
            className="h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </HUICombobox.Button>

        <HUICombobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {options.length === 0 && (
            <HUICombobox.Option
              value=""
              disabled
              className="relative cursor-default select-none py-2 pl-3 pr-9"
            >
              <span className="block truncate pl-4">No options</span>
            </HUICombobox.Option>
          )}
          {options.map((option) => (
            <HUICombobox.Option
              key={option[by] as string}
              value={option}
              className={({ active }) =>
                clsx("relative cursor-default select-none py-2 pl-3 pr-9", {
                  "bg-gray-100": active,
                })
              }
            >
              {({ selected }) => (
                <Tooltip
                  showArrow
                  enabled={showTooltip}
                  content={getTooltipContent(option)}
                >
                  {selected && (
                    <span
                      className={clsx(
                        "absolute inset-y-0 left-2 flex items-center pr-4 text-blue-600"
                      )}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </span>
                  )}
                  <span
                    className={clsx(
                      "block truncate pl-4",
                      selected && "font-semibold"
                    )}
                  >
                    {getLabel(option)}
                  </span>
                </Tooltip>
              )}
            </HUICombobox.Option>
          ))}
        </HUICombobox.Options>
      </div>
      {controller.fieldState.error && (
        <p className="mt-2 text-xs text-red-500">
          {controller.fieldState.error.message}
        </p>
      )}
      {displaySelectedValues && multiple && (
        <ul className="mt-1 flex flex-wrap gap-1">
          {controller.field.value?.map((val: T) => (
            <li key={val[by] as string}>
              <span className="inline-flex items-center gap-x-0.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {getLabel(val)}
                <button
                  type="button"
                  className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-blue-600/20"
                  onClick={() => handleRemove(val)}
                >
                  <span className="sr-only">Remove</span>
                  <svg
                    viewBox="0 0 14 14"
                    className="h-3.5 w-3.5 stroke-blue-700/50 group-hover:stroke-blue-700/75"
                  >
                    <path d="M4 4l6 6m0-6l-6 6" />
                  </svg>
                  <span className="absolute -inset-1" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </HUICombobox>
  );
};
