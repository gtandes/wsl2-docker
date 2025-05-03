import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function AdminPanel({ children }: Props) {
  return (
    <div className="-mx-4 overflow-hidden bg-white shadow-sm sm:mx-0 sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6 ">{children}</div>
    </div>
  );
}
