import React, { useEffect, useState } from "react";
import { Navbar, NavigationItem } from "./Navbar";
import { Header } from "./Header";
import { useRouter } from "next/router";
import {
  faUsers,
  faQuestionCircle,
  faCog,
  faListCheck,
  faSitemap,
  faChalkboardTeacher,
  faTableCells,
  faFileLines,
  faBookOpen,
  faBuilding,
  faLayerGroup,
  faArrowsLeftRight,
} from "@fortawesome/pro-thin-svg-icons";
import {
  AdminEditRoles,
  AdminGroup,
  HSHAdminOnly,
  EditRoles,
} from "../types/roles";
import { useAgency } from "../hooks/useAgency";
import { MaintenanceBanners } from "./BannerMaintenance";
import { useFeatureFlags } from "../hooks/useFeatureFlags";

interface Props {
  children: React.ReactNode;
  checkChangesOnforms?: boolean;
}

export const AdminLayout: React.FC<Props> = ({
  children,
  checkChangesOnforms = false,
}) => {
  const globalAgency = useAgency();
  const { flags } = useFeatureFlags();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const adminNavigationOptions: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/admin/dashboard/compliance",
      icon: faTableCells,
      current: router.pathname.includes("/admin/dashboard"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Agencies",
      href: "/admin/agencies",
      icon: faBuilding,
      current: router.pathname.includes("/admin/agencies"),
      userGroup: AdminEditRoles,
      checkChangesOnforms,
    },
    {
      name: "Users & Assignments",
      href: "/admin/users",
      icon: faUsers,
      current: router.pathname.startsWith("/admin/users"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Bundles",
      href: "/admin/bundles",
      icon: faLayerGroup,
      current: router.pathname.startsWith("/admin/bundles"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Modules",
      href: "/admin/modules",
      icon: faChalkboardTeacher,
      current: router.pathname.startsWith("/admin/modules"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Exams",
      href: "/admin/exams",
      icon: faQuestionCircle,
      current: router.pathname.startsWith("/admin/exams"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Skills Checklists",
      href: "/admin/skills-checklists",
      icon: faListCheck,
      current: router.pathname.startsWith("/admin/skills-checklists"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Policies",
      href: "/admin/policies",
      icon: faFileLines,
      current: router.pathname.startsWith("/admin/policies"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Documents",
      href: "/admin/documents",
      icon: faBookOpen,
      current: router.pathname.startsWith("/admin/documents"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },

    {
      name: "Categories",
      href: "/admin/categories",
      icon: faSitemap,
      current: router.pathname.startsWith("/admin/categories"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Settings",
      href: "/admin/settings/profile",
      icon: faCog,
      current: router.pathname.startsWith("/admin/settings/profile"),
      userGroup: AdminGroup,
      checkChangesOnforms,
    },
    {
      name: "Admin Reports",
      href: "/admin/reports/pass-rate-modality",
      icon: faFileLines,
      current: router.pathname.startsWith("/admin/reports"),
      userGroup: HSHAdminOnly,
      checkChangesOnforms,
    },
  ];

  const isIaEnable = globalAgency.currentAgency?.ia_enable;

  if (flags["enabled_integrity_advocate"] && isIaEnable) {
    adminNavigationOptions.push({
      name: "Proctoring",
      href: "/admin/proctoring",
      icon: faChalkboardTeacher,
      current: router.pathname.startsWith("/admin/proctoring"),
      userGroup: EditRoles,
      checkChangesOnforms,
    });
  }

  if (["local", "prod"].includes(process.env.NEXT_PUBLIC_ENV_NAME as string)) {
    adminNavigationOptions.push({
      name: "Migration Mappings",
      href: "/admin/mappings",
      icon: faArrowsLeftRight,
      current: router.pathname.includes("/admin/mappings"),
      userGroup: AdminEditRoles,
      checkChangesOnforms,
    });
  }

  const adminNavigation = [
    { name: "Profile", href: "/admin/settings/profile" },
    {
      name: "Contact Support",
      href: "mailto:support@healthcarestaffinghire.com",
    },
    { name: "Sign out", href: "/?logoutAction=true" },
  ];

  return (
    <div className="flex min-h-screen">
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        navigationOptions={adminNavigationOptions}
      />

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f4f6fd]">
        <MaintenanceBanners />
        <Header
          setMobileMenuOpen={setMobileMenuOpen}
          navigation={adminNavigation}
        />

        <div className="flex h-full flex-1 items-stretch overflow-hidden">
          <div className="container max-w-full flex-1 overflow-y-auto pb-8 pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
