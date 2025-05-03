import React, { useMemo } from "react";
import { Tabs2 } from "../Tabs2";
import { useRouter } from "next/router";
import { FilterComboInfoTooltip } from "../FilterComboInfoTooltip";

export const SkillsChecklistsHeader: React.FC = () => {
  const router = useRouter();
  const tabs = useMemo(
    () => [
      {
        name: "List",
        href: `/admin/skills-checklists`,
        current: false,
      },
    ],
    []
  );

  const tabsWithCurrent = tabs.map((tab) => {
    return {
      ...tab,
      current: router.asPath.includes(tab.href),
    };
  });

  return (
    <>
      <div className="mb-7 flex flex-row items-center gap-2">
        <h1 className="text-2xl font-medium text-blue-800">
          Skills Checklists
        </h1>
        <FilterComboInfoTooltip />
      </div>
      <div className="mb-6 w-full border-b border-b-gray-100">
        <Tabs2 tabs={tabsWithCurrent} />
      </div>
    </>
  );
};
