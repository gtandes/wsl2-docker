import { format, isValid, parseISO } from "date-fns";

export const formatDateTime = (dateTime: string | number | Date): string => {
  return dateTime
    ? format(new Date(dateTime), "MMMM dd yyyy 'at' hh:mm aaa")
    : "";
};

export const formatDateTimeSplitted = (dateTime: string | number | Date) => {
  if (dateTime)
    return {
      date: format(new Date(dateTime), "MMMM dd, yyyy"),
      time: format(new Date(dateTime), "hh:mm aaa"),
    };
  return { date: "", time: "" };
};

export const formatTime = (dateTime: string | number | Date): string => {
  return format(new Date(dateTime), "hh:mm:ss");
};

export const formatDateForInput = (
  dateTime: string | number | Date | undefined | null
): string => {
  if (!dateTime) return "";

  return format(new Date(dateTime), "yyyy-MM-dd");
};

export const formatDateForCSV = (
  dateTime: string | number | Date | undefined | null
): string => {
  if (!dateTime) return "";

  return format(new Date(dateTime), "MM/dd/yyyy");
};

export const formatDate = (dateTime: string | number | Date): string => {
  return dateTime ? format(new Date(dateTime), "dd MMMM, yyyy") : "";
};

export const formatDateForSC = (
  dateTime?: string | number | Date | null
): string => {
  if (!dateTime) return "";
  return format(new Date(dateTime), "MMM dd, yyyy hh:mm a");
};

export const formatDateForModules = (
  dateTime?: string | number | Date | null
): string => {
  if (!dateTime) return "";
  return format(new Date(dateTime), "MMM dd, yyyy");
};

export const formatBytes = (bytes: number, decimals: number = 2) => {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.ceil(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)))} ${
    sizes[i]
  }`;
};

export const getLastMinuteOfDate = (date: string | number | Date): Date => {
  return new Date(new Date(date).setHours(23, 59, 999));
};

export const getFormattedDueDate = (
  dueDate: string | Date | null | undefined
): string => {
  if (!dueDate) {
    return "No due date";
  }

  if (typeof dueDate === "string" && dueDate.trim() !== "") {
    return format(parseISO(dueDate), "MMM dd, yyyy") + " at 11:59 pm";
  }

  if (dueDate instanceof Date) {
    return format(dueDate, "MMM dd, yyyy") + " at 11:59 pm";
  }

  return "No due date";
};

/**
 * This function formats the expires on date and subtracts 1 day from it.
 * @param expiresOn
 * @returns
 */
export const formatExpiresOnDate = (
  expiresOn: string | Date | null | undefined
): string => {
  if (!expiresOn || !isValid(expiresOn)) {
    return "";
  }

  const expiresOnDate = expiresOn
    ? new Date(new Date(expiresOn).setDate(new Date(expiresOn).getDate() - 1))
    : "";

  if (typeof expiresOnDate === "string" && expiresOnDate.trim() !== "") {
    return format(parseISO(expiresOnDate), "MMM dd, yyyy");
  }

  if (expiresOnDate instanceof Date) {
    return format(expiresOnDate, "MMM dd, yyyy");
  }

  return "";
};
