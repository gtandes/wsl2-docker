import {
  Junction_Modules_Definition_Directus_Users_Filter,
  useGetModulesAverageScoreQuery,
  useGetModulesReportByStatusQuery,
} from "api";
import { first, startCase } from "lodash";
import { ExamAnaliticCard } from "../../../clinicians/ExamAnaliticCard";
import SemiCircleProgressBar from "react-progressbar-semicircle";
import { CompetencyState } from "types";

export const ModuleReportAnalytics: React.FC<{
  filters?: Junction_Modules_Definition_Directus_Users_Filter;
}> = ({ filters = {} }) => {
  const modulesAverageScoreQuery = useGetModulesAverageScoreQuery({
    variables: {
      filter: {
        ...filters,
        status: {
          _in: [CompetencyState.FINISHED],
        },
      },
    },
  });

  const modulesByStatusQuery = useGetModulesReportByStatusQuery({
    variables: {
      notStartedfilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.PENDING],
            },
          },
          filters,
        ],
      },

      passedFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.FINISHED],
            },
            approved: {
              _eq: true,
            },
          },
          filters,
        ],
      },

      failedFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.FINISHED],
            },
            approved: {
              _eq: false,
            },
          },
          filters,
        ],
      },
      inProgressFilters: {
        _and: [
          {
            status: {
              _in: [CompetencyState.STARTED],
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
  });

  const averages = first(
    modulesAverageScoreQuery.data
      ?.junction_modules_definition_directus_users_aggregated
  )?.avg;

  const notStarted =
    first(modulesByStatusQuery.data?.notStarted)?.count?.status || 0;
  const passed = first(modulesByStatusQuery.data?.passed)?.count?.status || 0;
  const failed = first(modulesByStatusQuery.data?.failed)?.count?.status || 0;
  const inProgress =
    first(modulesByStatusQuery.data?.inProgress)?.count?.status || 0;
  const expired = first(modulesByStatusQuery.data?.expired)?.count?.status || 0;
  const total = first(modulesByStatusQuery.data?.total)?.count?.status || 0;

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
        <div className="flex flex-col items-center justify-center">
          <SemiCircleProgressBar
            percentage={(value * 100) / total}
            strokeWidth={15}
            stroke={graphColor}
            diameter={160}
          />
          <span
            className={`-mt-8 text-3xl font-extrabold text-${textColor}-500`}
          >
            {value}/{total}
          </span>
        </div>
      </ExamAnaliticCard>
      <div
        className={`text-${textColor}-500 mb-2 text-center text-2xl font-extrabold`}
      >
        {Math.round((value * 100) / total) || 0} %
      </div>
    </div>
  );

  return (
    <>
      {total > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center">
          {getCountAnalyticCard(
            "Not Started",
            notStarted,
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
          {getCountAnalyticCard("Failed", failed, total, "red", "#E66A48")}
          {getCountAnalyticCard(
            "Passed",
            passed,
            total,
            "green",
            "rgb(18, 183, 119)"
          )}
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
