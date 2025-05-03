import React from "react";
import { ProgressBar } from "../ProgressBar";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/pro-solid-svg-icons";
import Link from "next/link";
import { Spinner } from "../Spinner";

interface Props {
  type: string;
  completed: number | undefined;
  total: number | undefined;
  icon: React.ReactNode;
  color: string;
  viewAllAction: string;
  loading: boolean;
}

export const CompetencyCard: React.FC<Props> = ({
  type,
  completed,
  total,
  icon,
  color,
  viewAllAction,
  loading,
}) => {
  return (
    <Link className="font-semibold text-black" href={viewAllAction}>
      <div className="grid">
        <div className="flex items-start gap-2 rounded-t border border-gray-100 bg-white p-3 shadow-sm">
          <div
            className={clsx(
              "flex h-16 w-16 items-center justify-center rounded-md text-white",
              `bg-${color}-500`
            )}
          >
            {icon}
          </div>
          <div className="h-[80px] lg:h-[100px]">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <div className="w-full text-xl font-bold text-gray-900">
                  {type}
                </div>
                <p className="mb-2 font-normal text-gray-400">
                  {completed}/{total} Completed
                </p>
                <ProgressBar
                  percentage={((completed || 0) * 100) / (total || 0)}
                  color={color}
                />
              </>
            )}
          </div>
        </div>
        <div className="rounded-b border border-gray-100 bg-gray-50 p-2 text-black shadow-sm">
          View all
        </div>
      </div>
    </Link>
  );
};
