import { RefinementCtx, ZodObject, z } from "zod";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const fileValidation = (
  required: boolean,
  ACCEPTED_FILE_TYPES: string[] = ["application/pdf"]
) => {
  const rule = required
    ? z.custom<File[]>().refine((val) => val.length > 0, "The file is required")
    : z.custom<File[]>().optional();

  return rule
    .refine((file) => {
      if (file && file.length) {
        return file[0].size <= MAX_FILE_SIZE;
      }
      return true;
    }, `Max file size is 25MB.`)
    .refine((file) => {
      if (file && file.length) {
        return ACCEPTED_FILE_TYPES.includes(file[0].type);
      }

      return true;
    }, `${ACCEPTED_FILE_TYPES.join(",")} files are accepted.`);
};

export const editAssignmentDetailsValidation = (
  values: any,
  refinementContext: RefinementCtx
) => {
  if (values.edit_assignments) {
    if (values.details.due_date === "") {
      return refinementContext.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date is required",
        path: ["details.due_date"],
      });
    }
    if (values.details.allowed_attempts === "") {
      return refinementContext.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed attempts is required",
        path: ["details.allowed_attempts"],
      });
    }
    if (parseInt(values.details.allowed_attempts!) <= 0) {
      return refinementContext.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Allowed attempts should be greater than 0",
        path: ["details.allowed_attempts"],
      });
    }
    if (values.details.expiration === "") {
      return refinementContext.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiration is required",
        path: ["details.expiration"],
      });
    }
  }
  return false;
};
