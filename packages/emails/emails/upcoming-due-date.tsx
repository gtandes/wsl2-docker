import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text, Link } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Upcoming Due Date",
  user: {
    first_name: "John",
    last_name: "Doe",
    email: "johondoe@email.com",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  report_link: "https://www.google.com",
};

export const UpcomingDueDateEmail = ({ props = defaultEmailProps }) => {
  const userFullName = `${props.user.first_name} ${props.user.last_name}`;

  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">Dear {userFullName},</Text>
      <Text className="text-gray-600">We hope this message finds you well.</Text>
      <Text className="text-gray-600">
        We wanted to bring to your attention an important update regarding clinicians under your care who have
        approaching competency due dates. Ensuring their timely compliance is crucial, and {"we're"} here to support you
        in this endeavor.
      </Text>
      <Text className="text-gray-600">
        To view the complete list of clinicians with upcoming due dates, please click on the following link:{" "}
        <Link href={props.report_link}>Here</Link> or access the data directly via the embedded CSV.
      </Text>
      <Text className="text-gray-600">
        Thank you for entrusting Healthcare Staffing Hire with your competency testing needs. If you have any questions,
        require additional information, or need assistance, please {"don't"} hesitate to reach out to our dedicated
        support team. We are fully committed to assisting you every step of the way.
      </Text>
      <Text className="text-gray-600">
        Your dedication to healthcare excellence is truly appreciated, and {"we're"} here to help you maintain the
        highest standards.
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

export default UpcomingDueDateEmail;
