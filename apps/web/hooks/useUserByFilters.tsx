import {
  Junction_Directus_Users_Agencies_Filter,
  useGetUsersOnOverviewReportLazyQuery,
} from "api";
import { FilterComboOptions } from "../components/clinicians/FilterCombo";

export function useUsersByFilters(agency: string | null) {
  const [usersBy] = useGetUsersOnOverviewReportLazyQuery();
  const getUserBy = async (
    supervisorFilters: FilterComboOptions[],
    locationFilters: FilterComboOptions[],
    departmentFilters: FilterComboOptions[],
    specialityFilters: FilterComboOptions[]
  ) => {
    if (agency) {
      const userByFilter: Junction_Directus_Users_Agencies_Filter = {
        _and: [
          {
            agencies_id: { id: { _eq: agency } },
          },
        ],
      };
      const subFilter: Junction_Directus_Users_Agencies_Filter = { _or: [] };

      if (supervisorFilters?.length) {
        subFilter._or?.push({
          supervisors: {
            directus_users_id: {
              id: { _in: supervisorFilters.map((us) => us.value) },
            },
          },
        });
      }
      if (locationFilters?.length) {
        subFilter._or?.push({
          locations: {
            locations_id: {
              id: { _in: locationFilters.map((us) => us.value) },
            },
          },
        });
      }
      if (departmentFilters?.length) {
        subFilter._or?.push({
          departments: {
            departments_id: {
              id: { _in: departmentFilters.map((us) => us.value) },
            },
          },
        });
      }
      if (specialityFilters?.length) {
        subFilter._or?.push({
          specialties: {
            specialties_id: {
              id: { _in: specialityFilters.map((us) => us.value) },
            },
          },
        });
      }

      userByFilter._and?.push(subFilter);
      const users = await usersBy({
        variables: {
          filter: userByFilter,
        },
      });

      if (users.data?.junction_directus_users_agencies.length) {
        return users.data?.junction_directus_users_agencies.map(
          (u) => u.directus_users_id?.id
        );
      }

      return null;
    }
    return null;
  };

  return { getUserBy };
}
