import * as React from "react";

import { Text, Section, Row, Column } from "@react-email/components";

import { Base } from "../common/base";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Clinician Expiring Competencies Reminder",
  user: {
    email: "johndoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  assignments: [
    {
      name: "Assignment Name",
      expires_on: "Expiry Date",
      status: "Status",
    },
  ],
};

export const ClinicianExpiringDateReminderEmail = ({ props = defaultEmailProps }) => {
  return (
    <Base preview={props.previewText}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
      </Text>
      <Text className="text-gray-600">
        Your dedication to maintaining your competencies is commendable, and we want to make sure {"you're"} aware of
        some upcoming expirations. {"We're"} here to help you keep your skills sharp and your career thriving.
      </Text>
      <Section>
        <Text className="text-gray-600 font-medium">Assignment Details:</Text>
        {props.assignments.map((assignment, index) => {
          return (
            <Row key={index}>
              <Column className="w-[150px] text-gray-600 text-sm">Name: {assignment.name}</Column>
              <Column className="w-[150px] text-gray-600 text-sm">Expiry Date: {assignment.expires_on}</Column>
              <Column className="w-[150px] text-gray-600 text-sm">Status: {assignment.status}</Column>
            </Row>
          );
        })}
      </Section>
      <Text className="text-gray-600">
        {"Don't"} worry; {"we're"} here to assist you in renewing your competencies hassle-free. Please reach out to
        your Credentialing team or Recruiter for guidance and support.
      </Text>
      <Text className="text-gray-600">
        Your commitment to excellence is an inspiration to us all. Keep up the fantastic work, and {"let's"} keep those
        competencies up to date!
      </Text>
      <Text className="text-gray-600">
        If you have forgotten your password, click the "Forgot Password" link on the training portal's login page.
      </Text>
      <Text className="text-gray-600">Thank you for your attention to this matter.</Text>
      <PortalLink />
      <Text className="text-gray-600">
        Regards,
        <br />
        {props.agency.name}
      </Text>
      <Text className="text-gray-600">Warm regards, Healthcare Staffing Hire</Text>
    </Base>
  );
};

export default ClinicianExpiringDateReminderEmail;
