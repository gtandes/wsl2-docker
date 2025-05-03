import React from "react";
import { AdminLayout } from "../../../../components/AdminLayout";
import { withAuth } from "../../../../hooks/withAuth";
import { AdminGroup } from "../../../../types/roles";

function InternalNotes() {
  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-medium text-blue-800 sm:mb-12">
        Internal Notes
      </h1>
    </AdminLayout>
  );
}

export default withAuth(InternalNotes, AdminGroup);
