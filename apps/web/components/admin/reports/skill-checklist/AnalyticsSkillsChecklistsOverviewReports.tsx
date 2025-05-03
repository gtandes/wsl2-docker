import {
  Sc_Definitions_Filter,
  useGetAllSkillCheckAnalyticsOverviewReportsQuery,
} from "api";
import { useMemo } from "react";
import { Spinner } from "../../../Spinner";
import { CompetencyState } from "types";
import { CompetencyAnalyticsCard } from "../CompetencyAnalyticsCard";

interface Props {
  filters?: Sc_Definitions_Filter;
}

export default function AnalyticsSkillsChecklistsOverviewReports({
  filters = {},
}: Props) {
  const archivedFilter = { directus_users: { status: { _neq: "archived" } } };
  const notStartedFilter = useMemo(
    () => [
      { directus_users: { status: { _eq: CompetencyState.PENDING } } },
      { ...archivedFilter },
    ],
    []
  );
  const completedFilter = useMemo(
    () => [
      { directus_users: { status: { _eq: CompetencyState.COMPLETED } } },
      { ...archivedFilter },
    ],
    []
  );
  const expiredFilter = useMemo(
    () => [
      {
        directus_users: { expires_on: { _lte: new Date().toUTCString() } },
      },
      { ...archivedFilter },
    ],
    []
  );

  const { data: skillChecklistsAnalytics, loading } =
    useGetAllSkillCheckAnalyticsOverviewReportsQuery({
      variables: {
        notStarted: {
          _and: filters._and
            ? [...notStartedFilter, ...Object.values(filters._and)]
            : [...notStartedFilter],
        },
        completed: {
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

  const notStartedSkill =
    skillChecklistsAnalytics?.notStarted[0].count?.id || 0;
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
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <CompetencyAnalyticsCard
            title={<span className="text-sm">Not Started</span>}
            value={notStartedSkill}
            percentage={(notStartedSkill * 100) / total}
            graphColor="#5688E5"
            textColor="blue"
          />

          <CompetencyAnalyticsCard
            title={<span className="text-sm">Completed</span>}
            value={completedSkill}
            percentage={(completedSkill * 100) / total}
            graphColor="#54B47C"
            textColor="green"
          />

          <CompetencyAnalyticsCard
            title={<span className="text-sm">Expired</span>}
            value={expiredSkill}
            percentage={(expiredSkill * 100) / total}
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
}
