import React from "react";
import { PieChartCard } from "../PieChartCard";
import { useGetAssignmentsTotalReportsQuery } from "api";
import { useAgency } from "../../hooks/useAgency";
import { UserRole } from "../../types/roles";
import { useAuth } from "../../hooks/useAuth";
import { Agency } from "../../types/global";
import { CompetencyState, DirectusStatus } from "types";
import { endOfHour } from "date-fns";

export const ComplianceStats = () => {
  const lastHour = endOfHour(new Date()).toUTCString();
  const auth = useAuth();
  const globalAgency = useAgency();
  const isAgencyUser = auth.currentUser?.role === UserRole.AgencyUser;
  const agency = isAgencyUser
    ? (auth.currentUser?.agencies.at(0) as Agency)
    : globalAgency.currentAgency;

  const agencyFilters =
    agency && agency.id
      ? {
          _and: [
            {
              agency: {
                id: { _eq: agency.id },
              },
            },
          ],
        }
      : {};

  const agencyFiltersModules =
    agency && agency.id ? { directus_users: agencyFilters } : {};
  const publishedFilter = {
    status: {
      _in: [DirectusStatus.PUBLISHED, CompetencyState.DUE_DATE_EXPIRED],
    },
  };

  const assignmentsTotalReportsQuery = useGetAssignmentsTotalReportsQuery({
    variables: {
      documentsExpiredFilter: {
        _and: [
          {
            expires_on: { _lte: lastHour },
          },
          publishedFilter,
          agencyFilters,
        ],
      },
      documentsReadFilter: {
        _and: [
          {
            read: { _nnull: true },
          },
          publishedFilter,
          agencyFilters,
        ],
      },
      documentsUnreadFilter: {
        _and: [
          {
            read: { _null: true },
          },
          publishedFilter,
          agencyFilters,
        ],
      },
      documentsTotalFilters: {
        _and: [{ status: { _neq: DirectusStatus.ARCHIVED } }, agencyFilters],
      },
      policiesExpiredFilter: {
        _and: [
          {
            expires_on: { _lte: lastHour },
          },
          publishedFilter,
          agencyFilters,
        ],
      },
      policiesSignedFilter: {
        _and: [
          { read: { _nnull: true } },
          { signed_on: { _nnull: true } },
          publishedFilter,
          agencyFilters,
        ],
      },
      policiesUnsignedFilter: {
        _and: [
          { read: { _nnull: true } },
          { signed_on: { _null: true } },
          publishedFilter,
          agencyFilters,
        ],
      },
      policiesUnreadFilter: {
        _and: [{ read: { _null: true } }, publishedFilter, agencyFilters],
      },
      policiesTotalFilters: {
        _and: [{ status: { _neq: DirectusStatus.ARCHIVED } }, agencyFilters],
      },
      skillsChecklistsTodoFilter: {
        _and: [{ status: { _eq: CompetencyState.PENDING } }, agencyFilters],
      },
      skillsChecklistsDoneFilter: {
        _and: [{ status: { _eq: CompetencyState.COMPLETED } }, agencyFilters],
      },
      skillsChecklistsExpiredFilter: {
        _and: [
          { expires_on: { _lte: lastHour } },
          agencyFilters,
          publishedFilter,
        ],
      },
      skillsCheklistsTotalFilters: {
        _and: [{ status: { _neq: DirectusStatus.ARCHIVED } }, agencyFilters],
      },
      examsDoneFilter: {
        _and: [
          {
            status: {
              _in: [CompetencyState.COMPLETED],
            },
            // exams_id: { status: { _eq: DirectusStatus.PUBLISHED } },
          },
          agencyFilters,
        ],
      },
      examsInProgressFilter: {
        _and: [
          {
            status: {
              _in: [CompetencyState.IN_PROGRESS, CompetencyState.IN_REVIEW],
            },
          },
          agencyFilters,
        ],
      },
      examsNotStartedFilter: {
        _and: [
          {
            status: {
              _in: [CompetencyState.NOT_STARTED],
            },
          },
          agencyFilters,
        ],
      },
      examsExpiredFilter: {
        _and: [
          {
            status: {
              _in: [CompetencyState.EXPIRED],
            },
          },
          agencyFilters,
        ],
      },
      examsTotalFilters: {
        _and: [agencyFilters, { status: { _neq: DirectusStatus.ARCHIVED } }],
      },
      modulesPassedFilter: {
        _and: [
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
          agencyFiltersModules,
        ],
      },
      modulesInProgressFilter: {
        _and: [
          {
            directus_users: {
              status: {
                _in: [CompetencyState.STARTED],
              },
            },
          },
          agencyFiltersModules,
        ],
      },
      modulesNotStartedFilter: {
        _and: [
          {
            directus_users: {
              status: {
                _in: [CompetencyState.PENDING],
              },
            },
          },
          { directus_users: { status: { _neq: DirectusStatus.ARCHIVED } } },
          { status: { _eq: DirectusStatus.PUBLISHED } },
          agencyFiltersModules,
        ],
      },
      modulesExpiredFilter: {
        _and: [
          {
            directus_users: {
              status: {
                _in: [CompetencyState.EXPIRED],
              },
            },
          },
          agencyFiltersModules,
        ],
      },
      modulesTotalFilters: {
        _and: [
          {
            status: { _neq: DirectusStatus.ARCHIVED },
            directus_users: {
              status: {
                _nnull: true,
              },
            },
          },
          agencyFiltersModules,
        ],
      },
    },
  });

  const countModulesByStatus = {
    passed:
      assignmentsTotalReportsQuery.data?.modulesPassed.at(0)?.count?.id || 0,
    inProgress:
      assignmentsTotalReportsQuery.data?.modulesInProgress.at(0)?.count?.id ||
      0,
    notStarted:
      assignmentsTotalReportsQuery.data?.modulesNotStarted.at(0)?.count?.id ||
      0,
    expired:
      assignmentsTotalReportsQuery.data?.modulesExpired.at(0)?.count?.id || 0,
  };

  const countExamsByStatus = {
    done: assignmentsTotalReportsQuery.data?.examsDone.at(0)?.count?.id || 0,
    inProgress:
      assignmentsTotalReportsQuery.data?.examsInProgress.at(0)?.count?.id || 0,
    notStarted:
      assignmentsTotalReportsQuery.data?.examsNotStarted.at(0)?.count?.id || 0,
    expired:
      assignmentsTotalReportsQuery.data?.examsExpired.at(0)?.count?.id || 0,
  };

  const countPoliciesByStatus = {
    unread:
      assignmentsTotalReportsQuery.data?.policiesUnread.at(0)?.count?.id || 0,
    readAndUnsigned:
      assignmentsTotalReportsQuery.data?.policiesUnsigned.at(0)?.count?.id || 0,
    readAndSigned:
      assignmentsTotalReportsQuery.data?.policiesSigned.at(0)?.count?.id || 0,
    expired:
      assignmentsTotalReportsQuery.data?.policiesExpired.at(0)?.count?.id || 0,
  };

  const countSkillChecklistsByStatus = {
    todo:
      assignmentsTotalReportsQuery.data?.skillsChecklistsTodo.at(0)?.count
        ?.id || 0,
    done:
      assignmentsTotalReportsQuery.data?.skillsChecklistsDone.at(0)?.count
        ?.id || 0,
    expired:
      assignmentsTotalReportsQuery.data?.skillsChecklistsExpired.at(0)?.count
        ?.id || 0,
  };

  const countDocumentByStatus = {
    expired:
      assignmentsTotalReportsQuery.data?.documentsExpired.at(0)?.count?.id || 0,
    read:
      assignmentsTotalReportsQuery.data?.documentsRead.at(0)?.count?.id || 0,
    unread:
      assignmentsTotalReportsQuery.data?.documentsUnread.at(0)?.count?.id || 0,
  };

  const totals = {
    exams: assignmentsTotalReportsQuery.data?.examsTotal.at(0)?.count?.id || 0,
    modules:
      assignmentsTotalReportsQuery.data?.modulesTotal.at(0)?.count?.id || 0,
    policies:
      assignmentsTotalReportsQuery.data?.policiesTotal.at(0)?.count?.id || 0,
    skillChecklists:
      assignmentsTotalReportsQuery.data?.skillsChecklistTotal.at(0)?.count
        ?.id || 0,
    documents:
      assignmentsTotalReportsQuery.data?.documentsTotal.at(0)?.count?.id || 0,
  };

  return (
    <div className="flex items-center justify-center">
      <div className="grid w-full grid-cols-1 place-items-center gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 min-[1820px]:grid-cols-5">
        <PieChartCard
          loading={assignmentsTotalReportsQuery.loading}
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
          total={totals.exams}
          highlightedLabel="Completed"
        />
        <PieChartCard
          loading={assignmentsTotalReportsQuery.loading}
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
              graphColor: "rgba(51, 145, 198, 1)",
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
          total={totals.modules}
          highlightedLabel="Completed"
        />
        <PieChartCard
          loading={assignmentsTotalReportsQuery.loading}
          mainColor="green"
          title="Skills Checklists"
          slices={[
            {
              label: "Done",
              count: countSkillChecklistsByStatus.done,
              colorGrade: "600",
              graphColor: "rgb(6, 149, 96)",
            },
            {
              label: "To Do",
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
          highlightedCount={countSkillChecklistsByStatus.done}
          total={totals.skillChecklists}
          highlightedLabel="Completed"
        />
        <PieChartCard
          loading={assignmentsTotalReportsQuery.loading}
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
          total={totals.policies}
          highlightedLabel="Completed"
        />
        <PieChartCard
          loading={assignmentsTotalReportsQuery.loading}
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
          total={totals.documents}
          highlightedLabel="Completed"
        />
      </div>
    </div>
  );
};
