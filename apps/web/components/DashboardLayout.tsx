import React, { useMemo } from "react";
import { Tabs2 } from "../components/Tabs2";
import { useRouter } from "next/router";
import { ReportTabs } from "../types/tab";

interface Props {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<Props> = ({ children }) => {
  const router = useRouter();

  const tabs = useMemo(
    () => [
      {
        name: "Compliance Summary",
        href: `/admin/dashboard/compliance`,
        current: false,
      },
      {
        name: ReportTabs.MODULES + " Reports",
        href: `/admin/dashboard/reports/modules/overview`,
        current: false,
      },
      {
        name: ReportTabs.EXAMS + " Reports",
        href: `/admin/dashboard/reports/exams/overview`,
        current: false,
      },
      {
        name: ReportTabs.SKILLS_CHECKLIST + " Reports",
        href: `/admin/dashboard/reports/skills-checklist/overview`,
        current: false,
      },
      {
        name: ReportTabs.POLICIES + " Reports",
        href: `/admin/dashboard/reports/policies/overview`,
        current: false,
      },
      {
        name: ReportTabs.DOCUMENTS + " Reports",
        href: `/admin/dashboard/reports/documents/overview`,
        current: false,
      },
      {
        name: ReportTabs.USER_GROUPS + " Reports",
        href: `/admin/dashboard/reports/user-and-groups/overview`,
        current: false,
      },
    ],
    []
  );

  const tabsWithCurrent = tabs.map((tab) => {
    return {
      ...tab,
      current: router.pathname.includes(tab.href.replace("/overview", "")),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="noprint flex flex-col gap-8">
        <h1 className="text-2xl font-medium text-blue-800">Dashboard</h1>
        <div className="w-full border-b border-b-gray-100">
          <Tabs2 tabs={tabsWithCurrent} fullSize />
        </div>
      </div>
      {children}
    </div>
  );
};
