import * as React from "react";
import { Link, Text } from "@react-email/components";
import { Base } from "../common/base";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Welcome",
  user: {
    email: "johndoe@mail.com",
    first_name: "John",
    last_name: "Doe",
  },
  registrationUrl: "https://www.google.com",
};

export const AdminWelcomeEmail = ({ props = defaultEmailProps }) => {
  return (
    <Base preview={props.previewText}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        Welcome to the HSH family! {"We're"} thrilled to have you on board and look forward to the work you will do to
        support the world of healthcare.
        <br />
        <br />
        To securely complete your registration, please click on the registration link below and update your password.
        The registration link will be valid for 1 day.
        <br />
        <br />
        <Link href={props.registrationUrl}>Reset Password</Link>. Your username is {props.user.email}.
        <br />
        <br />
        Thank you for your dedication to supporting HSH {"clinicians'"} professional development. Together, we can
        support them to achieve their goals and deliver exceptional care.
      </Text>
      <PortalLink />
      <Text className="text-gray-600">
        Best regards,
        <br />
        Healthcare Staffing Hire
      </Text>
    </Base>
  );
};

export default AdminWelcomeEmail;
