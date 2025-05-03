import { FileItem, OneItem } from "@directus/sdk";
import { directus } from "./directus";
import { addYears } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { stringify } from "csv-stringify/sync";
import { CompetencyType } from "types";
import { Competencies, MIGRATION_START_DATE } from "../types/global";

export const decompressGzip = async (buffer: ArrayBuffer): Promise<string> => {
  const compressedStream = new Response(buffer).body;
  const decompressionStream = new DecompressionStream("gzip");
  const decompressedStream = compressedStream?.pipeThrough(decompressionStream);
  return new Response(decompressedStream).text();
};

export function escapeCSVField(field: any): string {
  // Handle null or undefined
  if (field === null || field === undefined) return "";

  // Handle arrays by joining
  if (Array.isArray(field)) {
    // Remove any null or undefined values and join
    const filteredField = field.filter((item) => item != null).join(", ");
    return escapeCSVField(filteredField);
  }

  // Convert to string
  const value = String(field).trim();

  // Check if the field needs escaping
  if (
    value.includes('"') ||
    value.includes(",") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    // Escape double quotes by doubling them
    // Wrap the entire field in double quotes
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export const exportToCsv2 = <T extends Object>(
  filename: string,
  items: T[]
) => {
  if (items.length) {
    const header = Object.keys(items[0]);

    // Modify the csv generation to use escapeCSVField
    const csv = [
      // Escape header names if they might contain special characters
      header.map((h) => escapeCSVField(h)).join(","),
      // Map each row, using escapeCSVField for each field
      ...items.map((row) =>
        header
          .map((fieldName) => escapeCSVField(row[fieldName as keyof T]))
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `${filename}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

export const exportToCsv = <T extends Object>(filename: string, items: T[]) => {
  if (items.length) {
    const replacer = (_: unknown, value: unknown) =>
      value === null ? "" : value;
    const header = Object.keys(items[0]);
    const csv = [
      header.join(","),
      ...items.map((row) =>
        header
          .map((fieldName) =>
            JSON.stringify(row[fieldName as keyof T], replacer)
          )
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `${filename}.csv`);
    a.click();
  }
};

export const averageScore = (
  total: number,
  items: { score: number | null | undefined }[] | undefined
) => {
  if (total > 0 && items?.length) {
    const totalScores = items.reduce((prev, current) => {
      const score = isNaN(current?.score!) ? 0 : current?.score!;
      return prev + score;
    }, 0);

    if (totalScores > 0) {
      return totalScores / total;
    }
    return 0;
  }
  return 0;
};

export const query = async (
  url: string,
  method: "POST" | "PUT" | "GET" | "PATCH" | "DELETE",
  body: object = {},
  options?: { signal?: AbortSignal }
): Promise<Response> => {
  await directus.auth.refreshIfExpired();
  const token = await directus.auth.token;
  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...((method === "POST" || method === "PUT" || method === "PATCH") && {
      body: JSON.stringify(body),
    }),
    credentials: "include",
    signal: options?.signal,
  });
};

export const createFile = async (
  formData: FormData
): Promise<OneItem<FileItem>> => {
  await directus.auth.refreshIfExpired();
  const token = await directus.auth.token;
  return directus.files.createOne(
    formData,
    {},
    {
      requestOptions: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
};

export const updateFile = async (
  recordId: string,
  formData: FormData
): Promise<OneItem<FileItem>> => {
  await directus.auth.refreshIfExpired();
  const token = await directus.auth.token;
  const requestOptions = {
    requestOptions: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  };

  const newFile = await directus.files.createOne(formData, {}, requestOptions);

  await directus.files.updateOne(
    recordId,
    {
      metadata: {
        archived: "true",
      },
    },
    {},
    requestOptions
  );

  return newFile;
};

export function getUserName(firstName: string, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function openExternalLink(url: string) {
  window.open(url, "_blank", "noopener, noreferrer");
}

export const getContentExpirationDate = () => {
  const date = new Date();
  const threeYearsLater = addYears(date, 3);
  return threeYearsLater;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const valueHumanReadable = (value: number) => {
  if (value > 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value;
};

export const stringifyCSV = (headers: string[], data: string[][]) => {
  return stringify([headers, ...data]);
};

export const showCompetencyResultLink = (
  type: CompetencyType,
  competency: Competencies,
  isClinician: boolean,
  userId: string
) => {
  const completedAfterMigration =
    competency.finished_on &&
    competency.finished_on > new Date(MIGRATION_START_DATE);
  let link = "";

  switch (true) {
    case competency.import_report_url && !completedAfterMigration:
      link =
        (type === CompetencyType.SKILL_CHECKLIST
          ? competency?.import_report_url?.replace(
              "s3.amazonaws.com/hshresources",
              "hshresources-ancc.s3.us-west-2.amazonaws.com"
            ) || ""
          : competency.import_report_url) || "";
      break;
    case !competency.finished_on || completedAfterMigration:
      switch (type) {
        case CompetencyType.EXAM:
          link = isClinician
            ? `/clinician/exams/${competency?.id}/review`
            : `/admin/dashboard/reports/${userId}/${competency?.id}/review`;
          break;
        case CompetencyType.MODULE:
          link = isClinician
            ? `/clinician/modules/${competency.id}/review`
            : `/admin/dashboard/reports/${userId}/modules/${competency.id}/review`;
          break;
        case CompetencyType.SKILL_CHECKLIST:
          link = isClinician
            ? `/clinician/skills-checklists/${competency?.id}/review?from_report=true`
            : `/admin/dashboard/reports/${userId}/skills-checklist/${competency?.id}/review?from_report=true`;
          break;
      }
      break;
  }

  return link;
};
