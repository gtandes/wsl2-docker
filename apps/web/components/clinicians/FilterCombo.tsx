import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useCallback,
} from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { Combobox } from "@headlessui/react";
import Button from "../Button";
import { faXmark } from "@fortawesome/pro-solid-svg-icons";
import clsx from "clsx";
import { isEmpty, some } from "lodash";
import { Spinner } from "../../components/Spinner";

export type FilterComboOptions = {
  label: string;
  value: string;
};

type FilterComboProps = {
  label?: string;
  placeholder?: string;
  options: FilterComboOptions[];
  filters: FilterComboOptions[];
  filterKey?: "label" | "value";
  disabled?: boolean;
  setFilters: ([]) => void;
  optionId?: string;
  setDebounced?: Dispatch<SetStateAction<string>>;
  loading?: boolean;
};

export const FilterCombo = ({
  label,
  placeholder,
  options,
  filters,
  filterKey = "value",
  disabled = false,
  setFilters,
  optionId,
  setDebounced,
  loading = false,
  ...props
}: FilterComboProps) => {
  const [query, setQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<FilterComboOptions[]>(
    []
  );

  const onComboChange = (e: any) => {
    const filterValues = filters.flatMap((f) => f.value);
    if (!filterValues.includes(e.value)) {
      setFilters([...filters, e]);
    }
  };

  useEffect(() => {
    if (isEmpty(query)) {
      setFilteredOptions(options);
    } else {
      setFilteredOptions(
        options?.filter((f) => {
          return f?.[filterKey].toLowerCase().includes(query.toLowerCase());
        })
      );
    }
    if (setDebounced) {
      setDebounced(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, query]);

  return (
    <>
      <Combobox
        as="div"
        value={filters}
        disabled={disabled || loading}
        onChange={(e) => onComboChange(e)}
        className={`${label ? "mt-5" : ""} flex flex-col`}
      >
        {label && (
          <Combobox.Label className="line-clamp-1 text-sm font-medium leading-6 text-gray-900">
            {label}
          </Combobox.Label>
        )}
        <div className="relative">
          {!loading ? (
            <Combobox.Input
              placeholder={placeholder}
              className={clsx(
                disabled ? "cursor-not-allowed bg-gray-50" : "bg-white",
                "min-w-[100%] rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              )}
              onChange={(event) => setQuery(event.target.value)}
              displayValue={(filter: any) => filter?.label}
              {...props}
            />
          ) : (
            <input
              placeholder={placeholder}
              className="min-w-[100%] cursor-not-allowed rounded-md border-0 bg-gray-50 py-2 pl-3 pr-10 text-gray-400 shadow-sm ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
              disabled
            />
          )}
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
            {loading ? (
              <Spinner />
            ) : (
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
                onClick={() => setQuery("")}
              />
            )}
          </Combobox.Button>
          {filteredOptions?.length > 0 && (
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredOptions.map((f) => (
                <Combobox.Option
                  key={f.value}
                  value={f}
                  className={({ active }) =>
                    clsx(
                      "relative cursor-pointer select-none py-2 pl-3 pr-9",
                      active ? "bg-blue-400 text-white" : "text-gray-900"
                    )
                  }
                >
                  {some(filters, (e) => e.value === f.value) ? (
                    <>
                      <div
                        className="flex items-center gap-2"
                        onClick={() =>
                          setFilters(filters.filter((x) => x.value !== f.value))
                        }
                      >
                        <span className="font-semibold text-blue-500">
                          {f.label}
                        </span>
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      </div>
                    </>
                  ) : (
                    <>{f.label}</>
                  )}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          )}
        </div>
      </Combobox>

      {filters.length > 0 && (
        <div className="mb-4 mt-2 flex flex-wrap gap-2">
          {filters.map((filter: FilterComboOptions) => (
            <Button
              key={filter.value}
              label={filter.label}
              iconRight={faXmark}
              variant="light"
              size="xs"
              onClick={() =>
                setFilters(filters.filter((x) => x.value !== filter.value))
              }
            />
          ))}
          <Button
            label="Clear"
            variant="light-green"
            size="xs"
            onClick={() => setFilters([])}
          />
        </div>
      )}
    </>
  );
};
