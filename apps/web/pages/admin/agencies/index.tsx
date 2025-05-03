import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles, AdminGroup } from "../../../types/roles";
import { AgenciesView } from "../../../components/agencies/AgenciesView";
import { AgencyLayout } from "../../../components/agencies/AgencyLayout";

function AgenciesList() {
  return (
    <AdminLayout>
      <AgencyLayout>
        <AgenciesView />
      </AgencyLayout>
    </AdminLayout>
  );
}

export default withAuth(AgenciesList, AdminEditRoles);
