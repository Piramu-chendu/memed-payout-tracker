import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createSubmission,
  getCreatorEarnings,
  getCreatorSubmissions,
  updateSubmissionViews,
} from "../services/submission.service";
import {
  createSubmissionSchema,
  updateViewsSchema,
} from "../validators/submission.validator";

export async function createSubmissionHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "creator") {
      res.status(403).json({
        success: false,
        message: "Only creator accounts can submit posts",
      });
      return;
    }

    const data = createSubmissionSchema.parse(req.body);
    const submission = await createSubmission(req.user.id, data);

    res.status(201).json({
      success: true,
      message: "Post submitted successfully",
      submission,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid submission data",
        errors: error.issues,
      });
      return;
    }

    if (error instanceof Error) {
      const clientErrors: Record<string, number> = {
        INVALID_CREATOR_ID: 401,
        CAMPAIGN_NOT_AVAILABLE: 404,
        CAMPAIGN_BUDGET_EXHAUSTED: 409,
        POST_PLATFORM_MISMATCH: 400,
        POST_ALREADY_SUBMITTED: 409,
      };

      const status = clientErrors[error.message];

      if (status) {
        res.status(status).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    console.error("Create submission error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit post",
    });
  }
}

export async function updateSubmissionViewsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || id.length === 0) {
      res.status(400).json({
        success: false,
        message: "A valid submission ID is required",
      });
      return;
    }

    const { views } = updateViewsSchema.parse(req.body);
    const result = await updateSubmissionViews(id, views);

    res.status(200).json({
      success: true,
      message: "Views updated successfully",
      result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid view count",
        errors: error.issues,
      });
      return;
    }

    if (error instanceof Error) {
      const clientErrors: Record<string, number> = {
        INVALID_SUBMISSION_ID: 400,
        SUBMISSION_NOT_FOUND: 404,
        CAMPAIGN_NOT_FOUND: 404,
        BUDGET_ALLOCATION_CONFLICT: 409,
        INVALID_VIEW_COUNT: 400,
        INVALID_MILESTONES: 400,
        MILESTONES_REQUIRED: 400,
      };

      const status = clientErrors[error.message];

      if (status) {
        res.status(status).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    console.error("Update submission views error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update submission views",
    });
  }
}

export async function getCreatorEarningsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "creator") {
      res.status(403).json({
        success: false,
        message: "Only creator accounts can view creator earnings",
      });
      return;
    }

    const earnings = await getCreatorEarnings(req.user.id);

    res.status(200).json({
      success: true,
      earnings,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREATOR_ID"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authenticated creator",
      });
      return;
    }

    console.error("Get creator earnings error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve creator earnings",
    });
  }
}

export async function getCreatorSubmissionsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || req.user.role !== "creator") {
      res.status(403).json({
        success: false,
        message: "Only creator accounts can view their submissions",
      });
      return;
    }

    const submissions = await getCreatorSubmissions(req.user.id);

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREATOR_ID"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authenticated creator",
      });
      return;
    }

    console.error("Get creator submissions error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve creator submissions",
    });
  }
}