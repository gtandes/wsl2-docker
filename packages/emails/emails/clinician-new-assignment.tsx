import * as React from "react";
import { BaseAssignment } from "../common/assignments/base";
import { BaseAgencyEmail } from "../common/base-agency";
import { AssignmentCard } from "../common/assignments/assignment-card";
import { PortalLink } from "../common/portal-link";

const defaultEmailData = {
  previewText: "New Assignment",
  user: {
    email: "johondoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  competencies: [
    {
      type: "exam",
      title: "Exam",
      category: "Exam",
      assigned_on: "2021-01-01",
      allowed_attempts: 3,
      competency_link: "https://www.google.com",
      icon_url: "http://localhost:3000/email/exam.png",
    },
    {
      type: "skill-checklist",
      title: "Skill Checklist",
      category: "Skill Checklist",
      assigned_on: "2021-05-03",
      allowed_attempts: 5,
      competency_link: "https://www.google.com",
      icon_url: "http://localhost:3000/email/skill-checklist.png",
    },
  ],
  agency: {
    name: "HSH",
    logo: "",
  },
};

export const ClinicianNewExamAssignmentEmail = ({ props = defaultEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <BaseAssignment {...props} />
      {props.competencies.map((competency) => (
        <AssignmentCard competency={competency} />
      ))}
      <PortalLink />
    </BaseAgencyEmail>
  );
};

export default ClinicianNewExamAssignmentEmail;
