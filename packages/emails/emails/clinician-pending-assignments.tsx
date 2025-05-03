import * as React from "react";
import { Text, Section, Row, Column } from "@react-email/components";
import { Base } from "../common/base";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Document Read",
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

export const ClinicianPendingAssignmentsEmail = ({ props = defaultEmailProps }) => {
  return (
    <Base preview={props.previewText}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
      </Text>
      <Text className="text-gray-600">
        We hope this message finds you well! We wanted to gently remind you about a pending assignment that requires
        your attention. Your dedication and commitment to your work are truly appreciated, and we know {"you've"} got
        this!
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
        Life can get busy, and sometimes things slip through the cracks. If you need any assistance or have any
        questions regarding this assignment, please {"don't"} hesitate to reach out to your dedicated Credentialing team
        or Recruiter. {"They're"} here to support you every step of the way.
      </Text>
      <Text className="text-gray-600">
        Your contribution is invaluable and we believe in your ability to shine. Keep up the great work!
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Warm regards,
        <br /> Healthcare Staffing Hire
      </Text>
    </Base>
  );
};

export default ClinicianPendingAssignmentsEmail;
