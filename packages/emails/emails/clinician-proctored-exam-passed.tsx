import * as React from "react";
import { Text, Link } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";

const defaultEmailData = {
  previewText: "Exam Passed",
  user: {
    email: "johondoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  competency: {
    type: "exam",
    title: "Core Mandatory Exam - Nursing",
  },
  exam_props: {
    passed_date: "2021-08-11",
    score: 70,
    allowed_attempts: 2,
    attempts_used: 2,
    certificate_url: "https://www.google.com",
  },
};

export const ClinicianProctoredExamPassedEmail = ({ props = defaultEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        Congratulations! {"You've"} successfully passed the <b>{props.competency.title}</b> with a score of{" "}
        {props.exam_props.score}%
        <br />
        <br />
        You can now download your certificate and exam report from the HSH Portal. Access your results here:{" "}
        <Link href={props.exam_props.certificate_url}>here</Link>
        .
        <br />
        <br />
        <PortalLink />
      </Text>
      <Text className="text-gray-600">
        Best regards,
        <br />
        {props.agency.name}
      </Text>
    </BaseAgencyEmail>
  );
};

export default ClinicianProctoredExamPassedEmail;
