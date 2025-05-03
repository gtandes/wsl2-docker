import React from "react";
import DonutChart, { DonutSlice } from "./DonutChart";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/pro-solid-svg-icons";
import { useRouter } from "next/router";
import { Spinner } from "./Spinner";
import clsx from "clsx";
import Link from "next/link";
import { cn } from "../utils/utils";

export type Slice = {
  label: string;
  count: number;
  colorGrade: string;
  graphColor: string;
};

interface Props {
  title: string;
  slices: Slice[];
  total?: number;
  highlightedCount: number;
  highlightedLabel: string;
  goToUrl?: string;
  mainColor: string;
  loading: boolean;
  classes?: string;
  verticalLegends?: boolean;
}

export const PieChartCard: React.FC<Props> = ({
  title,
  slices,
  total: _total,
  highlightedCount,
  highlightedLabel,
  goToUrl,
  mainColor,
  loading,
  classes,
  verticalLegends,
}) => {
  const router = useRouter();
  const total = _total
    ? _total
    : slices.reduce((acc, slice) => acc + slice.count, 0);
  const donutData: DonutSlice[] = slices.map((slice: Slice, i: number) => {
    return {
      id: i,
      percent: (slice.count * 100) / total || 0,
      color: slice.graphColor,
    };
  });

  const bottomPercentageItem = (
    percent: number,
    label: string,
    color: string
  ) => (
    <div className="flex flex-col items-center justify-center" key={label}>
      <div
        className={`h-9 w-12 rounded-md bg-${color} p-2 text-sm font-semibold text-white`}
      >
        {percent || 0}%
      </div>
      <div
        className="mt-2 whitespace-nowrap font-semibold"
        style={{ fontSize: "10px" }}
      >
        {label}
      </div>
    </div>
  );

  return loading ? (
    <div className="w-[300px] px-28" key={"complicanceCardLoading-" + title}>
      <Spinner
        className={`my-20 h-24 w-24 border-8 border-b-${mainColor}-600 border-l-${mainColor}-400 border-r-${mainColor}-400`}
      />
    </div>
  ) : (
    <div
      className={cn(
        "flex rounded-md bg-white text-center",
        verticalLegends
          ? "w-[300px] flex-row px-4"
          : "h-[315px] w-full flex-col items-center px-4",
        classes
      )}
      key={"complianceCard" + title}
    >
      <div className={cn(verticalLegends ? "-ml-14 block" : "flex flex-col")}>
        <div
          className={clsx(
            "flex justify-between pt-4 font-semibold",
            verticalLegends ? "ml-12" : "w-full px-4"
          )}
        >
          <div>{title}</div>
          {goToUrl && (
            <Link href={goToUrl}>
              <FontAwesomeIcon
                icon={faArrowRight}
                size="xs"
                onClick={() => router.push(goToUrl)}
                href={goToUrl}
                className="hover:cursor-pointer"
              />
            </Link>
          )}
        </div>
        {donutData.length > 0 && (
          <DonutChart
            verticalLegends={verticalLegends}
            viewBox={100}
            radius={25}
            borderSize={8}
            data={
              total > 0
                ? donutData
                : [
                    {
                      id: 0,
                      percent: 100,
                      color: `${mainColor}`,
                    },
                  ]
            }
            label={
              <div className="pt-2">
                <div className="pt-1 text-3xl font-bold">
                  {Math.round((highlightedCount * 100) / total) || 0}%
                </div>
                <div className="text-md -mt-2 font-normal">
                  {highlightedLabel}
                </div>
              </div>
            }
          />
        )}
      </div>
      <div
        className={cn(
          "flex w-full justify-center",
          verticalLegends
            ? "ml-12 mt-0 h-[259px] w-[100px] flex-col flex-wrap justify-items-start gap-2"
            : "mt-[75px] flex-row gap-2"
        )}
      >
        {slices.map((slice) =>
          bottomPercentageItem(
            Math.round((slice.count * 100) / total),
            slice.label,
            slice.colorGrade
              ? mainColor + "-" + slice.colorGrade
              : slice.graphColor + "-200"
          )
        )}
      </div>
    </div>
  );
};
