import { Control } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import {
  DocumentNode,
  OperationVariables,
  TypedDocumentNode,
  useQuery,
  WatchQueryFetchPolicy,
} from "@apollo/client";

import { Combobox } from "./Combobox";
import { useDebounce } from "usehooks-ts";
import { COMBOBOX_RESULTS_AMOUNT } from "../types/global";
import { DirectusStatus } from "types";

interface Props<T> {
  name: string;
  label: string;
  placeholder?: string;
  query: DocumentNode | TypedDocumentNode<any, OperationVariables>;
  control: Control<any>;
  filter: Object;
  dataKey: string;
  getLabel: (c: T) => string;
  refetchQuery?: boolean;
  disabled?: boolean;
  showTooltip?: boolean;
  getTooltipContent?: (val: T) => React.ReactNode;
  resultsLimit?: number;
  fetchPolicy?: WatchQueryFetchPolicy;
  excludedIds?: string[];
}

export default function QueryCombobox<T extends Object>({
  name,
  label,
  placeholder,
  query,
  control,
  filter,
  dataKey,
  getLabel,
  refetchQuery = false,
  disabled = false,
  showTooltip = false,
  getTooltipContent = () => "",
  resultsLimit = COMBOBOX_RESULTS_AMOUNT,
  fetchPolicy = "network-only",
  excludedIds, // optional array of ids to exclude from the options
}: Props<T>) {
  const [search, setSearch] = useState<string>("");
  const debouncedSearchQuery = useDebounce(search, 400);
  const { data, refetch } = useQuery(query, {
    variables: {
      limit: resultsLimit,
      search: debouncedSearchQuery,
      filter,
    },
    fetchPolicy,
  });

  // filter out excluded ids from the data if provided
  const filteredData = useMemo(() => {
    if (!data) return {};

    if (excludedIds) {
      return {
        [dataKey]: data[dataKey].filter(
          (item: T) => !excludedIds.includes((item as any).id)
        ),
      };
    }

    return data;
  }, [data, dataKey, excludedIds]);

  useEffect(() => {
    if (refetchQuery) {
      refetch();
    }
  }, [refetchQuery]);

  return (
    <Combobox<T>
      name={name}
      control={control}
      label={label}
      options={filteredData?.[dataKey] || []}
      disabled={disabled}
      multiple
      query={search}
      setQuery={setSearch}
      getLabel={getLabel}
      by={"id" as keyof T}
      displaySelectedValues
      placeholder={placeholder}
      showTooltip={showTooltip}
      getTooltipContent={getTooltipContent}
    />
  );
}
