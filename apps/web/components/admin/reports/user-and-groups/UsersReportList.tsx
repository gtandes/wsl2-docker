import React, { useState } from "react";
import { useAdminTable } from "../../../../hooks/useAdminTable";
import {
  OnChangeFn,
  PaginationState,
  Row,
  SortingState,
} from "@tanstack/react-table";
import {
  formatDateForCSV,
  formatDateTime,
  formatDateTimeSplitted,
} from "../../../../utils/format";
import { UserForReportsFragment } from "api";
import { first, isNull } from "lodash";
import {
  UsersAndGroupsNonCompliantReportsExport,
  UsersAndGroupsReportsExport,
} from "../../../../types/reports";
import { CompetencyState, DirectusStatus, UserRole } from "types";
import { escapeCSVField } from "../../../../utils/utils";

export const ACCESSORS = {
  Name: "last_name",
  "Last Access": "last_access",
};

export enum UserReportStatus {
  READY_FOR_PLACEMENT = "Ready for placement",
  IN_PROGRESS = "In progress",
  NOT_STARTED = "Not started",
}

export type UserReportStatusType = typeof UserReportStatus;

export type UserReportCompletionStatusType = {
  completed: number;
  total: number;
};

export type UserReportItemType = {
  id: string;
  name: string;
  email: string;
  globalStatus: UserReportStatus;
  modulesStatus: UserReportCompletionStatusType;
  policiesStatus: UserReportCompletionStatusType;
  examsStatus: UserReportCompletionStatusType;
  skillsChecklistStatus: UserReportCompletionStatusType;
  documentsStatus: UserReportCompletionStatusType;
  lastAccess: Date;
  status: string;
  departments: string[];
  locations: string[];
  specialties: string[];
  supervisors: string[];
};

const calculateUserStatus = (
  competenciesStatuses: UserReportCompletionStatusType[]
): UserReportStatus => {
  if (
    competenciesStatuses.every(
      (competency) =>
        competency.total >= 0 && competency.completed === competency.total
    )
  )
    return UserReportStatus.READY_FOR_PLACEMENT;

  if (
    competenciesStatuses.some(
      (competency) =>
        competency.total > 0 && competency.completed < competency.total
    )
  )
    return UserReportStatus.IN_PROGRESS;

  return UserReportStatus.NOT_STARTED;
};

const getModulesCompletionStatus = (
  user: UserForReportsFragment
): UserReportCompletionStatusType => {
  return {
    completed:
      user.modules?.filter(
        (module) => module?.status === CompetencyState.FINISHED
      ).length || 0,
    total: user.modules?.length || 0,
  };
};
const getDocumentsCompletionStatus = (
  user: UserForReportsFragment
): UserReportCompletionStatusType => {
  return {
    completed: user.documents?.filter((doc) => !isNull(doc?.read)).length || 0,
    total: user.documents?.length || 0,
  };
};
const getPoliciesCompletionStatus = (
  user: UserForReportsFragment
): UserReportCompletionStatusType => {
  return {
    completed:
      user.policies?.filter((policy) => !isNull(policy?.signed_on)).length || 0,
    total: user.policies?.length || 0,
  };
};
const getSkillsCompletionStatus = (
  user: UserForReportsFragment
): UserReportCompletionStatusType => {
  return {
    completed:
      user.sc_definitions?.filter(
        (sc) => sc?.status === CompetencyState.COMPLETED
      ).length || 0,
    total: user.sc_definitions?.length || 0,
  };
};
const getExamsCompletionStatus = (
  user: UserForReportsFragment
): UserReportCompletionStatusType => {
  return {
    completed:
      user.exams?.filter((exam) => exam?.status === CompetencyState.COMPLETED)
        .length || 0,
    total: user.exams?.length || 0,
  };
};

export const getUserStatus = (
  user: UserForReportsFragment,
  currentAgencyid?: string
) => {
  let status = user.status;

  const currentAgency = user.agencies?.find(
    (agency) => agency?.agencies_id?.id! === currentAgencyid
  );

  if (currentAgency && currentAgency?.status !== DirectusStatus.ARCHIVED) {
    status = currentAgency?.status;
  }

  return status;
};

const getDepartments = (
  user: UserForReportsFragment,
  currentAgencyId?: string
) => {
  const currentAgency = user.agencies?.find(
    (agency) => agency?.agencies_id?.id! === currentAgencyId
  );

  return currentAgency?.departments?.map((d) => d!.departments_id?.name!)!;
};

const getLocations = (
  user: UserForReportsFragment,
  currentAgencyId?: string
) => {
  const currentAgency = user.agencies?.find(
    (agency) => agency?.agencies_id?.id! === currentAgencyId
  );

  return currentAgency?.locations?.map((l) => l!.locations_id?.name!)!;
};

const getSupervisors = (
  user: UserForReportsFragment,
  currentAgencyId?: string
) => {
  const currentAgency = user.agencies?.find(
    (agency) => agency?.agencies_id?.id! === currentAgencyId
  );

  return currentAgency?.supervisors?.map(
    (p) =>
      `${p?.directus_users_id?.first_name} ${p?.directus_users_id?.last_name}`
  )!;
};

const getSpecialties = (
  user: UserForReportsFragment,
  currentAgencyId?: string
) => {
  const currentAgency = user.agencies?.find(
    (agency) => agency?.agencies_id?.id! === currentAgencyId
  );

  return currentAgency?.specialties?.map((s) => s?.specialties_id?.name || "")!;
};

export const processUserForList = (
  userReport: UserForReportsFragment,
  currentAgencyId: string
): UserReportItemType => {
  const modulesStatus = getModulesCompletionStatus(userReport);
  const policiesStatus = getPoliciesCompletionStatus(userReport);
  const examsStatus = getExamsCompletionStatus(userReport);
  const skillsChecklistStatus = getSkillsCompletionStatus(userReport);
  const documentsStatus = getDocumentsCompletionStatus(userReport);
  const userStatus = getUserStatus(userReport, currentAgencyId);
  const departments = getDepartments(userReport, currentAgencyId);
  const locations = getLocations(userReport, currentAgencyId);
  const supervisors = getSupervisors(userReport, currentAgencyId);
  const specialties = getSpecialties(userReport, currentAgencyId);

  return {
    id: userReport.id,
    name: userReport.first_name + " " + (userReport.last_name || ""),
    email: userReport.email!,
    globalStatus: calculateUserStatus([
      modulesStatus,
      policiesStatus,
      examsStatus,
      skillsChecklistStatus,
      documentsStatus,
    ]),
    modulesStatus: modulesStatus,
    policiesStatus: policiesStatus,
    examsStatus: examsStatus,
    skillsChecklistStatus: skillsChecklistStatus,
    documentsStatus: documentsStatus,
    lastAccess: userReport.last_access!,
    status: userStatus!,
    departments,
    locations,
    specialties,
    supervisors,
  };
};

export const processUserForExport = (
  user: UserForReportsFragment,
  currentAgencyId: string
): UsersAndGroupsReportsExport => {
  const processedUser = processUserForList(user, currentAgencyId);
  return {
    name: processedUser.name,
    email: processedUser.email,
    globalStatus: processedUser.globalStatus,
    modulesStatus: `${processedUser.modulesStatus.completed}/${processedUser.modulesStatus.total}`,
    policiesStatus: `${processedUser.policiesStatus.completed}/${processedUser.policiesStatus.total}`,
    examsStatus: `${processedUser.examsStatus.completed}/${processedUser.examsStatus.total}`,
    skillsChecklistStatus: `${processedUser.skillsChecklistStatus.completed}/${processedUser.skillsChecklistStatus.total}`,
    documentsStatus: `${processedUser.documentsStatus.completed}/${processedUser.documentsStatus.total}`,
    lastAccess: formatDateTime(processedUser.lastAccess),
    departments: escapeCSVField(processedUser.departments?.join(", ")),
    locations: escapeCSVField(processedUser.locations?.join(", ")),
    specialties: escapeCSVField(processedUser.specialties?.join(", ")),
    supervisors: escapeCSVField(processedUser.supervisors?.join(", ")),
  };
};

export const processNonCompliantUsersForReport = (
  user: UserForReportsFragment
): UsersAndGroupsNonCompliantReportsExport[] => {
  const userInfo = {
    department:
      first(user.agencies)
        ?.departments?.map((d) => d?.departments_id?.name || "")
        .join(", ") || "",
    location:
      first(user.agencies)
        ?.locations?.map((l) => l?.locations_id?.name || "")
        .join(", ") || "",
    speciality:
      first(user.agencies)
        ?.specialties?.map((s) => s?.specialties_id?.name || "")
        .join(", ") || "",
    supervisors:
      first(user.agencies)
        ?.supervisors?.map(
          (s) =>
            `${s?.directus_users_id?.first_name} ${s?.directus_users_id?.last_name}` ||
            ""
        )
        .join(", ") || "",
    clinicianFirstName: user.first_name || "",
    clinicianLastName: user.last_name || "",
    email: user.email || "",
  };

  const exams = user.exams?.map((e) => ({
    ...userInfo,
    contentType: "Exam",
    contentTitle: e?.exams_id?.title || "",
    assignmentDate: formatDateForCSV(e?.assigned_on) || "",
    dueDate: formatDateForCSV(e?.due_date) || "",
    assignmentStatus: e?.status || "",
    expirationDate: formatDateForCSV(e?.expires_on) || "",
  }));

  const modules = user.modules?.map((m) => ({
    ...userInfo,
    contentType: "Module",
    contentTitle: m?.modules_definition_id?.title || "",
    assignmentDate: formatDateForCSV(m?.assigned_on) || "",
    dueDate: formatDateForCSV(m?.due_date) || "",
    assignmentStatus: m?.status || "",
    expirationDate: formatDateForCSV(m?.expires_on) || "",
  }));

  const policies = user.policies?.map((p) => ({
    ...userInfo,
    contentType: "Policy",
    contentTitle: p?.policies_id?.name || "",
    assignmentDate: formatDateForCSV(p?.assigned_on) || "",
    dueDate: formatDateForCSV(p?.due_date) || "",
    assignmentStatus: p?.signed_on
      ? CompetencyState.SIGNED
      : CompetencyState.UNSIGNED,
    expirationDate: formatDateForCSV(p?.expires_on) || "",
  }));

  const skillsChecklists = user.sc_definitions?.map((sc) => ({
    ...userInfo,
    contentType: "Skills Checklist",
    contentTitle: sc?.sc_definitions_id?.title || "",
    assignmentDate: formatDateForCSV(sc?.assigned_on) || "",
    dueDate: formatDateForCSV(sc?.due_date) || "",
    assignmentStatus: sc?.status || "",
    expirationDate: formatDateForCSV(sc?.expires_on) || "",
  }));

  const documents = user.documents?.map((d) => ({
    ...userInfo,
    contentType: "Document",
    contentTitle: d?.documents_id?.title || "",
    assignmentDate: formatDateForCSV(d?.assigned_on) || "",
    dueDate: formatDateForCSV(d?.due_date) || "",
    assignmentStatus: d?.read ? CompetencyState.READ : CompetencyState.UNREAD,
    expirationDate: formatDateForCSV(d?.expires_on) || "",
  }));

  return [
    ...(exams || []),
    ...(modules || []),
    ...(policies || []),
    ...(skillsChecklists || []),
    ...(documents || []),
  ];
};

export const getDateTimeRow = (datetime: string | Date) => {
  const { date, time } = formatDateTimeSplitted(datetime as string);
  return (
    <div>
      {date} <br />
      <span className="text-gray-500">{time}</span>
    </div>
  );
};

const getStatusRow = (status: UserReportStatus) => {
  let color: string;
  switch (status) {
    case UserReportStatus.READY_FOR_PLACEMENT:
      color = "green";
      break;
    case UserReportStatus.IN_PROGRESS:
      color = "blue";
      break;
    case UserReportStatus.NOT_STARTED:
      color = "yellow";
      break;
    default:
      color = "gray";
  }
  return (
    <div
      className={`rounded-md bg-${color}-100 text-sm font-medium text-${color}-700 whitespace-pre-wrap p-1`}
    >
      {status.replaceAll("_", " ")}
    </div>
  );
};

const getGroupColumn = (s: string[], name: string, pluralName: string) => (
  <div>
    {s.length > 0 ? (
      <span className="text-gray-400">
        {s.length === 1 ? name : pluralName}:{" "}
      </span>
    ) : (
      ""
    )}
    {s.join(", ").toString()}
  </div>
);

const goToUserDetails = (id: string) => {
  window.open(`/admin/dashboard/reports/${id}/user-details`, "_self");
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "green";
    default:
      return "gray";
  }
};

const tableColumns = [
  {
    header: "Name",
    accessorFn: () => ({}),
    enableSorting: true,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="flex w-[240px] flex-col items-center justify-between">
        <div
          className="mr-1 flex cursor-pointer flex-col text-center"
          onClick={() => goToUserDetails(row.original.id)}
        >
          <span className="font-semibold">{row.original.name}</span>
          <span className="text-sm text-gray-400">{row.original.email}</span>
        </div>
        <div
          className={`rounded-md bg-${getStatusColor(
            row.original.status
          )}-100 text-${getStatusColor(
            row.original.status
          )}-800 h-5 px-1 font-semibold`}
        >
          {row.original.status}
        </div>
      </div>
    ),
  },
  {
    header: "Group By",
    accessorFn: () => ({}),
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[200px] whitespace-pre-wrap text-xs">
        <div>
          {getGroupColumn(row.original.departments, "Document", "Documents")}
        </div>
        <div>
          {getGroupColumn(row.original.locations, "Location", "Locations")}
        </div>
        <div>
          {getGroupColumn(row.original.specialties, "Specialty", "Specialties")}
        </div>
        <div>
          {getGroupColumn(
            row.original.supervisors,
            "Supervisor",
            "Supervisors"
          )}
        </div>
      </div>
    ),
  },
  {
    header: "Status",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="-ml-1 w-[90px] text-center">
        {getStatusRow(row.original.globalStatus)}
      </div>
    ),
  },
  {
    header: "Supervisors",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="items-left flex w-[150px] flex-col justify-between">
        {row.original.supervisors.map((supervisor, index) => (
          <span key={index} className="block">
            {supervisor}
          </span>
        ))}
      </div>
    ),
  },
  {
    header: "Specialties",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="items-left flex w-[150px] flex-col justify-between">
        {row.original.specialties.map((specialty, index) => (
          <span key={index} className="block">
            {specialty}
          </span>
        ))}
      </div>
    ),
  },
  {
    header: "Locations",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="items-left w-[150px]">{row.original.locations}</div>
    ),
  },
  {
    header: "Exams",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[50px] text-center">
        {row.original.examsStatus.completed}/{row.original.examsStatus.total}
      </div>
    ),
  },
  {
    header: "Modules",
    accessorKey: "module",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[50px] text-center">
        {row.original.modulesStatus.completed}/
        {row.original.modulesStatus.total}
      </div>
    ),
  },
  {
    header: "Skills Checklists",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="m-auto w-[50px] ">
        {row.original.skillsChecklistStatus.completed}/
        {row.original.skillsChecklistStatus.total}
      </div>
    ),
  },
  {
    header: "Policies",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[50px] text-center">
        {row.original.policiesStatus.completed}/
        {row.original.policiesStatus.total}
      </div>
    ),
  },
  {
    header: "Documents",
    enableSorting: false,
    cell: ({ row }: { row: Row<UserReportItemType> }) => (
      <div className="w-[50px] text-center">
        {row.original.documentsStatus.completed}/
        {row.original.documentsStatus.total}
      </div>
    ),
  },
  {
    header: "Last Access",
    enableSorting: true,
    accessorFn: () => ({}),
    cell: ({ row }: { row: Row<UserReportItemType> }) =>
      getDateTimeRow(row.original.lastAccess),
  },
];

interface Props {
  data: UserReportItemType[];
  totalItems: number;
  isLoading: boolean;
  sort: SortingState;
  setSort: OnChangeFn<SortingState>;
  page: PaginationState;
  pageCount: number;
  setPage: OnChangeFn<PaginationState>;
  pageSize: number;
  spinnerClasses?: string;
}

export const UsersReportList: React.FC<Props> = ({
  data,
  totalItems,
  isLoading,
  sort,
  setSort,
  page,
  pageCount,
  setPage,
  spinnerClasses,
}: Props) => {
  const [rowSelection, setRowSelection] = useState({});

  const usersReportList = useAdminTable<UserReportItemType>({
    columns: tableColumns,
    data: data,
    pageCount: pageCount,
    paginate: [page, setPage],
    sort: [sort, setSort],
    loading: isLoading,
    totalItems: totalItems,
    rowSelection: [rowSelection, setRowSelection],
    spinnerClasses: spinnerClasses,
  });

  return <usersReportList.Component />;
};
