import React, { useMemo } from "react";
import { Tabs2 } from "../Tabs2";
import { useRouter } from "next/router";

interface Props {
  children: React.ReactNode;
}

export const CategoriesLayout: React.FC<Props> = ({ children }) => {
  const router = useRouter();

  const tabs = useMemo(
    () => [
      {
        name: "Exams, Modules, Skills checklists",
        href: `/admin/categories`,
        current: false,
      },
      {
        name: "Exam Questions",
        href: `/admin/categories/questions`,
        current: false,
      },
      {
        name: "Policies",
        href: `/admin/categories/policies`,
        current: false,
      },
      {
        name: "Documents",
        href: `/admin/categories/documents`,
        current: false,
      },
    ],
    []
  );

  const tabsWithCurrent = tabs.map((tab) => {
    return {
      ...tab,
      current: router.pathname === tab.href,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-medium text-blue-800">Categories</h1>
        <div className="w-full border-b border-b-gray-100">
          <Tabs2 tabs={tabsWithCurrent} fullSize={true} />
        </div>
      </div>
      {children}
    </div>
  );
};
