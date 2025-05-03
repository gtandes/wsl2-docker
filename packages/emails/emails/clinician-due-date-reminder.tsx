import * as React from "react";

import { Text, Section, Row, Column } from "@react-email/components";

import { Base } from "../common/base";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Clinician Due Date Reminder",
  user: {
    email: "johndoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  assignments: [
    {
      name: "Assignment Name",
      due_date: "Due Date",
      status: "Status",
    },
  ],
};

export const ClinicianDueDateReminderEmail = ({ props = defaultEmailProps }) => {
  return (
    <Base preview={props.previewText}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
      </Text>
      <Text className="text-gray-600">
        We hope this message finds you well! We wanted to gently remind you about an assignment that is due within the
        next 7 days. Your dedication and commitment to your work are truly appreciated, and we know {`you've`} got this!
      </Text>
      <Section>
        <Text className="text-gray-600 font-medium">Assignment Details:</Text>
        {props.assignments.map((assignment, index) => {
          return (
            <Row key={index}>
              <Column className="w-[150px] text-gray-600 text-sm">Name: {assignment.name}</Column>
              <Column className="w-[150px] text-gray-600 text-sm">Due Date: {assignment.due_date}</Column>
              <Column className="w-[150px] text-gray-600 text-sm">Status: {assignment.status}</Column>
            </Row>
          );
        })}
      </Section>
      <Text className="text-gray-600">
        As the assignment due date approaches, we understand that life can become hectic, and tasks may occasionally be
        overlooked. If you require any assistance or have inquiries about the assignment, please feel free to contact
        your dedicated Credentialing team or Recruiter. They are committed to providing you with support and guidance
        throughout the process.
      </Text>
      <Text className="text-gray-600">
        You are highly valued within the [agency name] community, and we have full confidence in your capacity to excel.
        Keep pushing forward with your outstanding efforts!
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Warm regards,
        <br /> Healthcare Staffing Hire
      </Text>
    </Base>
  );
};

export default ClinicianDueDateReminderEmail;
