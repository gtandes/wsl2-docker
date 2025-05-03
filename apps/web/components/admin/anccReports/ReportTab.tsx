import Link from "next/link";
import React from "react";
import clsx from "clsx";
import { Tab } from "../../../types/tab";

interface Props {
  tabs: Tab[];
}

function ReportTab({ tabs }: Props) {
  return (
    <div className="border-b border-gray-300">
      <nav className="flex space-x-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={clsx(
              {
                "border-blue-500 text-blue-500": tab.current,
                "border-transparent text-gray-600 hover:border-blue-500 hover:text-gray-800":
                  !tab.current,
              },
              "border-b-2 px-3 py-2 font-medium"
            )}
            aria-current={tab.current ? "page" : undefined}
          >
            <span className="w-full">{tab.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default ReportTab;
