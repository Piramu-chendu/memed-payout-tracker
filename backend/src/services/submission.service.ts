import mongoose, { Types } from "mongoose";
import Campaign from "../models/Campaign";
import Submission from "../models/Submission";
import { CreateSubmissionInput } from "../validators/submission.validator";
import {
  calculateBudgetAllocation,
  calculatePayout,
} from "./payout.service";

export async function createSubmission(
  creatorId: string,
  data: CreateSubmissionInput
) {
  if (!mongoose.isValidObjectId(creatorId)) {
    throw new Error("INVALID_CREATOR_ID");
  }

  const campaign = await Campaign.findById(data.campaignId).lean();

  if (!campaign || campaign.status !== "live") {
    throw new Error("CAMPAIGN_NOT_AVAILABLE");
  }

  if (campaign.spentAmount >= campaign.totalBudget) {
    throw new Error("CAMPAIGN_BUDGET_EXHAUSTED");
  }

  const url = new URL(data.postUrl);
  const hostname = url.hostname.toLowerCase();

  const isInstagram =
    hostname === "instagram.com" ||
    hostname.endsWith(".instagram.com");

  const isYouTube =
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com") ||
    hostname === "youtu.be" ||
    hostname.endsWith(".youtu.be");

  if (
    (campaign.platform === "instagram" && !isInstagram) ||
    (campaign.platform === "youtube" && !isYouTube)
  ) {
    throw new Error("POST_PLATFORM_MISMATCH");
  }

  try {
    return await Submission.create({
      campaignId: campaign._id,
      creatorId: new Types.ObjectId(creatorId),
      postUrl: data.postUrl,
      views: 0,
      payoutAmount: 0,
      highestMilestonePayout: 0,
    });
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      throw new Error("POST_ALREADY_SUBMITTED");
    }

    throw error;
  }
}

export async function updateSubmissionViews(
  submissionId: string,
  views: number
) {
  if (!mongoose.isValidObjectId(submissionId)) {
    throw new Error("INVALID_SUBMISSION_ID");
  }

  const session = await mongoose.startSession();

  let result: {
    submissionId: string;
    views: number;
    highestMilestonePayout: number;
    payoutAmount: number;
    additionalPayout: number;
    campaignSpent: number;
    campaignRemaining: number;
    flaggedUnusualSpike: boolean;
  } | null = null;

  try {
    await session.withTransaction(async () => {
      const submission = await Submission.findById(submissionId)
        .session(session);

      if (!submission) {
        throw new Error("SUBMISSION_NOT_FOUND");
      }

      const campaign = await Campaign.findById(submission.campaignId)
        .session(session);

      if (!campaign) {
        throw new Error("CAMPAIGN_NOT_FOUND");
      }

      const calculation = calculatePayout(
        views,
        campaign.milestones
      );

      const highestMilestonePayout = Math.max(
        submission.highestMilestonePayout,
        calculation.highestMilestonePayout
      );

      const remainingBudget = Math.max(
        0,
        campaign.totalBudget - campaign.spentAmount
      );

      const allocation = calculateBudgetAllocation(
        highestMilestonePayout,
        submission.payoutAmount,
        remainingBudget
      );

      const additionalPayout = allocation.additionalPayout;


      if (additionalPayout > 0) {
        const updatedSpent = campaign.spentAmount + additionalPayout;
        const budgetExhausted =
          updatedSpent >= campaign.totalBudget;

        const budgetUpdate = await Campaign.updateOne(
          {
            _id: campaign._id,
            spentAmount: campaign.spentAmount,
            $expr: {
              $lte: [
                {
                  $add: [
                    "$spentAmount",
                    additionalPayout,
                  ],
                },
                "$totalBudget",
              ],
            },
          },
          {
            $inc: {
              spentAmount: additionalPayout,
            },
            ...(budgetExhausted && campaign.status === "live"
              ? {
                  $set: {
                    status: "completed",
                  },
                }
              : {}),
          },
          { session }
        );

        if (budgetUpdate.modifiedCount !== 1) {
          throw new Error("BUDGET_ALLOCATION_CONFLICT");
        }
      }


      const previousViews = submission.views;
      const now = new Date();

      const elapsedMs = submission.lastViewsUpdatedAt
        ? now.getTime() -
          submission.lastViewsUpdatedAt.getTime()
        : Number.POSITIVE_INFINITY;

      const flaggedUnusualSpike =
        submission.flaggedUnusualSpike ||
        (
          views - previousViews >= 10_000 &&
          elapsedMs <= 5 * 60 * 1000
        );

      submission.previousViews = previousViews;
      submission.views = views;
      submission.highestMilestonePayout =
        highestMilestonePayout;
      submission.payoutAmount += additionalPayout;
      submission.flaggedUnusualSpike = flaggedUnusualSpike;
      submission.lastViewsUpdatedAt = now;

      await submission.save({ session });

      const updatedSpent =
        campaign.spentAmount + additionalPayout;

      result = {
        submissionId: submission.id,
        views: submission.views,
        highestMilestonePayout:
          submission.highestMilestonePayout,
        payoutAmount: submission.payoutAmount,
        additionalPayout,
        campaignSpent: updatedSpent,
        campaignRemaining:
          campaign.totalBudget - updatedSpent,
        flaggedUnusualSpike:
          submission.flaggedUnusualSpike,
      };
    });

    if (!result) {
      throw new Error("PAYOUT_UPDATE_FAILED");
    }

    return result;
  } finally {
    await session.endSession();
  }
}

export async function getCreatorEarnings(creatorId: string) {
  if (!mongoose.isValidObjectId(creatorId)) {
    throw new Error("INVALID_CREATOR_ID");
  }

  const creatorObjectId = new Types.ObjectId(creatorId);

  const [summary] = await Submission.aggregate<{
    totalEarnings: number;
    submissionCount: number;
  }>([
    {
      $match: {
        creatorId: creatorObjectId,
      },
    },
    {
      $group: {
        _id: null,
        totalEarnings: {
          $sum: "$payoutAmount",
        },
        submissionCount: {
          $sum: 1,
        },
      },
    },
  ]);

  return {
    totalEarnings: summary?.totalEarnings ?? 0,
    submissionCount: summary?.submissionCount ?? 0,
  };
}

export async function getCreatorSubmissions(creatorId: string) {
  if (!mongoose.isValidObjectId(creatorId)) {
    throw new Error("INVALID_CREATOR_ID");
  }

  const creatorObjectId = new Types.ObjectId(creatorId);

  const submissions = await Submission.find({
    creatorId: creatorObjectId,
  })
    .select(
      "_id campaignId postUrl views previousViews payoutAmount highestMilestonePayout flaggedUnusualSpike lastViewsUpdatedAt createdAt updatedAt"
    )
    .sort({ createdAt: -1 })
    .lean();

  const results = await Promise.all(
    submissions.map(async (submission) => {
      const campaign = await Campaign.findById(
        submission.campaignId
      )
        .select("name platform status milestones")
        .lean();

      return {
        id: submission._id.toString(),
        campaign: campaign
          ? {
              id: campaign._id.toString(),
              name: campaign.name,
              platform: campaign.platform,
              status: campaign.status,
              milestones: campaign.milestones,
            }
          : null,
        postUrl: submission.postUrl,
        views: submission.views,
        previousViews: submission.previousViews,
        payoutAmount: submission.payoutAmount,
        highestMilestonePayout:
          submission.highestMilestonePayout,
        flaggedUnusualSpike: submission.flaggedUnusualSpike,
        lastViewsUpdatedAt: submission.lastViewsUpdatedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      };
    })
  );

  return results;
}

