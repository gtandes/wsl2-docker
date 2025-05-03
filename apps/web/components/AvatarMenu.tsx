import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/pro-solid-svg-icons";
import AgencySelector from "./AgencySelector";

interface Props {
  navigation?: { name: string; href: string }[];
}

export const AvatarMenu: React.FC<Props> = ({ navigation }) => {
  return (
    <div className="noprint flex flex-1 justify-between px-4 py-3 sm:px-6">
      <div className="ml-auto flex items-center gap-6">
        <AgencySelector />
        <Menu as="div" className="relative flex-shrink-0">
          <div>
            <Menu.Button className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <span className="sr-only">Open user menu</span>
              <FontAwesomeIcon
                icon={faUser}
                size="2x"
                className="text-gray-400"
              />
            </Menu.Button>
          </div>
          {navigation && (
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              {navigation && (
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {navigation.map((item) => (
                    <Menu.Item key={item.name}>
                      {({ active }) => (
                        <Link
                          href={item.href}
                          className={clsx(
                            active ? "bg-gray-100" : "",
                            "block px-4 py-2 text-sm text-gray-700"
                          )}
                        >
                          {item.name}
                        </Link>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              )}
            </Transition>
          )}
        </Menu>
      </div>
    </div>
  );
};
