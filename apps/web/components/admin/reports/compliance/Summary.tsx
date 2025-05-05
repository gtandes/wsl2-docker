import {
  Directus_Users_Filter,
  useSysUsersForComplianceSummaryQuery,
} from "api";
import { useMemo, useState } from "react";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import {
  faCircleCheck,
  faExclamationCircle,
  faExclamationTriangle,
  faStopCircle,
} from "@fortawesome/pro-solid-svg-icons";
import { SummaryFilters } from "./SummaryFilters";
import { UsersListCard } from "./SummaryUsersListCard";
import { Tooltip } from "../../../utils/Tooltip";
import { endOfHour } from "date-fns";
import { useAgency } from "../../../../hooks/useAgency";

enum TooltipCopys {
  ASSIGNMENTS_COMPLETE = "Displays a list of users with no pending assignments, expired competencies, or failed exams/modules.",
  ASSIGNMENTS_AWAITING_USER_LOGIN = "Displays a list of users with assigned items who haven't logged into the system to access their assignments.",
  ASSIGNMENTS_INCOMPLETE = "Displays a list of users with assignments that are not yet completed and are still within the due date. A clinician may have a mix of completed and incomplete assignments and appear in this list.",
  ALL_ATTEMPTS_USED = "Displays users with at least one competency (exams and modules) where all attempts have been used.",
  SUMMARY = "Each user is represented only once in either the 'Assignments Complete', 'Awaiting Login', 'Assignments Incomplete' or 'All Attempts Used' columns.",
}

const lastHour = endOfHour(new Date()).toISOString();

const lastAccessFilter = {
  last_access: {
    _nnull: true,
  },
};

const noLastAccessFilter = {
  last_access: {
    _null: true,
  },
};

const clinicianRoleFilter = { role: { id: { _eq: UserRole.Clinician } } };

export const ComplianceSummary: React.FC = ({}) => {
  const currentAgency = useAgency();
  const [filters, setFilters] = useState<Directus_Users_Filter>({ _and: [] });

  const agencyFilters = useMemo(() => {
    return currentAgency && currentAgency.currentAgency?.id
      ? {
          agencies: {
            agencies_id: {
              id: { _eq: currentAgency.currentAgency.id },
            },
          },
        }
      : null;
  }, [currentAgency]);

  const completedAssignmentsFilters = useMemo(() => {
    const baseFilters = structuredClone(filters);

    baseFilters._and?.push(clinicianRoleFilter);
    baseFilters._and?.push(lastAccessFilter);
    if (agencyFilters) {
      baseFilters._and?.push(agencyFilters);
    }

    baseFilters._and?.push({
      _or: [
        {
          exams: {
            id: {
              _nnull: true,
            },
            status: {
              _in: [CompetencyState.COMPLETED, CompetencyState.FAILED],
            },
            expires_on: { _gte: lastHour },
          },
        },
        {
          modules: {
            id: {
              _nnull: true,
            },
            status: {
              _in: [CompetencyState.FINISHED],
            },
            expires_on: { _gte: lastHour },
          },
        },
        {
          sc_definitions: {
            id: {
              _nnull: true,
            },
            status: {
              _in: [CompetencyState.COMPLETED],
            },
            expires_on: { _gte: lastHour },
          },
        },
        {
          documents: {
            id: {
              _nnull: true,
            },
            read: {
              _nnull: true,
            },
            expires_on: { _gte: lastHour },
          },
        },
        {
          policies: {
            id: {
              _nnull: true,
            },
            signed_on: {
              _nnull: true,
            },
            expires_on: { _gte: lastHour },
          },
        },
      ],
    });

    return baseFilters;
  }, [filters, agencyFilters]);

  const awaitingUserLoginFilters = useMemo(() => {
    const baseFilters = structuredClone(filters);

    baseFilters._and?.push(clinicianRoleFilter);
    baseFilters._and?.push(noLastAccessFilter);
    if (agencyFilters) {
      baseFilters._and?.push(agencyFilters);
    }

    baseFilters._and?.push({
      _or: [
        {
          exams: {
            id: { _nnull: true },
          },
        },
        {
          modules: {
            id: { _nnull: true },
          },
        },
        {
          sc_definitions: {
            id: { _nnull: true },
          },
        },
        {
          documents: {
            id: { _nnull: true },
            status: { _eq: DirectusStatus.PUBLISHED },
          },
        },
        {
          policies: {
            id: { _nnull: true },
            status: { _eq: DirectusStatus.PUBLISHED },
          },
        },
      ],
    });

    return baseFilters;
  }, [filters, agencyFilters]);

  const incompleteAssignmentsFilters = useMemo(() => {
    const baseFilters = structuredClone(filters);

    baseFilters._and?.push(clinicianRoleFilter);
    baseFilters._and?.push(lastAccessFilter);
    if (agencyFilters) {
      baseFilters._and?.push(agencyFilters);
    }
    baseFilters._and?.push({
      _or: [
        {
          exams: {
            id: {
              _nnull: true,
            },
            status: {
              _in: [CompetencyState.NOT_STARTED, CompetencyState.IN_PROGRESS],
            },
            due_date: { _gte: lastHour },
          },
        },
        {
          modules: {
            id: {
              _nnull: true,
            },
            status: {
              _in: [CompetencyState.PENDING, CompetencyState.STARTED],
            },
            due_date: { _gte: lastHour },
          },
        },
        {
          sc_definitions: {
            id: {
              _nnull: true,
            },
            status: { _eq: CompetencyState.PENDING },
            due_date: { _gte: lastHour },
          },
        },
        {
          documents: {
            id: {
              _nnull: true,
            },
            read: { _null: true },
            due_date: { _gte: lastHour },
            status: { _eq: DirectusStatus.PUBLISHED },
          },
        },
        {
          policies: {
            id: {
              _nnull: true,
            },
            signed_on: { _null: true },
            due_date: { _gte: lastHour },
            status: { _eq: DirectusStatus.PUBLISHED },
          },
        },
      ],
    });

    return baseFilters;
  }, [filters, agencyFilters]);

  const allAttemptsUsedFilters = useMemo(() => {
    const baseFilters = structuredClone(filters);

    baseFilters._and?.push(clinicianRoleFilter);
    baseFilters._and?.push(lastAccessFilter);
    if (agencyFilters) {
      baseFilters._and?.push(agencyFilters);
    }

    return baseFilters;
  }, [filters, agencyFilters]);

  const summaryQuery = useSysUsersForComplianceSummaryQuery({
    variables: {
      completedAssignmentsFilter: completedAssignmentsFilters,
      noLoginFilters: awaitingUserLoginFilters,
      incompletedAssignmentsFilter: incompleteAssignmentsFilters,
      allAttemptsUsedFilters: allAttemptsUsedFilters,
    },
  });

  const cliniciansWithAllAttemptsUsed = useMemo(() => {
    return summaryQuery.data?.allAttemptsUsed.filter((user) => {
      const exams = user?.exams?.filter(
        (exam) => exam?.attempts_used === exam?.allowed_attempts
      );

      const modules = user?.modules?.filter(
        (module) => module?.attempts_used === module?.allowed_attempts
      );

      if (!exams?.length && !modules?.length) return false;

      return true;
    });
  }, [summaryQuery.data?.allAttemptsUsed]);

  const cliniciansWithAllAssignmentsCompleted = useMemo(() => {
    return summaryQuery.data?.cliniciansWithCompletedAssignments.filter(
      (user) => {
        const exams = user?.exams;
        const modules = user?.modules;
        const scDefinitions = user?.sc_definitions;
        const documents = user?.documents;
        const policies = user?.policies;

        const allExamsApproved =
          exams &&
          exams.every(
            (exam) =>
              exam?.status === CompetencyState.COMPLETED ||
              exam?.status === CompetencyState.FAILED
          );

        const allModulesApproved =
          modules &&
          modules.every(
            (module) => module?.status === CompetencyState.FINISHED
          );

        const allSCDefinitionsApproved =
          scDefinitions &&
          scDefinitions.every(
            (scDefinition) => scDefinition?.status === CompetencyState.COMPLETED
          );

        const allDocumentsRead =
          documents && documents.every((document) => document?.read);

        const allPoliciesSigned =
          policies && policies.every((policy) => policy?.signed_on);

        return (
          allExamsApproved &&
          allModulesApproved &&
          allSCDefinitionsApproved &&
          allDocumentsRead &&
          allPoliciesSigned
        );
      }
    );
  }, [summaryQuery.data?.cliniciansWithCompletedAssignments]);

  const renderTooltipContent = (tooltipCopy: TooltipCopys) => {
    return (
      <p className="w-56 rounded bg-black/80 p-2 text-xs text-white">
        {tooltipCopy}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <Tooltip
        placement="top"
        showArrow
        content={renderTooltipContent(TooltipCopys.SUMMARY)}
      >
        <h1 className="noprint w-min text-xl font-semibold">Summary</h1>
      </Tooltip>

      {currentAgency.loaded && currentAgency.currentAgency?.id && (
        <SummaryFilters setFilters={setFilters} />
      )}

      <div className="grid grid-cols-1 place-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UsersListCard
          tooltipContent={renderTooltipContent(
            TooltipCopys.ASSIGNMENTS_COMPLETE
          )}
          users={cliniciansWithAllAssignmentsCompleted}
          title="Assignments Complete"
          icon={faCircleCheck}
          iconColor="green"
          loading={summaryQuery.loading}
        />
        <UsersListCard
          tooltipContent={renderTooltipContent(
            TooltipCopys.ASSIGNMENTS_AWAITING_USER_LOGIN
          )}
          users={summaryQuery.data?.assignmentsAwaitingUserLogin}
          title="Assignments awaiting user login"
          icon={faExclamationCircle}
          iconColor="yellow"
          loading={summaryQuery.loading}
        />
        <UsersListCard
          tooltipContent={renderTooltipContent(
            TooltipCopys.ASSIGNMENTS_INCOMPLETE
          )}
          users={summaryQuery.data?.cliniciansWithIncompletedAssignments}
          title="Assignments incomplete"
          icon={faStopCircle}
          iconColor="red"
          loading={summaryQuery.loading}
        />
        <UsersListCard
          tooltipContent={renderTooltipContent(TooltipCopys.ALL_ATTEMPTS_USED)}
          users={cliniciansWithAllAttemptsUsed}
          title="All attempts used"
          icon={faExclamationTriangle}
          iconColor="orange"
          loading={summaryQuery.loading}
        />
      </div>
    </div>
  );
};
