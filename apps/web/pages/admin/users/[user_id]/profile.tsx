import { AdminLayout } from "../../../../components/AdminLayout";
import { withAuth } from "../../../../hooks/withAuth";
import { UserRole, AdminGroup } from "../../../../types/roles";
import { useRouter } from "next/router";
import Button from "../../../../components/Button";
import {
  SysUserForCrudDocument,
  useSysDeleteUserMutation,
  useSysGetUserCrudCompetenciesLazyQuery,
  useSysUpdateUserMutation,
  useSysUserForCrudQuery,
  useUpdateUserForAgencyMutation,
} from "api";
import {
  UserProfileForm,
  UserProfileFormValues,
} from "../../../../components/UserProfileForm";
import { useModal } from "../../../../hooks/useModal";
import { useAuth } from "../../../../hooks/useAuth";
import { AdminUserLayout } from "../../../../components/AdminUserLayout";
import { useAgency } from "../../../../hooks/useAgency";
import {
  GENERIC_ERROR,
  GENERIC_SUCCESS_SAVED,
  notify,
} from "../../../../components/Notification";
import React from "react";
import { DirectusStatus } from "types";

function Profile() {
  const router = useRouter();
  const modal = useModal();
  const userId = router.query.user_id as string;
  const auth = useAuth();
  const globalAgency = useAgency();

  const isAdmin = [UserRole.HSHAdmin, UserRole.Developer].includes(
    auth.currentUser?.role as UserRole
  );

  const userCrudVariables = {
    filter: {
      id: {
        _eq: userId,
      },
      ...(globalAgency.currentAgency?.id && {
        agencies: {
          agencies_id: {
            id: {
              _eq: globalAgency.currentAgency.id,
            },
          },
        },
      }),
    },
  };

  const refetchCrudQuery = {
    query: SysUserForCrudDocument,
    variables: userCrudVariables,
  };

  const sysUserQuery = useSysUserForCrudQuery({
    variables: userCrudVariables,
  });

  const [updateSysUser, { loading: updateUserLoading }] =
    useSysUpdateUserMutation({
      refetchQueries: [
        refetchCrudQuery,
        "sysUsersTable",
        "SysUserForAssigment",
      ],
    });

  const [updateUserAgency] = useUpdateUserForAgencyMutation({
    refetchQueries: [refetchCrudQuery, "sysUsersTable", "SysUserForAssigment"],
  });

  const [deleteUser] = useSysDeleteUserMutation({
    variables: {
      id: router.query.user_id as string,
    },
    refetchQueries: ["sysUsersTable"],
  });

  const [userCompetencies, { loading: competenciesLoading }] =
    useSysGetUserCrudCompetenciesLazyQuery();

  const checkCompetenciesBeforeChangingRole = async (
    newRole: UserRole
  ): Promise<boolean> => {
    const assignments = await userCompetencies({
      variables: {
        id: userId,
        agency: globalAgency?.currentAgency?.id as string,
      },
      fetchPolicy: "network-only",
    });
    const currentUserCompetencies = assignments.data?.users_by_id;
    const isNewRole = newRole !== UserRole.Clinician;
    const exams = currentUserCompetencies?.exams?.flatMap(
      (exam) => exam?.exams_id?.id
    );
    const modules = currentUserCompetencies?.modules?.flatMap(
      (module) => module?.modules_definition_id?.id
    );
    const scs = currentUserCompetencies?.sc_definitions?.flatMap(
      (sc) => sc?.sc_definitions_id?.id
    );
    const documents = currentUserCompetencies?.documents?.flatMap(
      (document) => document?.documents_id?.id
    );
    const policies = currentUserCompetencies?.policies?.flatMap(
      (policy) => policy?.policies_id?.id
    );
    const competencies = [
      ...exams!,
      ...modules!,
      ...scs!,
      ...documents!,
      ...policies!,
    ];

    const hasCompetencies = competencies.length;
    if (isNewRole && hasCompetencies) {
      await modal.showAlert(
        "The assignments must be cleared before changing roles"
      );
      return false;
    }

    return true;
  };

  const onUpdateUser = async (data: UserProfileFormValues) => {
    try {
      const agencyData = sysUserQuery.data?.users[0].agencies?.find(
        (a) => a?.agencies_id?.id === globalAgency.currentAgency?.id
      );

      let roleControl = true;

      if (
        sysUserQuery.data?.users[0].role?.id === UserRole.Clinician &&
        data.role !== UserRole.Clinician
      ) {
        roleControl = await checkCompetenciesBeforeChangingRole(
          data.role as UserRole
        );
      }

      if (roleControl) {
        await updateSysUser({
          variables: {
            id: router.query.user_id as string,
            data: {
              first_name: data.first_name,
              last_name: data.last_name,
              email: data.email,
              address_line_1: data.address_line_1,
              address_line_2: data.address_line_2,
              city: data.city,
              state: data.state,
              zip: data.zip,
              phone: data.phone,
              role: { id: data.role },
              ...(data.role === UserRole.HSHAdmin && {
                status: data.active
                  ? DirectusStatus.ACTIVE
                  : DirectusStatus.INACTIVE,
              }),
            },
          },
        });
        if (agencyData?.id) {
          await updateUserAgency({
            variables: {
              id: agencyData?.id as string,
              data: {
                status: data.active
                  ? DirectusStatus.ACTIVE
                  : DirectusStatus.INACTIVE,
                employee_number: data.employee_number,
                specialties: data.specialties?.length
                  ? data.specialties?.map((s) => ({
                      specialties_id: { id: s.id },
                    }))
                  : null,
                departments: data.departments?.length
                  ? data.departments?.map((d) => ({
                      departments_id: { id: d.id },
                    }))
                  : null,
                locations: data.locations?.length
                  ? data.locations?.map((l) => ({
                      locations_id: { id: l.id },
                    }))
                  : null,
                supervisors: data.supervisors?.length
                  ? data.supervisors?.map((s) => ({
                      directus_users_id: { id: s.id },
                    }))
                  : null,
              },
            },
          });
        }

        notify(GENERIC_SUCCESS_SAVED);
      }
    } catch (e) {
      notify(GENERIC_ERROR);
    }
  };

  const onDeleteUser = async () => {
    const userEmail = sysUserQuery.data?.users[0].email;
    const result = await modal.showConfirm(
      `Confirm you want to delete user ${userEmail}`
    );
    if (!result) return;

    await deleteUser();

    router.push("/admin/users");
  };

  return (
    <AdminLayout>
      <AdminUserLayout>
        <div className="mt-4 flex flex-col rounded bg-white p-4">
          <div className="mb-3 border-b border-gray-100 pb-1">
            <h2 className="font-medium text-blue-800">User Information</h2>
          </div>
          <UserProfileForm
            user={sysUserQuery.data?.users[0]}
            onSubmit={onUpdateUser}
            showAdminRoleOption={true}
          >
            {!sysUserQuery.loading && sysUserQuery.data?.users.length && (
              <div className="flex justify-between">
                {isAdmin &&
                sysUserQuery.data?.users.at(0)?.status !== "archived" ? (
                  <Button
                    classes="px-5 mr-4"
                    type="button"
                    label="Delete user"
                    variant="light-blue"
                    onClick={onDeleteUser}
                  />
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  <Button
                    classes="px-5"
                    type="submit"
                    label="Save changes"
                    loading={competenciesLoading || updateUserLoading}
                  />
                </div>
              </div>
            )}
          </UserProfileForm>
        </div>
      </AdminUserLayout>
    </AdminLayout>
  );
}

export default withAuth(Profile, AdminGroup);
