import * as React from "react";
import { Link, Text } from "@react-email/components";
import { BaseAgencyEmail } from "../common/base-agency";
import { PortalLink } from "../common/portal-link";

const defaultEmailProps = {
  previewText: "Welcome",
  user: {
    email: "",
    first_name: "John",
    last_name: "Doe",
  },
  agency: {
    name: "HSH",
    logo: "",
  },
  registrationUrl: "https://www.google.com",
};

export const WelcomeEmail = ({ props = defaultEmailProps }) => {
  return (
    <BaseAgencyEmail previewText={props.previewText} agency={{ name: props.agency.name, logo: props.agency.logo }}>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        Welcome to the {props.agency.name} family! {"We're"} thrilled to have you on board and look forward to
        supporting your journey in the world of healthcare.
        <br />
        <br />
        {props.agency.name} has partnered with Healthcare Staffing Hire to provide you with a series of web-based
        courses for your compliance and other training needs!
        <br />
        <br />
        To securely complete your registration, please click on the registration link below. This link will take you to
        a secure registration page where you can provide a password to complete your profile.
        <br />
        <br />
      </Text>
      <Link
        href={props.registrationUrl}
        className="mx-auto block bg-green-100 text-green-800 font-bold text-center w-[200px] py-2 rounded text-[14px]"
      >
        Complete Registration
      </Link>
      <Text className="text-gray-600">
        <b>Important: This link will expire in 72 hours.</b>
        <br />
        <br />
        Once your registration is successfully completed, you will gain access to the clinician dashboard, where you can
        track your progress on assignments.
        {/*TODO assignments block*/}
        <br />
        <br />
        A certificate will be generated after you successfully complete the assigned exams and modules and you will earn
        CEUs/contact hours, where applicable.
        <br />
        <br />
        Via the platform, you will also have access to complete required Skills Checklists, required Policies, and
        Documents that you need to read. Don’t worry, You’ve got this!
        <br />
        <br />
        At {props.agency.name}, we believe in the incredible potential of our clinicians, and {"we're"} here to empower
        you every step of the way. Your commitment to continuous improvement and growth aligns perfectly with our
        values.
        <br />
        <br />
        Whether {"you're"} a seasoned professional or just starting your career, know that you are not alone. Our
        dedicated Credentialing team and Recruiters are here to guide you, answer your questions, and ensure your
        success.
        <br />
        <br />
        Together, {"we'll"} make a positive impact in healthcare, and {"we're"} excited to see your contributions shine.
        <br />
        <br />
        Once again, welcome to the {props.agency.name} family!
        <br />
        <br />
        Warm regards,
        <br /> {props.agency.name} and Healthcare Staffing Hire
      </Text>
    </BaseAgencyEmail>
  );
};

export default WelcomeEmail;
