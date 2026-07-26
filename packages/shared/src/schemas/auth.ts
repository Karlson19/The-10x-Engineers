import { z } from "zod";
import { roleSchema, sectionSchema } from "../enums";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Long enough to be worth hashing, loose enough to type on a phone keyboard
 * while standing in a car park.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use no more than ${PASSWORD_MAX_LENGTH} characters.`)
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const emailSchema = z
  .email({ message: "Enter a valid email address." })
  .trim()
  .toLowerCase()
  .max(255);

/** Ghana numbers are usually written as +233XXXXXXXXX or 0XXXXXXXXX. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{7,17}$/, "Enter a valid phone number, for example +233 24 111 0004.");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "That name is too long.");

/**
 * Registration always creates a CLIENT. There is deliberately no role field:
 * a role sent by a browser is never trusted. Staff and management accounts are
 * created by management through POST /users.
 */
export const registerRequestSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** The only user shape that ever leaves the API. There is no passwordHash here. */
export const publicUserSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.email(),
  phone: z.string(),
  role: roleSchema,
  section: sectionSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/**
 * The access token is returned in the body so the client can hold it in memory.
 * The refresh token is set as an httpOnly cookie and never appears in a payload.
 */
export const authResponseSchema = z.object({
  user: publicUserSchema,
  accessToken: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = z.object({
  user: publicUserSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** Name of the httpOnly cookie carrying the refresh token. */
export const REFRESH_COOKIE_NAME = "chrysmec_refresh";
