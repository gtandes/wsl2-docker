import {
  Junction_Directus_Users_Policies_Filter,
  useGetPoliciesByStatusReportsQuery,
} from "api";
import { useMemo } from "react";
import { Spinner } from "../../../Spinner";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Junction_Directus_Users_Policies_Filter;
}

const getAnalyticCards = (
  title: string,
  graphColor: string,
  textColor: string,
  value: number,
  total: number
) => {
  return (
    <div className="flex flex-col gap-4">
      <CompetencyAnalyticsCard
        title={<span className="text-sm font-bold">{title}</span>}
        value={`${value} / ${total}`}
        percentage={(value * 100) / total}
        graphColor={graphColor}
        textColor={textColor}
        graphDiameter={160}
        fontSize="xl"
      />
      <div
        className={`text-center text-2xl font-extrabold text-${textColor}-500`}
      >
        {Math.round((value * 100) / total) || 0} %
      </div>
    </div>
  );
};

export const AnalyticsPoliciesReports: React.FC<Props> = ({ filters = {} }) => {
  const readFilter = useMemo(() => [{ read: { _null: true } }], []);
  const readAndUnsignedFilters = useMemo(
    () => [{ read: { _nnull: true } }, { signed_on: { _null: true } }],
    []
  );
  const readAndSignedFilters = useMemo(
    () => [{ read: { _nnull: true } }, { signed_on: { _nnull: true } }],
    []
  );
  const expiredFilters = useMemo(
    () => [
      {
        expires_on: { _lte: new Date().toUTCString() },
      },
    ],
    []
  );

  const { data: policiesByStatus, loading } =
    useGetPoliciesByStatusReportsQuery({
      variables: {
        unreadFilters: {
          _and: filters?._and
            ? [...readFilter, ...Object.values(filters?._and!)]
            : [...readFilter],
        },
        readAndUnsignedFilters: {
          _and: filters?._and
            ? [...readAndUnsignedFilters, ...Object.values(filters?._and!)]
            : [...readAndUnsignedFilters],
        },
        readAndSignedFilters: {
          _and: filters?._and
            ? [...readAndSignedFilters, ...Object.values(filters?._and!)]
            : [...readAndSignedFilters],
        },
        expiredFilters: {
          _and: filters?._and
            ? [...expiredFilters, ...Object.values(filters?._and!)]
            : [...expiredFilters],
        },
        totalFilter: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const expiredPolicies = policiesByStatus?.expired[0]?.count?.id || 0;
  const readAndSignedPolicies =
    policiesByStatus?.readAndSigned[0]?.count?.id || 0;
  const readAndUnsignedPolicies =
    policiesByStatus?.readAndUnsigned[0]?.count?.id || 0;
  const unreadPolicies = policiesByStatus?.unread[0]?.count?.id || 0;
  const totalPoliciesStatus = policiesByStatus?.total[0]?.count?.id || 0;

  if (loading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col justify-center text-center md:flex-row">
      {totalPoliciesStatus > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {getAnalyticCards(
            "Unread",
            "rgb(217, 181, 64)",
            "yellow",
            unreadPolicies,
            totalPoliciesStatus
          )}
          {getAnalyticCards(
            "Read",
            "rgb(69, 138, 236)",
            "blue",
            readAndUnsignedPolicies,
            totalPoliciesStatus
          )}
          {getAnalyticCards(
            "Signed",
            "rgb(18, 183, 119)",
            "green",
            readAndSignedPolicies,
            totalPoliciesStatus
          )}
          {getAnalyticCards(
            "Expired",
            "rgb(102, 102, 102)",
            "gray",
            expiredPolicies,
            totalPoliciesStatus
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center">
          It looks like there is no data to display at the moment
        </div>
      )}
    </div>
  );
};
