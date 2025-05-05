import { AdminLayout } from "../../../components/AdminLayout";

import { AdminSettingsLayout } from "../../../components/admin/settings/SettingsLayout";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup, UserRole } from "../../../types/roles";
import { WebHookForm } from "../../../components/admin/settings/integrations/WebHookForm";
import IntegrityAdvocateForm from "../../../components/admin/settings/integrations/IntegrityAdvocateForm";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import BullhornIntegration from "../../../components/admin/settings/integrations/BullhornIntegration";
import { useAuth } from "../../../hooks/useAuth";
import { useAgency } from "../../../hooks/useAgency";
import NotAuthorized from "../../not-authorized";

function Integrations() {
  const auth = useAuth();
  const { flags } = useFeatureFlags();
  const globalAgency = useAgency();
  const { currentUser } = useAuth();
  const isAgencySelected = !!globalAgency.currentAgency?.id;

  if (
    auth.currentUser?.role === UserRole.UsersManager ||
    auth.currentUser?.role === UserRole.CredentialingUser
  ) {
    return <NotAuthorized />;
  }
  return (
    <AdminLayout>
      <AdminSettingsLayout>
        {process.env.NEXT_PUBLIC_ENV_NAME !== "prod" && <WebHookForm />}
        {flags["enabled_integrity_advocate"] && <IntegrityAdvocateForm />}
        {flags["bullhorn_enabled"] &&
          !!isAgencySelected &&
          currentUser?.role === UserRole.HSHAdmin && <BullhornIntegration />}
      </AdminSettingsLayout>
    </AdminLayout>
  );
}

export default withAuth(Integrations, AdminGroup);
