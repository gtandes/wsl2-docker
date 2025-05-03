/* eslint-disable @next/next/no-img-element */
import { faCheck } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Combobox as HUICombobox } from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { useRef, useMemo, useState, useCallback } from "react";
import { Control, useController } from "react-hook-form";
import { Tooltip } from "../../utils/Tooltip";
import { Dialog } from "@headlessui/react";

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
  loading?: boolean;
}
interface OptionWithImage {
  image?: { id: string }; // Image is now an object with an `id` field
  [key: string]: any; // Allow any other properties
}

export const CustomCombobox = <T extends OptionWithImage>({
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
  loading = false,
}: Props<T>) => {
  const controller = useController({
    name,
    control,
    defaultValue: multiple ? [] : null,
  });

  const comboboxButtonRef = useRef<HTMLButtonElement>(null);

  const [hoveredOption, setHoveredOption] = useState<T | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleRemove = (val: T) => {
    controller.field.onChange(
      controller.field.value.filter((v: T) => v[by] !== val[by])
    );
  };

  const getImageUrl = (imageId: string | undefined) => {
    if (!imageId) return "";
    return `${window.origin}/cms/assets/${imageId}?width=1480`;
  };

  const openImageModal = (imageId: string | undefined) => {
    setSelectedImageUrl(getImageUrl(imageId));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImageUrl(null);
  };
  const options = useMemo(() => {
    let filteredOptions =
      query === ""
        ? _options
        : _options.filter((o) =>
            getLabel(o).toLowerCase().includes(query.toLowerCase())
          );

    const allOption = { label: "All", value: "" } as unknown as T;
    const allOptionIncluded = filteredOptions.some((o) => o[by] === "");

    if (!allOptionIncluded) {
      filteredOptions = [allOption, ...filteredOptions];
    }

    if (multiple) {
      filteredOptions = filteredOptions
        .filter(
          (o) => !controller.field.value.some((v: any) => v[by] === o[by])
        )
        .concat(controller.field.value);
    } else {
      filteredOptions = filteredOptions
        .filter((o) => o[by] !== controller.field.value?.[by])
        .concat(controller.field.value || []);
    }

    // Sort the filtered options alphabetically based on the label (excluding "All")
    return filteredOptions.sort((a, b) => {
      const labelA = getLabel(a).toLowerCase();
      const labelB = getLabel(b).toLowerCase();

      if (labelA === "all") return -1; // Ensure "All" comes first
      if (labelB === "all") return 1;

      return labelA.localeCompare(labelB);
    });
  }, [query, _options, controller.field.value, multiple, by, getLabel]);

  const handleOptionChange = useCallback(
    (newVal: T) => {
      setQuery("");

      const newValue =
        !multiple && controller.field.value?.[by] === newVal[by]
          ? null
          : multiple
          ? Array.from(
              new Map(
                [...(controller.field.value || []), newVal].map((item) => [
                  item[by],
                  item,
                ])
              ).values()
            )
          : newVal;

      controller.field.onChange(newValue);
      comboboxButtonRef.current?.click();
    },
    [setQuery, controller.field, multiple, by]
  );

  return (
    <HUICombobox
      disabled={disabled}
      as="div"
      {...controller.field}
      onChange={handleOptionChange}
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
          {loading && (
            <div className="flex items-center justify-center py-2">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
              <span className="ml-2 text-gray-700">Loading...</span>
            </div>
          )}
          {options.length === 0 && !loading && (
            <HUICombobox.Option
              value=""
              disabled
              className="relative cursor-default select-none py-2 pl-3 pr-9"
            >
              <span className="block truncate pl-4">No options</span>
            </HUICombobox.Option>
          )}
          {!loading &&
            options.map((option) => (
              <HUICombobox.Option
                key={option[by] as string}
                value={option}
                className={({ active }) =>
                  clsx("relative cursor-default select-none py-2 pl-3 pr-9", {
                    "bg-gray-100": active,
                  })
                }
                onMouseEnter={() => setHoveredOption(option)} // Set hovered option
                onMouseLeave={() => setHoveredOption(null)} // Reset on mouse leave
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
                    <div className="flex items-center">
                      <span
                        className={clsx(
                          "block truncate pl-4",
                          selected && "font-semibold"
                        )}
                      >
                        {getLabel(option)}
                      </span>
                      {hoveredOption?.[by] === option[by] &&
                        option.image?.id && (
                          <img
                            src={getImageUrl(option.image?.id)}
                            alt={getLabel(option)}
                            className="ml-4 h-10 w-10 cursor-pointer object-cover"
                            onClick={() => openImageModal(option.image?.id)}
                          />
                        )}
                    </div>
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

      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        className="fixed inset-0 z-20 overflow-y-auto"
      >
        <div className="min-h-screen px-4 text-center">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-50" />
          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <div className="my-8 inline-block max-h-[90vh] w-full max-w-[90vw] transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
            <img
              src={selectedImageUrl || ""}
              alt="Selected option"
              className="h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      </Dialog>
    </HUICombobox>
  );
};
