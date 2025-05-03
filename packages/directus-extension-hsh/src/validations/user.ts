import { body } from "express-validator";
import { UserRole } from "../../../types";

export const validateCreateUser = [
  body("email")
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("role").notEmpty().withMessage("Role is required").isIn(Object.values(UserRole)).withMessage("Invalid role"),
  body("first_name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters long"),
  body("last_name").optional().trim().isLength({ min: 2 }).withMessage("Last name must be at least 2 characters long"),
  body("password").optional().trim(),
  body("address_line_1").optional().trim(),
  body("address_line_2").optional().trim(),
  body("agencies").optional().isArray(),
  body("auth_data").optional().isJSON(),
  body("avatar")
    .optional()
    .custom((value) => typeof value === "object" && value !== null),
  body("city").optional().isString(),
  body("description").optional().isString(),
  body("documents").optional().isArray(),
  body("email_notifications").optional().isBoolean(),
  body("exams").optional().isArray(),
  body("external_identifier").optional().isString(),
  body("id").optional().isString(),
  body("import_student_id").optional().isInt(),
  body("imported").optional().isBoolean(),
  body("language").optional().isString(),
  body("last_access").optional().isDate(),
  body("last_page").optional().isString(),
  body("location").optional().isString(),
  body("modules").optional().isArray(),
  body("phone").optional().isString(),
  body("policies").optional().isArray(),
  body("provider").optional().isString(),
  body("sc_definitions").optional().isArray(),
  body("state").optional().isString(),
  body("status").optional().isString(),
  body("tags").optional().isJSON(),
  body("tfa_secret").optional().isString(),
  body("theme").optional().isString(),
  body("title").optional().isString(),
  body("token").optional().isString(),
  body("zip").optional().isString(),
];
