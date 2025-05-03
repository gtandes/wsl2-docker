import React from "react";

interface Props {
  title: React.ReactElement;
  children: React.ReactNode;
}

export const ExamAnaliticCard: React.FC<Props> = ({ title, children }) => {
  return (
    <div className="min-h-100 mb-4 mr-4 max-h-36 min-h-[150px] min-w-[200px] rounded-md bg-blue-50 px-6">
      <div className="flex justify-between p-2">{title}</div>
      {children}
    </div>
  );
};
