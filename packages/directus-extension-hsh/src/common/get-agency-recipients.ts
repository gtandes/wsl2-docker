import { UserRole } from "types";

export const getAgencyRecipients = async ({
  usersService,
  assignment,
  settingKey,
}: {
  usersService: any;
  assignment: any;
  settingKey: string;
}) => {
  if (!assignment) return [];
  const recipients = [];

  let addAgencyUsers = false;
  let addManagerUsers = false;

  const agencyAdminNotifSettings = assignment.agency.notifications_settings?.agency_admin;
  const userManagerNotifSettings = assignment.agency.notifications_settings?.user_manager;

  if (agencyAdminNotifSettings?.[`${settingKey}_after_final_attempt`]) {
    if (agencyAdminNotifSettings?.[settingKey] && assignment.attempts_used === assignment.allowed_attempts) {
      addAgencyUsers = true;
    }
  } else {
    if (agencyAdminNotifSettings?.[settingKey]) {
      addAgencyUsers = true;
    }
  }

  if (userManagerNotifSettings?.[`${settingKey}_after_final_attempt`]) {
    if (userManagerNotifSettings?.[settingKey] && assignment.attempts_used === assignment.allowed_attempts) {
      addManagerUsers = true;
    }
  } else {
    if (userManagerNotifSettings?.[settingKey]) {
      addManagerUsers = true;
    }
  }

  if (addAgencyUsers) {
    const agencyUsers =
      (await usersService.readByQuery({
        filter: {
          agencies: {
            agencies_id: { id: { _eq: assignment.agency.id } },
          },
          role: {
            id: {
              _in: [UserRole.AgencyUser, UserRole.CredentialingUser],
            },
          },
        },
        fields: ["email"],
      })) || [];

    recipients.push(...agencyUsers.map((u: any) => u.email));
  }

  if (addManagerUsers) {
    assignment.directus_users_id.agencies.forEach((a: any) => {
      a.supervisors?.forEach((s: any) => {
        const supervisorAgency = s.directus_users_id.agencies.flatMap((agency: any) => agency.agencies_id);
        if (supervisorAgency.includes(assignment.agency.id) && s.directus_users_id.role.id === UserRole.UsersManager) {
          recipients.push(s.directus_users_id.email);
        }
      });
    });
  }

  return [...new Set(recipients)];
};
