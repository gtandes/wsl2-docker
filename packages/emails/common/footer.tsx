import { Link, Section, Text } from "@react-email/components";
import * as React from "react";

export const Footer = () => {
  return (
    <Section>
      <Text className="text-[10px] text-gray-500 m-0 mt-12">
        Contact us: <Link href="mailto:support@hs-hire.com">support@hs-hire.com</Link>
        <br />
        HEALTHCARE STAFFING HIRE 1058 S. Citrus Ave., Los Angeles, CA 90019,{" "}
        <Link href="tel:(424) 488-3612">(424) 488-3612</Link>
      </Text>
    </Section>
  );
};
