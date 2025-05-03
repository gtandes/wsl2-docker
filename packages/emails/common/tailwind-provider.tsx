import * as React from "react";
import { Tailwind } from "@react-email/components";

export const TailwindProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <Tailwind>{children}</Tailwind>;
};
