import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Document Read",
  user: {
    email: "johondoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  document: {
    title: "Document Name",
  },
};

export const DocumentReadEmail = ({ props = defaultEmailProps }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        We are thrilled to inform you that one of your potential placements, {props.user.first_name}{" "}
        {props.user.last_name}, has just successfully read the {props.document.title} document!
      </Text>
      <Text className="text-gray-600">
        Thank you for choosing Healthcare Staffing Hire for your competency testing needs. If you have any further
        questions or need additional information, please do not hesitate to reach out to our team. We are here to assist
        you every step of the way.
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

export default DocumentReadEmail;
