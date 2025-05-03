import {
  Junction_Directus_Users_Documents_Filter,
  useGetAllAssignedDocumentsTotalReportsQuery,
} from "api";
import { useMemo } from "react";
import { Spinner } from "../../../Spinner";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Junction_Directus_Users_Documents_Filter;
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

export default function AnalyticsDocumentsReports({ filters = {} }: Props) {
  const unreadFilter = useMemo(() => [{ read: { _null: true } }], []);
  const readfilter = useMemo(() => [{ read: { _nnull: true } }], []);
  const expiredFilter = useMemo(
    () => [{ expires_on: { _lte: new Date().toUTCString() } }],
    []
  );

  const { data: documentsAnalytics, loading } =
    useGetAllAssignedDocumentsTotalReportsQuery({
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
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {getAnalyticCards(
            "Unread",
            "rgb(69, 138, 236)",
            "blue",
            unread,
            totalDocuments
          )}
          {getAnalyticCards(
            "Read",
            "rgb(18, 183, 119)",
            "green",
            read,
            totalDocuments
          )}
          {getAnalyticCards(
            "Expired",
            "rgb(102, 102, 102)",
            "gray",
            expiredDocuments,
            totalDocuments
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center">
          It looks like there is no data to display at the moment
        </div>
      )}
    </div>
  );
}
