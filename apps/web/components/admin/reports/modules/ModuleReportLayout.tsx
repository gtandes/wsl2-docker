import { UserRole } from "types";
import { RouterTabs } from "../../../utils/RouterTabs";
import { useAuth } from "../../../../hooks/useAuth";

interface ModuleReportLayoutsProps {
  children: React.ReactNode;
}

export const ModuleReportLayout: React.FC<ModuleReportLayoutsProps> = ({
  children,
}) => {
  const { currentUser } = useAuth();

  const tabs = ["Overview", "Details"];
  const isHshAdmin = currentUser?.role === UserRole.HSHAdmin;

  if (isHshAdmin) {
    tabs.push("Pass Rate");
  }

  return (
    <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
      <RouterTabs tabs={tabs} rootPath="/admin/dashboard/reports/modules" />
      {children}
    </div>
  );
};
