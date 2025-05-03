import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text, Section } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaulEmailData = {
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
    name: "1-Hour Post-Hospitalization Education in Handling Stroke Patients",
    date: "18 July, 2023",
    score: "2%",
    attempts_used: 3,
    allowed_attempts: 3,
  },
};

export const ClinicianModuleFailedEmail = ({ props = defaulEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        We appreciate your commitment to continuous improvement and growth! We see that you recently attempted the{" "}
        {props.module.name}, and while this attempt {"didn't"} meet the passing requirement, {"we're"} here to cheer you
        on and support your success.
      </Text>
      <Text className="text-gray-600 text-base font-medium">Module Details:</Text>
      <Section>
        <Text className="text-gray-600">Module Name: {props.module.name}</Text>
        <Text className="text-gray-600">Date: {props.module.date}</Text>
        <Text className="text-gray-600">Score: {props.module.score}%</Text>
        <Text className="text-gray-600">
          Attempts: {props.module.attempts_used}/{props.module.allowed_attempts}
        </Text>
        <Text className="text-gray-600">Result: Failed</Text>
      </Section>
      <Text className="text-gray-600">
        {"Don't"} be disheartened by this result. Every setback is an opportunity for growth. We firmly believe in your
        potential, and we know that with determination and persistence, you will excel!
      </Text>
      <Text className="text-gray-600">
        To retake the module and showcase your incredible skills, simply reach out to your Credentialing team or
        Recruiter. {"They'll"} be able to provide the support you need.
      </Text>
      <Text className="text-gray-600">
        Thank you for being part of the {props.agency.name} family, where your success is our priority.
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Warm regards,
        <br />
        {props.agency.name} and Healthcare Staffing Hire
      </Text>
    </BaseAgencyEmail>
  );
};

export default ClinicianModuleFailedEmail;
