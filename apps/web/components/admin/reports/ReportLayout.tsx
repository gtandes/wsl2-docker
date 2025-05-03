import { AdminLayout } from "../../AdminLayout";
import { DashboardLayout } from "../../DashboardLayout";

interface Props {
  children: React.ReactNode;
}
export default function ReportLayout({ children }: Props) {
  return (
    <AdminLayout>
      <DashboardLayout>
        <h2 className="noprint mt-8 text-xl font-semibold">Reports</h2>
        {children}
      </DashboardLayout>
    </AdminLayout>
  );
}
