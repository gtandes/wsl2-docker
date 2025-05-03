import React from "react";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";
import ReportLayout from "../../../../components/admin/reports/ReportLayout";
import { ComplianceStats } from "../../../../components/compliance-stats/ComplianceStats";
import { ComplianceSummary } from "../../../../components/admin/reports/compliance/Summary";

function Compliance() {
  return (
    <ReportLayout>
      <ComplianceStats />
      <ComplianceSummary />
    </ReportLayout>
  );
}

export default withAuth(Compliance, AdminGroup);
