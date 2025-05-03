import * as React from "react";
import { BaseAgencyEmail } from "../common/base-agency";
import { Text, Link } from "@react-email/components";
import { PortalLink } from "../common/portal-link";

const defaulEmailData = {
  previewText: "Congratulations on receiving your certificate!",
  user: {
    email: "johondoe@email.com",
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  module: {
    name: "1-Hour Post-Hospitalization Education in Handling Stroke Patients",
    cert_url: "https://www.google.com",
  },
};

export const ClinicianModulePassedEmail = ({ props = defaulEmailData }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ ...props.agency }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        Congratulations! {"You've"} successfully completed the {props.module.name} with flying colors!
        <br />
        <br />
        To mark this impressive achievement, {"we're"} thrilled to present you with your certificate of completion. You
        can download and print it <Link href={props.module.cert_url}>here</Link>.
        <br />
        <br />
        Your dedication to continuous learning is truly admirable, and we {"couldn't"} be prouder of your commitment to
        professional growth. Keep up the fantastic work, and remember that the pursuit of knowledge is a journey that
        knows no bounds!
        <br />
        <br />
        Happy Learning, {props.user.first_name} {props.user.last_name}! {"We're"} here to support you on every step of
        your learning journey.
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Warm regards,
        <br />
        {props.agency.name} and Healthcare Staffing Hire
      </Text>
    </BaseAgencyEmail>
  );
};

export default ClinicianModulePassedEmail;
