import { Tab } from "../../types/tab";
import { UserRole } from "../../types/roles";

export const getExamTabs = (isAdmin: boolean): Tab[] => {
  const tabs = [{ name: "List", href: "/admin/exams", current: false }];

  if (isAdmin) {
    tabs.push({
      name: "Questions",
      href: "/admin/exams/questions",
      current: false,
    });
  }

  return tabs;
};

export const SettingsTabs: Tab[] = [
  {
    name: "My Profile",
    href: "/admin/settings/profile",
    current: false,
    allowed_roles: [
      UserRole.AgencyUser,
      UserRole.HSHAdmin,
      UserRole.UsersManager,
    ],
  },
  {
    name: "Details",
    href: "/admin/settings/details",
    current: false,
    allowed_roles: [
      UserRole.AgencyUser,
      UserRole.HSHAdmin,
      UserRole.UsersManager,
    ],
  },
  {
    name: "Notifications",
    href: "/admin/settings/notifications",
    current: false,
    allowed_roles: [
      UserRole.AgencyUser,
      UserRole.HSHAdmin,
      UserRole.UsersManager,
    ],
  },
  {
    name: "Departments",
    href: "/admin/settings/departments",
    current: false,
    allowed_roles: [UserRole.AgencyUser, UserRole.HSHAdmin, UserRole.Developer],
  },
  {
    name: "Locations",
    href: "/admin/settings/locations",
    current: false,
    allowed_roles: [UserRole.AgencyUser, UserRole.HSHAdmin, UserRole.Developer],
  },
  {
    name: "Specialties",
    href: "/admin/settings/specialties",
    current: false,
    allowed_roles: [UserRole.HSHAdmin, UserRole.Developer],
  },
  {
    name: "Other",
    href: "/admin/settings/other",
    current: false,
    allowed_roles: [
      UserRole.AgencyUser,
      UserRole.Developer,
      UserRole.HSHAdmin,
      UserRole.UsersManager,
    ],
  },
  {
    name: "Integrations",
    href: "/admin/settings/integrations",
    current: false,
    allowed_roles: [UserRole.AgencyUser, UserRole.Developer, UserRole.HSHAdmin],
  },
];

export const PoliciesTabs: Tab[] = [
  { name: "List", href: "/admin/policies", current: true },
];

export const DocumentTabs: Tab[] = [
  { name: "List", href: "/admin/documents", current: true },
];
