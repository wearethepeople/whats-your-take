import { z } from "zod";

export const newsletterFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export type NewsletterFields = z.output<typeof newsletterFormSchema>;
