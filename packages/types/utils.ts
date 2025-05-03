import { ExpirationType } from "./global";
import { addYears } from "date-fns";

export const controlExpiration = (expirationType: ExpirationType, completion_date: Date): Date | null => {
  switch (expirationType) {
    case ExpirationType.YEARLY:
      return addYears(completion_date, 1);
    case ExpirationType.BIANNUAL:
      return addYears(completion_date, 2);
    default:
      return null;
  }
};

export function hasCompetencyExpirationReport(
  settings: unknown,
): settings is { competency_expiration_report?: boolean } {
  return (settings as { competency_expiration_report?: boolean }).competency_expiration_report !== undefined;
}

export function hasInvalidEmailNotification(settings: unknown): settings is { invalid_email?: boolean } {
  return (settings as { invalid_email?: boolean }).invalid_email !== undefined;
}
