import { useAuth } from "../../../hooks/useAuth";
import { UserRole } from "../../../types/roles";
import Tabs from "../../Tabs";
import { SettingsTabs } from "../../exams/tabs";

interface Props {
  children: React.ReactNode;
}

export const AdminSettingsLayout: React.FC<Props> = ({ children }) => {
  const auth = useAuth();
  const settingsTabs = SettingsTabs.filter((tab) =>
    tab.allowed_roles?.includes(auth.currentUser?.role as UserRole)
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-7 sm:gap-12">
        <h1 className="text-2xl font-medium text-blue-800">Settings</h1>
        <Tabs tabs={settingsTabs} />
      </div>
      {children}
    </div>
  );
};
