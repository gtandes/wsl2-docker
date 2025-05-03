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
        We hope this message finds you well! This is a reminder that you must complete the following competencies:
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
        Your invaluable role within the community is acknowledged, and we trust in your ability to succeed. Kindly
        ensure compliance by promptly completing the necessary competencies today.
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
