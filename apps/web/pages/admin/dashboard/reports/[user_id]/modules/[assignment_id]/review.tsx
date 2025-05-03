import React from "react";
import { ModuleResults } from "../../../../../../../components/shared/modules/ModuleResults";
import { AdminGroup } from "../../../../../../../types/roles";
import { withAuth } from "../../../../../../../hooks/withAuth";

function ReviewModule() {
  return <ModuleResults />;
}

export default withAuth(ReviewModule, AdminGroup);
