import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  FontAwesomeIconProps,
  FontAwesomeIcon,
} from "@fortawesome/react-fontawesome";
import { UserForComplianceSummaryFragment } from "api";
import { formatDateForCSV } from "../../../../utils/format";
import Button from "../../../Button";
import { Spinner } from "../../../Spinner";
import { Tooltip } from "../../../utils/Tooltip";
import { stringifyCSV } from "../../../../utils/utils";

interface UsersListCardProps {
  users?: UserForComplianceSummaryFragment[];
  title: string;
  icon: IconDefinition;
  iconColor: FontAwesomeIconProps["color"];
  loading: boolean;
  tooltipContent: React.ReactNode;
}

export const UsersListCard: React.FC<UsersListCardProps> = ({
  users,
  title,
  icon,
  iconColor,
  loading,
  tooltipContent,
}) => {
  const downloadCSV = () => {
    const csvHeaders = [
      "First Name",
      "Last Name",
      "Email",
      "Specialties",
      "Departments",
      "Locations",
      "Supervisors",
      "Assigned Date",
      "Due Date",
      "Content Name",
      "Content Type",
      "Status",
      "Expiration Date",
    ];

    const csvRows: string[][] = [];

    users?.forEach((user) => {
      user.exams?.forEach((exam) => {
        const userAgency = user.agencies?.find(
          (agency) => agency?.agencies_id?.id === exam?.agency?.id
        );

        const specialities = userAgency?.specialties
          ?.map((speciality) => speciality?.specialties_id?.name)
          .join(", ");

        const departments = userAgency?.departments
          ?.map((department) => department?.departments_id?.name)
          .join(", ");

        const locations = userAgency?.locations
          ?.map((location) => location?.locations_id?.name)
          .join(", ");

        const supervisors = userAgency?.supervisors
          ?.map(
            (supervisor) =>
              `${supervisor?.directus_users_id?.first_name} ${supervisor?.directus_users_id?.last_name}`
          )
          .join(", ");

        csvRows.push([
          user.first_name || "",
          user.last_name || "",
          user.email || "",
          specialities || "",
          departments || "",
          locations || "",
          supervisors || "",
          formatDateForCSV(exam?.assigned_on),
          formatDateForCSV(exam?.due_date),
          exam?.exams_id?.title || "",
          "Exam",
          exam?.status || "",
          formatDateForCSV(exam?.expires_on),
        ]);
      });

      user.modules?.forEach((module) => {
        const userAgency = user.agencies?.find(
          (agency) => agency?.agencies_id?.id === module?.agency?.id
        );

        const specialities = userAgency?.specialties
          ?.map((speciality) => speciality?.specialties_id?.name)
          .join(", ");

        const departments = userAgency?.departments
          ?.map((department) => department?.departments_id?.name)
          .join(", ");

        const locations = userAgency?.locations
          ?.map((location) => location?.locations_id?.name)
          .join(", ");

        const supervisors = userAgency?.supervisors
          ?.map(
            (supervisor) =>
              `${supervisor?.directus_users_id?.first_name} ${supervisor?.directus_users_id?.last_name}`
          )
          .join(", ");

        csvRows.push([
          user.first_name || "",
          user.last_name || "",
          user.email || "",
          specialities || "",
          departments || "",
          locations || "",
          supervisors || "",
          formatDateForCSV(module?.assigned_on),
          formatDateForCSV(module?.due_date),
          module?.modules_definition_id?.title || "",
          "Module",
          module?.status || "",
          formatDateForCSV(module?.expires_on),
        ]);
      });

      user.sc_definitions?.forEach((scDefinition) => {
        const userAgency = user.agencies?.find(
          (agency) => agency?.agencies_id?.id === scDefinition?.agency?.id
        );

        const specialities = userAgency?.specialties
          ?.map((speciality) => speciality?.specialties_id?.name)
          .join(", ");

        const departments = userAgency?.departments
          ?.map((department) => department?.departments_id?.name)
          .join(", ");

        const locations = userAgency?.locations
          ?.map((location) => location?.locations_id?.name)
          .join(", ");

        const supervisors = userAgency?.supervisors
          ?.map(
            (supervisor) =>
              `${supervisor?.directus_users_id?.first_name} ${supervisor?.directus_users_id?.last_name}`
          )
          .join(", ");

        csvRows.push([
          user.first_name || "",
          user.last_name || "",
          user.email || "",
          specialities || "",
          departments || "",
          locations || "",
          supervisors || "",
          formatDateForCSV(scDefinition?.assigned_on),
          formatDateForCSV(scDefinition?.due_date),
          scDefinition?.sc_definitions_id?.title || "",
          "Skill Checklist",
          scDefinition?.status || "",
          formatDateForCSV(scDefinition?.expires_on),
        ]);
      });

      user.documents?.forEach((document) => {
        const userAgency = user.agencies?.find(
          (agency) => agency?.agencies_id?.id === document?.agency?.id
        );

        const specialities = userAgency?.specialties
          ?.map((speciality) => speciality?.specialties_id?.name)
          .join(", ");

        const departments = userAgency?.departments
          ?.map((department) => department?.departments_id?.name)
          .join(", ");

        const locations = userAgency?.locations
          ?.map((location) => location?.locations_id?.name)
          .join(", ");

        const supervisors = userAgency?.supervisors
          ?.map(
            (supervisor) =>
              `${supervisor?.directus_users_id?.first_name} ${supervisor?.directus_users_id?.last_name}`
          )
          .join(", ");

        csvRows.push([
          user.first_name || "",
          user.last_name || "",
          user.email || "",
          specialities || "",
          departments || "",
          locations || "",
          supervisors || "",
          formatDateForCSV(document?.assigned_on),
          formatDateForCSV(document?.due_date),
          document?.documents_id?.title || "",
          "Document",
          document?.read ? "Completed" : "Incomplete",
          formatDateForCSV(document?.expires_on),
        ]);
      });

      user.policies?.forEach((policy) => {
        const userAgency = user.agencies?.find(
          (agency) => agency?.agencies_id?.id === policy?.agency?.id
        );

        const specialities = userAgency?.specialties
          ?.map((speciality) => speciality?.specialties_id?.name)
          .join(", ");

        const departments = userAgency?.departments
          ?.map((department) => department?.departments_id?.name)
          .join(", ");

        const locations = userAgency?.locations
          ?.map((location) => location?.locations_id?.name)
          .join(", ");

        const supervisors = userAgency?.supervisors
          ?.map(
            (supervisor) =>
              `${supervisor?.directus_users_id?.first_name} ${supervisor?.directus_users_id?.last_name}`
          )
          .join(", ");

        csvRows.push([
          user.first_name || "",
          user.last_name || "",
          user.email || "",
          specialities || "",
          departments || "",
          locations || "",
          supervisors || "",
          formatDateForCSV(policy?.assigned_on),
          formatDateForCSV(policy?.due_date),
          policy?.policies_id?.name || "",
          "Policy",
          policy?.signed_on ? "Completed" : "Incomplete",
          formatDateForCSV(policy?.expires_on),
        ]);
      });
    });

    const csvContent = stringifyCSV(csvHeaders, csvRows);

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", `data:text/csv;charset=utf-8,${encodedUri}`);
    link.setAttribute("download", `${title}-${new Date().toString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex w-full flex-col rounded-lg bg-white p-3">
      <div className="flex justify-between">
        <Tooltip content={tooltipContent} showArrow placement="top" offset={10}>
          <div className="flex items-center gap-2 text-xs font-medium">
            <FontAwesomeIcon icon={icon} color={iconColor} />
            <h3>{title}</h3>
          </div>
        </Tooltip>
        <Button
          onClick={downloadCSV}
          variant="outline"
          size="xs"
          label="Export"
        />
      </div>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : users && users.length > 0 ? (
        <div className="flex h-64 flex-col divide-y divide-gray-100 overflow-auto pt-2">
          {users?.map((user) => (
            <span
              key={user.id}
              className="px-1 py-2 text-sm font-semibold text-blue-700"
            >
              {user.first_name} {user.last_name}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-xs italic text-gray-600">
          It looks like there is no data to display at the moment.
        </div>
      )}
    </div>
  );
};
