import React from "react";
import PercentageGraph from "../PercentageGraph";
import { PieChartCard, Slice } from "../../../PieChartCard";
import { capitalize, countBy, first } from "lodash";
import { UserReportItemType } from "./UserDetailsReportList";
import { AnalyticsTabs } from "../../../AnalyticsTabs";
import { GetUserDetailsAvgQuery } from "api";
import { CompetencyState } from "types";
import { FilterComboOptions } from "../../../clinicians/FilterCombo";

interface Props {
  loading: boolean;
  hasFilters: number;
  examsFilters: FilterComboOptions[];
  modulesFilters: FilterComboOptions[];
  dataItems: UserReportItemType[];
  averages?: GetUserDetailsAvgQuery;
}

const getColor = (c: string) => {
  switch (c) {
    case CompetencyState.COMPLETED:
      return "green";
    case CompetencyState.FAILED:
      return "red";
    case CompetencyState.SIGNED:
      return "yellow";
    case CompetencyState.NOT_STARTED:
      return "teal";
    case CompetencyState.IN_PROGRESS:
      return "blue";
    case CompetencyState.PENDING:
      return "gray";
    default:
      return "gray";
  }
};

export default function AnalyticsUserDetailsReports({
  loading,
  hasFilters,
  examsFilters,
  modulesFilters,
  dataItems,
  averages,
}: Props) {
  const dataByStatus = countBy(dataItems, "status");

  const statusSlices = Object.keys(dataByStatus).map(
    (k: string, i: number): Slice => {
      return {
        label: capitalize(k.replaceAll("_", " ")),
        count: dataByStatus[k] || 0,
        colorGrade: "",
        graphColor: getColor(k),
      };
    }
  );

  const examsAverages = first(averages?.exams)?.avg;
  const moduleAverages = first(averages?.modules)?.avg;

  const hasExamsOptions =
    !hasFilters || (hasFilters && examsFilters.length > 0);
  const hasModulesOptions =
    !hasFilters || (hasFilters && modulesFilters.length > 0);

  const scoreOptions = [];
  const attemptsOptions = [];

  if (hasExamsOptions) {
    scoreOptions.push({
      id: 0,
      label: "Exams",
      content: (
        <PercentageGraph
          percentage={
            examsAverages?.score! > 100 ? 100 : examsAverages?.score || 0
          }
          color="rgb(18, 183, 119)"
          title="Average Score"
          showPerecentage={true}
          maxWidth="160"
          noMargin
        />
      ),
    });
    attemptsOptions.push({
      id: 0,
      label: "Exams",
      content: (
        <PercentageGraph
          percentage={
            examsAverages?.attempts_used! > 100
              ? 100
              : examsAverages?.attempts_used || 0
          }
          color="rgb(217, 181, 64)"
          title="Average Attempts"
          showPerecentage={true}
          maxWidth="160"
          noMargin
        />
      ),
    });
  }

  if (hasModulesOptions) {
    scoreOptions.push({
      id: 1,
      label: "Modules",
      content: (
        <PercentageGraph
          percentage={
            examsAverages?.score! > 100 ? 100 : moduleAverages?.score!
          }
          color="rgb(69, 138, 236)"
          title="Average Score"
          showPerecentage={true}
          maxWidth="160"
          noMargin
        />
      ),
    });
    attemptsOptions.push({
      id: 1,
      label: "Modules",
      content: (
        <PercentageGraph
          percentage={
            examsAverages?.attempts_used! > 100
              ? 100
              : moduleAverages?.attempts_used!
          }
          color="rgb(248, 96, 59)"
          title="Average Attempts"
          showPerecentage={true}
          maxWidth="160"
          noMargin
        />
      ),
    });
  }

  return (
    <div className="mt-4 flex flex-col justify-center text-center print:flex-row xl:flex-row">
      {statusSlices.length > 0 ? (
        <>
          <PieChartCard
            loading={loading}
            mainColor="green"
            title="Overall Status"
            slices={statusSlices}
            highlightedCount={
              statusSlices.filter((slice) => slice.label === "Completed")[0]
                ?.count || 0
            }
            highlightedLabel="Completed"
            verticalLegends={true}
            classes="bg-white w-full justify-center"
          />
          <div className="flex w-full justify-center">
            <AnalyticsTabs loading={loading} tabs={scoreOptions} />
          </div>
          <div className="flex w-full justify-center">
            <AnalyticsTabs loading={loading} tabs={attemptsOptions} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center">
          It looks like there is no data to display at the moment
        </div>
      )}
    </div>
  );
}
