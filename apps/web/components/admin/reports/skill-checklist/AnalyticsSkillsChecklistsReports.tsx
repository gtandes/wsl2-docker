import {
  Junction_Sc_Definitions_Directus_Users_Filter,
  useGetAllSkillChecklistsTotalsReportsQuery,
} from "api";
import { Spinner } from "../../../Spinner";
import { useMemo } from "react";
import { CompetencyState } from "types";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Junction_Sc_Definitions_Directus_Users_Filter;
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

export default function AnalyticsSkillsChecklistsReports({
  filters = {},
}: Props) {
  const notStartedFilter = useMemo(
    () => [{ status: { _eq: CompetencyState.PENDING } }],
    []
  );
  const completedFilter = useMemo(
    () => [{ status: { _eq: CompetencyState.COMPLETED } }],
    []
  );
  const expiredFilter = useMemo(
    () => [{ expires_on: { _lte: new Date().toUTCString() } }],
    []
  );
  const { data: skillChecklistsAnalytics, loading } =
    useGetAllSkillChecklistsTotalsReportsQuery({
      variables: {
        notStartedFilter: {
          _and: filters._and
            ? [...notStartedFilter, ...Object.values(filters._and)]
            : [...notStartedFilter],
        },
        completedFilter: {
          _and: filters._and
            ? [...completedFilter, ...Object.values(filters._and)]
            : [...completedFilter],
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

  const notStarted = skillChecklistsAnalytics?.notStarted[0].count?.id || 0;
  const completedSkill = skillChecklistsAnalytics?.completed[0]?.count?.id || 0;
  const expiredSkill = skillChecklistsAnalytics?.expired[0].count?.id || 0;
  const total = skillChecklistsAnalytics?.total[0].count?.id || 0;

  if (loading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col justify-center text-center md:flex-row">
      {total > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {getAnalyticCards(
            "Not Started",
            "rgb(69, 138, 236)",
            "blue",
            notStarted,
            total
          )}
          {getAnalyticCards(
            "Completed",
            "rgb(18, 183, 119)",
            "green",
            completedSkill,
            total
          )}
          {getAnalyticCards(
            "Expired",
            "rgb(102, 102, 102)",
            "gray",
            expiredSkill,
            total
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
