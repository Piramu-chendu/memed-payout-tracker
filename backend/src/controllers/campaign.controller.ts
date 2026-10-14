import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createCampaign,
  getBrandCampaigns,
  getLiveCampaigns,
} from "../services/campaign.service";
import { createCampaignSchema } from "../validators/campaign.validator";

export async function createCampaignHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "brand") {
      res.status(403).json({
        success: false,
        message: "Only brand accounts can create campaigns",
      });
      return;
    }

    const data = createCampaignSchema.parse(req.body);
    const campaign = await createCampaign(req.user.id, data);

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid campaign data",
        errors: error.issues,
      });
      return;
    }

    if (error instanceof Error && error.message === "INVALID_BRAND_ID") {
      res.status(401).json({
        success: false,
        message: "Invalid authenticated brand",
      });
      return;
    }

    console.error("Create campaign error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create campaign",
    });
  }
}

export async function listLiveCampaigns(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const campaigns = await getLiveCampaigns();

    res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    console.error("List live campaigns error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve live campaigns",
    });
  }
}

export async function listBrandCampaigns(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "brand") {
      res.status(403).json({
        success: false,
        message: "Only brand accounts can view their campaign dashboard",
      });
      return;
    }

    const campaigns = await getBrandCampaigns(req.user.id);

    const totalBudget = campaigns.reduce(
      (total, campaign) => total + campaign.totalBudget,
      0
    );

    const totalSpent = campaigns.reduce(
      (total, campaign) => total + campaign.spentAmount,
      0
    );

    res.status(200).json({
      success: true,
      summary: {
        campaignCount: campaigns.length,
        totalBudget,
        totalSpent,
        remainingBudget: totalBudget - totalSpent,
      },
      campaigns,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_BRAND_ID") {
      res.status(401).json({
        success: false,
        message: "Invalid authenticated brand",
      });
      return;
    }

    console.error("List brand campaigns error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve brand campaigns",
    });
  }
}
