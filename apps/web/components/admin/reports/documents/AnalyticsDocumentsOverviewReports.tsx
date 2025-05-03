import {
  Documents_Filter,
  useGetDocumentsAnalyticsOverviewReportsQuery,
} from "api";
import { useMemo } from "react";
import { Spinner } from "../../../Spinner";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Documents_Filter;
}

export default function AnalyticsDocumentsOverviewReports({
  filters = {},
}: Props) {
  const archivedFilter = { directus_users: { status: { _neq: "archived" } } };
  const unreadFilter = useMemo(
    () => [
      { directus_users: { read: { _null: true } } },
      { ...archivedFilter },
    ],
    []
  );
  const readfilter = useMemo(
    () => [
      { directus_users: { read: { _nnull: true } } },
      { ...archivedFilter },
    ],
    []
  );
  const expiredFilter = useMemo(
    () => [
      { directus_users: { expires_on: { _lte: new Date().toUTCString() } } },
      { ...archivedFilter },
    ],
    []
  );

  const { data: documentsAnalytics, loading } =
    useGetDocumentsAnalyticsOverviewReportsQuery({
      variables: {
        unreadFilter: {
          _and: filters._and
            ? [...unreadFilter, ...Object.values(filters._and)]
            : [...unreadFilter],
        },
        readfilter: {
          _and: filters._and
            ? [...readfilter, ...Object.values(filters._and)]
            : [...readfilter],
        },
        expiredFilter: {
          _and: filters._and
            ? [...expiredFilter, ...Object.values(filters._and)]
            : [...expiredFilter],
        },
        totalFilter: filters,
      },
      skip: !Object.keys(filters).length,
    });

  const unread = documentsAnalytics?.unread[0].count?.id || 0;
  const read = documentsAnalytics?.read[0].count?.id || 0;
  const expiredDocuments = documentsAnalytics?.expired[0].count?.id || 0;
  const totalDocuments = documentsAnalytics?.total[0].count?.id || 0;
  const unreadPercentage = (unread * 100) / totalDocuments;
  const readPercentage = (read * 100) / totalDocuments;
  const expiredPercentage = (expiredDocuments * 100) / totalDocuments;

  if (loading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-col justify-center text-center md:flex-row">
      {totalDocuments > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Unread</span>}
            value={unread}
            percentage={unreadPercentage}
            graphColor="rgb(69, 138, 236)"
            textColor="blue"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Read</span>}
            value={read}
            percentage={readPercentage}
            graphColor="rgb(18, 183, 119)"
            textColor="green"
          />
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Expired</span>}
            value={expiredDocuments}
            percentage={expiredPercentage}
            graphColor="rgb(102, 102, 102)"
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
}
