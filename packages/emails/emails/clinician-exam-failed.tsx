import * as React from "react";
import { Text, Link } from "@react-email/components";
import { FailedExamStats } from "../common/assignments/failed-exam-stats";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";

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
        We appreciate your commitment to continuous improvement and growth! We see that you recently attempted the{" "}
        {props.exam.title}, and while this attempt {"didn't"} meet the passing requirement, {"we're"} here to cheer you
        on and support your success.
        <br />
        <br />
        <span className="font-bold">Exam details</span>
      </Text>
      <FailedExamStats {...props} />
      <Text className="text-gray-600 mt-8">
        {"Don't"} be disheartened by this result. Every setback is an opportunity for growth. We firmly believe in your
        potential, and we know that with determination and persistence, you will excel!{" "}
        {props.exam.outlineUrl ? (
          <span>
            Check out the <Link href={props.exam.outlineUrl}>{props.exam.outlineName}</Link> as your trusty Study Guide
            to help you ace your next attempt.
          </span>
        ) : (
          ""
        )}
        <br />
        <br />
        To retake the exam and showcase your incredible skills, simply reach out to your Credentialing team or
        Recruiter. {"They'll"} be able to provide the support you need.
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
