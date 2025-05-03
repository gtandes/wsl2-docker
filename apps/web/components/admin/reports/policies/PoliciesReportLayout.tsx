import { RouterTabs } from "../../../utils/RouterTabs";
import ReportLayout from "../ReportLayout";

interface PoliciesReportLayoutProps {
  children: React.ReactNode;
}

export const PoliciesReportLayout: React.FC<PoliciesReportLayoutProps> = ({
  children,
}) => {
  return (
    <ReportLayout>
      <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
        <RouterTabs
          tabs={["Overview", "Details"]}
          rootPath="/admin/dashboard/reports/policies"
        />
        {children}
      </div>
    </ReportLayout>
  );
};
