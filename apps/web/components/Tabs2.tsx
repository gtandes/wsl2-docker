import React from "react";
import { Tab } from "../types/tab";
import Link from "next/link";
import clsx from "clsx";
import { useRouter } from "next/router";

interface Props {
  tabs: Tab[];
  fullSize?: boolean;
}

export const Tabs2: React.FC<Props> = ({ tabs, fullSize }) => {
  const router = useRouter();

  return (
    <div className="noprint flex w-full flex-col items-center justify-between sm:flex-row">
      <div className={`hidden w-full ${fullSize ? "" : "max-w-lg"} lg:block`}>
        <nav
          className="bg-transparent isolate flex divide-x divide-gray-200"
          aria-label="Tabs"
        >
          {tabs.map((tab, tabIdx) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={clsx(
                {
                  "!bg-blue-800 text-white": tab.current,
                  "text-gray-500 hover:text-gray-700": !tab.current,
                  "rounded-tl-lg": tabIdx === 0,
                  "rounded-tr-lg": tabIdx === tabs.length - 1,
                },
                "relative min-w-0 flex-1 bg-white px-3 py-4 text-center text-sm font-medium shadow hover:bg-gray-50"
              )}
              aria-current={tab.current ? "page" : undefined}
            >
              <span className="w-full">{tab.name}</span>
            </Link>
          ))}
        </nav>
      </div>
      <select
        className="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6 lg:hidden"
        defaultValue={tabs.find((tab) => tab.current)?.name}
        onChange={(e) => {
          router.push(
            `${tabs.find((tab) => tab.name === e.target.value)?.href}`
          );
        }}
      >
        {tabs.map((tab) => (
          <option key={tab.name} value={tab.name}>
            {tab.name}
          </option>
        ))}
      </select>
    </div>
  );
};
