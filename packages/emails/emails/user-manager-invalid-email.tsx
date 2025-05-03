import * as React from "react";
import { Text } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";

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
  clinician: {
    name: "Jane doe",
    exam_name: "Proctored Exam",
  },
};

export const UserManagerInvalidEMail = ({ props = defaultEmailProps }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        We hope this message finds you well.
        <br />
        <br />
        The recent proctored exam attempt for {props.clinician.name} on {props.clinician.exam_name} has been reviewed by
        Integrity Advocate (IA) and was deemed invalid.
        <br />
        <br />
        You may now review the case and take the appropriate action:
        <br />
        ✅ Override the invalid status
        <br />
        This will allow the clinician to proceed with any remaining exam attempts.
        <br />
        Note: Once the status is changed, please allow approximately 15 minutes for the update to reflect in the HSH
        portal.
        <br />
        ❌ No Action Needed
        <br />
        This indicates acceptance of the invalid status and will prevent the clinician from continuing with further
        attempts for this assignment.
        <br />
        <br />
        If you have any questions or need further assistance, feel free to reach out.
      </Text>
      <PortalLink />
      {/* Footer */}
      <Text className="text-gray-600">
        Best Regards,
        <br />
        Healthcare Staffing Hire
      </Text>
    </BaseAgencyEmail>
  );
};

export default UserManagerInvalidEMail;
