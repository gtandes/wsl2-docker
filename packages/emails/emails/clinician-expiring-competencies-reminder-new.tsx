import * as React from "react";
import { Text, Section } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { CompetencyType } from "../../types";

const defaultEmailProps = {
  previewText: "Clinician Expiring Competencies Reminder",
  user: {
    email: "davidrey.olarte@hs-hire.com",
    first_name: "David",
    last_name: "Olarte",
  },
  agency: {
    name: "AlliedStaff",
    logo: "",
  },
  assignments: [
    {
      name: "Basic Life Support Exam",
      expires_on: "2024-10-01",
      status: "Completed",
      type: "EXAMS",
    },
    {
      name: "Advanced Cardiac Life Support Exam",
      expires_on: "2024-09-15",
      status: "Completed",
      type: "EXAMS",
    },
    {
      name: "Infection Control Module",
      expires_on: "2024-08-05",
      status: "Completed",
      type: "MODULES",
    },
    {
      name: "Fire Safety Checklist",
      expires_on: "2024-07-20",
      status: "Completed",
      type: "SC_DEFINITIONS",
    },
    {
      name: "Patient Privacy Policy",
      expires_on: "2024-09-01",
      status: "Completed",
      type: "POLICIES",
    },
    {
      name: "Document Policy",
      expires_on: "2024-07-15",
      status: "Completed",
      type: "DOCUMENTS",
    },
    {
      name: "Emergency Preparedness Module",
      expires_on: "2024-08-25",
      status: "Completed",
      type: "MODULES",
    },
  ],
};

export const ClinicianExpiringCompetencyReminderEmail = ({ props = defaultEmailProps }) => {
  const renderTable = (title, assignments) => (
    <Section>
      <Text className="text-gray-600">
        <strong>{title}</strong>
      </Text>
      <table className="w-full table-fixed border-collapse mb-5">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-100 text-left w-1/2">Title</th>
            <th className="border border-gray-300 p-2 bg-gray-100 text-left w-1/2">Expiration Date</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment, index) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2">{assignment.name}</td>
              <td className="border border-gray-300 p-2">{assignment.expires_on}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );

  const filterAndSortAssignmentsByType = (assignments, type, alternativeType) =>
    assignments
      .filter((a) => a.type === type || a.type.toLowerCase() === alternativeType.toLowerCase())
      .sort((a, b) => new Date(a.expires_on).getTime() - new Date(b.expires_on).getTime());

  const exams = filterAndSortAssignmentsByType(props.assignments, CompetencyType.EXAM, "exams");
  const modules = filterAndSortAssignmentsByType(props.assignments, CompetencyType.MODULE, "modules");
  const checklists = filterAndSortAssignmentsByType(
    props.assignments,
    CompetencyType.SKILL_CHECKLIST,
    "sc_definitions",
  );
  const policies = filterAndSortAssignmentsByType(props.assignments, CompetencyType.POLICY, "policies");
  const documents = filterAndSortAssignmentsByType(props.assignments, CompetencyType.DOCUMENT, "documents");

  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Hello {props.user.first_name} {props.user.last_name},
      </Text>
      <Text className="text-gray-600">
        This is a friendly reminder from {props.agency.name} that several of your assigned competencies are approaching
        their expiration dates. Please review the details below:
      </Text>
      {exams.length > 0 && renderTable("Exams", exams)}
      {modules.length > 0 && renderTable("Modules", modules)}
      {checklists.length > 0 && renderTable("Skills Checklists", checklists)}
      {policies.length > 0 && renderTable("Policies", policies)}
      {documents.length > 0 && renderTable("Documents", documents)}
      <Text className="text-gray-600">
        To ensure you remain up-to-date, please log in to the training portal and complete these competencies before
        they expire.
      </Text>
      <Text className="text-gray-600">
        <b>Your account details:</b>
        <br />
        URL:{" "}
        <a href="https://app.healthcarestaffinghire.com" className="text-blue-500 underline">
          www.app.healthcarestaffinghire.com
        </a>
        <br />
        Email: {props.user.email}
      </Text>
      <Text className="text-gray-600">
        If you have forgotten your password, click the &#34;Forgot Password&#34; link on the training portal&#39;s login
        page.
      </Text>
      <Text className="text-gray-600">Thank you for your attention to this matter.</Text>
      <Text className="text-gray-600">
        Regards,
        <Text className="text-gray-600">{props.agency.name}</Text>
      </Text>
    </BaseAgencyEmail>
  );
};
export default ClinicianExpiringCompetencyReminderEmail;
