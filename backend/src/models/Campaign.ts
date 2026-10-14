import mongoose, { Document, Schema, Types } from "mongoose";

export type CampaignPlatform = "instagram" | "youtube";

export type CampaignStatus =
  | "live"
  | "paused"
  | "completed";

export interface IMilestone {
  viewThreshold: number;
  payout: number;
}

export interface ICampaign extends Document {
  name: string;
  platform: CampaignPlatform;
  totalBudget: number;
  spentAmount: number;
  milestones: IMilestone[];
  status: CampaignStatus;
  brandId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    viewThreshold: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "View threshold must be a positive integer",
      },
    },
    payout: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Payout must be a positive integer",
      },
    },
  },
  {
    _id: false,
  }
);

const campaignSchema = new Schema<ICampaign>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    platform: {
      type: String,
      enum: ["instagram", "youtube"],
      required: true,
    },
    totalBudget: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Campaign budget must be a positive integer",
      },
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Spent amount must be a non-negative integer",
      },
    },
    milestones: {
      type: [milestoneSchema],
      required: true,
      validate: {
        validator: (milestones: IMilestone[]) => {
          if (milestones.length === 0) {
            return false;
          }

          for (let index = 1; index < milestones.length; index += 1) {
            if (
              milestones[index].viewThreshold <=
              milestones[index - 1].viewThreshold
            ) {
              return false;
            }

            if (
              milestones[index].payout <
              milestones[index - 1].payout
            ) {
              return false;
            }
          }

          return true;
        },
        message:
          "Milestones must have strictly increasing view thresholds and non-decreasing payouts",
      },
    },
    status: {
      type: String,
      enum: ["live", "paused", "completed"],
      default: "live",
      required: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

campaignSchema.index({ status: 1, createdAt: -1 });
campaignSchema.index({ brandId: 1, createdAt: -1 });

const Campaign = mongoose.model<ICampaign>(
  "Campaign",
  campaignSchema
);

export default Campaign;