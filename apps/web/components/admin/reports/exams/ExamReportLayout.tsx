import { UserRole } from "types";
import { RouterTabs } from "../../../utils/RouterTabs";
import { useAuth } from "../../../../hooks/useAuth";

interface ExamReportLayoutProps {
  children: React.ReactNode;
}

export const ExamReportLayout: React.FC<ExamReportLayoutProps> = ({
  children,
}) => {
  const { currentUser } = useAuth();

  const tabs = ["Overview", "Details"];
  const isHshAdmin = currentUser?.role === UserRole.HSHAdmin;

  if (isHshAdmin) {
    tabs.push("Pass Rate");
    tabs.push("Completion Time Average");
    tabs.push("Content Insights");
  }

  return (
    <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
      <RouterTabs tabs={tabs} rootPath="/admin/dashboard/reports/exams" />
      {children}
    </div>
  );
};
