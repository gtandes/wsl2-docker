import {
  useGetModulesAnalyticsOverviewReportsQuery,
  Modules_Definition_Filter,
} from "api";
import { averageScore } from "../../../../utils/utils";
import { Spinner } from "../../../Spinner";
import { CompetencyState } from "types";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Modules_Definition_Filter;
}

export const AnalyticsModulesOverviewReports: React.FC<Props> = ({
  filters = {},
}) => {
  const archivedFilter = { directus_users: { status: { _neq: "archived" } } };
  const notStartedfilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.PENDING],
        },
      },
    },
    { ...archivedFilter },
  ];
  const passedFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.FINISHED],
        },
        approved: {
          _eq: true,
        },
      },
    },
    { ...archivedFilter },
  ];
  const failedFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.FINISHED],
        },
        approved: {
          _eq: false,
        },
      },
    },
    { ...archivedFilter },
  ];
  const inProgressFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.STARTED],
        },
      },
    },
    { ...archivedFilter },
  ];
  const expiredFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.EXPIRED],
        },
      },
    },
    { ...archivedFilter },
  ];

  const { data: moduleAnalytics, loading } =
    useGetModulesAnalyticsOverviewReportsQuery({
      variables: {
        notStartedfilters: {
          _and: filters._and
            ? [...notStartedfilters, ...Object.values(filters._and)]
            : [...notStartedfilters],
        },

        passedFilters: {
          _and: filters._and
            ? [...passedFilters, ...Object.values(filters._and)]
            : [...passedFilters],
        },

        failedFilters: {
          _and: filters._and
            ? [...failedFilters, ...Object.values(filters._and)]
            : [...failedFilters],
        },

        inProgressFilters: {
          _and: filters._and
            ? [...inProgressFilters, ...Object.values(filters._and)]
            : [...inProgressFilters],
        },

        expiredFilters: {
          _and: filters._and
            ? [...expiredFilters, ...Object.values(filters._and)]
            : [...expiredFilters],
        },
        totalFilters: filters,
        scoreFilters: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const notStarted = moduleAnalytics?.notStarted[0]?.count?.id || 0;
  const passed = moduleAnalytics?.passed[0]?.count?.id || 0;
  const failed = moduleAnalytics?.failed[0]?.count?.id || 0;
  const inProgress = moduleAnalytics?.inProgress[0]?.count?.id || 0;
  const expired = moduleAnalytics?.expired[0]?.count?.id || 0;
  const total = moduleAnalytics?.total[0]?.count?.id || 0;

  const avgs = moduleAnalytics?.scores.map((ma) =>
    averageScore(
      ma.directus_users?.length || 0,
      ma.directus_users?.flatMap((mu) => ({ score: mu?.score }))
    )
  );
  const totalAverages = avgs?.reduce((prev, curr) => prev + curr, 0) || 0;
  const averageScoreResult = totalAverages / total;

  if (loading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {total > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Not Started</span>}
            percentage={(notStarted * 100) / total}
            value={notStarted}
            graphColor="rgb(69, 138, 236)"
            textColor="blue"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">In Progress</span>}
            percentage={(inProgress * 100) / total}
            value={inProgress}
            graphColor="rgb(217, 181, 64)"
            textColor="yellow"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Passed</span>}
            percentage={(passed * 100) / total}
            value={passed}
            graphColor="rgb(18, 183, 119)"
            textColor="green"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Failed</span>}
            percentage={(failed * 100) / total}
            value={failed}
            graphColor="#E66A48"
            textColor="red"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Expired</span>}
            percentage={(expired * 100) / total}
            value={expired}
            graphColor="rgb(102, 102, 102)"
            textColor="gray"
          />

          <CompetencyAnalyticsCard
            title={<span className="text-sm">Average Score</span>}
            value={averageScoreResult}
            percentage={averageScoreResult}
            graphColor="#566DA4"
            textColor="dark-blue"
            isPercentage
          />
        </div>
      ) : (
        <div className="h-16 text-center">
          <p>It looks like there&apos;s no data to display at the moment.</p>
        </div>
      )}
    </>
  );
};
