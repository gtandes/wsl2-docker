import React from "react";

interface Props {
  children: React.ReactNode;
  colors?: string;
}

export const Badge: React.FC<Props> = ({
  children,
  colors = "bg-blue-100 text-blue-700",
}) => {
  return (
    <span
      className={`${colors} inline-flex items-center rounded-md px-2 py-1 text-xs font-medium`}
    >
      {children}
    </span>
  );
};
