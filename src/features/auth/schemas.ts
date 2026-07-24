import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

export const signUpSchema = signInSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(40, "Display name must be 40 characters or fewer."),
});
