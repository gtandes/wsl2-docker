import React from "react";
import {
  Junction_Directus_Users_Exams_Filter,
  useGetUserExamsAverageAttemptsQuery,
  useGetUserExamsByStatusReportsQuery,
} from "api";
import SemiCircleProgressBar from "react-progressbar-semicircle";
import { ExamAnaliticCard } from "../../../clinicians/ExamAnaliticCard";
import { startCase, first } from "lodash";
import { CompetencyState } from "types";
import { valueHumanReadable } from "../../../../utils/utils";

const getCountAnalyticCard = (
  title: string,
  value: number,
  total: number,
  textColor: string,
  graphColor: string
) => (
  <div className="flex flex-col">
    <ExamAnaliticCard
      title={<span className="mt-2 text-sm">{startCase(title)}</span>}
    >
      {/*// TODO fix: make cards use the whole space and adapt the semicircle*/}
      {/*// TODO: make human readable number when over 1000s: 1k, 2k, 3k, etc.*/}
      <div className="relative flex flex-col items-center justify-center">
        <SemiCircleProgressBar
          percentage={(value * 100) / total}
          strokeWidth={15}
          stroke={graphColor}
          diameter={180}
        />
        <div className="absolute bottom-0">
          <span className={`mt-4 text-xl font-extrabold text-${textColor}-500`}>
            {valueHumanReadable(value)}/{valueHumanReadable(total)}
          </span>
        </div>
      </div>
    </ExamAnaliticCard>
    <div
      className={`text-${textColor}-500 text-center text-2xl font-extrabold`}
    >
      {Math.round((value * 100) / total) || 0} %
    </div>
  </div>
);

interface Props {
  filters: Junction_Directus_Users_Exams_Filter;
}

export const AnalyticsExamsReports: React.FC<Props> = ({ filters }) => {
  const { data: averagesResponse } = useGetUserExamsAverageAttemptsQuery({
    variables: {
      filter: filters,
    },
    skip: !Object.keys(filters).length,
  });

  const { data: countStatusResponse } = useGetUserExamsByStatusReportsQuery({
    variables: {
      notStartedfilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.NOT_STARTED],
            },
          },
          filters,
        ],
      },

      passedFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.COMPLETED],
            },
          },
          filters,
        ],
      },

      failedFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.FAILED],
            },
          },
          filters,
        ],
      },

      inProgressFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.IN_PROGRESS],
            },
          },
          filters,
        ],
      },

      inReviewFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.IN_REVIEW],
            },
          },
          filters,
        ],
      },

      invalidFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.INVALID],
            },
          },
          filters,
        ],
      },

      expiredFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.EXPIRED],
            },
          },
          filters,
        ],
      },
      totalFilters: filters,
    },
    skip: !Object.keys(filters).length,
  });

  const averages = first(
    averagesResponse?.junction_directus_users_exams_aggregated
  )?.avg;

  const toDo = first(countStatusResponse?.notStarted)?.count?.status || 0;
  const passed = first(countStatusResponse?.passed)?.count?.status || 0;
  const failed = first(countStatusResponse?.failed)?.count?.status || 0;
  const inProgress = first(countStatusResponse?.inProgress)?.count?.status || 0;
  const inReview = first(countStatusResponse?.inReview)?.count?.status || 0;
  const invalid = first(countStatusResponse?.invalid)?.count?.status || 0;

  const expired = first(countStatusResponse?.expired)?.count?.status || 0;
  const total = first(countStatusResponse?.total)?.count?.status || 0;

  return (
    <>
      {total > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {getCountAnalyticCard(
            "Not Started",
            toDo,
            total,
            "blue",
            "rgb(69, 138, 236)"
          )}
          {getCountAnalyticCard(
            "In Progress",
            inProgress,
            total,
            "yellow",
            "rgb(217, 181, 64)"
          )}
          {getCountAnalyticCard(
            "Proctoring Review",
            inReview,
            total,
            "blue",
            "rgb(217, 181, 64)"
          )}
          {getCountAnalyticCard("Invalid", invalid, total, "red", "#E66A48")}
          {getCountAnalyticCard(
            "Passed",
            passed,
            total,
            "green",
            "rgb(18, 183, 119)"
          )}
          {getCountAnalyticCard("Failed", failed, total, "red", "#E66A48")}
          {getCountAnalyticCard(
            "Expired",
            expired,
            total,
            "gray",
            "rgb(102, 102, 102)"
          )}
          <ExamAnaliticCard
            title={<span className="mt-2 text-sm">Average Score</span>}
          >
            <div className="flex flex-col items-center justify-center">
              <SemiCircleProgressBar
                percentage={averages?.score || 0}
                strokeWidth={15}
                stroke="rgb(163, 181, 214)"
                diameter={160}
              />
              <span
                className={`-mt-8 text-3xl font-extrabold text-dark-blue-300`}
              >
                {averages?.score?.toFixed() || 0} %
              </span>
            </div>
          </ExamAnaliticCard>
        </div>
      ) : (
        <div className="h-16 text-center">
          <p>It looks like there&apos;s no data to display at the moment.</p>
        </div>
      )}
    </>
  );
};
