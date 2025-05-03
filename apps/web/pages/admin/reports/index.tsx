import React from "react";
import AnccReportsLayout from "../../../components/admin/anccReports/AnccReportsLayout";
import { withAuth } from "../../../hooks/withAuth";
import { HSHAdminOnly } from "../../../types/roles";

function Index() {
  return (
    <AnccReportsLayout>
      <div className="flex items-center justify-center">
        It looks like there is no data to display at the moment
      </div>
    </AnccReportsLayout>
  );
}

export default withAuth(Index, HSHAdminOnly);
