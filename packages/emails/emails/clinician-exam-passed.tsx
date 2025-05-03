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

export const ClinicianExamPassedEmail = ({ props = defaultEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        Congratulations! {"You've"} successfully completed the <b>{props.competency.title}</b> with flying colors!
        <br />
        <br />
        To mark this impressive achievement, {"we're"} thrilled to present you with your certificate of completion. You
        can download and print it <Link href={props.exam_props.certificate_url}>here</Link>
        .
        <br />
        <br />
        Your dedication to continuous learning is truly admirable, and we {"couldn't"} be prouder of your commitment to
        professional growth. Keep up the fantastic work, and remember that the pursuit of knowledge is a journey that
        knows no bounds!
        <br />
        <br />
        Happy Learning, {props.user.first_name} {props.user.last_name}! {"We're"} here to support you on every step of
        your learning journey.
        <PortalLink />
      </Text>
      <Text className="text-gray-600">
        With warmest regards,
        <br />
        {props.agency.name}
      </Text>
    </BaseAgencyEmail>
  );
};

export default ClinicianExamPassedEmail;
