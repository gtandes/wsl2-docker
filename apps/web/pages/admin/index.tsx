import { AdminLayout } from "../../components/AdminLayout";
import { withAuth } from "../../hooks/withAuth";
import { AdminGroup } from "../../types/roles";

function AdminDashboard() {
  return (
    <AdminLayout>
      <h1 className="noprint text-2xl font-medium text-blue-800">Dashboard</h1>
    </AdminLayout>
  );
}

export default withAuth(AdminDashboard, AdminGroup);
