import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import { CreateCampaignInput } from "../validators/campaign.validator";

function formatCampaign(
  campaign: Awaited<ReturnType<typeof Campaign.findById>> & object
) {
  return campaign;
}

export async function createCampaign(
  brandId: string,
  data: CreateCampaignInput
) {
  if (!mongoose.isValidObjectId(brandId)) {
    throw new Error("INVALID_BRAND_ID");
  }

  const campaign = await Campaign.create({
    name: data.name,
    platform: data.platform,
    totalBudget: data.totalBudget,
    spentAmount: 0,
    milestones: data.milestones,
    status: "live",
    brandId,
  });

  return {
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
    totalBudget: campaign.totalBudget,
    spentAmount: campaign.spentAmount,
    remainingBudget: campaign.totalBudget - campaign.spentAmount,
    milestones: campaign.milestones,
    status: campaign.status,
    brandId: campaign.brandId.toString(),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export async function getLiveCampaigns() {
  const campaigns = await Campaign.find({
    status: "live",
    $expr: {
      $lt: ["$spentAmount", "$totalBudget"],
    },
  })
    .select("-__v")
    .sort({ createdAt: -1 })
    .lean();

  return campaigns.map((campaign) => ({
    id: campaign._id.toString(),
    name: campaign.name,
    platform: campaign.platform,
    totalBudget: campaign.totalBudget,
    spentAmount: campaign.spentAmount,
    remainingBudget: campaign.totalBudget - campaign.spentAmount,
    milestones: campaign.milestones,
    status: campaign.status,
    brandId: campaign.brandId.toString(),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  }));
}

export async function getBrandCampaigns(brandId: string) {
  if (!mongoose.isValidObjectId(brandId)) {
    throw new Error("INVALID_BRAND_ID");
  }

  const campaigns = await Campaign.find({ brandId })
    .select("-__v")
    .sort({ createdAt: -1 })
    .lean();

  return campaigns.map((campaign) => ({
    id: campaign._id.toString(),
    name: campaign.name,
    platform: campaign.platform,
    totalBudget: campaign.totalBudget,
    spentAmount: campaign.spentAmount,
    remainingBudget: campaign.totalBudget - campaign.spentAmount,
    milestones: campaign.milestones,
    status: campaign.status,
    brandId: campaign.brandId.toString(),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  }));
}
