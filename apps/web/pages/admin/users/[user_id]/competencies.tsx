import React, { useMemo, useState } from "react";
import { format, isValid } from "date-fns";
import { AdminLayout } from "../../../../components/AdminLayout";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";
import {
  Directus_Users,
  useSysUserForAssigmentQuery,
  useUpdateDocumentCompetencyMutation,
  useUpdateExamCompetencyMutation,
  useUpdateModuleCompetencyMutation,
  useUpdatePolicyCompetencyMutation,
  useUpdateSkillChecklistCompetencyMutation,
  useUserCompetenciesQuery,
  useUserCompetenciesHshAdminViewQuery,
} from "api";
import { useRouter } from "next/router";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import { useQueryParam, withDefault, JsonParam } from "use-query-params";
import { AdminUserLayout } from "../../../../components/AdminUserLayout";
import { faCircle0, faEllipsis } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { notify } from "../../../../components/Notification";
import { useModal } from "../../../../hooks/useModal";
import { faCirclePlus, faCircleMinus } from "@fortawesome/pro-thin-svg-icons";
import AssignSingleUserCompentenciesModal from "../../../../components/competencies/AssignSingleUserCompentenciesModal";
import CompetencyStatus from "../../../../components/competencies/CompetencyStatus";
import { Competencies as CompetencyTypes } from "../../../../types/global";
import {
  competencyParse,
  getExamCEU,
  getModuleCEU,
  policiesAndDocumentsStatus,
} from "../../../../utils/user-competencies-utilities";
import { useAgency } from "../../../../hooks/useAgency";
import {
  CompetencyState,
  CompetencyType,
  DirectusStatus,
  UserRole,
} from "types";
import Button from "../../../../components/Button";
import Link from "next/link";
import { CompetencyCertificate } from "../../../../components/competencies/CompetencyCertificate";
import { CompetencyActions } from "../../../../components/competencies/CompetencyActions";
import { Tooltip } from "../../../../components/utils/Tooltip";
import { clsx } from "clsx";
import AttemptHistoryModal from "../../../../components/competencies/AttemptHistoryModal";
import { formatExpiresOnDate } from "../../../../utils/format";
import { useAuth } from "../../../../hooks/useAuth";

const PAGE_SIZE = 10;

function Competencies() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const globalAgency = useAgency();
  const userId = router.query.user_id as string;
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>(
    []
  );
  const [checkedCompetencies, setCheckedCompetencies] =
    useState<boolean>(false);

  const [sort, setSort] = useQueryParam(
    "sort",
    withDefault(JsonParam, [
      {
        id: "assigned_on",
        desc: false,
      },
    ])
  );

  const [page, setPage] = useQueryParam(
    "page",
    withDefault(JsonParam, {
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    })
  );

  const sysUserQuery = useSysUserForAssigmentQuery({
    variables: {
      id: userId,
    },
  });

  const queryVariables = {
    variables: {
      user: userId,
      agencies: globalAgency.currentAgency?.id
        ? [globalAgency.currentAgency?.id]
        : [],
      offset: page.pageIndex * PAGE_SIZE,
    },
    skip: globalAgency.currentAgency?.id === undefined,
  };

  function useUserCompetencies(
    userId: string,
    pageIndex: number,
    agencyId?: string,
    role?: UserRole
  ) {
    const variables = {
      user: userId,
      agencies: agencyId ? [agencyId] : [],
      offset: pageIndex * PAGE_SIZE,
    };

    const isAdmin = role === UserRole.HSHAdmin;
    const shouldSkip = !agencyId;

    const hshAdminQuery = useUserCompetenciesHshAdminViewQuery({
      variables,
      skip: shouldSkip || !isAdmin,
    });

    const defaultQuery = useUserCompetenciesQuery({
      variables,
      skip: shouldSkip || isAdmin,
    });

    return isAdmin ? hshAdminQuery : defaultQuery;
  }

  const userCompetenciesQuery = useUserCompetencies(
    userId,
    page.pageIndex,
    globalAgency.currentAgency?.id,
    currentUser?.role
  );

  const competencyIds = {
    modules:
      userCompetenciesQuery.data?.modules.map(
        (mo) => mo.modules_definition_id?.id
      ) ?? [],
    exams: userCompetenciesQuery.data?.exams.map((ex) => ex.exams_id?.id) ?? [],
    policies:
      userCompetenciesQuery.data?.policies.map((po) => po.policies_id?.id) ??
      [],
    skillChecklists:
      userCompetenciesQuery.data?.skills_checklists.map(
        (sl) => sl.sc_definitions_id?.id
      ) ?? [],
    documents:
      userCompetenciesQuery.data?.documents.map((d) => d.documents_id?.id) ??
      [],
  };

  const competencies = useMemo<CompetencyTypes[]>(() => {
    const userCompetencies: CompetencyTypes[] = [];

    if (userCompetenciesQuery.data?.modules.length) {
      const modules = userCompetenciesQuery.data.modules.map((mo) => {
        const moduleStatus = mo.status as CompetencyState;
        let status: CompetencyState;
        const attemptsUsed = mo.attempts_used ?? 0;
        const outOfAttempts = attemptsUsed >= (mo.allowed_attempts ?? 0);

        if (moduleStatus === CompetencyState.FINISHED && mo.approved) {
          status = CompetencyState.COMPLETED;
        } else if (
          moduleStatus === CompetencyState.FINISHED &&
          !mo.approved &&
          outOfAttempts
        ) {
          status = CompetencyState.FAILED;
        } else if (!outOfAttempts && attemptsUsed > 0) {
          status = CompetencyState.STARTED;
        } else {
          status = moduleStatus;
        }

        return competencyParse(
          mo as CompetencyTypes,
          CompetencyType.MODULE,
          mo.modules_definition_id?.title,
          status,
          getModuleCEU(mo),
          mo.import_cert_url!,
          mo.import_report_url!
        );
      });
      userCompetencies.push(...modules);
    }
    if (userCompetenciesQuery.data?.exams.length) {
      const exams = userCompetenciesQuery.data.exams
        .slice()
        .sort((a, b) =>
          a.exams_id?.title! > b.exams_id?.title!
            ? 1
            : b.exams_id?.title! > a.exams_id?.title!
            ? -1
            : 0
        )
        .map((ex) => {
          return competencyParse(
            ex as CompetencyTypes,
            CompetencyType.EXAM,
            ex.exams_id?.title,
            ex.status as CompetencyState,
            getExamCEU(ex),
            ex.import_cert_url!,
            ex.import_report_url!
          );
        });
      userCompetencies.push(...exams);
    }

    if (userCompetenciesQuery.data?.policies.length) {
      const policies = userCompetenciesQuery.data.policies.map((po) => {
        return competencyParse(
          po as CompetencyTypes,
          CompetencyType.POLICY,
          po.policies_id?.name,
          policiesAndDocumentsStatus(po),
          null
        );
      });
      userCompetencies.push(...policies);
    }
    if (userCompetenciesQuery.data?.documents.length) {
      const documents = userCompetenciesQuery.data.documents.map((doc) => {
        return competencyParse(
          doc as CompetencyTypes,
          CompetencyType.DOCUMENT,
          doc.documents_id?.title,
          policiesAndDocumentsStatus(doc),
          null
        );
      });
      userCompetencies.push(...documents);
    }
    if (userCompetenciesQuery.data?.skills_checklists.length) {
      const skills_checklists = userCompetenciesQuery.data.skills_checklists
        .slice()
        .sort((a, b) =>
          a.sc_definitions_id?.title! > b.sc_definitions_id?.title!
            ? 1
            : b.sc_definitions_id?.title! > a.sc_definitions_id?.title!
            ? -1
            : 0
        )
        .map((sc) =>
          competencyParse(
            sc as CompetencyTypes,
            CompetencyType.SKILL_CHECKLIST,
            sc.sc_definitions_id?.title,
            sc.status as CompetencyState,
            null,
            undefined,
            sc.import_report_url!
          )
        );
      userCompetencies.push(...skills_checklists);
    }

    return userCompetencies;
  }, [userCompetenciesQuery]);

  const { showConfirm, show } = useModal();
  const [archiveExam] = useUpdateExamCompetencyMutation();
  const [archivePolicy] = useUpdatePolicyCompetencyMutation();
  const [archiveDocument] = useUpdateDocumentCompetencyMutation();
  const [archiveModule] = useUpdateModuleCompetencyMutation();
  const [archiveSkillChecklist] = useUpdateSkillChecklistCompetencyMutation();

  const selectAllCompetencies = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (competencies.length > 0) {
      setSelectedCompetencies(
        e.target.checked
          ? (competencies.flatMap((c) => `${c.id}_${c.type}`) as string[])
          : []
      );
    }
    setCheckedCompetencies((prev) => !prev);
  };

  const selectCompetency = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let competencies = [...selectedCompetencies, value];

    if (selectedCompetencies.includes(value)) {
      competencies = competencies.filter((c) => c !== value);
    }
    setSelectedCompetencies(competencies);
  };

  const userAgencyStatus = useMemo(() => {
    const userAgencies = sysUserQuery.data?.users[0].agencies;
    return userAgencies?.find(
      (ag) => ag?.agencies_id?.id === globalAgency.currentAgency?.id
    )?.status;
  }, [globalAgency, sysUserQuery]);

  const userRole = useMemo<UserRole>(() => {
    return sysUserQuery.data?.users[0].role?.id as UserRole;
  }, [sysUserQuery]);

  const adminTable = useAdminTable<CompetencyTypes>({
    columns: [
      {
        header: () => (
          <input
            type="checkbox"
            className="text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300"
            checked={checkedCompetencies}
            onChange={selectAllCompetencies}
          />
        ),
        accessorKey: "bulk_remove",
        enableSorting: false,
        cell: ({ row }) => {
          const value = `${row.original.id}_${row.original.type}`;
          return (
            <input
              type="checkbox"
              value={value}
              className="text-indigo-600 focus:ring-indigo-600 h-4 w-4 rounded border-gray-300"
              checked={selectedCompetencies.includes(value)}
              onChange={selectCompetency}
            />
          );
        },
      },
      {
        header: "TITLE",
        accessorKey: "exams_id",
        enableSorting: false,
        id: "exams_id.title",
        cell: ({ row }) => {
          return (
            <div
              className="flex w-28 flex-col whitespace-normal text-sm"
              style={{ overflowWrap: "anywhere" }}
            >
              <span className="font-semibold">{row.original.name}</span>
              {row.original.type === CompetencyType.EXAM && (
                <div
                  className={clsx(
                    "text-gray-500",
                    row.original.score_history ? "cursor-pointer underline" : ""
                  )}
                  onClick={() => {
                    if (row.original.score_history && row.original.id) {
                      showHistoryAttempts(
                        row.original.score_history,
                        row.original.id as unknown as number
                      );
                    }
                  }}
                >
                  <span>
                    <Tooltip
                      content={
                        <div className="min-w-max rounded bg-black p-2 text-xs text-white">
                          <b>Attempts history</b>
                          <div className="mt-1 flex flex-col gap-1">
                            {row.original.score_history?.map((sh) => {
                              const scoreHistory = Array.isArray(
                                row.original.score_history
                              )
                                ? row.original.score_history
                                : [];

                              const lastAttempt = scoreHistory.reduce(
                                (max, s) => Math.max(max, s.attempt),
                                sh.attempt
                              );

                              const isLastAttempt = sh.attempt === lastAttempt;
                              const status = row.original.status ?? "";
                              const isReviewStatus =
                                isLastAttempt &&
                                [
                                  CompetencyState.IN_REVIEW,
                                  CompetencyState.INVALID,
                                ].includes(status as CompetencyState);

                              const scoreStatus = (
                                isReviewStatus ? status : sh.score_status ?? ""
                              ).replaceAll("_", " ");
                              const score =
                                sh.score_status !==
                                  CompetencyState.FAILED_TIMED_OUT &&
                                !isReviewStatus
                                  ? `${sh.score}%`
                                  : "";

                              return (
                                <div
                                  key={sh.attempt}
                                  className="flex items-center gap-2"
                                >
                                  <span className="flex w-20 justify-between text-right">
                                    <span>Attempt {sh.attempt}</span>
                                    <span>:</span>
                                  </span>
                                  <span className="w-8 text-right">
                                    {score || "--"}
                                  </span>
                                  <FontAwesomeIcon
                                    className="text-[6px]"
                                    icon={faCircle0}
                                  />
                                  <span className="w-24">{scoreStatus}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      }
                      showArrow
                      enabled={!!row.original.score_history}
                      placement="right"
                      offset={10}
                      arrowOptions={{ fill: "black" }}
                    >
                      Attempts:{" "}
                      {`${row.original.attempts_used || 0}/${
                        row.original.allowed_attempts
                      }`}
                    </Tooltip>
                  </span>
                </div>
              )}
              {row.original.reassigned && (
                <div className="w-fit rounded bg-blue-50 px-2 text-center text-xs font-medium text-blue-700">
                  reassigned
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: "TYPE",
        accessorKey: "type",
        id: "type",
        enableSorting: false,
        cell: ({ row }) => row.original.type,
      },
      {
        header: "STATUS",
        accessorKey: "status",
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <div className="flex flex-col gap-3">
              <CompetencyStatus
                status={row.original.status as CompetencyState}
              />
              <CompetencyCertificate
                userId={userId}
                competency={row.original}
                viewerRole="admin"
              />
            </div>
          );
        },
      },
      {
        header: "SCORE",
        accessorKey: "score",
        enableSorting: false,
        cell: ({ row }) => {
          if (
            row.original.status === CompetencyState.INVALID ||
            row.original.status === CompetencyState.IN_REVIEW
          ) {
            return "-";
          }

          const lastAttemptDetails = row.original.score_history
            ? row.original.score_history.at(-1)
            : null;

          const scoreStatus = lastAttemptDetails?.score_status;

          const isTimedOut =
            scoreStatus === CompetencyState.FAILED_TIMED_OUT ||
            scoreStatus === CompetencyState.IN_REVIEW;

          const isFinalState =
            scoreStatus === CompetencyState.COMPLETED ||
            scoreStatus === CompetencyState.FINISHED;

          if (isTimedOut) {
            return "-";
          }

          return isFinalState && row.original.score
            ? `${row.original.score}%`
            : "-";
        },
      },
      {
        header: "CEUs",
        accessorKey: "ceu",
        enableSorting: false,
        cell: ({ row }) => row.original.ceu,
      },
      {
        header: "ASSIGNED ON",
        accessorKey: "assigned_on",
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original.assigned_on!;
          return isValid(d) ? (
            <div className="flex flex-col text-sm">
              <span className="text-gray-900">{format(d, "MMM dd, yyyy")}</span>
            </div>
          ) : (
            "-"
          );
        },
      },
      {
        header: "STARTED",
        accessorKey: "started_on",
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original.started_on!;
          return isValid(d) ? (
            <div className="flex flex-col text-sm">
              <span className="text-gray-900">{format(d, "MMM dd, yyyy")}</span>
            </div>
          ) : (
            "-"
          );
        },
      },
      {
        header: "EXPIRES ON",
        accessorKey: "expires_on",
        enableSorting: false,
        cell: ({ row }) => {
          if (
            row.original.status === CompetencyState.INVALID ||
            row.original.status === CompetencyState.IN_REVIEW
          ) {
            return "-";
          }
          const d = row.original.expires_on!;
          return isValid(d) ? (
            <div className="flex flex-col text-sm">
              <span className="text-gray-900">{formatExpiresOnDate(d)}</span>
            </div>
          ) : (
            "-"
          );
        },
      },
      {
        header: "DUE DATE",
        accessorKey: "due_date",
        enableSorting: false,
        cell: ({ row }) => {
          const { due_date } = row.original;

          if (!due_date) return "-";

          const formattedDate = format(new Date(due_date), "MMM dd, yyyy");

          return (
            <div className="flex flex-col text-sm">
              <span className="text-gray-900">{formattedDate}</span>
            </div>
          );
        },
      },

      {
        header: "COMPLETED",
        accessorKey: "finished_on",
        enableSorting: false,
        cell: ({ row }) => {
          if (
            row.original.status === CompetencyState.INVALID ||
            row.original.status === CompetencyState.IN_REVIEW
          ) {
            return "-";
          }
          const finishedOn: Date | null | undefined =
            row.original.type === CompetencyType.POLICY
              ? row.original.signed_on
              : row.original.finished_on;

          const parts = finishedOn?.toUTCString().split(" ");
          const formatted = parts
            ? `${parts[2]} ${parts[1]}, ${parts[3]}`
            : null;

          return isValid(finishedOn) ? (
            <div className="flex flex-col text-sm">
              <span className="text-gray-900">{formatted}</span>
            </div>
          ) : (
            "-"
          );
        },
      },
      {
        header: () => <FontAwesomeIcon icon={faEllipsis} />,
        accessorKey: "actions",
        enableSorting: false,
        cell: ({ row }) => (
          <CompetencyActions
            competency={row.original}
            refetch={userCompetenciesQuery.refetch}
          />
        ),
      },
    ],
    data: competencies || [],
    pageCount: undefined,
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: userCompetenciesQuery.loading,
    totalItems: 0,
  });

  const showAssignCompetenciesModal = () => {
    show({
      title: `Assign Competencies - ${[
        sysUserQuery.data?.users[0].first_name,
        sysUserQuery.data?.users[0].last_name,
      ].join(" ")}`,
      disableClickOutside: true,
      panelClasses: "md:!w-[1000px]",
      children: (onClose) => (
        <AssignSingleUserCompentenciesModal
          users={sysUserQuery.data?.users as Directus_Users[]}
          excludedIds={
            currentUser?.role !== UserRole.HSHAdmin
              ? {
                  modules: competencyIds.modules.filter(
                    (id): id is string => id !== undefined
                  ),
                  exams: competencyIds.exams.filter(
                    (id): id is string => id !== undefined
                  ),
                  policies: competencyIds.policies.filter(
                    (id): id is string => id !== undefined
                  ),
                  skillChecklists: competencyIds.skillChecklists.filter(
                    (id): id is string => id !== undefined
                  ),
                  documents: competencyIds.documents.filter(
                    (id): id is string => id !== undefined
                  ),
                }
              : undefined
          }
          refreshUserAssignments={userCompetenciesQuery.refetch}
          onClose={onClose}
        />
      ),
    });
  };

  const showHistoryAttempts = (scoreHistory: any[], assignment_id: number) => {
    show({
      title: `Exam History`,
      panelClasses: "md:!w-[1000px]",
      children: () => (
        <AttemptHistoryModal
          scoreHistory={scoreHistory}
          assignmentId={assignment_id}
        />
      ),
    });
  };

  const bulkRemove = async () => {
    const confirmed = await showConfirm(
      "Are you sure you want to delete the assignments?"
    );

    if (confirmed && selectedCompetencies.length > 0) {
      const notfication = notify({
        title: "Success!",
        description: "Assignments removed successfully.",
        type: "success",
      });
      await Promise.all(
        selectedCompetencies.map(async (sc) => {
          const item = sc.split("_");
          const updateValues = {
            variables: {
              id: String(item.at(0)),
              data: {
                status: "archived",
              },
            },
            onCompleted: () => {
              notfication;
              userCompetenciesQuery.refetch();
            },
          };

          switch (item.at(1) as CompetencyType) {
            case CompetencyType.EXAM:
              await archiveExam(updateValues);
              break;
            case CompetencyType.POLICY:
              archivePolicy(updateValues);
              break;
            case CompetencyType.DOCUMENT:
              archiveDocument(updateValues);
              break;
            case CompetencyType.MODULE:
              archiveModule(updateValues);
              break;
            case CompetencyType.SKILL_CHECKLIST:
              archiveSkillChecklist(updateValues);
              break;
          }
          setSelectedCompetencies([]);
          setCheckedCompetencies(false);
        })
      );
    }
  };

  const isPlatformUser = currentUser?.role === UserRole.PlatformUser;
  const isClinician = userRole === UserRole.Clinician;
  const canBeAssignedCompetencies =
    userAgencyStatus === DirectusStatus.ACTIVE && isClinician;

  const renderCompetencyControls = () =>
    canBeAssignedCompetencies && (
      <>
        <FontAwesomeIcon
          size="2x"
          icon={faCirclePlus}
          className="cursor-pointer bg-gray-50"
          onClick={showAssignCompetenciesModal}
        />
        {selectedCompetencies.length > 0 && (
          <FontAwesomeIcon
            size="2x"
            icon={faCircleMinus}
            className="cursor-pointer bg-gray-50"
            onClick={bulkRemove}
          />
        )}
      </>
    );

  const Content = () => (
    <>
      <div className="mt-5 flex items-center justify-between gap-2 border-none">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-medium text-blue-800">Competencies</h1>
          {renderCompetencyControls()}
        </div>
        {!isPlatformUser && (
          <Link href={`/admin/dashboard/reports/${userId}/user-details`}>
            <Button label="User Report" />
          </Link>
        )}
      </div>
      <adminTable.Component />
    </>
  );

  return isPlatformUser ? (
    <div className="mx-5 my-10">
      <Content />
    </div>
  ) : (
    <AdminLayout>
      <AdminUserLayout>
        <Content />
      </AdminUserLayout>
    </AdminLayout>
  );
}

export default withAuth(Competencies, AdminGroup);
