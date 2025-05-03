import { UserRole, DirectusStatus } from "types";
import crypto from "crypto";

export const createPlatformUser = async ({
  database,
  env,
  agency_id,
  ats_type,
  role = UserRole.PlatformUser,
}: {
  database: any;
  env: any;
  agency_id: string;
  ats_type: string;
  role?: UserRole;
}) => {
  try {
    const usersDB = database.get("directus_users");
    const agencyDB = database.get("agencies");
    const agencyUsersDB = database.get("junction_directus_users_agencies");

    const agency = await agencyDB.readOne(agency_id, { fields: ["name"] });

    if (!agency) {
      throw new Error(`Agency with ID ${agency_id} not found`);
    }

    const sanitizedAgencyName = agency.name.replace(/\s+/g, "").toLowerCase();
    const email = `${crypto.randomBytes(3).toString("hex")}.${sanitizedAgencyName}.${ats_type}${env}`;

    let userId: string = "";
    const existingUsers = await usersDB.readByQuery({
      filter: { email: { _eq: email } },
      fields: ["id"],
    });

    if (!existingUsers.length) {
      userId = await usersDB.createOne({
        first_name: agency.name,
        last_name: ats_type,
        email,
        role,
        agencies: [{ agencies_id: agency_id }],
      });
    }
    if (existingUsers.length) {
      userId = existingUsers[0].id;
      const userAgencies = existingUsers[0].agencies.map((agency: any) => agency.agencies_id.id);

      if (!userAgencies.includes(agency_id)) {
        await agencyUsersDB.createOne({
          agencies_id: agency_id,
          directus_users_id: userId,
          status: DirectusStatus.ACTIVE,
        });
      }
    }
    return userId;
  } catch (error) {
    throw new Error("Failed to create platform user");
  }
};
