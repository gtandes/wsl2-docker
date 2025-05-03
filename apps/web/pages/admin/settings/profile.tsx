import { AdminLayout } from "../../../components/AdminLayout";
import { AdminSettingsLayout } from "../../../components/admin/settings/SettingsLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup } from "../../../types/roles";
import { SettingsUserInformation } from "../../../components/admin/settings/my-profile/UserInformation";
import { SettingsChangePassword } from "../../../components/admin/settings/my-profile/ChangePassword";

function Settings() {
  return (
    <AdminLayout>
      <AdminSettingsLayout>
        <SettingsUserInformation />
        <SettingsChangePassword />
      </AdminSettingsLayout>
    </AdminLayout>
  );
}

export default withAuth(Settings, AdminGroup);
