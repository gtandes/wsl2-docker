import { RouterTabs } from "../../../utils/RouterTabs";
import ReportLayout from "../ReportLayout";

interface UserAndGroupsReportsLayoutProps {
  children: React.ReactNode;
}

export const UserAndGroupsReportsLayout: React.FC<
  UserAndGroupsReportsLayoutProps
> = ({ children }) => {
  return (
    <ReportLayout>
      <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
        <RouterTabs
          tabs={["Overview", "Non Compliant", "Details"]}
          rootPath="/admin/dashboard/reports/user-and-groups"
        />
        {children}
      </div>
    </ReportLayout>
  );
};
