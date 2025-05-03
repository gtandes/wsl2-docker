import AdminWidget from "../../../components/admin/proctoring/AdminWidget";
import { AdminLayout } from "../../../components/AdminLayout";
import { withAuth } from "../../../hooks/withAuth";
import { EditRoles } from "../../../types/roles";

function Index() {
  return (
    <AdminLayout>
      <div className="flex flex-col">
        <div className="flex flex-row items-center gap-2">
          <h1 className="text-2xl font-medium text-blue-800">
            Integrity Advocate Admin Settings
          </h1>
        </div>
        <div className="mt-3">
          <AdminWidget />
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAuth(Index, EditRoles);
