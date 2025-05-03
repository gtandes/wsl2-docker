import { RouterTabs } from "../../../utils/RouterTabs";
import ReportLayout from "../ReportLayout";

interface SkillsChecklistReportLayoutProps {
  children: React.ReactNode;
}

export const SkillsChecklistReportLayout: React.FC<
  SkillsChecklistReportLayoutProps
> = ({ children }) => {
  return (
    <ReportLayout>
      <div className="admin-report my-8 rounded-md bg-white p-8 shadow-sm">
        <RouterTabs
          tabs={["Overview", "Details", "Content Insights"]}
          rootPath="/admin/dashboard/reports/skills-checklist"
        />
        {children}
      </div>
    </ReportLayout>
  );
};
