import { z } from "zod";

const emailSchema = z.email("Enter a valid email address.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Use a password with at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer."),
});

export type AuthFormValues = z.infer<typeof loginSchema>;