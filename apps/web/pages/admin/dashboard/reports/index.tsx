import React from "react";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";
import ReportLayout from "../../../../components/admin/reports/ReportLayout";

function Index() {
  return (
    <ReportLayout>
      <div className="flex items-center justify-center">
        It looks like there is no data to display at the moment
      </div>
    </ReportLayout>
  );
}

export default withAuth(Index, AdminGroup);
