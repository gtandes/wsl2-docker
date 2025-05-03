import React, { useMemo } from "react";
import { useGetUserAndGroupsOverviewAssignmentsQuery } from "api/generated/graphql";

import { first } from "lodash";
import { PieChartCard } from "../../../PieChartCard";
import { CompetencyState, DirectusStatus } from "types";

const publishedFilter = { status: { _eq: DirectusStatus.PUBLISHED } };

interface Props {
  filters?: any;
}

export default function UserAndGroupsAnalyticsOverview({
  filters = {},
}: Props) {
  const competenciesQuery = useGetUserAndGroupsOverviewAssignmentsQuery({
    variables: {
      examsNotStartedFilter: {
        status: {
          _in: [CompetencyState.NOT_STARTED],
        },
        ...filters,
      },
      examsDoneFilter: {
        status: {
          _in: [CompetencyState.COMPLETED, CompetencyState.FAILED],
        },
        ...filters,
      },
      examsExpiredFilter: {
        status: {
          _in: [CompetencyState.EXPIRED],
        },
        ...filters,
      },
      examsInProgressFilter: {
        status: {
          _in: [CompetencyState.IN_PROGRESS, CompetencyState.IN_REVIEW],
        },
        ...filters,
      },
      modulesPassedFilter: {
        status: {
          _in: [CompetencyState.COMPLETED],
        },
        approved: {
          _eq: true,
        },

        ...filters,
      },
      modulesInProgressFilter: {
        status: {
          _in: [CompetencyState.IN_PROGRESS],
        },
        ...filters,
      },
      modulesNotStartedFilter: {
        status: {
          _in: [CompetencyState.PENDING],
        },
        ...filters,
      },
      modulesExpiredFilter: {
        status: {
          _in: [CompetencyState.EXPIRED],
        },
        ...filters,
      },
      skillsChecklistsDoneFilter: {
        status: {
          _in: [CompetencyState.COMPLETED],
        },
        ...filters,
      },
      skillsChecklistsExpiredFilter: {
        expires_on: {
          _lte: new Date().toUTCString(),
        },
        ...filters,
      },
      skillsChecklistsTodoFilter: {
        status: {
          _in: [CompetencyState.PENDING],
        },
        ...filters,
      },
      policiesExpiredFilter: {
        expires_on: {
          _lte: new Date().toUTCString(),
        },
        ...publishedFilter,
        ...filters,
      },
      policiesSignedFilter: {
        signed_on: {
          _nnull: true,
        },
        ...publishedFilter,
        ...filters,
      },
      policiesUnreadFilter: {
        read: {
          _null: true,
        },
        ...publishedFilter,
        ...filters,
      },
      policiesUnsignedFilter: {
        read: {
          _nnull: true,
        },
        ...publishedFilter,
        ...filters,
      },
      documentsExpiredFilter: {
        expires_on: {
          _lte: new Date().toUTCString(),
        },
        ...publishedFilter,
        ...filters,
      },
      documentsReadFilter: {
        read: {
          _nnull: true,
        },
        ...publishedFilter,
        ...(filters || []),
      },
      documentsUnreadFilter: {
        read: {
          _null: true,
        },
        ...publishedFilter,
        ...filters,
      },
    },
    skip: !Object.keys(filters).length,
  });

  const countExamsByStatus = useMemo(
    () => ({
      notStarted:
        first(competenciesQuery.data?.examsNotStarted)?.count?.id || 0,
      done: first(competenciesQuery.data?.examsDone)?.count?.id || 0,
      inProgress:
        first(competenciesQuery.data?.examsInProgress)?.count?.id || 0,
      expired: first(competenciesQuery.data?.examsExpired)?.count?.id || 0,
    }),
    [competenciesQuery.data]
  );

  const countModulesByStatus = useMemo(
    () => ({
      passed: first(competenciesQuery.data?.modulesPassed)?.count?.id || 0,
      inProgress:
        first(competenciesQuery.data?.modulesInProgress)?.count?.id || 0,
      notStarted:
        first(competenciesQuery.data?.modulesNotStarted)?.count?.id || 0,
      expired: first(competenciesQuery.data?.modulesExpired)?.count?.id || 0,
    }),
    [competenciesQuery.data]
  );

  const countSkillChecklistsByStatus = useMemo(
    () => ({
      todo: first(competenciesQuery.data?.skillsChecklistsTodo)?.count?.id || 0,
      done: first(competenciesQuery.data?.skillsChecklistsDone)?.count?.id || 0,
      expired:
        first(competenciesQuery.data?.skillsChecklistsExpired)?.count?.id || 0,
    }),
    [competenciesQuery.data]
  );

  const countPoliciesByStatus = useMemo(
    () => ({
      unread: first(competenciesQuery.data?.policiesUnread)?.count?.id || 0,
      readAndUnsigned:
        first(competenciesQuery.data?.policiesUnsigned)?.count?.id || 0,
      readAndSigned:
        first(competenciesQuery.data?.policiesSigned)?.count?.id || 0,
      expired: first(competenciesQuery.data?.policiesExpired)?.count?.id || 0,
    }),
    [competenciesQuery.data]
  );

  const countDocumentByStatus = useMemo(
    () => ({
      expired: first(competenciesQuery.data?.documentsExpired)?.count?.id || 0,
      read: first(competenciesQuery.data?.documentsRead)?.count?.id || 0,
      unread: first(competenciesQuery.data?.documentsUnread)?.count?.id || 0,
    }),
    [competenciesQuery.data]
  );

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="grid w-full grid-cols-1 gap-4 print:grid-cols-2 print:gap-10 lg:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5">
        <PieChartCard
          loading={competenciesQuery.loading}
          classes="bg-[#f4f6fd]"
          mainColor="purple"
          title="Exams"
          slices={[
            {
              label: "Completed",
              count: countExamsByStatus.done,
              colorGrade: "200",
              graphColor: "rgba(219, 200, 246, 1)",
            },
            {
              label: "In Progress",
              count: countExamsByStatus.inProgress,
              colorGrade: "600",
              graphColor: "rgba(92, 45, 159, 1)",
            },
            {
              label: "Not Started",
              count: countExamsByStatus.notStarted,
              colorGrade: "400",
              graphColor: "rgba(68, 30, 121, 1)",
            },
            {
              label: "Expired",
              count: countExamsByStatus.expired,
              colorGrade: "800",
              graphColor: "rgba(50, 15, 100, 1)",
            },
          ]}
          highlightedCount={countExamsByStatus.done}
          highlightedLabel="Completed"
          goToUrl="/admin/dashboard/reports/exams"
        />
        <PieChartCard
          loading={competenciesQuery.loading}
          classes="bg-[#f4f6fd]"
          mainColor="light-blue"
          title="Modules"
          slices={[
            {
              label: "Passed",
              count: countModulesByStatus.passed,
              colorGrade: "200",
              graphColor: "rgba(186, 224, 246, 1)",
            },
            {
              label: "In Progress",
              count: countModulesByStatus.inProgress,
              colorGrade: "600",
              graphColor: "rgba(92, 45, 159, 1)",
            },
            {
              label: "Not Started",
              count: countModulesByStatus.notStarted,
              colorGrade: "400",
              graphColor: "rgba(92, 184, 236, 1)",
            },
            {
              label: "Expired",
              count: countModulesByStatus.expired,
              colorGrade: "700",
              graphColor: "rgba(23, 115, 168, 1)",
            },
          ]}
          highlightedCount={countModulesByStatus.passed}
          highlightedLabel="Completed"
          goToUrl="/admin/dashboard/reports/modules"
        />
        <PieChartCard
          loading={competenciesQuery.loading}
          classes="bg-[#f4f6fd]"
          mainColor="green"
          title="Skills Checklists"
          slices={[
            {
              label: "Completed",
              count: countSkillChecklistsByStatus.done,
              colorGrade: "600",
              graphColor: "rgb(6, 149, 96)",
            },
            {
              label: "Not Started",
              count: countSkillChecklistsByStatus.todo,
              colorGrade: "400",
              graphColor: "rgb(54, 209, 145)",
            },
            {
              label: "Expired",
              count: countSkillChecklistsByStatus.expired,
              colorGrade: "200",
              graphColor: "rgb(139, 238, 187)",
            },
          ]}
          highlightedCount={countSkillChecklistsByStatus.todo}
          highlightedLabel="Completed"
          goToUrl="/admin/dashboard/reports/skill-checklist"
        />
        <PieChartCard
          loading={competenciesQuery.loading}
          classes="bg-[#f4f6fd]"
          mainColor="blue"
          title="Policies"
          slices={[
            {
              label: "Signed",
              count: countPoliciesByStatus.readAndSigned,
              colorGrade: "800",
              graphColor: "rgb(39, 75, 173)",
            },
            {
              label: "Unsigned",
              count: countPoliciesByStatus.readAndUnsigned,
              colorGrade: "600",
              graphColor: "rgb(48, 109, 224)",
            },
            {
              label: "Unread",
              count: countPoliciesByStatus.unread,
              colorGrade: "600",
              graphColor: "rgb(194, 221, 251)",
            },
            {
              label: "Expired",
              count: countPoliciesByStatus.expired,
              colorGrade: "200",
              graphColor: "rgb(194, 221, 251)",
            },
          ]}
          highlightedCount={countPoliciesByStatus.readAndSigned}
          highlightedLabel="Completed"
          goToUrl="/admin/dashboard/reports/policies"
        />
        <PieChartCard
          loading={competenciesQuery.loading}
          classes="bg-[#f4f6fd]"
          mainColor="teal"
          title="Documents"
          slices={[
            {
              label: "Read",
              count: countDocumentByStatus.read,
              colorGrade: "600",
              graphColor: "rgb(95, 157, 165)",
            },
            {
              label: "Unread",
              count: countDocumentByStatus.unread,
              colorGrade: "400",
              graphColor: "rgb(65, 111, 121)",
            },
            {
              label: "Expired",
              count: countDocumentByStatus.expired,
              colorGrade: "200",
              graphColor: "rgb(194, 221, 223)",
            },
          ]}
          highlightedCount={countDocumentByStatus.read}
          highlightedLabel="Completed"
          goToUrl="/admin/dashboard/reports/documents"
        />
      </div>
    </div>
  );
}
