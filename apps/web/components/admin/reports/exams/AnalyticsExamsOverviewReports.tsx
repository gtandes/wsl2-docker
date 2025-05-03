import React from "react";
import {
  Exams_Filter,
  useGetUserExamsAnalyticsOverviewReportsQuery,
} from "api";
import { Spinner } from "../../../Spinner";
import { CompetencyState, DirectusStatus } from "types";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Exams_Filter;
}

export const AnalyticsExamsOverviewReports: React.FC<Props> = ({
  filters = {},
}) => {
  const archivedFilter = {
    directus_users: { status: { _neq: DirectusStatus.ARCHIVED } },
  };
  const notStartedfilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.NOT_STARTED],
        },
      },
    },
    { ...archivedFilter },
  ];
  const passedFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.COMPLETED],
        },
      },
    },
    { ...archivedFilter },
  ];
  const failedFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.FAILED],
        },
      },
    },
    { ...archivedFilter },
  ];
  const inProgressFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.IN_PROGRESS],
        },
      },
    },
    { ...archivedFilter },
  ];
  const inReviewFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.IN_REVIEW],
        },
      },
    },
    { ...archivedFilter },
  ];

  const invalidFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.INVALID],
        },
      },
    },
    { ...archivedFilter },
  ];
  const expiredFilters = [
    {
      directus_users: {
        status: {
          _in: [CompetencyState.EXPIRED, CompetencyState.DUE_DATE_EXPIRED],
        },
      },
    },
    { ...archivedFilter },
  ];

  const { data: examsAnalytics, loading } =
    useGetUserExamsAnalyticsOverviewReportsQuery({
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

        inReviewFilters: {
          _and: filters._and
            ? [...inReviewFilters, ...Object.values(filters._and)]
            : [...inReviewFilters],
        },

        invalidFilters: {
          _and: filters._and
            ? [...invalidFilters, ...Object.values(filters._and)]
            : [...invalidFilters],
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

  const notStarted = examsAnalytics?.notStarted[0].count?.id || 0;
  const passed = examsAnalytics?.passed[0]?.count?.id || 0;
  const failed = examsAnalytics?.failed[0]?.count?.id || 0;
  const inProgress = examsAnalytics?.inProgress[0]?.count?.id || 0;
  const inReview = examsAnalytics?.inReview[0]?.count?.id || 0;
  const invalid = examsAnalytics?.invalid[0]?.count?.id || 0;
  const expired = examsAnalytics?.expired[0]?.count?.id || 0;
  const total = examsAnalytics?.total[0]?.count?.id || 0;

  const scores = {
    users:
      examsAnalytics?.scores.reduce(
        (prev, curr) => prev + curr.directus_users?.length! || 0,
        0
      ) || 0,
    totalScore: examsAnalytics?.scores
      .map((exams) =>
        exams.directus_users?.reduce(
          (prev, curr) => prev + curr?.score! || 0,
          0
        )
      )
      .reduce((prev, curr) => prev! + curr!, 0),
  };
  const averageScoreResult = scores.totalScore! / scores.users;

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
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Not Started</span>}
            value={notStarted}
            percentage={(notStarted * 100) / total}
            textColor="blue"
            graphColor="rgb(69, 138, 236)"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">In Progress</span>}
            value={inProgress}
            percentage={(inProgress * 100) / total}
            textColor="yellow"
            graphColor="rgb(217, 181, 64)"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Proctoring Review</span>}
            value={inReview}
            percentage={(inReview * 100) / total}
            textColor="yellow"
            graphColor="rgb(217, 181, 64)"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Invalid</span>}
            value={invalid}
            percentage={(invalid * 100) / total}
            textColor="red"
            graphColor="#E66A48"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Passed</span>}
            value={passed}
            percentage={(passed * 100) / total}
            textColor="green"
            graphColor="rgb(18, 183, 119)"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Failed</span>}
            value={failed}
            percentage={(failed * 100) / total}
            textColor="red"
            graphColor="#E66A48"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Expired</span>}
            value={expired}
            percentage={(expired * 100) / total}
            textColor="gray"
            graphColor="rgb(102, 102, 102)"
          />

          <CompetencyAnalyticsCard
            title={<span className="text-sm">Average Score</span>}
            value={averageScoreResult}
            percentage={averageScoreResult}
            textColor="dark-blue"
            graphColor="#566DA4"
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
