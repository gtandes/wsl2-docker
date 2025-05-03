import React, { useState } from "react";
import { Navbar, NavigationItem } from "../Navbar";
import { Header } from "../Header";
import { useRouter } from "next/router";
import {
  faGrid2,
  faQuestionCircle,
  faListCheck,
  faChalkboardTeacher,
  faFileLines,
  faBookOpen,
} from "@fortawesome/pro-thin-svg-icons";

import { AllRoles } from "../../types/roles";
import { MaintenanceBanners } from "../BannerMaintenance";

interface Props {
  children: React.ReactNode;
  hideNavbar?: boolean;
  showHeader?: boolean;
}
export const clinicianNavigation = [
  { name: "Profile", href: "/clinician/profile" },
  { name: "History", href: "/clinician/competencies" },
  {
    name: "Contact Support",
    href: "mailto:support@healthcarestaffinghire.com",
  },
  { name: "Sign out", href: "/?logoutAction=true" },
];

export const DashboardLayout: React.FC<Props> = ({
  children,
  hideNavbar = false,
  showHeader = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const cliniciansNavigationOptions: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/clinician/",
      icon: faGrid2,
      current: router.pathname.startsWith("/clinician/dashboard/"),
      userGroup: AllRoles,
    },
    {
      name: "Exams",
      href: "/clinician/exams",
      icon: faQuestionCircle,
      current: router.pathname.startsWith("/clinician/exams"),
      userGroup: AllRoles,
    },
    {
      name: "Modules",
      href: "/clinician/modules",
      icon: faChalkboardTeacher,
      current: router.pathname.startsWith("/clinician/modules"),
      userGroup: AllRoles,
    },
    {
      name: "Skills Checklists",
      href: "/clinician/skills-checklists",
      icon: faListCheck,
      current: router.pathname.startsWith("/clinician/skills-checklists"),
      userGroup: AllRoles,
    },
    {
      name: "Policies",
      href: "/clinician/policies",
      icon: faFileLines,
      current: router.pathname.startsWith("/clinician/policies"),
      userGroup: AllRoles,
    },
    {
      name: "Documents",
      href: "/clinician/documents",
      icon: faBookOpen,
      current: router.pathname.startsWith("/clinician/documents"),
      userGroup: AllRoles,
    },
  ];

  return (
    <div className="skill-checklist-review flex h-screen print:mx-auto print:!h-full">
      {!hideNavbar && (
        <Navbar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          navigationOptions={cliniciansNavigationOptions}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f4f6fd] print:bg-white">
        <MaintenanceBanners />
        {showHeader && (
          <Header
            hideNavbar={hideNavbar}
            setMobileMenuOpen={setMobileMenuOpen}
            navigation={clinicianNavigation}
          />
        )}

        <div className="flex h-full flex-1 items-stretch overflow-hidden">
          <div className="flex flex-1 flex-col overflow-y-auto p-3 py-10 print:p-2 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
