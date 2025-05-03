import * as React from "react";
import { Text, Section, Link } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Skill Checklist Completion",
  user: {
    first_name: "John",
    last_name: "Doe",
    email: "",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  skill_checklist: {
    title: "Skill Checklist",
    completion_date: "2021-05-03",
    result_url: "",
  },
};

export const SkillChecklistCompletionEmail = ({ props = defaultEmailProps }) => {
  const clinicianFullName = `${props.user.first_name} ${props.user.last_name}`;

  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        We are thrilled to inform you that one of your potential placements, {clinicianFullName}, has just successfully
        completed the {props.skill_checklist.title} Skills Checklist on {props.skill_checklist.completion_date}!
      </Text>
      <Section>
        <Text className="text-gray-600 font-medium">
          Here are the details of {clinicianFullName}
          {"'s"} exam:
        </Text>
        <Text className="text-gray-600">Name: {clinicianFullName}</Text>
        <Text className="text-gray-600">Skills Checklist: {props.skill_checklist.title}</Text>
        <Text className="text-gray-600">Date: {props.skill_checklist.completion_date}</Text>
      </Section>
      <Text className="text-gray-600">
        If you would like to print the result or review the details, please click on this link:{" "}
        <Link href={props.skill_checklist.result_url}>{props.skill_checklist.title}</Link>
      </Text>
      <Text className="text-gray-600">
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

export default SkillChecklistCompletionEmail;
