import { Text } from "@react-email/components";
import * as React from "react";

interface BaseAssignmentProps {
  user: {
    first_name: string;
    last_name: string;
  };
}

export const BaseAssignment = (props: BaseAssignmentProps) => {
  return (
    <>
      <Text className="text-gray-600">
        Dear {props.user.first_name} {props.user.last_name},
        <br />
        <br />
        We hope this email finds you well and in high spirits!
        <br />
        <br />
        We are thrilled to inform you about your latest assignment, which is packed with opportunities for growth and
        contribution.
      </Text>
      <Text className="text-gray-500 text-sm font-medium">Assignment Details:</Text>
    </>
  );
};
