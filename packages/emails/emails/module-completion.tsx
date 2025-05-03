import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text, Section, Link } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaultemailData = {
  previewText: "Module Completed",
  user: {
    email: "johondoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  module: {
    name: "Module Name",
    passed_date: "2021-01-01",
    score: 100,
    cert_url: "https://www.google.com",
  },
};

export const ModuleCompletionEmail = ({ props = defaultemailData }) => {
  const clinicianFullName = `${props.user.first_name} ${props.user.last_name}`;

  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        We are thrilled to inform you that one of your potential placements, {clinicianFullName}, has just successfully
        completed the {props.module.name} module on {props.module.passed_date} with a score of {props.module.score}%,
        resulting in a Pass!
      </Text>
      <Section>
        <Text className="text-gray-600 font-medium">
          Here are the details of {clinicianFullName}
          {"'s"} module:
        </Text>
        <Text className="text-gray-600">Name: {clinicianFullName}</Text>
        <Text className="text-gray-600">Module: {props.module.name}</Text>
        <Text className="text-gray-600">Date: {props.module.passed_date}</Text>
        <Text className="text-gray-600">Score: {props.module.score}%</Text>
        <Text className="text-gray-600">Result: Pass</Text>
      </Section>
      <Text className="text-gray-600">
        If you would like to print the result or review the details, please click on this link:{" "}
        <Link href={props.module.cert_url}>Here</Link>
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

export default ModuleCompletionEmail;
