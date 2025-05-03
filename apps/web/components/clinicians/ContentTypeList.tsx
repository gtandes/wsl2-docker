import React from "react";
import { faFileMagnifyingGlass } from "@fortawesome/pro-light-svg-icons";
import { clsx } from "clsx";
import { Spinner } from "../Spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  filters: React.ReactNode;
  loading: boolean;
  content: React.ReactNode;
  totalItems?: number;
}

export const ContentTypeList: React.FC<Props> = ({
  filters,
  loading,
  content,
  totalItems,
}) => {
  return (
    <div className="flex w-full flex-col">
      <div className="mt-2 grid gap-4 lg:grid-cols-[300px_minmax(0,_1fr)]">
        <div className="rounded-md bg-white p-3 pb-6 shadow">{filters}</div>
        <div
          className={clsx(
            "grid rounded-md bg-white p-3 shadow md:auto-rows-fr md:p-8"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <Spinner />
            </div>
          ) : !loading && content && totalItems! > 0 ? (
            content
          ) : (
            <div className="flex flex-col items-center justify-center py-10 font-medium text-gray-500">
              <FontAwesomeIcon icon={faFileMagnifyingGlass} size="3x" />
              <p className="mt-2">No results found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
