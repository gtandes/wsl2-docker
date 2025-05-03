import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text, Section } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaultemailData = {
  previewText: "Module Failed",
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
    date: "2021-01-01",
    score: 100,
    attempts_used: 3,
    allowed_attempts: 3,
  },
};

export const ModuleFailedEmail = ({ props = defaultemailData }) => {
  const clinicianFullName = `${props.user.first_name} ${props.user.last_name}`;

  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        We hope this message finds you well. We wanted to inform you that one of your clinicians has recently completed
        a curriculum module, and unfortunately, they did not meet the passing requirement.
      </Text>
      <Section>
        <Text className="text-gray-600">Name: {clinicianFullName}</Text>
        <Text className="text-gray-600">Module: {props.module.name}</Text>
        <Text className="text-gray-600">Date: {props.module.date}</Text>
        <Text className="text-gray-600">Score: {props.module.score}%</Text>
        <Text className="text-gray-600">
          Attempts used: {props.module.attempts_used}/{props.module.allowed_attempts}
        </Text>
        <Text className="text-gray-600">Result: Failed</Text>
      </Section>
      <Text className="text-gray-600">If you wish, you can reassign the module or provide another attempt.</Text>
      <Text className="text-gray-600">
        Thank you for your dedication to supporting our clinicians{"'"} professional development. Together, we can
        support them to achieve their goals and deliver exceptional care.
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

export default ModuleFailedEmail;
