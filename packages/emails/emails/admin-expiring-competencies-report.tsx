import * as React from "react";
import { Text, Link } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";

const defaultEmailProps = {
  previewText: "Expiring Competencies Report",
  user: {
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  reportDate: "2024-11-22",
  csvDownloadHref: "",
};

export const AdminExpiringCompetenciesEmail = ({ props = defaultEmailProps }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Hello {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        We hope this message finds you well.
        <br />
        <br />
        Attached to this email, {"you'll"} find the latest Expiring Competencies Report for {props.agency.name}. This
        report includes a comprehensive list of users whose competencies are approaching their expiration dates.
        <br />
        <br />
        <strong>Action Required:</strong> Please review the attached CSV report to identify users who need to complete
        their competencies soon. Timely follow-up is crucial to ensure that all necessary competencies are maintained.
        <br />
        <br />
        <strong>Attachment:</strong>
        <br />
        <Link
          href={props.csvDownloadHref}
          download={`Expiring_Competencies_Report_${props.reportDate}.csv`}
          className="text-blue-600 underline"
          target="_blank"
        >
          Expiring_Competencies_Report_{props.reportDate}.csv
        </Link>
        <br />
        <br />
        If you have any questions or need further assistance, please {"don't"} hesitate to reach out. {"We're"} here to
        support you.
      </Text>

      {/* Footer */}
      <Text className="text-gray-600">
        Best Regards,
        <br />
        Healthcare Staffing Hire
      </Text>
    </BaseAgencyEmail>
  );
};

export default AdminExpiringCompetenciesEmail;
