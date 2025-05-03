import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text, Link } from "@react-email/components";
import { SuccessExamStats } from "../common/assignments/success-exam-stats";
import { PortalLink } from "../common/portal-link";

const defaultemailData = {
  previewText: "Exam Completion",
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
    passed_date: "2020-01-01",
    allowed_attempts: "1",
    attempts_used: "1",
    certificate_url: "https://www.google.com",
  },
};

export const ExamPassedEmail = ({ props = defaultemailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        We are thrilled to inform you that one of your potential placements, {props.user.first_name}{" "}
        {props.user.last_name}, has just successfully completed the{" "}
        <span className="font-semibold">{props.exam.title}</span> exam on{" "}
        <span className="font-semibold">{props.exam.passed_date}</span> with a score of{" "}
        <span className="font-semibold">{props.exam.score}%</span>, resulting in a{" "}
        <span className="font-semibold">Pass!</span>
        <br />
        <br />
        Here are the details of {props.user.first_name} {props.user.last_name}
        {"'"}s exam:
        <br />
      </Text>
      <SuccessExamStats {...props} />
      <Text className="text-gray-600">
        If you would like to print the result or review the details, please click on this link:{" "}
        <Link href={props.exam.certificate_url + "?user_id=" + props.user.id}>Click Here</Link>
        <br />
        <br />
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

export default ExamPassedEmail;
