import { z } from "zod";

export const createSubmissionSchema = z.object({
  campaignId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "A valid campaign ID is required"),

  postUrl: z
    .string()
    .trim()
    .min(1, "Post URL is required")
    .max(2048, "Post URL is too long")
    .url("A valid post URL is required")
    .refine(
      (value) => {
        try {
          const url = new URL(value);

          if (url.protocol !== "https:") {
            return false;
          }

          const hostname = url.hostname.toLowerCase();

          return (
            hostname === "instagram.com" ||
            hostname.endsWith(".instagram.com") ||
            hostname === "youtube.com" ||
            hostname.endsWith(".youtube.com") ||
            hostname === "youtu.be" ||
            hostname.endsWith(".youtu.be")
          );
        } catch {
          return false;
        }
      },
      "Use a valid HTTPS Instagram or YouTube post URL"
    ),
});

export const updateViewsSchema = z.object({
  views: z
    .number()
    .int("Views must be an integer")
    .min(0, "Views cannot be negative")
    .max(Number.MAX_SAFE_INTEGER, "View count is too large"),
});

export type CreateSubmissionInput = z.infer<
  typeof createSubmissionSchema
>;

export type UpdateViewsInput = z.infer<
  typeof updateViewsSchema
>;
