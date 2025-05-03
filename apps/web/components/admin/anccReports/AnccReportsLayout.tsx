import { useMemo } from "react";
import { AdminLayout } from "../../../components/AdminLayout";
import ReportTab from "../../../components/admin/anccReports/ReportTab";
import { useRouter } from "next/router";

interface Props {
  children: React.ReactNode;
}

function ReportsPage({ children }: Props) {
  const router = useRouter();

  const tabs = useMemo(
    () => [
      {
        name: "Pass Rate Per Modality Type",
        href: `/admin/reports/pass-rate-modality`,
        current: false,
      },
      {
        name: "Exam Questions Pass Rate",
        href: `/admin/reports/exams-pass-rate`,
        current: false,
      },
    ],
    []
  );

  const tabsWithCurrent = tabs.map((tab) => {
    return {
      ...tab,
      current: router.pathname === tab.href,
    };
  });

  return (
    <AdminLayout>
      <div className="flex flex-col">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-2xl font-medium text-blue-800">Admin Reports</h1>
        </div>
        <h2 className="noprint mt-8 text-xl font-semibold">ANCC Reports</h2>

        <div className="mt-6 bg-white px-10 py-8 shadow-md">
          <div className="mt-2">
            <ReportTab tabs={tabsWithCurrent} />
          </div>
          {children}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ReportsPage;
