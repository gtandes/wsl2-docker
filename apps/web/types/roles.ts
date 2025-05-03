export enum UserRole {
  UsersManager = "fb7c8da4-685c-11ee-8c99-0242ac120002",
  AgencyUser = "122c0248-4037-49ae-8c82-43a5e7f1d9c5",
  Clinician = "8be9ecec-947d-4f53-932a-bdd6a779d8f8",
  HSHAdmin = "cc987fae-dbb9-4d72-8199-21243fa13c92",
  Developer = "cd4bfb95-9145-4bad-aa88-a3810f15a976",
  CredentialingUser = "05bdccb9-dbff-4a45-bfb7-47abe151badb",
  PlatformUser = "3f9c2b6e-8d47-4a60-bf3c-12e9a0f5d2b8",
}

export const AgencyGroup = [UserRole.Developer, UserRole.AgencyUser];

export const HSHAdminOnly = [UserRole.HSHAdmin];

export const UsersGroup = [
  UserRole.HSHAdmin,
  UserRole.Developer,
  UserRole.AgencyUser,
];

export const AdminGroup = [
  UserRole.HSHAdmin,
  UserRole.Developer,
  UserRole.AgencyUser,
  UserRole.UsersManager,
  UserRole.CredentialingUser,
  UserRole.PlatformUser,
];

export const AllRoles = [
  UserRole.HSHAdmin,
  UserRole.Developer,
  UserRole.AgencyUser,
  UserRole.Clinician,
  UserRole.UsersManager,
  UserRole.CredentialingUser,
  UserRole.PlatformUser,
];

export const EditRoles = [
  UserRole.HSHAdmin,
  UserRole.Developer,
  UserRole.AgencyUser,
];

export const AdminEditRoles = [UserRole.HSHAdmin, UserRole.Developer];
export const ClinicianGroup = [UserRole.Clinician, UserRole.Developer];
export const getRoleOptions = (
  currentRole: UserRole,
  createAdmin?: boolean,
  showAdminRoleOption?: boolean,
  selectedUser?: UserRole,
  isCreating?: boolean
) => {
  let roleOptions: { label: string; value: string }[] = [];

  switch (currentRole) {
    case UserRole.AgencyUser:
      roleOptions.push(
        { label: "Clinician", value: UserRole.Clinician },
        { label: "User's Manager", value: UserRole.UsersManager },
        { label: "Credentialing User", value: UserRole.CredentialingUser },
        { label: "Agency User", value: UserRole.AgencyUser }
      );
      break;

    case UserRole.CredentialingUser:
      roleOptions.push(
        { label: "Clinician", value: UserRole.Clinician },
        { label: "User's Manager", value: UserRole.UsersManager },
        { label: "Credentialing User", value: UserRole.CredentialingUser },
        { label: "Agency User", value: UserRole.AgencyUser }
      );

      if (
        selectedUser === UserRole.Clinician ||
        selectedUser === UserRole.UsersManager ||
        selectedUser === UserRole.CredentialingUser ||
        isCreating === true
      ) {
        const index = roleOptions.findIndex(
          (option) => option.value === UserRole.AgencyUser
        );
        if (index !== -1) {
          roleOptions.splice(index, 1);
        }
      }
      break;

    case UserRole.UsersManager:
      roleOptions.push(
        { label: "Clinician", value: UserRole.Clinician },
        { label: "User's Manager", value: UserRole.UsersManager },
        { label: "Credentialing User", value: UserRole.CredentialingUser }
      );

      if (
        selectedUser === UserRole.Clinician ||
        selectedUser === UserRole.UsersManager ||
        isCreating === true
      ) {
        const index = roleOptions.findIndex(
          (option) => option.value === UserRole.CredentialingUser
        );
        if (index !== -1) {
          roleOptions.splice(index, 1);
        }
      }

      break;

    default:
      roleOptions.push(
        { label: "Clinician", value: UserRole.Clinician },
        { label: "User's Manager", value: UserRole.UsersManager },
        { label: "Credentialing User", value: UserRole.CredentialingUser },
        { label: "Agency User", value: UserRole.AgencyUser }
      );
      break;
  }

  if (showAdminRoleOption && currentRole === UserRole.HSHAdmin) {
    roleOptions.push({ label: "Admin User", value: UserRole.HSHAdmin });
  }

  if (createAdmin) {
    roleOptions.unshift({ label: "Select Role", value: UserRole.HSHAdmin });
  } else {
    roleOptions.unshift({ label: "Select Role", value: "" });
  }

  return roleOptions;
};
