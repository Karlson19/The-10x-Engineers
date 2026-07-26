import { z } from "zod";
import { roleSchema, sectionSchema } from "../enums";
import { emailSchema, fullNameSchema, passwordSchema, phoneSchema } from "./auth";
import { paginationQuerySchema } from "./common";

/**
 * A STAFF member works in exactly one section, and a client or manager works in
 * none. Enforcing it here means both the API and the admin form agree.
 */
function sectionMatchesRole(value: {
  role: z.infer<typeof roleSchema>;
  section?: z.infer<typeof sectionSchema> | null;
}): boolean {
  if (value.role === "STAFF") {
    return value.section !== null && value.section !== undefined;
  }
  return value.section === null || value.section === undefined;
}

const SECTION_RULE_MESSAGE =
  "Staff must be assigned to a section, and clients and management must not have one.";

/** MANAGEMENT only. This is the one place a role may be set. */
export const createUserRequestSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    role: roleSchema,
    section: sectionSchema.nullable().optional(),
  })
  .refine(sectionMatchesRole, { message: SECTION_RULE_MESSAGE, path: ["section"] });
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const updateUserRequestSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
    section: sectionSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to change.",
  });
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

export const userListQuerySchema = paginationQuerySchema.extend({
  role: roleSchema.optional(),
  section: sectionSchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).max(120).optional(),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** Anyone signed in may change their own password. */
export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export { SECTION_RULE_MESSAGE };
