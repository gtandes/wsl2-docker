import { Transition, Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { Fragment, useMemo } from "react";
import Link from "next/link";
import Logo from "../assets/logo.svg";

import Image from "next/image";
import { rubik } from "../pages/_app";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { UserRole } from "../types/roles";
import { useAuth } from "../hooks/useAuth";
import { useAgency } from "../hooks/useAgency";
import { useModal } from "../hooks/useModal";
import { useRouter } from "next/router";

export type NavigationItem = {
  name: string;
  href: string;
  icon: IconDefinition;
  current: boolean;
  userGroup: UserRole[];
  checkChangesOnforms?: boolean;
};

interface Props {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
  navigationOptions: NavigationItem[];
}

export const Navbar: React.FC<Props> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  navigationOptions,
}) => {
  const auth = useAuth();
  const modal = useModal();
  const router = useRouter();
  const globalAgency = useAgency();
  const isAdminUser = auth.currentUser?.role === UserRole.HSHAdmin;

  const navItems = navigationOptions.filter((item) =>
    item.userGroup.includes(auth.currentUser?.role as UserRole)
  );

  const menuColor = `bg-blue-${
    auth.currentUser?.role === UserRole.Clinician ? "700" : "900"
  }`;

  const getAgencyLogo = useMemo(() => {
    if (isAdminUser || !globalAgency?.currentAgency?.logo.id) {
      return <Image width={50} height={50} src={Logo} alt="HSH" priority />;
    }

    return (
      <Image
        width={50}
        height={50}
        src={`${window.origin}/cms/assets/${globalAgency?.currentAgency?.logo.id}`}
        alt="HSH"
        priority
      />
    );
  }, [globalAgency.currentAgency?.logo.id, isAdminUser]);

  const handleLink = async (
    item: NavigationItem,
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (item.checkChangesOnforms) {
      const leave = await modal.showConfirm(
        `You have unsaved changes. Do you want to continue?`
      );

      if (leave) {
        await router.push(item.href);
      }
      return;
    }
    await router.push(item.href);
  };
  return (
    <>
      <div
        className={`noprint hidden w-28 overflow-y-auto md:block ${menuColor}`}
      >
        <div className="flex w-full flex-col items-center py-6">
          <div className="flex flex-shrink-0 items-center">
            {!globalAgency.loaded ? null : getAgencyLogo}
          </div>
          <div className="mt-12 w-full flex-1 space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                onClick={(e) => handleLink(item, e)}
                href={item.href}
                className={clsx(
                  item.current
                    ? "bg-blue-800 text-white"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white",
                  "group flex w-full cursor-pointer flex-col items-center justify-center rounded-md p-3 text-center text-xs font-medium"
                )}
                aria-current={item.current ? "page" : undefined}
              >
                <span className="h-6 w-6">
                  <FontAwesomeIcon icon={item.icon} size="2x" />
                </span>
                <span className="mt-2">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-20 md:hidden"
          onClose={setMobileMenuOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-blue-700 pb-4 pt-5">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute right-0 top-1 -mr-14 p-1">
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Close sidebar</span>
                    </button>
                  </div>
                </Transition.Child>
                <div className="relative flex flex-shrink-0 items-center px-4">
                  <Image width={33} height={30} src={Logo} alt="HSH" />
                </div>
                <div className="mt-5 h-0 flex-1 overflow-y-auto px-2">
                  <nav className="flex h-full flex-col">
                    <div className="space-y-1">
                      {navigationOptions.map((item) => (
                        <Link
                          key={item.name}
                          // onClick={() => handleLink(item)}
                          href={item.href}
                          className={clsx(
                            item.current
                              ? "bg-blue-800 text-white"
                              : "text-blue-100 hover:bg-blue-800 hover:text-white",
                            "group flex items-center space-x-2 rounded-md px-3 py-2 text-center text-sm font-medium",
                            `${rubik.variable} font-sans`
                          )}
                          aria-current={item.current ? "page" : undefined}
                        >
                          <div className={"h-6 w-6"}>
                            <FontAwesomeIcon icon={item.icon} />
                          </div>
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
