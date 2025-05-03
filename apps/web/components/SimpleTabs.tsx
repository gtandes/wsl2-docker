import clsx from "clsx";
import React, { useState } from "react";

export type Tab = {
  id: string;
  label: string;
};

interface Props {
  tabs: Tab[];
  defaultTab?: string;
  children: React.ReactNode;
}

export const SimpleTabs = ({ tabs, defaultTab, children }: Props) => {
  const [selectedTab, setSelectedTab] = useState(
    defaultTab ? defaultTab : tabs[0].id
  );

  return (
    <>
      <div className="noprint mb-6 border-b  border-gray-200">
        <ul className="-mb-px flex flex-wrap" id="myTab">
          {tabs.map((tab: Tab) => (
            <li className="mr-2" role="presentation" key={tab.id}>
              <button
                className={clsx(
                  "border-transparent inline-block rounded-t-lg border-b-2 px-4 py-4 text-center text-sm font-medium",
                  selectedTab === tab.id
                    ? "cursor-default border-blue-700 text-blue-700"
                    : "text-gray-500 hover:border-gray-300 hover:text-gray-600"
                )}
                id={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                type="button"
                role="tab"
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="">{children}</div>
    </>
  );
};
