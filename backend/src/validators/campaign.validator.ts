import { z } from "zod";

const milestoneSchema = z.object({
  viewThreshold: z
    .number()
    .int("View threshold must be an integer")
    .positive("View threshold must be greater than zero")
    .max(Number.MAX_SAFE_INTEGER),
  payout: z
    .number()
    .int("Payout must be an integer amount in rupees")
    .positive("Payout must be greater than zero")
    .max(Number.MAX_SAFE_INTEGER),
});

export const createCampaignSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Campaign name must contain at least 3 characters")
      .max(120, "Campaign name cannot exceed 120 characters"),

    platform: z.enum(["instagram", "youtube"]),

    totalBudget: z
      .number()
      .int("Campaign budget must be an integer amount in rupees")
      .positive("Campaign budget must be greater than zero")
      .max(Number.MAX_SAFE_INTEGER),

    milestones: z
      .array(milestoneSchema)
      .min(1, "At least one milestone is required")
      .max(50, "A campaign cannot have more than 50 milestones"),
  })
  .superRefine((campaign, context) => {
    for (let index = 1; index < campaign.milestones.length; index += 1) {
      const current = campaign.milestones[index];
      const previous = campaign.milestones[index - 1];

      if (current.viewThreshold <= previous.viewThreshold) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["milestones", index, "viewThreshold"],
          message: "View thresholds must be in strictly increasing order",
        });
      }

      if (current.payout < previous.payout) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["milestones", index, "payout"],
          message: "Payout amounts must not decrease between milestones",
        });
      }
    }

    campaign.milestones.forEach((milestone, index) => {
      if (milestone.payout > campaign.totalBudget) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["milestones", index, "payout"],
          message:
            "A milestone payout cannot exceed the total campaign budget",
        });
      }
    });
  });

export type CreateCampaignInput = z.infer<
  typeof createCampaignSchema
>;
