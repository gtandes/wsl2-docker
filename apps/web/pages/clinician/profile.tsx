import { DashboardLayout } from "../../components/clinicians/DashboardLayout";
import { withAuth } from "../../hooks/withAuth";
import { ClinicianGroup } from "../../types/roles";
import { useAuth } from "../../hooks/useAuth";
import {
  ClinicianUserProfileForm,
  ClinicianUserProfileFormValues,
} from "../../components/ClinicianUserProfileForm";
import {
  useSysUpdateForClinicianUserMutation,
  useSysUserForClinicianQuery,
} from "api";

import { Spinner } from "../../components/Spinner";
import Button from "../../components/Button";
import { first } from "lodash";
import { useModal } from "../../hooks/useModal";
import { GENERIC_SUCCESS_SAVED, notify } from "../../components/Notification";
import { SettingsChangePassword } from "../../components/admin/settings/my-profile/ChangePassword";

function ClinicianProfile() {
  const modal = useModal();
  const { currentUser } = useAuth();

  const { data, loading } = useSysUserForClinicianQuery({
    variables: { id: currentUser?.id! },
  });

  const [updateSysUser] = useSysUpdateForClinicianUserMutation();

  const onUpdateClinicianUser = async (
    data: ClinicianUserProfileFormValues
  ) => {
    await updateSysUser({
      variables: {
        id: currentUser?.id!,
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          address_line_1: data.address_line_1,
          address_line_2: data.address_line_2,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
        },
      },
    });

    notify(GENERIC_SUCCESS_SAVED);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10 rounded-md md:mx-28">
        <h1 className="text-left text-2xl font-medium text-blue-800">
          My Profile
        </h1>
        {loading ? (
          <Spinner />
        ) : (
          <ClinicianUserProfileForm
            user={first(data?.users)}
            onSubmit={onUpdateClinicianUser}
          >
            <Button classes="px-5 mt-3" type="submit" label="Save changes" />
          </ClinicianUserProfileForm>
        )}

        <SettingsChangePassword />
      </div>
    </DashboardLayout>
  );
}

export default withAuth(ClinicianProfile, ClinicianGroup);
