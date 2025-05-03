import { RouterTabs } from "../../../utils/RouterTabs";
import ReportLayout from "../ReportLayout";

interface DocumentsReportLayoutProps {
  children: React.ReactNode;
}

export const DocumentsReportLayout: React.FC<DocumentsReportLayoutProps> = ({
  children,
}) => {
  return (
    <ReportLayout>
      <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
        <RouterTabs
          tabs={["Overview", "Details"]}
          rootPath="/admin/dashboard/reports/documents"
        />
        {children}
      </div>
    </ReportLayout>
  );
};
