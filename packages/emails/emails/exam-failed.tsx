import React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text } from "@react-email/components";
import { FailedExamStats } from "../common/assignments/failed-exam-stats";
import { PortalLink } from "../common/portal-link";

const defaultemailData = {
  previewText: "Exam Failed",
  agency: {
    name: "HSH",
    logo: "",
  },
  user: {
    id: "123",
    email: "johndoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  exam: {
    title: "Core Mandatory Exam - Nursing",
    score: 100,
    failed_date: "2020-01-01",
    allowed_attempts: "1",
    attempts_used: "1",
  },
};

export const ExamFailedEmail = ({ props = defaultemailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        To whom it may concern,
        <br />
        <br />
        We hope this message finds you well. We wanted to inform you that one of your clinicians has recently completed
        an assessment, and unfortunately, they did not meet the passing requirement.
        <br />
        <br />
        <span className="font-bold">Exam details</span>
      </Text>
      <FailedExamStats {...props} />
      <Text className="text-gray-600 mt-8">
        If you wish, you can reassign the assessment or provide another attempt.
        <br />
        <br />
        Thank you for your dedication to supporting our {"clinicians'"} professional development. Together, we can
        support them to achieve their goals and deliver exceptional care.
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Best regards,
        <br />
        {props.agency.name}
      </Text>
    </BaseAgencyEmail>
  );
};

export default ExamFailedEmail;
