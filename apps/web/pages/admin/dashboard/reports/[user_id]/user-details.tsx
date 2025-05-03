import React from "react";
import { withAuth } from "../../../../../hooks/withAuth";
import { AdminGroup } from "../../../../../types/roles";
import ReportLayout from "../../../../../components/admin/reports/ReportLayout";

import UserDetailReport from "../../../../../components/admin/reports/user-and-groups/UserDetailsReport";

function Documents() {
  return (
    <ReportLayout>
      <UserDetailReport />
    </ReportLayout>
  );
}

export default withAuth(Documents, AdminGroup);
