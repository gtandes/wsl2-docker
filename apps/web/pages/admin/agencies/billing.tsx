import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminEditRoles, AdminGroup } from "../../../types/roles";
import { AgencyLayout } from "../../../components/agencies/AgencyLayout";
import { AgencyBillingForm } from "../../../components/agencies/AgencyBillingForm";

function AgenciesBilling() {
  return (
    <AdminLayout>
      <AgencyLayout>
        <AgencyBillingForm />
      </AgencyLayout>
    </AdminLayout>
  );
}

export default withAuth(AgenciesBilling, AdminEditRoles);
