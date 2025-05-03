import React from "react";
import { Tab } from "../types/tab";
import { useRouter } from "next/router";
import Link from "next/link";
import clsx from "clsx";

function Tabs({
  tabs,
  isFull,
  useCurrentTabFlag = false,
}: {
  tabs: Tab[];
  isFull?: boolean;
  useCurrentTabFlag?: boolean;
}) {
  const router = useRouter();

  const tabsWithCurrent = tabs.map((tab) => ({
    ...tab,
    ...(!useCurrentTabFlag && { current: router.pathname === tab.href }),
  }));

  return (
    <div className="noprint border-gray-100 md:border-b">
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          defaultValue={tabsWithCurrent.find((tab) => tab.current)?.name}
          onChange={(e) => {
            const selectedTab = tabs.find((tab) => tab.name === e.target.value);
            router.push(selectedTab?.href || "");
          }}
        >
          {tabsWithCurrent.map((tab) => (
            <option key={tab.name}>{tab.name}</option>
          ))}
        </select>
      </div>
      <div className={clsx("hidden sm:block", isFull ? "w-full" : "w-3/4")}>
        <nav
          className="isolate flex divide-x divide-gray-200 rounded-lg rounded-b-none shadow"
          aria-label="Tabs"
        >
          {tabsWithCurrent.map((tab, tabIdx) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={clsx(
                tab.current
                  ? "!rounded-b-none !bg-blue-800 text-white"
                  : "text-gray-500 hover:text-gray-700",
                tabIdx === 0 ? "rounded-l-lg" : "",
                tabIdx === tabsWithCurrent.length - 1 ? "rounded-r-lg" : "",
                "group relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-white px-4 py-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10"
              )}
              aria-current={tab.current ? "page" : undefined}
            >
              <span>{tab.name}</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5"
              />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default Tabs;
