import { Tab } from "@headlessui/react";
import clsx from "clsx";
import { useState } from "react";
import { UserRole } from "../../types/roles";
import { useAuth } from "../../hooks/useAuth";

interface Props {
  tabs: {
    name: string;
    allowedRoles: UserRole[];
  }[];
  panels: React.ReactNode[];
  defaultTab?: number;
}

export default function Tabs({ tabs, panels, defaultTab = 0 }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(defaultTab);
  const auth = useAuth();

  return (
    <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
      <Tab.List className="noprint mb-6 border-b border-gray-200">
        {tabs.length > 0 &&
          tabs
            .filter((tab) =>
              tab.allowedRoles.includes(auth.currentUser?.role as UserRole)
            )
            .map((tab, index) => {
              return (
                <Tab
                  key={index}
                  className={({ selected }) =>
                    clsx(
                      "border-transparent mr-2 inline-block rounded-t-lg border-b-2 px-4 py-4 text-center text-sm font-medium",
                      selected
                        ? "cursor-default border-blue-700 text-blue-700 focus-visible:outline-none"
                        : "text-gray-500 hover:border-gray-300 hover:text-gray-600"
                    )
                  }
                >
                  {tab.name}
                </Tab>
              );
            })}
      </Tab.List>
      <Tab.Panels className="mt-2">
        {panels.length > 0 &&
          panels.map((panel, index) => (
            <Tab.Panel key={index}>{panel}</Tab.Panel>
          ))}
      </Tab.Panels>
    </Tab.Group>
  );
}
