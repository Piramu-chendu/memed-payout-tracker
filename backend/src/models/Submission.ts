import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubmission extends Document {
  campaignId: Types.ObjectId;
  creatorId: Types.ObjectId;
  postUrl: string;
  views: number;
  payoutAmount: number;
  highestMilestonePayout: number;
  flaggedUnusualSpike: boolean;
  previousViews: number;
  lastViewsUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (value: string) => {
          try {
            const url = new URL(value);

            return (
              url.protocol === "https:" &&
              (url.hostname === "instagram.com" ||
                url.hostname.endsWith(".instagram.com") ||
                url.hostname === "youtube.com" ||
                url.hostname.endsWith(".youtube.com") ||
                url.hostname === "youtu.be" ||
                url.hostname.endsWith(".youtu.be"))
            );
          } catch {
            return false;
          }
        },
        message: "A valid Instagram or YouTube HTTPS URL is required",
      },
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Views must be a non-negative integer",
      },
    },
    payoutAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Payout amount must be a non-negative integer",
      },
    },
    highestMilestonePayout: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Milestone payout must be a non-negative integer",
      },
    },
    flaggedUnusualSpike: {
      type: Boolean,
      default: false,
    },
    previousViews: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Previous views must be a non-negative integer",
      },
    },
    lastViewsUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent the same post from being submitted to the same campaign twice.
submissionSchema.index(
  { campaignId: 1, postUrl: 1 },
  { unique: true }
);

// Support creator earnings queries and campaign submission lookups.
submissionSchema.index({ creatorId: 1, createdAt: -1 });
submissionSchema.index({ campaignId: 1, views: -1 });

const Submission = mongoose.model<ISubmission>(
  "Submission",
  submissionSchema
);

export default Submission;
