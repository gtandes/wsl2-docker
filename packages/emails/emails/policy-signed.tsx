import * as React from "react";
import { Text, Link } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";

const defaultEmailData = {
  previewText: "Policy Signed",
  user: {
    first_name: "John",
    last_name: "Doe",
    email: "johondoe@email.com",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  policy: {
    title: "Policy Name",
    signature_link: "https://www.google.com",
  },
};

export const PolicySignedEmail = ({ props = defaultEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        We are thrilled to inform you that one of your potential placements, {props.user.first_name}{" "}
        {props.user.last_name}, has just successfully signed the {props.policy.title} policy!
      </Text>
      <Text className="text-gray-600">
        Thank you for choosing Healthcare Staffing Hire for your competency testing needs. If you have any further
        questions or need additional information, please do not hesitate to reach out to our team. We are here to assist
        you every step of the way.
      </Text>
      <Text className="text-gray-600">
        If you would like to print the signed policy or review the details, please click on this link:{" "}
        <Link href={props.policy.signature_link}>[Click Here]</Link>
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

export default PolicySignedEmail;
