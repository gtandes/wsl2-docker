import { Directus_Users, useUserCompetenciesQuery } from "api";
import { DashboardLayout } from "../../../components/clinicians/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { withAuth } from "../../../hooks/withAuth";
import { ClinicianGroup } from "../../../types/roles";
import {
  competencyParse,
  getExamCEU,
  getModuleCEU,
  policiesAndDocumentsStatus,
} from "../../../utils/user-competencies-utilities";
import { format, isValid, parseISO } from "date-fns";
import { Competencies } from "../../../types/global";
import React, { useMemo } from "react";
import { useAdminTable } from "../../../hooks/useAdminTable";
import CompetencyStatus from "../../../components/competencies/CompetencyStatus";
import { JsonParam, useQueryParam, withDefault } from "use-query-params";
import { useAgency } from "../../../hooks/useAgency";
import { CompetencyState, CompetencyType } from "types";
import { CompetencyCertificate } from "../../../components/competencies/CompetencyCertificate";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlus } from "@fortawesome/pro-thin-svg-icons";
import { useModal } from "../../../hooks/useModal";
import AssignSingleUserCompentenciesModal from "../../../components/competencies/AssignSingleUserCompentenciesModal";
import { useApolloClient } from "@apollo/client";

function Index() {
  const auth = useAuth();
  const globalAgency = useAgency();
  const { show } = useModal();
  const userId = String(auth.currentUser?.id);
  const apolloClient = useApolloClient();

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
      pageSize: 10,
    })
  );

  const userAgencies = useMemo<string[]>(() => {
    return auth.currentUser?.agencies.map((agency) => agency.id) || [];
  }, [auth]);

  const userCompetenciesQuery = useUserCompetenciesQuery({
    variables: {
      user: userId,
      agencies: userAgencies,
      offset: 0,
    },
    skip: globalAgency.currentAgency?.id === undefined,
  });

  const competencies = useMemo<Competencies[]>(() => {
    const userCompetencies: Competencies[] = [];

    if (userCompetenciesQuery.data?.exams.length) {
      const exams = userCompetenciesQuery.data.exams.map((ex) => {
        return competencyParse(
          ex as Competencies,
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
          po as Competencies,
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
          doc as Competencies,
          CompetencyType.DOCUMENT,
          doc.documents_id?.title,
          policiesAndDocumentsStatus(doc),
          null
        );
      });
      userCompetencies.push(...documents);
    }
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
          mo as Competencies,
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
    if (userCompetenciesQuery.data?.skills_checklists.length) {
      const skills_checklists =
        userCompetenciesQuery.data.skills_checklists.map((sc) =>
          competencyParse(
            sc as Competencies,
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

  const competenciesTable = useAdminTable<Competencies>({
    columns: [
      {
        header: "NAME",
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
                <div className="text-gray-500">
                  <span>
                    Attempts:{" "}
                    {`${row.original.attempts_used || 0}/${
                      row.original.allowed_attempts
                    }`}
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
        header: "AGENCY",
        accessorKey: "agency",
        id: "agency.name",
        enableSorting: false,
        cell: ({ row }) => row.original.agency.name,
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
        cell: ({ row }) => (
          <CompetencyStatus status={row.original.status as CompetencyState} />
        ),
      },
      {
        header: "SCORE",
        accessorKey: "score",
        enableSorting: false,
        cell: ({ row }) => row.original.score && `${row.original.score}%`,
      },
      {
        header: "CEUs",
        accessorKey: "ceu",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === CompetencyState.COMPLETED &&
          row.original.ceu &&
          row.original.ceu,
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
        header: "EXPIRES",
        accessorKey: "expires_on",
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original.expires_on!;
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
        header: "DUE DATE",
        accessorKey: "due_date",
        enableSorting: false,
        cell: ({ row }) => {
          const d = parseISO(
            row.original.due_date?.toISOString().split("T")[0]!
          );
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
        header: "COMPLETED",
        accessorKey: "finished_on",
        enableSorting: false,
        cell: ({ row }) => {
          let d: Date;

          if (row.original.type === CompetencyType.POLICY) {
            d = row.original.signed_on!;
          } else {
            d = row.original.finished_on!;
          }
          return isValid(d) ? (
            <div className="flex flex-col text-sm">
              <span className="text-gray-900">{format(d, "MMM dd, yyyy")}</span>
              <CompetencyCertificate
                userId={userId}
                competency={row.original}
                viewerRole="clinician"
              />
            </div>
          ) : (
            "-"
          );
        },
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
        auth.currentUser?.firstName,
        auth.currentUser?.lastName,
      ].join(" ")}`,
      disableClickOutside: true,
      panelClasses: "md:!w-[1000px]",
      children: (onClose) => (
        <AssignSingleUserCompentenciesModal
          users={
            [
              {
                id: auth.currentUser?.id,
              },
            ] as Directus_Users[]
          }
          refreshUserAssignments={() =>
            apolloClient.refetchQueries({
              include: [
                "UserCompetencies",
                "GetClinicianDashboardCompetencies",
                "GetClinicianDashboardItems",
                "GetClinicianDashboardAnalytics",
              ],
            })
          }
          onClose={onClose}
        />
      ),
    });
  };

  return (
    <DashboardLayout>
      <div className="m-0 flex flex-col md:px-6">
        <h1 className="text-2xl font-medium text-blue-800 sm:mb-12">History</h1>
        {globalAgency.currentAgency?.self_assigment_allow && (
          <div>
            <FontAwesomeIcon
              size="2x"
              icon={faCirclePlus}
              className="cursor-pointer bg-gray-50"
              onClick={showAssignCompetenciesModal}
            />
          </div>
        )}
        <competenciesTable.Component />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(Index, ClinicianGroup);
