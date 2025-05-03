import React from "react";
import { Tab } from "../types/tab";
import clsx from "clsx";
import Link from "next/link";

interface UnderlineTab extends Tab {
  disabled: boolean;
}
interface Props {
  tabs: UnderlineTab[];
}

export const UnderlineTabs: React.FC<Props> = ({ tabs }) => {
  return (
    <div className="flex h-10 gap-8 border-b border-b-gray-100">
      {tabs.map((tab) =>
        tab.disabled ? (
          <div
            key={tab.href}
            className={clsx(
              "h-full cursor-not-allowed font-medium text-gray-300"
            )}
          >
            {tab.name}
          </div>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx("relative h-full font-medium", {
              "text-blue-800": tab.current,
              "text-gray-500": !tab.current,
            })}
          >
            {tab.name}
            {tab.current && (
              <div className="absolute bottom-0 h-px w-full bg-blue-800" />
            )}
          </Link>
        )
      )}
    </div>
  );
};
