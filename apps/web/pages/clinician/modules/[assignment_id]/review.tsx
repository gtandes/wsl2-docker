import React from "react";
import { AvatarMenu } from "../../../../components/AvatarMenu";
import { withAuth } from "../../../../hooks/withAuth";
import { ClinicianGroup } from "../../../../types/roles";
import { clinicianNavigation } from "../../../../components/clinicians/DashboardLayout";
import { ModuleResults } from "../../../../components/shared/modules/ModuleResults";

function ReviewModule() {
  return (
    <>
      <AvatarMenu navigation={clinicianNavigation} />
      <ModuleResults />
    </>
  );
}

export default withAuth(ReviewModule, ClinicianGroup);
