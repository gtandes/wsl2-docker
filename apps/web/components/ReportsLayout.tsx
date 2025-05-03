import React, { useState } from "react";
import { Navbar, NavigationItem } from "./Navbar";
import { Header } from "./Header";
import { useRouter } from "next/router";
import {
  faUsers,
  faQuestionCircle,
  faCog,
  faListCheck,
} from "@fortawesome/pro-thin-svg-icons";
import { AdminGroup } from "../types/roles";

interface Props {
  children: React.ReactNode;
}

export const ReportsLayout: React.FC<Props> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const adminNavigationOptions: NavigationItem[] = [
    // {
    //   name: "Dashboard",
    //   href: "/admin",
    //   icon: DashboardIcon,
    //   current: router.pathname === "/admin",
    // },
    {
      name: "Users & Assignments",
      href: "/admin/users",
      icon: faUsers,
      current: router.pathname.startsWith("/admin/users"),
      userGroup: AdminGroup,
    },
    // {
    //   name: "Modules",
    //   href: "/admin/modules",
    //   icon: ModulesIcon,
    //   current: router.pathname === "/admin/modules",
    // },
    {
      name: "Exams",
      href: "/admin/exams",
      icon: faQuestionCircle,
      current: router.pathname.startsWith("/admin/exams"),
      userGroup: AdminGroup,
    },
    {
      name: "Skills Checklists",
      href: "/admin/skills-checklists",
      icon: faListCheck,
      current: router.pathname.startsWith("/admin/skills-checklists"),
      userGroup: AdminGroup,
    },
    // {
    //   name: "Policies & Documents",
    //   href: "/admin/policies",
    //   icon: PoliciesIcon,
    //   current: router.pathname === "/admin/policies",
    // },
    {
      name: "Settings",
      href: "/admin/settings/other",
      icon: faCog,
      current: router.pathname === "/admin/settings",
      userGroup: AdminGroup,
    },
  ];

  return (
    <div className="flex h-screen">
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        navigationOptions={adminNavigationOptions}
      />

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f4f6fd]">
        <Header setMobileMenuOpen={setMobileMenuOpen} />

        <div className="flex h-full items-stretch overflow-hidden">
          <div className="container max-w-full flex-1 overflow-y-auto pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
