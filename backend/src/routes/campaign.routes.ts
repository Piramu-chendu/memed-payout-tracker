import { Router } from "express";
import {
  createCampaignHandler,
  listBrandCampaigns,
  listLiveCampaigns,
} from "../controllers/campaign.controller";
import {
  authenticate,
  authorizeRole,
} from "../middleware/auth.middleware";

const router = Router();

// Public endpoint: creators can browse live campaigns.
router.get("/live", listLiveCampaigns);

// Protected endpoint: brands can create campaigns.
router.post(
  "/",
  authenticate,
  authorizeRole("brand"),
  createCampaignHandler
);

// Protected endpoint: brands can view their own campaigns and budgets.
router.get(
  "/mine",
  authenticate,
  authorizeRole("brand"),
  listBrandCampaigns
);

export default router;