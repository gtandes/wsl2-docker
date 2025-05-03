import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaultemailData = {
  previewText: "Expiring Competencies Report",
  agency: {
    name: "HSH",
    logo: "",
  },
};
export const ExpiringCompetenciesReport = ({ props = defaultemailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">Hello {props.agency.name},</Text>
      <Text className="text-gray-600">
        Attached to this email is the latest Expiring Competencies Report for {props.agency.name}, which includes a list
        of users with competencies that are nearing their expiration dates.
        <Text className="text-gray-600">
          Please review the attached report to identify and follow up with users who need to complete their competencies
          soon.
        </Text>
      </Text>
      <Text className="text-gray-600">
        If you have any questions or need further assistance, please don't hesitate to reach out. We're here to support
        you.
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Best regards,
        <br />
        Healthcare Staffing Hire
      </Text>
    </BaseAgencyEmail>
  );
};
export default ExpiringCompetenciesReport;
