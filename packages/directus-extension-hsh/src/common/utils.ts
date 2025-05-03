import { stringify } from "csv-stringify/sync";
import { DirectusStatus } from "types";
import { EventContext } from "@directus/types";

export const stringifyCSV = (headers: string[], data: string[][]) => {
  return stringify([headers, ...data]);
};

export const isUserActive = (agency: string, user: any) => {
  if (!user?.agencies) {
    return false;
  }
  const currentAgency = user.agencies?.find((a: any) => a && a.agencies_id && a.agencies_id.id === agency);
  return currentAgency?.status !== undefined && currentAgency?.status !== DirectusStatus.INACTIVE;
};

export function getUserInfo(eventContext: EventContext) {
  const user = eventContext.accountability?.user;
  const role = eventContext.accountability?.role;
  return { user, role };
}
