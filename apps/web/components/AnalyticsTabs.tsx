import React, { useState } from "react";
import Select from "./Select";
import { Spinner } from "./Spinner";

type AnalyticTab = {
  id: number;
  label: string;
  content: React.ReactNode;
};

interface AnalyticsTabsProps {
  loading: boolean;
  tabs: AnalyticTab[];
}

export function AnalyticsTabs({ loading, tabs }: AnalyticsTabsProps) {
  const [currentTab, setCurrentTab] = useState(0);

  return loading ? (
    <div className="w-[300px] px-28">
      <Spinner className={`my-20 h-24 w-24`} />
    </div>
  ) : (
    tabs && tabs.length > 0 && (
      <div className="flex">
        <div>{tabs[currentTab]?.content}</div>
        <div className="relative right-32 top-8 w-0">
          <Select
            selectSize="w-[100px]"
            options={tabs.map((t) => {
              return {
                label: t.label,
                value: t.id,
                selected: currentTab === t.id,
              };
            })}
            onChange={(e) => setCurrentTab(e.target.value as unknown as number)}
          />
        </div>
      </div>
    )
  );
}
