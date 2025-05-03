import {
  Policies_Filter,
  useGetPoliciesAnalyticsOverviewReportsQuery,
} from "api";
import { useMemo } from "react";
import { Spinner } from "../../../Spinner";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";
import { DirectusStatus } from "types";

interface Props {
  filters?: Policies_Filter;
}

export const AnalyticsPoliciesOverviewReports: React.FC<Props> = ({
  filters = {},
}) => {
  const archivedFilter = {
    directus_users: {
      status: {
        _neq: DirectusStatus.ARCHIVED,
      },
    },
  };

  const readFilters = useMemo(
    () => [
      {
        directus_users: {
          _and: [{ read: { _nnull: true } }, { signed_on: { _null: true } }],
        },
      },
      { ...archivedFilter },
    ],
    []
  );
  const unreadFilters = useMemo(
    () => [
      { directus_users: { read: { _null: true } } },
      { ...archivedFilter },
    ],
    []
  );
  const signedFilters = useMemo(
    () => [
      { directus_users: { signed_on: { _nnull: true } } },
      { ...archivedFilter },
    ],
    []
  );
  const expiredFilters = useMemo(
    () => [
      {
        directus_users: {
          expires_on: { _lte: new Date().toUTCString() },
        },
      },
      { ...archivedFilter },
    ],
    []
  );

  const { data: policiesAnalytics, loading } =
    useGetPoliciesAnalyticsOverviewReportsQuery({
      variables: {
        readFilters: {
          _and: filters._and
            ? [...readFilters, ...Object.values(filters._and)]
            : [...readFilters],
        },
        unreadFilters: {
          _and: filters._and
            ? [...unreadFilters, ...Object.values(filters._and)]
            : [...unreadFilters],
        },
        signedFilters: {
          _and: filters._and
            ? [...signedFilters, ...Object.values(filters._and)]
            : [...signedFilters],
        },
        expiredFilters: {
          _and: filters._and
            ? [...expiredFilters, ...Object.values(filters._and)]
            : [...expiredFilters],
        },
        totalFilter: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const expiredPolicies = policiesAnalytics?.expired[0]?.count?.id || 0;
  const readPolicies = policiesAnalytics?.read[0]?.count?.id || 0;
  const unreadPolicies = policiesAnalytics?.unread[0]?.count?.id || 0;
  const signedPolicies = policiesAnalytics?.signed[0]?.count?.id || 0;
  const totalPolicies = policiesAnalytics?.total[0]?.count?.id || 0;
  const signedPercentage = (signedPolicies * 100) / totalPolicies;
  const unreadPercentage = (unreadPolicies * 100) / totalPolicies;
  const readPercentage = (readPolicies * 100) / totalPolicies;
  const expiredPercentage = (expiredPolicies * 100) / totalPolicies;

  if (loading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col justify-center text-center md:flex-row">
      {totalPolicies > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Unread</span>}
            value={unreadPolicies}
            percentage={unreadPercentage}
            graphColor="#D3B656"
            textColor="yellow"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Read</span>}
            value={readPolicies}
            percentage={readPercentage}
            graphColor="#5688E5"
            textColor="blue"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Signed</span>}
            value={signedPolicies}
            percentage={signedPercentage}
            graphColor="#54B47C"
            textColor="green"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Expired</span>}
            value={expiredPolicies}
            percentage={expiredPercentage}
            graphColor="#666666"
            textColor="gray"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center">
          It looks like there is no data to display at the moment
        </div>
      )}
    </div>
  );
};
