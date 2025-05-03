import { Bars3BottomLeftIcon } from "@heroicons/react/24/outline";
import React from "react";
import { AvatarMenu } from "./AvatarMenu";

interface Props {
  setMobileMenuOpen: (value: boolean) => void;
  hideNavbar?: boolean;
  navigation?: {
    name: string;
    href: string;
  }[];
}

export const Header: React.FC<Props> = ({
  setMobileMenuOpen,
  hideNavbar = false,
  navigation,
}) => {
  return (
    <header className="noprint w-full">
      <div className="relative z-10 flex flex-shrink-0 border-b border-gray-200 shadow-sm md:border-none md:shadow-none">
        {!hideNavbar && (
          <button
            type="button"
            className="border-r border-gray-200 bg-blue-700 px-4 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3BottomLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        <AvatarMenu navigation={navigation} />
      </div>
    </header>
  );
};
