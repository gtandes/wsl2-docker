import * as React from "react";
import { Text, Link } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";
import { InvalidExamStats } from "../common/assignments/invalid-exam-stats";

const defaultEmailData = {
  previewText: "Exam Failed",
  user: {
    email: "johondoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  exam: {
    title: "Core Mandatory Exam - Nursing",
    score: 100,
    failed_date: "2020-01-01",
    allowed_attempts: "1",
    attempts_used: "1",
    outlineUrl: "https://www.google.com",
    outlineName: "Core Mandatory Exam - Nursing",
  },
};

export const ClinicianExamFailedEmail = ({ props = defaultEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        Your recent attempt at the {props.exam.title}. has been marked as invalid by Integrity Advocate.
        <br />
        <br />
        <span className="font-bold">Exam details</span>
      </Text>
      <InvalidExamStats {...props} />
      <Text className="text-gray-600 mt-8">
        The potential violation will be reviewed within 72 business hours. If there are further steps you need to take,
        you will be notified. Once the result is determined, you will be notified via email.”
        <br />
        <br />
        Thank you for being part of the {props.agency.name} family, where your success is our priority.
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        With unwavering support and encouragement,
        <br />
        {props.agency.name}
      </Text>
    </BaseAgencyEmail>
  );
};

export default ClinicianExamFailedEmail;
